"""Central tool registry.

A Tool wraps a backend API call, browser action, or other side-effect with a
typed input contract. Agents discover available tools through the registry and
invoke them via `registry.call(name, args, principal)`.

This is the integration seam for the frontend's "Automation" page — every
StepKind in `schemas.workflow` should ultimately map to one or more Tools here.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from app.core.errors import bad_request, not_found
from app.core.security import AuthPrincipal
from app.schemas.tool import ToolDescriptor, ToolKind

ToolHandler = Callable[[dict[str, Any], AuthPrincipal], Awaitable[Any]]


@dataclass
class Tool:
    name: str
    description: str
    kind: ToolKind
    input_schema: dict[str, Any]
    handler: ToolHandler
    # Roles that may invoke this tool. Empty = anyone authenticated.
    allowed_roles: tuple[str, ...] = field(default=())

    def descriptor(self) -> ToolDescriptor:
        return ToolDescriptor(
            name=self.name,
            description=self.description,
            kind=self.kind,
            input_schema=self.input_schema,
        )


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        if tool.name in self._tools:
            raise ValueError(f"Duplicate tool name: {tool.name}")
        self._tools[tool.name] = tool

    def all(self) -> list[Tool]:
        return list(self._tools.values())

    def descriptors(self) -> list[ToolDescriptor]:
        return [t.descriptor() for t in self._tools.values()]

    def get(self, name: str) -> Tool:
        if name not in self._tools:
            raise not_found(f"Tool '{name}' is not registered")
        return self._tools[name]

    async def call(
        self, name: str, args: dict[str, Any], principal: AuthPrincipal
    ) -> Any:
        tool = self.get(name)
        if tool.allowed_roles and principal.role not in tool.allowed_roles:
            raise bad_request(f"Role '{principal.role}' cannot invoke tool '{name}'")
        return await tool.handler(args, principal)


# Module-level singleton — import from anywhere.
registry = ToolRegistry()
