"""Submission tools — view, count, grade student assignment submissions.

Wraps the Express endpoints under `/resources/:id/submissions` and
`/submissions/:id/...` (see `express-backend/src/routes/submission.routes.ts`).

The grading tools here cover ONE submission at a time (manual / per-student
flow). Batch rubric-based AI grading is in `app/tools/erp/grading.py`.
"""

from __future__ import annotations

from typing import Any, Optional

from langchain_core.tools import tool

from app.agents.run_context import current_run_context
from app.tools.erp._util import erp_safe


def _slim_submission(s: dict[str, Any]) -> dict[str, Any]:
    """Trim a submission doc to the fields the agent / teacher cares about."""
    student = s.get("student") or {}
    if not isinstance(student, dict):
        student = {}
    return {
        "id": str(s.get("_id") or s.get("id")),
        "studentId": str(student.get("_id") or student.get("id") or ""),
        "studentName": student.get("name"),
        "rollNumber": student.get("rollNumber"),
        "status": s.get("status"),
        "score": s.get("score"),
        "submittedAt": s.get("submittedAt"),
        "gradedAt": s.get("gradedAt"),
        "attachments": len(s.get("attachments", []) or []),
    }


@tool
@erp_safe
async def list_submissions(
    resource_id: str, status: Optional[str] = None
) -> list[dict[str, Any]]:
    """List every student submission for one assignment. `status` (optional) is
    one of: pending | graded | resubmit_requested. Returns rows of
    {id, studentName, rollNumber, status, score, submittedAt}."""
    ctx = current_run_context()
    data = await ctx.erp().get(f"/resources/{resource_id}/submissions")
    rows = data.get("submissions", []) if isinstance(data, dict) else []
    out = [_slim_submission(s) for s in rows]
    if status:
        out = [s for s in out if s.get("status") == status]

    if out:
        ctx.add_table(
            title=f"Submissions ({len(out)})",
            columns=["Student", "Roll", "Status", "Score", "Submitted"],
            rows=[
                [
                    s.get("studentName") or "—",
                    s.get("rollNumber") or "—",
                    s.get("status") or "—",
                    s.get("score") if s.get("score") is not None else "—",
                    (s.get("submittedAt") or "")[:16].replace("T", " ") if s.get("submittedAt") else "—",
                ]
                for s in out
            ],
        )
        ctx.set_navigate(
            "Open submissions review",
            f"/assignments/list/{resource_id}/review",
        )
    return out


@tool
@erp_safe
async def submission_stats(resource_id: str) -> dict[str, Any]:
    """Summarise submissions for one assignment: totals by status, plus the
    expected division roster size so you can answer "how many students have
    submitted?" / "who hasn't submitted yet?"."""
    ctx = current_run_context()
    # Submissions for this assignment.
    sub_data = await ctx.erp().get(f"/resources/{resource_id}/submissions")
    subs = sub_data.get("submissions", []) if isinstance(sub_data, dict) else []

    # Expected roster: fetch the resource to learn its division, then count
    # students enrolled in that division.
    res = await ctx.erp().get(f"/resources/{resource_id}")
    resource = res.get("resource", res) if isinstance(res, dict) else res
    division = resource.get("division") if isinstance(resource, dict) else None
    division_id = None
    if isinstance(division, dict):
        division_id = str(division.get("_id") or division.get("id"))
    elif isinstance(division, str):
        division_id = division

    roster_size: Optional[int] = None
    if division_id:
        try:
            stats = await ctx.erp().get(f"/divisions/{division_id}/attendance/stats")
            inner = stats.get("stats", stats) if isinstance(stats, dict) else {}
            roster_size = inner.get("studentsTotal") or inner.get("students")
        except Exception:  # noqa: BLE001
            roster_size = None

    by_status: dict[str, int] = {"pending": 0, "graded": 0, "resubmit_requested": 0}
    for s in subs:
        st = s.get("status") or "pending"
        by_status[st] = by_status.get(st, 0) + 1

    submitted_total = len(subs)
    not_submitted = (
        max(0, roster_size - submitted_total) if isinstance(roster_size, int) else None
    )

    stats = {
        "resourceId": resource_id,
        "title": resource.get("title") if isinstance(resource, dict) else None,
        "dueDate": resource.get("dueDate") if isinstance(resource, dict) else None,
        "rosterSize": roster_size,
        "submittedTotal": submitted_total,
        "notSubmitted": not_submitted,
        "byStatus": by_status,
    }

    ctx.add_table(
        title="Submission summary",
        columns=["Metric", "Value"],
        rows=[
            ["Assignment", stats["title"] or "—"],
            ["Due date", (stats["dueDate"] or "")[:10] if stats["dueDate"] else "—"],
            ["Class size", roster_size if roster_size is not None else "—"],
            ["Submitted", submitted_total],
            ["Not submitted", not_submitted if not_submitted is not None else "—"],
            ["Pending review", by_status.get("pending", 0)],
            ["Graded", by_status.get("graded", 0)],
            ["Resubmit requested", by_status.get("resubmit_requested", 0)],
        ],
    )
    ctx.set_navigate(
        "Open submissions review",
        f"/assignments/list/{resource_id}/review",
    )
    return stats


@tool
@erp_safe
async def grade_submission(
    submission_id: str, score: float
) -> dict[str, Any]:
    """Manually grade one student's submission (capped by the assignment's
    maxMarks). Use this for one-off corrections. For AI batch grading with a
    rubric, use grade_submissions_with_rubric instead."""
    data = await current_run_context().erp().post(
        f"/submissions/{submission_id}/grade", json={"score": score}
    )
    sub = data.get("submission", data) if isinstance(data, dict) else data
    return {"graded": _slim_submission(sub)}


@tool
@erp_safe
async def request_resubmit(submission_id: str) -> dict[str, Any]:
    """Ask the student to resubmit (clears their grade, keeps their files)."""
    data = await current_run_context().erp().post(
        f"/submissions/{submission_id}/request-resubmit"
    )
    sub = data.get("submission", data) if isinstance(data, dict) else data
    return {"resubmitRequested": _slim_submission(sub)}
