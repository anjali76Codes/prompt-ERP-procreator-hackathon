"""Rubric-based AI grading.

Workflow the tools encode:
  1. `set_rubric(resource_id, criteria, total_points, grader_notes?)`
       Teacher uploads a rubric (criteria + weights + max points). Stored on the
       Resource doc so future grading runs use it.
  2. `grade_submissions_with_rubric(resource_id)`
       Loops every submission for the assignment, downloads its attachment text,
       and asks Gemini to score it AGAINST the rubric. Results are stored as
       *proposed* grades (`reviewStatus='proposed'`) — NOT visible to students.
       Returns a summary of what was proposed.
  3. Teacher reviews proposals via the dashboard (or per-submission in chat).
  4. `publish_proposed_grades(resource_id, submission_ids?)`
       Commits proposed grades. Either all of them (omit ids) or a whitelist.

For the per-student chat permission flow, the agent calls
`grade_submissions_with_rubric` first to compute proposals, then iterates
proposals one by one asking the user "allow / deny / override", and only
publishes the approved ones.
"""

from __future__ import annotations

import json
import re
from io import BytesIO
from typing import Any, Optional

import httpx
from langchain_core.tools import tool

from app.agents.run_context import current_run_context
from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.chat import ChatPermission, ChatPermissionOption
from app.tools.erp._util import erp_safe

log = get_logger("tools.grading")


async def _save_rubric(
    resource_id: str,
    criteria: list[dict[str, Any]],
    total_points: float,
    grader_notes: Optional[str] = None,
) -> dict[str, Any]:
    """Shared HTTP write — set_rubric and parse_rubric_from_chat_attachment both call this."""
    body: dict[str, Any] = {
        "criteria": criteria,
        "totalPoints": total_points,
    }
    if grader_notes:
        body["graderNotes"] = grader_notes
    data = await current_run_context().erp().patch(
        f"/resources/{resource_id}/rubric", json=body
    )
    resource = data.get("resource", data) if isinstance(data, dict) else data
    rubric = resource.get("rubric") if isinstance(resource, dict) else None
    return {
        "rubricSet": True,
        "resourceId": resource_id,
        "totalPoints": rubric.get("totalPoints") if isinstance(rubric, dict) else None,
        "criteriaCount": len(criteria),
        "criteria": [
            {
                "name": c.get("name"),
                "maxPoints": c.get("maxPoints"),
                "weight": c.get("weight"),
                "mandatory": c.get("mandatory", False),
            }
            for c in criteria
        ],
    }


@tool
@erp_safe
async def set_rubric(
    resource_id: str,
    criteria: list[dict[str, Any]],
    total_points: float,
    grader_notes: Optional[str] = None,
) -> dict[str, Any]:
    """Attach a rubric to an assignment. `criteria` is a list of
    {name, description?, maxPoints, weight (0-100), mandatory?}.
    `grader_notes` is freeform guidance (e.g. "don't give full marks unless the
    student gives at least one original example").

    Example criteria:
      [
        {"name": "Correctness", "maxPoints": 8, "weight": 40,
         "description": "All requested concepts addressed accurately."},
        {"name": "Clarity",     "maxPoints": 6, "weight": 30, "mandatory": false},
        {"name": "Examples",    "maxPoints": 6, "weight": 30,
         "description": "At least one concrete original example."}
      ]
    """
    if not criteria:
        return {"status": "error", "message": "At least one criterion is required."}
    out = await _save_rubric(resource_id, criteria, total_points, grader_notes)
    current_run_context().set_navigate(
        "Open AI grading dashboard",
        f"/assignments/list/{resource_id}/ai-grade",
    )
    return out


async def _llm_parse_rubric(*, rubric_text: str, default_total: Optional[float]) -> dict[str, Any]:
    """Ask Gemini to convert freeform rubric text into structured JSON."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not set — cannot parse the rubric.")

    from langchain_google_genai import ChatGoogleGenerativeAI

    model = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.1,
        max_output_tokens=settings.gemini_max_output_tokens,
    )

    hint = (
        f"If the rubric doesn't state a total, use {default_total}."
        if default_total is not None
        else "If the rubric doesn't state a total, sum the criteria's maxPoints."
    )

    prompt = f"""You are converting a teacher's rubric document into structured \
JSON for an automatic grading system.

