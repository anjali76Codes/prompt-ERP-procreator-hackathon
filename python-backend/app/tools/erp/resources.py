"""Notes & assignment tools.

In the Express backend, both "notes" and "assignments" are *resources*
(`kind="notes"|"assignment"`), created via multipart upload at POST /resources.
Files the user attached to the chat turn are pulled from the run context when
`attach_files=True`.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from langchain_core.tools import tool

from app.agents.run_context import current_run_context
from app.core.logging import get_logger

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
    - `kind="assignment"` REQUIRES `due_date` (format YYYY-MM-DD); notes do not.
    - `max_marks` only makes sense for assignments.
    - `unit` is a free-text section/chapter label (e.g. "Chapter 3", "Unit II").
    - Set `attach_files=True` to upload the file(s) the user attached to this
      message. If the user said they're uploading a file but none is attached,
      ask them to attach it rather than calling this with attach_files=True.

    Returns the created resource (status defaults to "draft" — call
    publish_resource to make it visible to students).
    """
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
    return {"created": _slim(resource), "uploadedFiles": len(files)}


@tool
async def publish_resource(resource_id: str) -> dict[str, Any]:
    """Publish a draft notes/assignment so students can see it."""
    data = await current_run_context().erp().post(f"/resources/{resource_id}/publish")
    resource = data.get("resource", data) if isinstance(data, dict) else data
    return {"published": _slim(resource)}


@tool
async def list_resources(
    kind: Optional[Literal["notes", "assignment"]] = None,
    status: Optional[Literal["draft", "published"]] = None,
    division_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    mine: bool = False,
) -> list[dict[str, Any]]:
    """List notes/assignments, optionally filtered by kind, status, division,
    subject, or `mine=True` (only resources the caller created)."""
    params = {
        "kind": kind,
        "status": status,
        "divisionId": division_id,
        "subjectId": subject_id,
        "mine": "1" if mine else None,
    }
    data = await current_run_context().erp().get("/resources", params=params)
    rows = data.get("resources", []) if isinstance(data, dict) else []
    return [_slim(r) for r in rows]
