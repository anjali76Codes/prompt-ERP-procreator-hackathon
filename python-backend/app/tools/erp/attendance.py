"""Attendance tools.

Marking attendance is a multi-step flow: find the lecture, read its roster
(the student list), then post a status per student. `mark_attendance_for_all`
is a shortcut for the common "mark everyone present" case.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from langchain_core.tools import tool
from pydantic import BaseModel, Field

from app.agents.run_context import current_run_context

Status = Literal["present", "absent", "late", "excused"]


class AttendanceEntry(BaseModel):
    student_id: str = Field(description="The student's ObjectId (from the roster).")
    status: Status = Field(description="present | absent | late | excused")
    remarks: Optional[str] = Field(default=None, description="Optional note.")


@tool
async def list_lectures(
    division_id: Optional[str] = None,
    date: Optional[str] = None,
    mine: bool = False,
) -> list[dict[str, Any]]:
    """List lectures, optionally filtered by division, a date (YYYY-MM-DD), or
    `mine=True` for the caller's own lectures. Use this to find the lecture to
    mark attendance for. Returns {id, date, startTime, room, division, subject}.
    """
    params = {
        "divisionId": division_id,
        "date": date,
        "mine": "1" if mine else None,
    }
    data = await current_run_context().erp().get("/lectures", params=params)
    rows = data.get("lectures", []) if isinstance(data, dict) else []
    out = []
    for lec in rows:
        out.append(
            {
                "id": str(lec.get("_id") or lec.get("id")),
                "date": lec.get("date"),
                "startTime": lec.get("startTime"),
                "endTime": lec.get("endTime"),
                "room": lec.get("room"),
                "division": (lec.get("division") or {}).get("code")
                if isinstance(lec.get("division"), dict)
                else lec.get("division"),
                "subject": (lec.get("subject") or {}).get("name")
                if isinstance(lec.get("subject"), dict)
                else lec.get("subject"),
            }
        )
    return out


@tool
async def get_lecture_roster(lecture_id: str) -> list[dict[str, Any]]:
    """Get the student roster for a lecture (the class enrolment), with each
    student's current attendance status if already marked. Returns rows of
    {studentId, name, rollNumber, status}."""
    data = await current_run_context().erp().get(f"/lectures/{lecture_id}/roster")
    roster = data.get("roster", []) if isinstance(data, dict) else []
    out = []
    for row in roster:
        student = row.get("student", {}) or {}
        att = row.get("attendance") or {}
        out.append(
            {
                "studentId": str(student.get("_id") or student.get("id")),
                "name": student.get("name"),
                "rollNumber": student.get("rollNumber"),
                "status": att.get("status"),
            }
        )
    return out


@tool
async def mark_attendance(
    lecture_id: str, entries: list[AttendanceEntry]
) -> dict[str, Any]:
    """Mark attendance for specific students in a lecture. Get studentIds from
    get_lecture_roster first. Use mark_attendance_for_all instead when every
    student should get the same status."""
    body = {
        "entries": [
            {"student": e.student_id, "status": e.status, **({"remarks": e.remarks} if e.remarks else {})}
            for e in entries
        ]
    }
    result = await current_run_context().erp().post(
        f"/lectures/{lecture_id}/attendance", json=body
    )
    return {"marked": len(entries), "result": result}


@tool
async def mark_attendance_for_all(
    lecture_id: str, status: Status = "present"
) -> dict[str, Any]:
    """Mark the SAME status for every student in a lecture (e.g. "mark all
    present"). Fetches the roster automatically, so you don't need studentIds."""
    ctx = current_run_context()
    data = await ctx.erp().get(f"/lectures/{lecture_id}/roster")
    roster = data.get("roster", []) if isinstance(data, dict) else []
    entries = []
    for row in roster:
        student = row.get("student", {}) or {}
        sid = str(student.get("_id") or student.get("id"))
        if sid and sid != "None":
            entries.append({"student": sid, "status": status})
    if not entries:
        return {"marked": 0, "note": "Roster is empty — no students to mark."}
    result = await ctx.erp().post(f"/lectures/{lecture_id}/attendance", json={"entries": entries})
    return {"marked": len(entries), "status": status, "result": result}


@tool
async def division_attendance_stats(division_id: str) -> dict[str, Any]:
    """Get overall attendance statistics for a division."""
    return await current_run_context().erp().get(f"/divisions/{division_id}/attendance/stats")


@tool
async def student_attendance(
    student_id: Optional[str] = None, subject_id: Optional[str] = None
) -> dict[str, Any]:
    """Get a student's attendance summary. Omit `student_id` to get the caller's
    own attendance (for students). Optionally scope to one subject."""
    params = {"subjectId": subject_id}
    if student_id:
        return await current_run_context().erp().get(
            f"/students/{student_id}/attendance", params=params
        )
    return await current_run_context().erp().get("/me/attendance", params=params)
