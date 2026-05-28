"""Notes & assignment tools.

In the Express backend, both "notes" and "assignments" are *resources*
(`kind="notes"|"assignment"`), created via multipart upload at POST /resources.
Files the user attached to the chat turn are pulled from the run context when
`attach_files=True`.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any, Literal, Optional

import httpx
from langchain_core.tools import tool

from app.agents.run_context import current_run_context
from app.core.logging import get_logger
from app.tools.erp._util import erp_safe

log = get_logger("tools.resources")


def _slim(resource: dict[str, Any]) -> dict[str, Any]:
    """Trim a resource doc to the fields worth showing the user."""
    return {
        "id": str(resource.get("_id") or resource.get("id")),
        "kind": resource.get("kind"),
        "title": resource.get("title"),
        "status": resource.get("status"),
        "dueDate": resource.get("dueDate"),
        "attachments": len(resource.get("attachments", []) or []),
    }


@tool
@erp_safe
async def get_resource(resource_id: str) -> dict[str, Any]:
    """Fetch the full details of one notes/assignment, including its attached
    files. Use this when the user asks for the contents / details of a specific
    assignment ("show me the OS assignment", "get the chapter 3 notes PDF").

    Returns title, description, dueDate, maxMarks, and the list of attachments.
    The PDF/file previews show up inline in the chat so the teacher can read
    the document without leaving the conversation.
    """
    ctx = current_run_context()
    data = await ctx.erp().get(f"/resources/{resource_id}")
    resource = data.get("resource", data) if isinstance(data, dict) else data
    if not isinstance(resource, dict):
        return {"status": "error", "message": "Resource not found."}

    attachments = resource.get("attachments") or []
    for att in attachments:
        url = att.get("url")
        if not url:
            continue
        ctx.add_attachment(
            name=att.get("name") or "file",
            url=url,
            mime_type=att.get("mimeType"),
            size_bytes=att.get("size"),
        )

    kind = resource.get("kind")
    if kind == "assignment":
        ctx.set_navigate(
            "Open review page",
            f"/assignments/list/{resource_id}/review",
        )
    elif kind == "notes":
        ctx.set_navigate("Open notes list", "/assignments/notes")

    return {
        "id": str(resource.get("_id") or resource.get("id")),
        "kind": kind,
        "title": resource.get("title"),
        "description": resource.get("description"),
        "status": resource.get("status"),
        "dueDate": resource.get("dueDate"),
        "maxMarks": resource.get("maxMarks"),
        "unit": resource.get("unit"),
        "attachments": [
            {"name": a.get("name"), "url": a.get("url"), "mimeType": a.get("mimeType")}
            for a in attachments
        ],
    }


@tool
@erp_safe
async def create_resource(
    kind: Literal["notes", "assignment"],
    title: str,
    description: str,
    division_id: str,
    subject_id: str,
    due_date: Optional[str] = None,
    max_marks: Optional[float] = None,
    unit: Optional[str] = None,
    attach_files: bool = False,
) -> dict[str, Any]:
    """Create a notes or assignment resource for a division + subject.

    Resolve `division_id` and `subject_id` first via list_divisions/list_subjects.
    - `kind="assignment"` REQUIRES `due_date` (format YYYY-MM-DD) AND
      `max_marks` (total marks). Ask the user for these if they didn't give
      them — do NOT guess defaults.
    - `unit` is a free-text section/chapter label (e.g. "Chapter 3", "Unit II").
    - Set `attach_files=True` to upload the file(s) the user attached to this
      message. If the user said they're uploading a file but none is attached,
      ask them to attach it rather than calling this with attach_files=True.

    Returns the created resource (status defaults to "draft" — call
    publish_resource to make it visible to students).
    """
    if kind == "assignment" and (max_marks is None or max_marks <= 0):
        return {
            "status": "error",
            "message": (
                "Total marks (max_marks) is required for assignments. Ask the "
                "teacher: \"What's the total marks for this assignment?\""
            ),
        }
    ctx = current_run_context()
    body: dict[str, Any] = {
        "kind": kind,
        "title": title,
        "description": description,
        "division": division_id,
        "subject": subject_id,
    }
    if due_date:
        body["dueDate"] = due_date
    if max_marks is not None:
        body["maxMarks"] = max_marks
    if unit:
        body["unit"] = unit

    files = ctx.take_files() if attach_files else []
    data = await ctx.erp().post_multipart("/resources", data=body, files=files)
    resource = data.get("resource", data) if isinstance(data, dict) else data
    rid = str(resource.get("_id") or resource.get("id")) if isinstance(resource, dict) else None

    # Surface the just-uploaded files in chat so the teacher gets a visual
    # confirmation of WHAT was uploaded — same UX as the "Your PDF file is
    # ready" card you'd see in other AI chat apps.
    if isinstance(resource, dict):
        for att in (resource.get("attachments") or []):
            url = att.get("url")
            if not url:
                continue
            ctx.add_attachment(
                name=att.get("name") or "file",
                url=url,
                mime_type=att.get("mimeType"),
                size_bytes=att.get("size"),
            )

    if rid:
        if kind == "assignment":
            ctx.set_navigate("View on assignments list", "/assignments/list")
        else:
            ctx.set_navigate("View on notes list", "/assignments/notes")
    return {"created": _slim(resource), "uploadedFiles": len(files)}


@tool
@erp_safe
async def publish_resource(resource_id: str) -> dict[str, Any]:
    """Publish a draft notes/assignment so students can see it."""
    ctx = current_run_context()
    data = await ctx.erp().post(f"/resources/{resource_id}/publish")
    resource = data.get("resource", data) if isinstance(data, dict) else data
    if isinstance(resource, dict) and resource.get("kind") == "assignment":
        ctx.set_navigate("Open assignments list", "/assignments/list")
    else:
        ctx.set_navigate("Open notes list", "/assignments/notes")
    return {"published": _slim(resource)}


@tool
@erp_safe
async def list_resources(
    kind: Optional[Literal["notes", "assignment"]] = None,
    status: Optional[Literal["draft", "published"]] = None,
    division_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    mine: bool = False,
) -> list[dict[str, Any]]:
    """List notes/assignments, optionally filtered by kind, status, division,
    subject, or `mine=True` (only resources the caller created)."""
    ctx = current_run_context()
    params = {
        "kind": kind,
        "status": status,
        "divisionId": division_id,
        "subjectId": subject_id,
        "mine": "1" if mine else None,
    }
    data = await ctx.erp().get("/resources", params=params)
    rows = data.get("resources", []) if isinstance(data, dict) else []
    slim = [_slim(r) for r in rows]

    # Render the list as a table in the chat surface.
    if slim:
        ctx.add_table(
            title=f"{kind.capitalize() if kind else 'Resources'} ({len(slim)})",
            columns=["Title", "Kind", "Status", "Due", "Files"],
            rows=[
                [
                    r.get("title") or "",
                    r.get("kind") or "",
                    r.get("status") or "",
                    (r.get("dueDate") or "")[:10] if r.get("dueDate") else "—",
                    r.get("attachments") or 0,
                ]
                for r in slim
            ],
        )
        if kind == "assignment" or any(r.get("kind") == "assignment" for r in slim):
            ctx.set_navigate("Open assignments list", "/assignments/list")
        elif kind == "notes":
            ctx.set_navigate("Open notes list", "/assignments/notes")
    return slim


@tool
@erp_safe
async def update_resource(
    resource_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    max_marks: Optional[float] = None,
    unit: Optional[str] = None,
) -> dict[str, Any]:
    """Update a notes/assignment. Use this to CHANGE THE DEADLINE
    (`due_date`, YYYY-MM-DD) or `max_marks` of an existing assignment, or
    fix a title / description / unit label. Only fields you pass are changed."""
    body: dict[str, Any] = {}
    if title is not None:
        body["title"] = title
    if description is not None:
        body["description"] = description
    if due_date is not None:
        body["dueDate"] = due_date
    if max_marks is not None:
        body["maxMarks"] = max_marks
    if unit is not None:
        body["unit"] = unit
    if not body:
        return {"status": "error", "message": "Nothing to update — pass at least one field."}
    data = await current_run_context().erp().patch(f"/resources/{resource_id}", json=body)
    resource = data.get("resource", data) if isinstance(data, dict) else data
    return {"updated": _slim(resource)}


@tool
@erp_safe
async def notify_non_submitters(
    resource_id: str, message: Optional[str] = None
) -> dict[str, Any]:
    """Notify every student in the assignment's division who hasn't submitted
    yet. Posts an in-app notification. `message` is optional; a sensible default
    referencing the assignment title + new deadline is used otherwise."""
    body: dict[str, Any] = {}
    if message:
        body["message"] = message
    data = await current_run_context().erp().post(
        f"/resources/{resource_id}/notify-non-submitters", json=body
    )
    return data if isinstance(data, dict) else {"result": data}


@tool
@erp_safe
async def read_resource_text(
    resource_id: str, attachment_index: int = 0, max_chars: int = 12000
) -> dict[str, Any]:
    """Download one attachment of a notes/assignment and extract its TEXT.
    Use this BEFORE generating a quiz/assignment from notes — feed the returned
    `text` into your next reasoning step.

    `attachment_index` picks which file (0 = first). PDFs are parsed with pypdf;
    plain-text files are returned as-is. Returns {title, attachmentName, text,
    truncated}. Truncates to `max_chars` to stay friendly to the LLM context.
    """
    ctx = current_run_context()
    data = await ctx.erp().get(f"/resources/{resource_id}")
    resource = data.get("resource", data) if isinstance(data, dict) else data
    attachments = resource.get("attachments") if isinstance(resource, dict) else None
    if not attachments:
        return {"status": "error", "message": "This resource has no attachments."}
    if attachment_index < 0 or attachment_index >= len(attachments):
        return {
            "status": "error",
            "message": f"attachment_index out of range (have {len(attachments)} files).",
        }
    att = attachments[attachment_index]
    url = att.get("url")
    if not url:
        return {"status": "error", "message": "Attachment has no public URL."}

    # Cloudinary URLs are public — no auth headers required.
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            blob = resp.content
    except httpx.HTTPError as e:
        return {"status": "error", "message": f"Could not download attachment: {e}"}

    mime = (att.get("mimeType") or "").lower()
    text = ""
    if "pdf" in mime or url.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(blob))
            text = "\n".join((p.extract_text() or "") for p in reader.pages)
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": f"Failed to parse PDF: {e}"}
    elif mime.startswith("text/") or url.lower().endswith((".txt", ".md")):
        try:
            text = blob.decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": f"Failed to decode text: {e}"}
    else:
        return {
            "status": "error",
            "message": f"Unsupported attachment type: {mime or 'unknown'}. Only PDF/text are supported.",
        }

    truncated = False
    if len(text) > max_chars:
        text = text[:max_chars]
        truncated = True

    return {
        "resourceId": resource_id,
        "title": resource.get("title") if isinstance(resource, dict) else None,
        "attachmentName": att.get("name"),
        "text": text.strip(),
        "truncated": truncated,
    }
