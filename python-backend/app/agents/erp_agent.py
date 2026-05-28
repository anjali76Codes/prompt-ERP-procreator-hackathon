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

from datetime import date
from functools import lru_cache
from typing import Any
from uuid import uuid4

from app.agents.run_context import RunContext, use_run_context
from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.security import AuthPrincipal
from app.integrations.erp_client import UploadFile
from app.schemas.chat import ChatResponse, PermissionResponse
from app.tools.erp import erp_tools

log = get_logger("agent.erp")

SYSTEM_PROMPT = """You are the Prompt ERP automation assistant for a college/university ERP.
Teachers and students talk to you in natural language; you carry out their request \
by calling the ERP tools available to you.

Today's date is {today}. The caller's role is {role}.

Follow this procedure on every request:
1. Identify the intent (upload notes, create an assignment, create/publish a quiz, \
mark or report attendance, look something up).
2. Resolve names to IDs FIRST. Divisions (e.g. "TE-A") and subjects (e.g. "Data \
Structures and Algorithms") must be turned into IDs with list_divisions / \
list_subjects before any create/mark tool. If exactly one match, use it. If \
several plausible matches, ask the user which one. If none, tell the user.
3. Extract the parameters the user gave; generate the ones you reasonably can \
(titles, quiz questions for a named topic, a default unit label). If the user \
tells you to write the description ("keep it on your side", "add from your side", \
"you decide"), GENERATE a sensible description yourself — do NOT ask again.
4. Ask ONLY for required details the user didn't give and that you cannot infer \
— never invent a required value. Don't over-ask about optional fields. Per action \
(required fields the backend enforces; ask if missing):
   - Notes: division, subject, title, and AT LEAST ONE attached file. Generate the \
description if not given. (No due date, no marks.)
   - Assignment: division, subject, title, a DUE DATE, and AT LEAST ONE attached \
file. NEVER guess the due date — ask for it if the user didn't give one. Generate \
the description if not given. max_marks is OPTIONAL — only set it if the user \
states marks; otherwise don't ask.
   - Quiz: division, subject, title, and questions. If the user didn't say, ASK how \
many questions and the marks per question, and confirm the topic if it's vague — \
then YOU generate the questions and options. Time limit and max attempts are \
OPTIONAL; only set them if asked.
   - Mark attendance: you need the specific lecture and a status. Find the lecture \
with list_lectures (filter by division and date). If several lectures match, ask \
which one; if none match, tell the user there is no such lecture (you cannot create \
lectures). "mark all present" uses mark_attendance_for_all with status=present.
   - Dates must be YYYY-MM-DD. Resolve relative dates ("today", "tomorrow", "next \
Friday") against today's date given below.
5. Execute tools in the correct order and chain multi-step flows (e.g. resolve \
IDs -> create_resource -> publish_resource; or list_lectures -> roster -> \
mark attendance).

Uploading notes / assignments — IMPORTANT ordering:
- The backend REQUIRES at least one attached file; it rejects the upload with \
"At least one attachment is required" otherwise.
- A file is attached on a turn only when the message ends with \
"[The user attached N file(s): ...]". Files do NOT carry over between turns.
- So: FIRST collect every text detail and resolve the IDs. THEN, as the LAST \
step, ask the user to attach the file and resend. Call create_resource \
(attach_files=True) ONLY on the turn whose message has the attachment marker. \
Never call it before the file is attached, even if you already have all the text \
details — wait for the file.
- There is no "folder" concept; if the user mentions a folder, treat it as the \
`unit` label.

Updating / submission / report flows:
- "Update the deadline" / "change the due date" / "extend the deadline": call \
update_resource with the new `due_date` (YYYY-MM-DD). Do NOT create a new \
assignment. If the user then says "notify the students who haven't submitted", \
follow with notify_non_submitters on the SAME resource id.
- "How many students have submitted X?" / "who hasn't submitted?": use \
submission_stats(resource_id). For full lists per status, use list_submissions.
- "Show me / list the assignments I uploaded for class TE-A / for OS": call \
list_resources with kind="assignment", mine=True, and the matching division_id \
and/or subject_id. Same pattern for notes (kind="notes").
- "Get / download / export attendance PDF": resolve the scope (one lecture vs a \
whole division) and call export_lecture_roster_pdf or \
export_division_attendance_pdf. Surface the returned `url` to the user as a \
clickable link.
- "Generate a N-question assignment from chapter X notes and upload it to \
<subject>": first find the source notes with list_resources(kind="notes", ...), \
resolve the target division+subject, then call \
generate_assignment_from_notes(notes_resource_id, subject_id, division_id, \
num_questions, due_date). You MUST ask for the due date if the user didn't give \
one — never guess. The tool returns a DRAFT; confirm with the user before \
calling publish_resource.
- read_resource_text is a helper if the user asks "summarise the notes" or you \
need to inspect note content for some other reason. Don't call it as part of \
generate_assignment_from_notes — that tool reads the notes itself.

Rubric-based AI grading ("validate / grade / evaluate the submissions"):
- The full pipeline is: set_rubric -> grade_submissions_with_rubric -> review \
proposals -> publish_proposed_grades (or publish_one_grade per student).
- AI grades are PROPOSED, not published. Students do not see scores until the \
teacher publishes. Always make this explicit in your reply.
- If the assignment has no rubric and the user asks you to grade, FIRST get the \
rubric. The teacher can provide it three ways:
    (a) Type the criteria in chat ("Correctness 40% max 8, Clarity 30% max 6, \
        ..."). Parse it and call set_rubric.
    (b) Attach a rubric PDF on the same turn. Resolve the target assignment \
        first (list_resources), then call \
        parse_rubric_from_chat_attachment(resource_id) — that tool reads the \
        attached file, asks Gemini to extract criteria, and saves the rubric. \
        After it returns, summarise the parsed criteria back to the teacher so \
        they can sanity-check before grading.
    (c) Use the dashboard rubric editor (no chat tool needed).
  Never invent a rubric — the teacher must define it.
- IMPORTANT: parse_rubric_from_chat_attachment ONLY works on the SAME turn the \
file is attached (the message ends with "[The user attached N file(s): ...]"). \
Files don't carry over. If the user mentions "the rubric I uploaded" on a later \
turn with no current attachment, ask them to attach it again.
- For the chat-attached rubric flow, DO NOT also call create_resource on the \
same file — the rubric PDF is metadata, not a student-facing resource. \
parse_rubric_from_chat_attachment consumes the file directly.
- After grade_submissions_with_rubric returns, IMMEDIATELY enter the \
PERMISSION FLOW for EVERY graded submission, regardless of count (even if only \
one was graded). On THIS turn, pick the FIRST proposal that hasn't been \
decided yet and call ask_grading_permission(student_name, submission_id, \
proposed_score, max_marks, one_line_feedback, resource_id). That tool renders \
a dropdown in the chat with three choices: allow, allow_for_all, deny.

  Your text reply for this turn should be short (1-2 sentences) — the dropdown \
  is the action surface, not your text. Example: "Reviewing proposal 1 of 5. \
  Pick from the dropdown to continue." Do NOT also write \
  "(allow / allow for all / deny)" in your reply — the dropdown shows those.

  On the NEXT turn, the user's choice arrives as a system message like:
      "permission_response: allow for submission_id=<id>, student=<name>"
  Map that to one of:

    - permission_response: allow
        -> call publish_one_grade(submission_id) for this submission.
        -> then call ask_grading_permission for the NEXT pending proposal \
           (if any). If none remain, summarise the run and stop.

    - permission_response: allow_for_all
        -> call publish_proposed_grades(resource_id, submission_ids=[ALL \
           remaining submission ids, INCLUDING the one the teacher just \
           said allow_for_all on]). After it returns, summarise and stop. \
           Do NOT call ask_grading_permission again on this run.

    - permission_response: deny
        -> The user must also have provided a score (the override). It will \
           appear as "deny with score=14" or similar. Call \
           publish_one_grade(submission_id, score_override=<number>). \
           Then call ask_grading_permission for the NEXT pending proposal. \
           If the user said deny but gave no number yet, just ask them \
           "What score should I give <student name> instead?" and wait.

  Never invent a "permission_response" — it only counts if it came from the \
  user via the dropdown OR explicitly in their typed message. Never call \
  publish_one_grade or publish_proposed_grades on the same turn as \
  ask_grading_permission — the user must choose first.

- Override at any later point: if the teacher says "actually give Aarav 18 \
instead", look up his submission via list_submissions, then call \
publish_one_grade(submission_id, score_override=18).
- Never publish without an explicit instruction from the teacher. \
grade_submissions_with_rubric only PROPOSES — it never publishes.

Rules:
- New quizzes / notes / assignments are created as DRAFTS. After creating one, \
confirm what you made and then ASK the user whether they want to publish it now \
(e.g. "It's saved as a draft — do you want me to publish it?"). On the next turn, \
if the user agrees (yes / publish / release / share / go ahead), call the matching \
publish tool (publish_resource for notes & assignments, publish_quiz for quizzes) \
using the id you just created, then confirm it's published. If they decline, \
leave it as a draft and say so. Don't publish without that confirmation (unless \
the user already asked to publish in their original request).
- Never invent IDs. Only use IDs returned by tools.
- If a tool returns a value whose status is "error", do NOT silently retry the \
same call. Read the message, explain it to the user in plain language, and ask \
for whatever is needed to fix it (e.g. attach the file).
- Be concise. After acting, briefly confirm what you did (titles, counts, status) \
and surface anything the user still needs to do.
- The caller's role is {role}; the ERP enforces permissions."""


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