Rubric document (extracted from a PDF the teacher uploaded):
---
{rubric_text}
---

Output JSON ONLY in EXACTLY this shape (no prose, no markdown fences):
{{
  "totalPoints": <number>,
  "criteria": [
    {{
      "name": "<short label>",
      "description": "<what it checks, one sentence>",
      "maxPoints": <number>,
      "weight": <0..100>,
      "mandatory": <true|false>
    }}
  ],
  "graderNotes": "<freeform grading guidance the teacher wrote, or empty string>"
}}

Rules:
- Weights MUST sum to 100. If the rubric expresses weights as percentages, use \
those directly. If it gives raw point allocations, convert: weight = maxPoints \
/ totalPoints * 100. Adjust rounding so the sum is exactly 100.
- Mark a criterion "mandatory": true ONLY if the rubric explicitly says it is \
required / must be satisfied / disqualifying if missing.
- Put any "don't give full marks unless X" / "deduct for Y" style instructions \
into graderNotes.
- {hint}
"""
    resp = await model.ainvoke(prompt)
    content = resp.content if isinstance(resp.content, str) else str(resp.content)
    parsed = _extract_json(content)
    if not isinstance(parsed, dict):
        raise RuntimeError(f"LLM did not return JSON. Raw: {content[:400]}")
    return parsed


@tool
@erp_safe
async def parse_rubric_from_chat_attachment(
    resource_id: str, default_total_points: Optional[float] = None
) -> dict[str, Any]:
    """Read the rubric PDF the teacher just attached to THIS chat turn, parse
    it into structured criteria with Gemini, and save it on the assignment.

    Call this when the teacher uploads a rubric file in chat and says
    something like "here's the rubric for <assignment>" / "use this rubric to
    grade <assignment>".

    Requirements:
      - The teacher must have attached at least one file on THIS turn (the
        message will end with "[The user attached N file(s): ...]"). Files do
        NOT carry over from previous turns.
      - The file should be a PDF (preferred) or a plain-text file.
      - The target assignment `resource_id` must already exist.

    Returns the parsed rubric: total points, criteria with weights, and any
    grader notes. After this, the agent should confirm with the teacher and
    then call grade_submissions_with_rubric.
    """
    ctx = current_run_context()
    files = ctx.take_files()
    if not files:
        return {
            "status": "error",
            "message": (
                "No file was attached to this turn. Ask the teacher to attach the "
                "rubric PDF and resend their message."
            ),
        }

    # Use the first attached file. Multiple rubrics in one turn doesn't make sense.
    filename, blob, mime = files[0]
    mime_l = (mime or "").lower()

    rubric_text = ""
    if "pdf" in mime_l or filename.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(blob))
            rubric_text = "\n".join((p.extract_text() or "") for p in reader.pages)
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": f"Could not parse PDF: {e}"}
    elif mime_l.startswith("text/") or filename.lower().endswith((".txt", ".md")):
        try:
            rubric_text = blob.decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": f"Could not decode text file: {e}"}
    else:
        return {
            "status": "error",
            "message": f"Unsupported rubric file type: {mime or 'unknown'}. Use PDF or text.",
        }

    rubric_text = (rubric_text or "").strip()
    if len(rubric_text) < 30:
        return {
            "status": "error",
            "message": "The attached file had no extractable text — is it a scanned image?",
        }
    if len(rubric_text) > 14000:
        rubric_text = rubric_text[:14000]

    try:
        parsed = await _llm_parse_rubric(
            rubric_text=rubric_text, default_total=default_total_points
        )
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": f"Rubric parsing failed: {e}"}

    raw_criteria = parsed.get("criteria") or []
    criteria: list[dict[str, Any]] = []
    for c in raw_criteria:
        if not isinstance(c, dict):
            continue
        name = (c.get("name") or "").strip()
        if not name:
            continue
        criteria.append(
            {
                "name": name[:120],
                "description": (c.get("description") or "").strip()[:2000] or None,
                "maxPoints": float(c.get("maxPoints") or 0),
                "weight": float(c.get("weight") or 0),
                "mandatory": bool(c.get("mandatory", False)),
            }
        )
    if not criteria:
        return {
            "status": "error",
            "message": "The LLM didn't find any usable criteria in the rubric file.",
        }

    # Normalise weights to sum to 100 if they're close.
    weight_sum = sum(c["weight"] for c in criteria)
    if weight_sum > 0 and abs(weight_sum - 100) > 0.5:
        scale = 100.0 / weight_sum
        for c in criteria:
            c["weight"] = round(c["weight"] * scale, 2)

    total_points = parsed.get("totalPoints")
    if not isinstance(total_points, (int, float)) or total_points <= 0:
        total_points = default_total_points or sum(c["maxPoints"] for c in criteria)

    grader_notes = (parsed.get("graderNotes") or "").strip() or None

    saved = await _save_rubric(
        resource_id, criteria, float(total_points), grader_notes
    )
    saved["source"] = {"filename": filename, "chars": len(rubric_text)}
    saved["graderNotes"] = grader_notes
    return saved


def _extract_json(text: str) -> Any:
    """Best-effort JSON extraction from an LLM reply."""
    if not text:
        return None
    fence = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    candidate = fence.group(1) if fence else text
    start = min(
        (i for i in (candidate.find("{"), candidate.find("[")) if i >= 0), default=-1
    )
    if start > 0:
        candidate = candidate[start:]
    try:
        return json.loads(candidate)
    except Exception:  # noqa: BLE001
        return None


async def _download_submission_text(
    attachments: list[dict[str, Any]], max_chars: int = 12000
) -> tuple[str, list[str]]:
    """Concatenate text extracted from a submission's attachments.

    Returns (text, flags). Flags include 'blank' if no extractable content, or
    'unreadable' if every attachment is in an unsupported format.
    """
    if not attachments:
        return "", ["blank"]

    from pypdf import PdfReader

    parts: list[str] = []
    unreadable = 0
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        for att in attachments:
            url = att.get("url")
            if not url:
                continue
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                blob = resp.content
            except httpx.HTTPError:
                unreadable += 1
                continue
            mime = (att.get("mimeType") or "").lower()
            if "pdf" in mime or url.lower().endswith(".pdf"):
                try:
                    reader = PdfReader(BytesIO(blob))
                    page_text = "\n".join((p.extract_text() or "") for p in reader.pages)
                    if page_text.strip():
                        parts.append(page_text)
                    else:
                        unreadable += 1
                except Exception:  # noqa: BLE001
                    unreadable += 1
            elif mime.startswith("text/") or url.lower().endswith((".txt", ".md")):
                try:
                    parts.append(blob.decode("utf-8", errors="replace"))
                except Exception:  # noqa: BLE001
                    unreadable += 1
            else:
                unreadable += 1

    text = "\n\n---\n\n".join(p.strip() for p in parts if p.strip()).strip()
    flags: list[str] = []
    if not text:
        flags.append("unreadable" if unreadable > 0 else "blank")
    if len(text) > max_chars:
        text = text[:max_chars]
    return text, flags


async def _llm_score_one(
    *, assignment_title: str, assignment_description: str, rubric: dict[str, Any],
    student_name: str, submission_text: str, is_late: bool,
) -> dict[str, Any]:
    """Ask Gemini to score one submission against the rubric. Returns a dict
    matching the propose-grade payload (minus model/proposedBy, set by caller).
    Raises on unrecoverable LLM failure."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not set — cannot run AI grading.")

    from langchain_google_genai import ChatGoogleGenerativeAI

    model = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.2,
        max_output_tokens=settings.gemini_max_output_tokens,
    )

    criteria = rubric.get("criteria") or []
    total_points = rubric.get("totalPoints")
    grader_notes = rubric.get("graderNotes") or ""

    rubric_block = "\n".join(
        f"- {c['name']} (max {c['maxPoints']}, weight {c['weight']}%)"
        + (f", MANDATORY" if c.get("mandatory") else "")
        + (f": {c['description']}" if c.get("description") else "")
        for c in criteria
    )

    prompt = f"""You are grading one student's submission for an assignment, \
using the rubric below. Be fair but rigorous; do not give full marks unless \
the answer fully meets every criterion. Reward understanding over keyword \
matching; ignore surface style; penalise factual errors, omissions, and \
blank/AI-generated/copied content.

Assignment: {assignment_title}
Brief: {assignment_description}

Rubric (total {total_points} points):
{rubric_block}

Grader notes from the teacher: {grader_notes or "(none)"}

Student: {student_name}
Submission text (extracted from their uploaded files):
---
{submission_text or "(empty or unreadable)"}
---

Submission was {'LATE' if is_late else 'on time'}.

Respond with JSON ONLY in EXACTLY this shape (no prose, no markdown fences):
{{
  "rubricBreakdown": [
    {{
      "name": "<criterion name as given>",
      "score": <0..maxPoints>,
      "maxPoints": <maxPoints>,
      "weight": <weight>,
      "feedback": "<one-sentence justification>",
      "mandatorySatisfied": <true|false|null>
    }}
  ],
  "proposedScore": <weighted total, 0..{total_points}>,
  "feedback": "<2-3 sentence overall feedback>",
  "strengths": ["..."],
  "improvements": ["..."],
  "flags": [<subset of: "late", "blank", "plagiarism_suspected", "ai_generated_suspected", "unreadable">]
}}

Compute proposedScore as: sum over criteria of (score / maxPoints * weight),
clamped to [0, {total_points}]. Include "late" in flags ONLY if the submission \
was late. Include "blank" or "unreadable" if there's nothing meaningful to grade."""
    resp = await model.ainvoke(prompt)
    content = resp.content if isinstance(resp.content, str) else str(resp.content)
    parsed = _extract_json(content)
    if not isinstance(parsed, dict):
        raise RuntimeError(f"LLM did not return JSON. Raw: {content[:300]}")

    breakdown_raw = parsed.get("rubricBreakdown") or []
    breakdown: list[dict[str, Any]] = []
    for crit in criteria:
        match = next(
            (b for b in breakdown_raw if isinstance(b, dict) and b.get("name") == crit["name"]),
            None,
        )
        row: dict[str, Any] = {
            "name": crit["name"],
            "maxPoints": float(crit["maxPoints"]),
            "weight": float(crit["weight"]),
        }
        if match:
            row["score"] = max(0.0, min(float(match.get("score", 0) or 0), float(crit["maxPoints"])))
            if match.get("feedback"):
                row["feedback"] = str(match["feedback"])[:1500]
            if "mandatorySatisfied" in match and match["mandatorySatisfied"] is not None:
                row["mandatorySatisfied"] = bool(match["mandatorySatisfied"])
        else:
            row["score"] = 0.0
        breakdown.append(row)

    # Recompute proposed score from the breakdown so it matches the rubric math.
    computed = 0.0
    for row in breakdown:
        if row["maxPoints"] > 0:
            computed += (row["score"] / row["maxPoints"]) * row["weight"]
    # Convert from weighted-percent to absolute points.
    if total_points and isinstance(total_points, (int, float)) and total_points > 0:
        weight_total = sum(c.get("weight", 0) for c in criteria) or 100
        proposed_score = (computed / weight_total) * float(total_points)
    else:
        proposed_score = computed
    proposed_score = max(0.0, min(proposed_score, float(total_points or proposed_score)))

    flags = [f for f in (parsed.get("flags") or []) if isinstance(f, str)]
    if is_late and "late" not in flags:
        flags.append("late")

    return {
        "proposedScore": round(proposed_score, 2),
        "rubricBreakdown": breakdown,
        "feedback": str(parsed.get("feedback") or "")[:4000],
        "strengths": [s for s in (parsed.get("strengths") or []) if isinstance(s, str)][:8],
        "improvements": [s for s in (parsed.get("improvements") or []) if isinstance(s, str)][:8],
        "flags": flags,
    }


