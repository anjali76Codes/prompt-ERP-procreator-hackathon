# Prompt ERP — Python Backend

AI orchestration layer for Prompt ERP. Hosts:

- **Agents** — Gemini-powered chat agents
- **Tools** — function-calling adapters that wrap ERP APIs and browser actions
- **Workflows** — the execution engine the `/automation` frontend talks to
- **Automation** — Playwright-driven browser flows (e.g. "open my fee receipt")
- **MCP** — Model Context Protocol server + client harness

## Layout

```
python-backend/
├── main.py                 # uvicorn launcher
├── pyproject.toml
├── .env.example
└── app/
    ├── main.py             # FastAPI app
    ├── core/               # config, logging, security, errors
    ├── api/                # HTTP routes (health, agents, workflows, tools)
    ├── schemas/            # Pydantic models — mirror frontend types
    ├── agents/             # Claude agent runtime
    ├── tools/              # tool registry + built-in adapters
    ├── workflows/          # workflow planning + execution engine
    ├── automation/         # Playwright browser automation
    └── mcp/                # MCP server + client wiring
```

## Quick start

```bash
# Using uv (already initialised here)
uv sync
cp .env.example .env        # then fill in GEMINI_API_KEY + JWT_SECRET

# Run the dev server
uv run python main.py
# or directly
uv run uvicorn app.main:app --reload --port 8000
```

Health check: `http://localhost:8000/health` · OpenAPI: `http://localhost:8000/docs`

## Auth

This service trusts JWTs minted by the Node backend (`express-backend`). The
`JWT_SECRET` env var **must** match the one used there. Protected routes pull
`{ sub, role, status }` from the verified token.
