"""Example tools — register more here or in dedicated modules.

Tools should be small and side-effecting. Heavy logic belongs in `services/`.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.core.security import AuthPrincipal
from app.tools.registry import Tool, registry

log = get_logger("tools")


async def _ping(args: dict[str, Any], principal: AuthPrincipal) -> dict[str, Any]:
    log.info("ping tool called", caller=principal.sub, args=args)
    return {"pong": True, "echo": args}


def register_builtin_tools() -> None:
    """Call this once on startup to expose the built-in toolset."""
    registry.register(
        Tool(
            name="ping",
            description="Health-check tool: echoes its arguments back.",
            kind="api",
            input_schema={
                "type": "object",
                "properties": {"message": {"type": "string"}},
                "additionalProperties": True,
            },
            handler=_ping,
        )
    )