@tool
@erp_safe
async def grade_submissions_with_rubric(
    resource_id: str, limit: Optional[int] = None
) -> dict[str, Any]:
    """Run AI grading on every pending submission for an assignment using its
    rubric. Stores results as PROPOSED grades (not published — students don't
    see them yet). Run set_rubric first if the assignment has no rubric.

    `limit`: cap how many submissions to grade (useful for spot-checks).

    Returns a summary {graded, skipped, failed, proposals: [{submissionId,
    studentName, proposedScore, flags}]} which the agent should show the user
    so they can decide whether to publish (use publish_proposed_grades) or
    review on the dashboard.
    """
    ctx = current_run_context()

    # 1. Fetch the assignment + its rubric.
    res_data = await ctx.erp().get(f"/resources/{resource_id}")
    resource = res_data.get("resource", res_data) if isinstance(res_data, dict) else res_data
    if not isinstance(resource, dict):
        return {"status": "error", "message": "Could not load the assignment."}
    if resource.get("kind") != "assignment":
        return {"status": "error", "message": "Only assignments can be graded."}
    rubric = resource.get("rubric")
    if not rubric or not rubric.get("criteria"):
        return {
            "status": "error",
            "message": "This assignment has no rubric yet. Call set_rubric first.",
        }

    due_date_str = resource.get("dueDate")
    from datetime import datetime, timezone

    due_dt = None
    if isinstance(due_date_str, str):
        try:
            due_dt = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
        except Exception:  # noqa: BLE001
            due_dt = None

    # 2. Fetch every submission to grade. Re-grading already-published ones is a
    #    common request, so we grade them too but the teacher can opt out by
    #    only publishing what they want.
    sub_data = await ctx.erp().get(f"/resources/{resource_id}/submissions")
    subs = sub_data.get("submissions", []) if isinstance(sub_data, dict) else []
    if limit:
        subs = subs[: int(limit)]

    proposals: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    skipped = 0

    title = resource.get("title") or "Assignment"
    description = resource.get("description") or ""
    model_name = get_settings().gemini_model

    for sub in subs:
        sub_id = str(sub.get("_id") or sub.get("id"))
        student = sub.get("student") or {}
        if not isinstance(student, dict):
            student = {}
        student_name = student.get("name") or "Student"
        attachments = sub.get("attachments") or []
        submitted_at = sub.get("submittedAt")
        is_late = False
        if due_dt and isinstance(submitted_at, str):
            try:
                submitted_dt = datetime.fromisoformat(submitted_at.replace("Z", "+00:00"))
                is_late = submitted_dt > due_dt
            except Exception:  # noqa: BLE001
                is_late = False

        try:
            text, blank_flags = await _download_submission_text(attachments)
            if not text and "blank" in blank_flags:
                # Still record a zero proposal so the teacher can see it.
                proposal_body = {
                    "proposedScore": 0.0,
                    "rubricBreakdown": [
                        {
                            "name": c["name"],
                            "score": 0.0,
                            "maxPoints": float(c["maxPoints"]),
                            "weight": float(c["weight"]),
                        }
                        for c in rubric.get("criteria", [])
                    ],
                    "feedback": "No readable content was submitted.",
                    "strengths": [],
                    "improvements": ["Resubmit the assignment with your answers."],
                    "flags": blank_flags + (["late"] if is_late else []),
                    "model": model_name,
                    "proposedBy": "ai",
                }
            else:
                scored = await _llm_score_one(
                    assignment_title=title,
                    assignment_description=description,
                    rubric=rubric,
                    student_name=student_name,
                    submission_text=text,
                    is_late=is_late,
                )
                scored["model"] = model_name
                scored["proposedBy"] = "ai"
                proposal_body = scored
        except Exception as e:  # noqa: BLE001
            log.warning("grading failed", submission_id=sub_id, error=str(e))
            failed.append({"submissionId": sub_id, "studentName": student_name, "error": str(e)})
            continue

        try:
            saved = await ctx.erp().post(
                f"/submissions/{sub_id}/propose", json=proposal_body
            )
            saved_sub = saved.get("submission", saved) if isinstance(saved, dict) else saved
            saved_proposal = (
                saved_sub.get("proposal") if isinstance(saved_sub, dict) else None
            )
            proposals.append(
                {
                    "submissionId": sub_id,
                    "studentName": student_name,
                    "proposedScore": (
                        saved_proposal.get("proposedScore")
                        if isinstance(saved_proposal, dict)
                        else proposal_body["proposedScore"]
                    ),
                    "flags": proposal_body.get("flags", []),
                }
            )
        except Exception as e:  # noqa: BLE001
            log.warning("propose save failed", submission_id=sub_id, error=str(e))
            failed.append({"submissionId": sub_id, "studentName": student_name, "error": str(e)})

    ctx.set_navigate(
        "Open AI grading dashboard",
        f"/assignments/list/{resource_id}/ai-grade",
    )
    if proposals:
        ctx.add_table(
            title=f"Proposed grades ({len(proposals)})",
            columns=["Student", "Proposed", "Flags"],
            rows=[
                [
                    p.get("studentName") or "—",
                    p.get("proposedScore") if p.get("proposedScore") is not None else "—",
                    ", ".join(p.get("flags") or []) or "—",
                ]
                for p in proposals
            ],
        )
    return {
        "resourceId": resource_id,
        "graded": len(proposals),
        "failed": len(failed),
        "skipped": skipped,
        "proposals": proposals,
        "failures": failed,
        "nextSteps": (
            "For EACH proposal, call ask_grading_permission so the teacher can pick "
            "allow / allow_for_all / deny via the dropdown. Don't publish yet."
        ),
    }


