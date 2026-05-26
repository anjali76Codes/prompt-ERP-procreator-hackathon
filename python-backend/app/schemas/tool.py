"""Tool registry schemas — exposed via `/tools`."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

ToolKind = Literal["api", "browser", "ai", "mcp"]


class ToolDescriptor(BaseModel):
    """The public face of a tool — what agents and the frontend see."""

    name: str
    description: str
    kind: ToolKind
    # JSON Schema describing the tool's input. Compatible with Claude tool-use.
    input_schema: dict[str, Any]
