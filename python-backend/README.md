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
`{ sub, role, status }` from the verified token. The agent's tools forward that
same token to Express, so Express keeps enforcing its own role checks.

## Prompt-driven automation (the AI layer)

A LangChain + LangGraph agent (Gemini via `langchain-google-genai`) turns a
teacher/student prompt into ERP actions. Pipeline per turn:

1. **Detect intent** → 2. **Select tools** (function calling) → 3. **Extract
params** → 4. **Ask** for missing required params → 5. **Generate** the rest
(titles, quiz questions, …) → 6. **Execute** tools in order → 7. **Multi-step**
flows across turns → 8. **Validate** args (Pydantic per tool) → 9. **Reply**.

State lives in a LangGraph `MemorySaver` keyed by `session_id`, so the
"ask a clarifying question, then continue" flow works across requests.

### Endpoints

| Method | Path                 | Body                                   |
|--------|----------------------|----------------------------------------|
| POST   | `/agents/chat`       | JSON `{ message, sessionId? }`         |
| POST   | `/agents/chat/files` | multipart: `message`, `session_id?`, `files[]` |

Response: `{ reply, sessionId, toolsUsed[], steps[] }`. Pass the returned
`sessionId` back on the next turn to keep the conversation going.

### Tools (`app/tools/erp/`)

- **academic** — `list_divisions`, `list_subjects` (resolve "TE-A" / "DSA" → IDs)
- **resources** — `create_resource` (notes & assignments, multipart upload),
  `publish_resource`, `list_resources`
- **quizzes** — `create_quiz` (agent generates questions), `publish_quiz`,
  `list_quizzes`, `get_quiz`, `quiz_metrics`
- **attendance** — `list_lectures`, `get_lecture_roster`, `mark_attendance`,
  `mark_attendance_for_all`, `division_attendance_stats`, `student_attendance`

### Example

```
POST /agents/chat/files   (multipart)
  message: "upload notes for chapter 3 of Data Structures and Algorithms for TE-A"
  files:   [ch3.pdf]

→ list_subjects("Data Structures") → list_divisions("TE-A")
→ create_resource(kind=notes, division_id, subject_id, unit="Chapter 3", attach_files=True)
→ reply: "Uploaded 'Chapter 3 — DSA' (notes, draft) for TE-A with 1 file. Publish it?"
```

Without `GEMINI_API_KEY` the chat endpoints return an offline stub; everything
else (auth, routing, tool registry) still works.
