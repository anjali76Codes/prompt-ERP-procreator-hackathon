"""MCP server scaffold.

Exposes Prompt ERP's tool registry as an MCP server so any MCP-compatible
client (Claude Desktop, Cursor, etc.) can drive the ERP through the same
tools the in-process Gemini agent uses.

Wire up concrete tools by registering them with `app.tools.registry` —
this scaffold reflects the registry into the MCP protocol on startup.
"""

from __future__ import annotations

from app.core.logging import get_logger

log = get_logger("mcp.server")


async def run_stdio_server() -> None:
    """Run the MCP server over stdio. Hook this into a CLI entrypoint as needed."""
    try:
        from mcp.server import Server  # type: ignore[import-not-found]
        from mcp.server.stdio import stdio_server  # type: ignore[import-not-found]
    except Exception as e:  # noqa: BLE001
        log.warning("mcp SDK unavailable", error=str(e))
        return

    from app.tools import registry

    server = Server("prompt-erp")

    @server.list_tools()  # type: ignore[misc]
    async def _list_tools():  # type: ignore[no-untyped-def]
        return [
            {
                "name": t.name,
                "description": t.description,
                "inputSchema": t.input_schema,
            }
            for t in registry.all()
        ]

    log.info("starting MCP stdio server", tools=len(registry.all()))
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())
