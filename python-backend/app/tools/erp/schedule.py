"""Schedule tools — what's on the teacher's plate today + cancel/restore.

The Express backend has two related models:
  - Schedule (recurring weekly template, edited at /attendance/schedules)
  - Lecture  (the concrete one-per-day instance)

These tools work on the concrete Lecture instances for "today" — the
common chat asks are "what's on today?", "cancel my 3 pm class", "put
the OS lecture back on". The recurring template lives behind the
/attendance/schedules UI and isn't editable from chat yet (no PATCH
endpoint upstream).
"""

from __future__ import annotations

from datetime import date as date_cls
from typing import Any, Optional

from langchain_core.tools import tool

from app.agents.run_context import current_run_context
from app.tools.erp._util import erp_safe


def _slim_lecture(lec: dict[str, Any]) -> dict[str, Any]:
    division = lec.get("division")
    subject = lec.get("subject")
    return {
        "id": str(lec.get("_id") or lec.get("id")),
        "date": lec.get("date"),
        "startTime": lec.get("startTime"),
        "endTime": lec.get("endTime"),
        "room": lec.get("room"),
        "status": lec.get("status"),
        "division": division.get("code") if isinstance(division, dict) else division,
        "subject": subject.get("name") if isinstance(subject, dict) else subject,
        "notes": lec.get("notes"),
    }


@tool
@erp_safe
async def get_my_schedule_today() -> list[dict[str, Any]]:
    """Return today's lectures for the calling teacher (or student),
    sorted by start time. Use this for "what's my schedule today?",
    "what classes do I have today?", "any lectures left today?".

    Each row includes the lecture id, time slot, subject, division,
    room, and status (scheduled / ongoing / completed / cancelled), so
    a follow-up "cancel my 3 pm" can be resolved without another query.
    """
    ctx = current_run_context()
    today = date_cls.today().isoformat()
    data = await ctx.erp().get("/lectures", params={"date": today, "mine": "1"})
    rows = data.get("lectures", []) if isinstance(data, dict) else []
    lectures = sorted(
        (_slim_lecture(lec) for lec in rows),
        key=lambda r: (r.get("startTime") or "00:00"),
    )

    if lectures:
        ctx.add_table(
            title=f"Your schedule for {today} ({len(lectures)})",
            columns=["Time", "Subject", "Division", "Room", "Status"],
            rows=[
                [
                    f"{r.get('startTime') or '—'}–{r.get('endTime') or '—'}",
                    r.get("subject") or "—",
                    r.get("division") or "—",
                    r.get("room") or "—",
                    r.get("status") or "scheduled",
                ]
                for r in lectures
            ],
        )
        ctx.set_navigate("Open schedule", "/attendance/schedules")
    return lectures


@tool
@erp_safe
async def cancel_lecture(lecture_id: str, note: Optional[str] = None) -> dict[str, Any]:
    """Cancel ONE specific lecture. Use this for "cancel my 3 pm class",
    "the 11 am DSA lecture is off today". Resolve the lecture id first
    with `get_my_schedule_today` — never invent it.

    `note` is an optional free-text reason that gets stored on the
    lecture (visible to students viewing the schedule).
    """
    ctx = current_run_context()
    body = {"note": note} if note else {}
    data = await ctx.erp().post(f"/lectures/{lecture_id}/cancel", json=body)
    lecture = data.get("lecture", data) if isinstance(data, dict) else data
    if not isinstance(lecture, dict):
        return {"status": "error", "message": "Cancel failed — no lecture returned."}
    ctx.set_navigate("Open schedule", "/attendance/schedules")
    return {"cancelled": _slim_lecture(lecture)}


@tool
@erp_safe
async def restore_lecture(lecture_id: str) -> dict[str, Any]:
    """Restore a previously cancelled lecture back to "scheduled". Use
    this when the teacher says "put the OS lecture back on", "actually
    we'll have the 3 pm class after all"."""
    ctx = current_run_context()
    data = await ctx.erp().post(f"/lectures/{lecture_id}/restore")
    lecture = data.get("lecture", data) if isinstance(data, dict) else data
    if not isinstance(lecture, dict):
        return {"status": "error", "message": "Restore failed — no lecture returned."}
    ctx.set_navigate("Open schedule", "/attendance/schedules")
    return {"restored": _slim_lecture(lecture)}