@tool
@erp_safe
async def publish_proposed_grades(
    resource_id: str, submission_ids: Optional[list[str]] = None
) -> dict[str, Any]:
    """Publish proposed grades for an assignment. Omit `submission_ids` to
    publish ALL proposed grades; pass a whitelist to publish only some.
    After publishing, students see their score + feedback."""
    body: dict[str, Any] = {}
    if submission_ids:
        body["submissionIds"] = submission_ids
    data = await current_run_context().erp().post(
        f"/resources/{resource_id}/publish-grades", json=body
    )
    return data if isinstance(data, dict) else {"result": data}


@tool
@erp_safe
async def publish_one_grade(
    submission_id: str, score_override: Optional[float] = None
) -> dict[str, Any]:
    """Publish ONE submission's proposed grade, optionally overriding the score.
    Use this in the interactive-permission flow when the user says e.g.
    "deny — give 12 instead" (pass `score_override=12`)."""
    body: dict[str, Any] = {}
    if score_override is not None:
        body["scoreOverride"] = score_override
    data = await current_run_context().erp().post(
        f"/submissions/{submission_id}/publish-grade", json=body
    )
    sub = data.get("submission", data) if isinstance(data, dict) else data
    return {
        "published": True,
        "submissionId": submission_id,
        "score": sub.get("score") if isinstance(sub, dict) else None,
    }


