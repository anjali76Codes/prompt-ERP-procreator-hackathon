"""Composite "generate from notes" tools.

These tools chain multiple operations the agent would otherwise need to wire
together by hand (read notes text -> ask the LLM for questions -> render a PDF
-> create an assignment with that PDF attached). The agent calls one tool and
gets a finished draft back.

The LLM call inside `generate_assignment_from_notes` reuses the Gemini config
the agent itself uses (`settings.gemini_model`).
"""

from __future__ import annotations

import json
import re
from io import BytesIO
from typing import Any, Optional

from langchain_core.tools import tool
from pydantic import BaseModel, Field

from app.agents.run_context import current_run_context
from app.core.config import get_settings
from app.core.logging import get_logger
from app.tools.erp._util import erp_safe

log = get_logger("tools.generate")


class GeneratedQuestion(BaseModel):
    """One assignment question as drafted by the LLM."""

    question: str = Field(description="The question text.")
    marks: int = Field(default=5, description="Marks for this question.")
    hint: Optional[str] = Field(default=None, description="Optional hint or sub-prompt.")


def _render_assignment_pdf(
    *, title: str, instructions: str, questions: list[dict[str, Any]]
) -> bytes:
    """Render a simple, readable assignment PDF with reportlab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        Paragraph, SimpleDocTemplate, Spacer,
    )

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=title,
    )
    styles = getSampleStyleSheet()
    h1 = styles["Heading1"]
    body = styles["BodyText"]
    qstyle = ParagraphStyle(
        "QuestionStyle", parent=body, spaceBefore=12, spaceAfter=4, fontSize=11, leading=15
    )

    flow: list[Any] = [Paragraph(title, h1), Spacer(1, 0.3 * cm)]
    if instructions:
        flow.append(Paragraph(instructions.replace("\n", "<br/>"), body))
        flow.append(Spacer(1, 0.4 * cm))

    total = sum(int(q.get("marks", 0) or 0) for q in questions)
    if total:
        flow.append(Paragraph(f"<b>Total marks:</b> {total}", body))
        flow.append(Spacer(1, 0.3 * cm))

    for i, q in enumerate(questions, start=1):
        text = (q.get("question") or "").strip()
        marks = q.get("marks")
        hint = (q.get("hint") or "").strip()
        marks_str = f" <i>[{marks} marks]</i>" if marks else ""
        flow.append(Paragraph(f"<b>Q{i}.</b> {text}{marks_str}", qstyle))
        if hint:
            flow.append(Paragraph(f"<i>Hint:</i> {hint}", body))

    doc.build(flow)
    return buf.getvalue()


def _extract_json(text: str) -> Any:
    """Best-effort JSON extraction from an LLM reply (handles ```json fences)."""
    if not text:
        return None
    fence = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    candidate = fence.group(1) if fence else text
    # Trim anything before the first { or [.
    start = min(
        (i for i in (candidate.find("{"), candidate.find("[")) if i >= 0),
        default=-1,
    )
    if start > 0:
        candidate = candidate[start:]
    try:
        return json.loads(candidate)
    except Exception:  # noqa: BLE001
        return None


async def _llm_generate_questions(
    *, source_text: str, topic: str, num_questions: int, marks_per_question: int
) -> list[dict[str, Any]]:
    """Ask Gemini for `num_questions` questions grounded in `source_text`.
    Returns a list of {question, marks, hint}. Raises if the LLM is unavailable."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not set — cannot generate questions.")

    from langchain_google_genai import ChatGoogleGenerativeAI

    model = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.4,  # a bit more creative than the default agent temp
        max_output_tokens=settings.gemini_max_output_tokens,
    )

    prompt = f"""You are designing a short assignment for college students.
Topic / chapter: {topic}

Source notes (use ONLY these as ground truth; do not invent facts beyond them):
---
{source_text}
---

Write EXACTLY {num_questions} assignment questions that test understanding of \
the source notes. Mix conceptual ("explain", "describe") and applied \
("compare", "analyse", "give an example") prompts. Each question should be \
answerable in one or two paragraphs. Each question is worth \
{marks_per_question} marks.

Respond with JSON ONLY in this exact shape (no prose, no markdown fences):
{{
  "questions": [
    {{"question": "...", "marks": {marks_per_question}, "hint": "optional short hint or null"}}
  ]
}}"""
    resp = await model.ainvoke(prompt)
    content = resp.content if isinstance(resp.content, str) else str(resp.content)
    parsed = _extract_json(content)
    if isinstance(parsed, dict):
        items = parsed.get("questions") or []
    elif isinstance(parsed, list):
        items = parsed
    else:
        items = []
    out: list[dict[str, Any]] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        q = (it.get("question") or "").strip()
        if not q:
            continue
        out.append(
            {
                "question": q,
                "marks": int(it.get("marks") or marks_per_question),
                "hint": (it.get("hint") or "").strip() or None,
            }
        )
    if not out:
        raise RuntimeError("LLM returned no usable questions. Raw reply: " + content[:400])
    return out[:num_questions]


@tool
@erp_safe
async def generate_assignment_from_notes(
    notes_resource_id: str,
    subject_id: str,
    division_id: str,
    num_questions: int = 2,
    marks_per_question: int = 5,
    title: Optional[str] = None,
    due_date: Optional[str] = None,
    unit: Optional[str] = None,
    attachment_index: int = 0,
) -> dict[str, Any]:
    """Read a notes resource, generate `num_questions` assignment questions
    grounded in those notes (Gemini), render them to a PDF, and create a DRAFT
    assignment for the same division+subject with that PDF attached.

    Use this when the teacher says e.g. "generate a 2-question assignment from
    the chapter 3 notes and upload it to OS". You must already know:
      - `notes_resource_id`: from list_resources(kind="notes", ...)
      - `subject_id`, `division_id`: resolve via list_subjects / list_divisions
      - `due_date` (YYYY-MM-DD): REQUIRED — ask the user if not given
    The created assignment is a DRAFT — ask the user before publishing.
    """
    if not due_date:
        return {
            "status": "error",
            "message": "Due date is required for assignments — ask the user (YYYY-MM-DD).",
        }
    if num_questions <= 0 or num_questions > 20:
        return {"status": "error", "message": "num_questions must be between 1 and 20."}

    ctx = current_run_context()

    # 1. Read the notes attachment text.
    notes_data = await ctx.erp().get(f"/resources/{notes_resource_id}")
    notes_resource = (
        notes_data.get("resource", notes_data) if isinstance(notes_data, dict) else notes_data
    )
    notes_kind = notes_resource.get("kind") if isinstance(notes_resource, dict) else None
    if notes_kind != "notes":
        return {
            "status": "error",
            "message": "notes_resource_id must reference a resource of kind 'notes'.",
        }
    attachments = notes_resource.get("attachments") or []
    if not attachments or attachment_index >= len(attachments):
        return {"status": "error", "message": "Notes resource has no readable attachment."}

    # We can't reuse the @tool wrapper here, so inline the download+extract.
    import httpx
    from pypdf import PdfReader

    att = attachments[attachment_index]
    url = att.get("url")
    if not url:
        return {"status": "error", "message": "Attachment has no public URL."}
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        blob = resp.content

    mime = (att.get("mimeType") or "").lower()
    notes_text = ""
    if "pdf" in mime or url.lower().endswith(".pdf"):
        reader = PdfReader(BytesIO(blob))
        notes_text = "\n".join((p.extract_text() or "") for p in reader.pages)
    elif mime.startswith("text/") or url.lower().endswith((".txt", ".md")):
        notes_text = blob.decode("utf-8", errors="replace")
    else:
        return {
            "status": "error",
            "message": f"Unsupported notes attachment type: {mime or 'unknown'}.",
        }
    notes_text = (notes_text or "").strip()
    if len(notes_text) < 50:
        return {
            "status": "error",
            "message": "Notes attachment had too little extractable text.",
        }
    if len(notes_text) > 14000:
        notes_text = notes_text[:14000]

    topic = notes_resource.get("title") if isinstance(notes_resource, dict) else "the notes"
    if unit:
        topic = f"{topic} ({unit})"

    # 2. Generate questions with the LLM.
    try:
        questions = await _llm_generate_questions(
            source_text=notes_text,
            topic=topic or "the chapter",
            num_questions=num_questions,
            marks_per_question=marks_per_question,
        )
    except Exception as e:  # noqa: BLE001
        return {"status": "error", "message": f"Question generation failed: {e}"}

    # 3. Render a PDF.
    final_title = title or f"Assignment — {topic}"
    instructions = (
        f"Answer ALL {len(questions)} questions. Write in your own words; "
        f"copy/paste from the notes will not receive marks. "
        f"Submit before the deadline: {due_date}."
    )
    pdf_bytes = _render_assignment_pdf(
        title=final_title, instructions=instructions, questions=questions
    )

    # 4. Upload as a new draft assignment.
    description = (
        f"Auto-generated from notes \"{notes_resource.get('title', '')}\". "
        f"{len(questions)} question{'s' if len(questions) != 1 else ''}, "
        f"{sum(q['marks'] for q in questions)} marks total. Due {due_date}."
    )
    body: dict[str, Any] = {
        "kind": "assignment",
        "title": final_title,
        "description": description,
        "division": division_id,
        "subject": subject_id,
        "dueDate": due_date,
        "maxMarks": sum(q["marks"] for q in questions),
    }
    if unit:
        body["unit"] = unit

    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", final_title).strip("-") or "assignment"
    files = [(f"{safe_name}.pdf", pdf_bytes, "application/pdf")]
    data = await ctx.erp().post_multipart("/resources", data=body, files=files)
    created = data.get("resource", data) if isinstance(data, dict) else data

    # Surface the generated PDF inline + nav.
    created_attachments = created.get("attachments") if isinstance(created, dict) else None
    if isinstance(created_attachments, list) and created_attachments:
        att = created_attachments[0]
        if att.get("url"):
            ctx.add_attachment(
                name=att.get("name") or f"{safe_name}.pdf",
                url=att["url"],
                mime_type="application/pdf",
                size_bytes=att.get("size"),
            )
    ctx.set_navigate("Open assignments list", "/assignments/list")

    return {
        "created": {
            "id": str(created.get("_id") or created.get("id")),
            "title": created.get("title"),
            "status": created.get("status"),
            "dueDate": created.get("dueDate"),
            "maxMarks": created.get("maxMarks"),
        },
        "questions": questions,
        "sourceNotesId": notes_resource_id,
    }