# Maps a session id to a replacement thread id when its original thread became
# corrupted (a dangling tool call). Lets us hand the user a clean slate without
# them needing to refresh.
_thread_overrides: dict[str, str] = {}


def _is_history_error(e: Exception) -> bool:
    text = str(e)
    return "INVALID_CHAT_HISTORY" in text or "corresponding ToolMessage" in text


def _friendly_error(e: Exception) -> str:
    text = str(e)
    if "RESOURCE_EXHAUSTED" in text or "429" in text:
        return (
            "The Gemini API rate limit / free-tier quota was hit. "
            "Please wait a minute and try again."
        )
    return f"Sorry — I hit an error carrying that out: {e}"


async def _invoke_turn(
    graph: Any,
    *,
    thread_id: str,
    user_text: str,
    principal: AuthPrincipal,
    ctx: RunContext,
) -> list[Any]:
    """Run one graph turn against a specific thread; returns the message list."""
    config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 25}

    # Send the system prompt only on a thread's first turn — the checkpointer
    # persists it, so re-sending each turn would pile up duplicate system msgs.
    turn_messages: list[Any] = []
    state = await graph.aget_state(config)
    has_history = bool(state and state.values and state.values.get("messages"))
    if not has_history:
        system = SYSTEM_PROMPT.format(role=principal.role, today=date.today().isoformat())
        turn_messages.append(("system", system))
    turn_messages.append(("user", user_text))

    with use_run_context(ctx):
        result = await graph.ainvoke({"messages": turn_messages}, config=config)
    return result.get("messages", [])


