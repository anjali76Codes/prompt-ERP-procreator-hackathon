"""LangGraph ReAct agent for the Prompt ERP automation layer.

Pipeline (this is what the agent does on every turn):
  1. Detect user intent (upload notes, create quiz, mark attendance, ...).
  2. Select the relevant tools (function calling).
  3. Extract structured parameters from the prompt.
  4. Ask for required params the user didn't give (e.g. quiz question count).
  5. Generate the params it can (titles, descriptions, quiz questions, ...).
  6. Execute tools in the right order (resolve IDs -> create -> publish).
  7. Handle multi-step workflows across turns.
  8. Validate tool arguments (Pydantic schemas on each tool).
  9. Return a useful final response.

State / memory: a LangGraph `MemorySaver` checkpointer keyed by `thread_id`
(the frontend's session id) keeps conversation state in-process between turns,
which is what makes the "ask a clarifying question, then continue" flow work.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from app.agents.run_context import RunContext, use_run_context
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.security import AuthPrincipal
from app.integrations.erp_client import UploadFile
from app.schemas.chat import ChatResponse
from app.tools.erp import erp_tools

log = get_logger("agent.erp")

SYSTEM_PROMPT = """You are the Prompt ERP automation assistant for a college/university ERP.
Teachers and students talk to you in natural language; you carry out their request \
by calling the ERP tools available to you.

Follow this procedure on every request:
1. Identify the intent (upload notes, create an assignment, create/publish a quiz, \
mark or report attendance, look something up).
2. Resolve names to IDs FIRST. Divisions (e.g. "TE-A") and subjects (e.g. "Data \
Structures and Algorithms") must be turned into IDs with list_divisions / \
list_subjects before any create/mark tool. If exactly one match, use it. If \
several plausible matches, ask the user which one. If none, tell the user.
3. Extract the parameters the user gave; generate the ones you reasonably can \
(titles, descriptions, quiz questions for a named topic, a default unit label).
4. For anything required that you cannot infer, ASK a short, specific question \
instead of guessing. Examples: quiz -> number of questions, marks per question, \
difficulty/topic if vague; assignment -> due date and max marks.
5. Execute tools in the correct order and chain multi-step flows (e.g. resolve \
IDs -> create_resource -> publish_resource; or list_lectures -> roster -> \
mark attendance).
6. When the user attaches a file and wants notes/an assignment uploaded, call \
create_resource with attach_files=True. If they mention a file but none is \
attached, ask them to attach it.

Rules:
- New things are created as drafts. Only publish when the user asks to publish/\
release/share, or after confirming.
- Never invent IDs. Only use IDs returned by tools.
- Be concise. After acting, briefly confirm what you did (titles, counts, status) \
and surface anything the user still needs to do.
- The caller's role is {role}; the ERP enforces permissions, so if a tool is \
rejected, explain it plainly rather than retrying."""


@lru_cache(maxsize=1)
def _build_graph():
    """Compile the ReAct agent once. Returns None if no model is configured."""
    settings = get_settings()
    if not settings.gemini_api_key:
        return None

    from langchain_google_genai import ChatGoogleGenerativeAI
    from langgraph.checkpoint.memory import MemorySaver
    from langgraph.prebuilt import create_react_agent

    model = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=settings.gemini_temperature,
        max_output_tokens=settings.gemini_max_output_tokens,
    )
    return create_react_agent(
        model,
        tools=erp_tools(),
        checkpointer=MemorySaver(),
    )


def _collect_tool_trace(messages: list[Any]) -> list[dict[str, Any]]:
    """Pull the tool calls out of the message history for this turn so the
    frontend can render a workflow pipeline / log."""
    trace: list[dict[str, Any]] = []
    for m in messages:
        for call in getattr(m, "tool_calls", None) or []:
            trace.append({"tool": call.get("name"), "args": call.get("args", {})})
    return trace


async def run_agent(
    *,
    message: str,
    session_id: str,
    principal: AuthPrincipal,
    token: str,
    files: list[UploadFile] | None = None,
) -> ChatResponse:
    """Run one turn of the agent for a caller, in the caller's session."""
    graph = _build_graph()
    if graph is None:
        return ChatResponse(
            reply=(
                "(offline) GEMINI_API_KEY isn't set, so the AI layer is disabled. "
                "Add it to python-backend/.env to enable prompt-driven automation."
            ),
            session_id=session_id,
        )

    files = files or []
    # If files were attached, tell the model so it knows to upload them.
    user_text = message
    if files:
        names = ", ".join(f[0] for f in files)
        user_text = f"{message}\n\n[The user attached {len(files)} file(s): {names}]"

    config = {"configurable": {"thread_id": session_id}, "recursion_limit": 25}

    # Send the system prompt only on the first turn of a session — the
    # checkpointer persists it, so re-sending each turn would pile up duplicate
    # system messages in the thread.
    turn_messages: list[Any] = []
    state = await graph.aget_state(config)
    has_history = bool(state and state.values and state.values.get("messages"))
    if not has_history:
        turn_messages.append(("system", SYSTEM_PROMPT.format(role=principal.role)))
    turn_messages.append(("user", user_text))
    inputs = {"messages": turn_messages}

    ctx = RunContext(principal=principal, token=token, files=list(files))
    with use_run_context(ctx):
        try:
            result = await graph.ainvoke(inputs, config=config)
        except Exception as e:  # noqa: BLE001
            log.exception("agent run failed", session=session_id)
            return ChatResponse(
                reply=f"Sorry — I hit an error carrying that out: {e}",
                session_id=session_id,
            )

    msgs = result.get("messages", [])
    reply = ""
    for m in reversed(msgs):
        # The final AIMessage with text content is the user-facing reply.
        if getattr(m, "type", None) == "ai" and getattr(m, "content", None):
            reply = m.content if isinstance(m.content, str) else str(m.content)
            break

    return ChatResponse(
        reply=reply or "(no reply)",
        session_id=session_id,
        tools_used=[t["tool"] for t in _collect_tool_trace(msgs)],
        steps=_collect_tool_trace(msgs),
    )