@tool
@erp_safe
async def ask_grading_permission(
    student_name: str,
    submission_id: str,
    proposed_score: float,
    max_marks: float,
    one_line_feedback: str,
    resource_id: str,
) -> dict[str, Any]:
    """Pause the conversation and show the teacher a permission dropdown for
    ONE student's proposed grade. The frontend renders a dropdown with three
    options: allow, allow_for_all, deny.

    After calling this, DO NOT call publish_one_grade in the same turn. Instead,
    end your message with a short note like "Use the dropdown below to choose."
    On the NEXT turn the teacher's choice will arrive as
    `permission_response: <value> for <submission_id>`; THEN call the
    appropriate publish/override tool.

    Always call this once per student you want to grade, in sequence. Even if
    only one submission was graded, still call it.
    """
    ctx = current_run_context()
    prompt = (
        f"{student_name} — proposed {proposed_score}/{max_marks}. "
        f"{one_line_feedback}"
    )
    ctx.set_permission(
        ChatPermission(
            prompt=prompt,
            options=[
                ChatPermissionOption(
                    value="allow",
                    label="Allow",
                    description="Publish this proposed grade as-is.",
                ),
                ChatPermissionOption(
                    value="allow_for_all",
                    label="Allow for all",
                    description="Publish this grade AND every other remaining proposal without asking again.",
                ),
                ChatPermissionOption(
                    value="deny",
                    label="Deny + override",
                    description="Don't accept the AI's score — provide a different one.",
                ),
            ],
            context={
                "submission_id": submission_id,
                "resource_id": resource_id,
                "student_name": student_name,
                "proposed_score": proposed_score,
                "max_marks": max_marks,
            },
        )
    )
    return {
        "awaiting": "permission_choice",
        "studentName": student_name,
        "submissionId": submission_id,
    }