def _format_permission_response(pr: PermissionResponse) -> str:
    """Convert a dropdown selection into the structured marker the system
    prompt told the agent to expect on the next turn."""
    ctx = pr.context or {}
    sub_id = ctx.get("submission_id") or "?"
    student = ctx.get("student_name") or "?"
    if pr.value == "deny" and pr.override_score is not None:
        return (
            f"[permission_response: deny with score={pr.override_score} "
            f"for submission_id={sub_id}, student={student}]"
        )
    return (
        f"[permission_response: {pr.value} "
        f"for submission_id={sub_id}, student={student}]"
    )


async def run_agent(
    *,
    message: str,
    session_id: str,
    principal: AuthPrincipal,
    token: str,
    files: list[UploadFile] | None = None,
    permission_response: PermissionResponse | None = None,
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
    if permission_response:
        # Prepend the structured marker so the agent has it before any free-form
        # text the user may also have typed alongside the dropdown selection.
        marker = _format_permission_response(permission_response)
        user_text = f"{marker}\n{user_text}" if user_text.strip() else marker

    thread_id = _thread_overrides.get(session_id, session_id)

    # Created on first attempt; reused in retries so the side-channel state
    # the tools populate survives a thread reset.
    ctx_holder: list[RunContext] = []

    def _ctx() -> RunContext:
        c = RunContext(principal=principal, token=token, files=list(files))
        ctx_holder.append(c)
        return c

    try:
        msgs = await _invoke_turn(
            graph, thread_id=thread_id, user_text=user_text, principal=principal, ctx=_ctx()
        )
    except Exception as e:  # noqa: BLE001
        if _is_history_error(e):
            # The session's thread is corrupted — give it a clean thread and
            # retry once so the user isn't permanently stuck.
            new_thread = f"{session_id}:{uuid4().hex[:8]}"
            _thread_overrides[session_id] = new_thread
            log.warning("resetting corrupted thread", session=session_id, new_thread=new_thread)
            try:
                msgs = await _invoke_turn(
                    graph, thread_id=new_thread, user_text=user_text,
                    principal=principal, ctx=_ctx(),
                )
            except Exception as e2:  # noqa: BLE001
                log.exception("agent retry failed", session=session_id)
                return ChatResponse(reply=_friendly_error(e2), session_id=session_id)
        else:
            log.exception("agent run failed", session=session_id)
            return ChatResponse(reply=_friendly_error(e), session_id=session_id)
    reply = ""
    for m in reversed(msgs):
        # The final AIMessage with text content is the user-facing reply.
        if getattr(m, "type", None) == "ai" and getattr(m, "content", None):
            reply = m.content if isinstance(m.content, str) else str(m.content)
            break

    # Drain UI side-channels from the final run context (the latest one wins —
    # if a retry created multiple, the last one ran to completion).
    final_ctx = ctx_holder[-1] if ctx_holder else None
    return ChatResponse(
        reply=reply or "(no reply)",
        session_id=session_id,
        tools_used=[t["tool"] for t in _collect_tool_trace(msgs)],
        steps=_collect_tool_trace(msgs),
        tables=final_ctx.tables if final_ctx else [],
        attachments=final_ctx.attachments if final_ctx else [],
        navigate=final_ctx.navigate if final_ctx else None,
        permission=final_ctx.permission if final_ctx else None,
    )
