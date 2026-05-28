"""Student-facing tools.

These wrap the Express endpoints gated on `requireRole('student')`:
  - GET  /me/resources               (the student's feed of assignments + notes)
  - POST /resources/:id/submissions/mine     (submit an assignment)
  - GET  /resources/:id/submissions/mine     (my submission for one assignment)
  - GET  /me/submissions                     (all my submissions)
  - GET  /student/quizzes                    (quizzes I can take)
  - POST /quizzes/:id/start                  (start an attempt)
  - POST /quizzes/submit                     (submit answers)

A student's own attendance is already covered by `attendance.student_attendance`
(it calls `/me/attendance` when no student_id is given), so we don't duplicate it.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from langchain_core.tools import tool
from pydantic import BaseModel, Field

from app.agents.run_context import current_run_context
from app.tools.erp._util import erp_safe


# ---------------------------------------------------------------------------
# Resources feed + submissions
# ---------------------------------------------------------------------------


def _slim_resource(r: dict[str, Any]) -> dict[str, Any]:
    subject = r.get("subject")
    return {
        "id": str(r.get("_id") or r.get("id")),
        "kind": r.get("kind"),
        "title": r.get("title"),
        "subject": subject.get("name") if isinstance(subject, dict) else subject,
        "dueDate": r.get("dueDate"),
        "maxMarks": r.get("maxMarks"),
        "status": r.get("status"),
        "attachments": len(r.get("attachments", []) or []),
    }


@tool
@erp_safe
async def list_my_assignments_and_notes(
    kind: Optional[Literal["notes", "assignment"]] = None,
    subject_id: Optional[str] = None,
) -> list[dict[str, Any]]:
    """List the published assignments and notes for the calling STUDENT's
    division. Use this when a student asks "what assignments do I have?",
    "show my notes", "what's pending?", etc.

    Filter by `kind="assignment"` or `kind="notes"` to narrow. Resolve
    `subject_id` with list_subjects first if the student named a subject.
    """
    ctx = current_run_context()
    params = {"kind": kind, "subjectId": subject_id}
    data = await ctx.erp().get("/me/resources", params=params)
    rows = data.get("resources", []) if isinstance(data, dict) else []
    slim = [_slim_resource(r) for r in rows]

    if slim:
        ctx.add_table(
            title=f"{kind.capitalize() if kind else 'Your resources'} ({len(slim)})",
            columns=["Title", "Kind", "Subject", "Due", "Marks"],
            rows=[
                [
                    r.get("title") or "",
                    r.get("kind") or "",
                    r.get("subject") or "—",
                    (r.get("dueDate") or "")[:10] if r.get("dueDate") else "—",
                    r.get("maxMarks") if r.get("maxMarks") is not None else "—",
                ]
                for r in slim
            ],
        )
    return slim


@tool
@erp_safe
async def submit_assignment(resource_id: str) -> dict[str, Any]:
    """Submit the calling STUDENT's solution for an assignment.

    The student MUST have attached a file (PDF/image/etc.) to THIS turn —
    the message ends with "[The user attached N file(s): ...]". Files do
    NOT carry over between turns; if no file is attached on this turn,
    ask the student to attach it and resend instead of calling this tool.

    Returns the created submission record (status=pending until graded).
    """
    ctx = current_run_context()
    files = ctx.take_files()
    if not files:
        return {
            "status": "error",
            "message": (
                "No file was attached this turn. Ask the student to attach "
                "their solution file and resend the message."
            ),
        }
    data = await ctx.erp().post_multipart(
        f"/resources/{resource_id}/submissions/mine", data={}, files=files
    )
    submission = data.get("submission", data) if isinstance(data, dict) else data

    # Surface the just-uploaded file in chat so the student gets visual
    # confirmation of WHAT they submitted.
    if isinstance(submission, dict):
        for att in (submission.get("attachments") or []):
            url = att.get("url")
            if not url:
                continue
            ctx.add_attachment(
                name=att.get("name") or "submission",
                url=url,
                mime_type=att.get("mimeType"),
                size_bytes=att.get("size"),
            )
        ctx.set_navigate("Open assignments", "/assignments/list")

    return {
        "submitted": True,
        "submissionId": str(submission.get("_id") or submission.get("id"))
        if isinstance(submission, dict)
        else None,
        "uploadedFiles": len(files),
        "submittedAt": submission.get("submittedAt")
        if isinstance(submission, dict)
        else None,
        "status": submission.get("status") if isinstance(submission, dict) else None,
    }


@tool
@erp_safe
async def my_submission_for_assignment(resource_id: str) -> dict[str, Any]:
    """Get the calling STUDENT's submission for ONE specific assignment —
    status, score (if graded), feedback, and attached files.

    Use this for "did I submit X?", "what did I score on the DSA
    assignment?", "show my submission for chapter 3".

    Returns {submitted: false} if the student hasn't submitted yet.
    """
    ctx = current_run_context()
    data = await ctx.erp().get(f"/resources/{resource_id}/submissions/mine")
    submission = data.get("submission") if isinstance(data, dict) else None
    if not submission:
        return {"submitted": False, "resourceId": resource_id}

    # Surface the attached file(s) so the student can re-download what they
    # submitted.
    for att in (submission.get("attachments") or []):
        url = att.get("url")
        if not url:
            continue
        ctx.add_attachment(
            name=att.get("name") or "submission",
            url=url,
            mime_type=att.get("mimeType"),
            size_bytes=att.get("size"),
        )

    return {
        "submitted": True,
        "submissionId": str(submission.get("_id") or submission.get("id")),
        "submittedAt": submission.get("submittedAt"),
        "status": submission.get("status"),
        "score": submission.get("score"),
        "gradedAt": submission.get("gradedAt"),
        "feedback": submission.get("feedback"),
        "attachments": [
            {"name": a.get("name"), "url": a.get("url")}
            for a in (submission.get("attachments") or [])
        ],
    }


@tool
@erp_safe
async def list_my_submissions() -> list[dict[str, Any]]:
    """List EVERY submission the calling STUDENT has made across all
    assignments, with status + score where graded. Use this for "show all
    my submissions", "what have I submitted?", "how am I doing overall?".
    """
    ctx = current_run_context()
    data = await ctx.erp().get("/me/submissions")
    rows = data.get("submissions", []) if isinstance(data, dict) else []

    out: list[dict[str, Any]] = []
    for s in rows:
        resource = s.get("resource") or {}
        out.append(
            {
                "submissionId": str(s.get("_id") or s.get("id")),
                "resourceId": str(resource.get("_id") or resource.get("id"))
                if isinstance(resource, dict)
                else str(resource),
                "title": resource.get("title") if isinstance(resource, dict) else None,
                "maxMarks": resource.get("maxMarks") if isinstance(resource, dict) else None,
                "submittedAt": s.get("submittedAt"),
                "status": s.get("status"),
                "score": s.get("score"),
            }
        )

    if out:
        ctx.add_table(
            title=f"Your submissions ({len(out)})",
            columns=["Assignment", "Submitted", "Status", "Score"],
            rows=[
                [
                    r.get("title") or "—",
                    (r.get("submittedAt") or "")[:10] if r.get("submittedAt") else "—",
                    r.get("status") or "—",
                    (
                        f"{r['score']}/{r['maxMarks']}"
                        if r.get("score") is not None and r.get("maxMarks") is not None
                        else r.get("score")
                        if r.get("score") is not None
                        else "—"
                    ),
                ]
                for r in out
            ],
        )
    return out


# ---------------------------------------------------------------------------
# Quizzes — student flow
# ---------------------------------------------------------------------------


def _slim_quiz(q: dict[str, Any]) -> dict[str, Any]:
    subject = q.get("subject")
    return {
        "id": str(q.get("_id") or q.get("id")),
        "title": q.get("title"),
        "subject": subject.get("name") if isinstance(subject, dict) else subject,
        "questionCount": len(q.get("questions", []) or []),
        "totalMarks": q.get("totalMarks"),
        "timeLimitMinutes": q.get("timeLimitMinutes"),
        "maxAttempts": q.get("maxAttempts"),
        "status": q.get("status"),
    }


@tool
@erp_safe
async def list_my_quizzes() -> list[dict[str, Any]]:
    """List the published quizzes available to the calling STUDENT (only
    quizzes for the student's division). Use this for "what quizzes do I
    have?", "any new quizzes?", "show me the JS quiz".
    """
    ctx = current_run_context()
    data = await ctx.erp().get("/student/quizzes")
    rows = data.get("quizzes", []) if isinstance(data, dict) else []
    slim = [_slim_quiz(q) for q in rows]

    if slim:
        ctx.add_table(
            title=f"Quizzes for you ({len(slim)})",
            columns=["Title", "Subject", "Questions", "Marks", "Time"],
            rows=[
                [
                    q.get("title") or "",
                    q.get("subject") or "—",
                    q.get("questionCount") or 0,
                    q.get("totalMarks") if q.get("totalMarks") is not None else "—",
                    f"{q['timeLimitMinutes']} min" if q.get("timeLimitMinutes") else "—",
                ]
                for q in slim
            ],
        )
    return slim


@tool
@erp_safe
async def start_quiz_attempt(quiz_id: str) -> dict[str, Any]:
    """Start a new quiz attempt for the calling STUDENT. Returns the
    `attemptId` you'll need later to submit answers.

    IMPORTANT: this endpoint does NOT return the questions. To show them
    to the student, also call `get_quiz(quiz_id)` and present the
    questions + options. Then collect the student's answers (over one or
    more turns) and call `submit_quiz_attempt`.

    Fails if the quiz is not published, the student isn't in the right
    division, or the student has used up the configured maxAttempts.
    """
    ctx = current_run_context()
    data = await ctx.erp().post(f"/quizzes/{quiz_id}/start")
    attempt = data.get("attempt", data) if isinstance(data, dict) else data
    if not isinstance(attempt, dict):
        return {"status": "error", "message": "Could not start the attempt."}
    return {
        "attemptId": str(attempt.get("_id") or attempt.get("id")),
        "quizId": quiz_id,
        "status": attempt.get("status"),
        "startedAt": attempt.get("startedAt"),
    }


class QuizAnswer(BaseModel):
    question_id: str = Field(description="ObjectId of the question (from get_quiz).")
    selected_option_ids: Optional[list[str]] = Field(
        default=None,
        description=(
            "List of option ObjectIds the student picked. For single-choice "
            "questions this is a single-element list."
        ),
    )
    text_answer: Optional[str] = Field(
        default=None,
        description="For short-answer / descriptive questions only.",
    )


@tool
@erp_safe
async def list_my_quiz_attempts() -> list[dict[str, Any]]:
    """List EVERY quiz attempt the calling STUDENT has made, newest
    first, with the quiz title, status (in_progress / submitted /
    graded / abandoned), score, and total marks per attempt.

    Use this for "what quizzes have I attempted?", "show my quiz
    history", "tell me my scores", "did I attempt the JS quiz yet?".

    If the student asks for the score on a specific quiz, find the
    matching row by title here — no need for an extra lookup.
    """
    ctx = current_run_context()
    data = await ctx.erp().get("/student/quizzes/attempts")
    rows = data.get("attempts", []) if isinstance(data, dict) else []

    def _fmt_score(r: dict[str, Any]) -> str:
        score = r.get("score")
        total = r.get("totalMarks") or 0
        if score is None:
            return "—" if r.get("status") == "in_progress" else "pending"
        return f"{score} / {total}" if total else str(score)

    if rows:
        ctx.add_table(
            title=f"Your quiz attempts ({len(rows)})",
            columns=["Quiz", "Subject", "Status", "Submitted", "Score"],
            rows=[
                [
                    r.get("quizTitle") or "—",
                    r.get("subjectLabel") or "—",
                    (r.get("status") or "—").replace("_", " "),
                    (r.get("submittedAt") or "")[:10] if r.get("submittedAt") else "—",
                    _fmt_score(r),
                ]
                for r in rows
            ],
        )
    return rows


@tool
@erp_safe
async def submit_quiz_attempt(
    quiz_id: str,
    answers: list[QuizAnswer],
    attempt_id: Optional[str] = None,
    duration_seconds: Optional[int] = None,
) -> dict[str, Any]:
    """Submit the calling STUDENT's answers for a quiz attempt.

    Prerequisites: you must have called `start_quiz_attempt` earlier (this
    or a previous turn) and have the `attempt_id` to pass here. You must
    also have collected an answer for every question — use `get_quiz` to
    iterate the questions and translate the student's chat replies
    ("A and C", "1, 3", "the third one") into the matching option
    ObjectIds.

    For MCQ-style questions set `selected_option_ids`. For short-answer
    questions set `text_answer`. Single-choice = a one-element
    `selected_option_ids` list.

    Returns the graded attempt: total score, per-question pointsAwarded,
    and whether auto-grading was possible.
    """
    ctx = current_run_context()
    body: dict[str, Any] = {
        "quizId": quiz_id,
        "answers": [
            {
                "questionId": a.question_id,
                **(
                    {"selectedOptionIds": a.selected_option_ids}
                    if a.selected_option_ids
                    else {}
                ),
                **({"textAnswer": a.text_answer} if a.text_answer else {}),
            }
            for a in answers
        ],
    }
    if attempt_id:
        body["attemptId"] = attempt_id
    if duration_seconds is not None:
        body["durationSeconds"] = duration_seconds

    data = await ctx.erp().post("/quizzes/submit", json=body)
    attempt = data.get("attempt", data) if isinstance(data, dict) else data
    if not isinstance(attempt, dict):
        return {"status": "error", "message": "Submit failed — no attempt returned."}

    return {
        "submitted": True,
        "attemptId": str(attempt.get("_id") or attempt.get("id")),
        "quizId": quiz_id,
        "score": attempt.get("score"),
        "totalMarks": attempt.get("totalMarks"),
        "status": attempt.get("status"),
        "answers": [
            {
                "questionId": str(a.get("questionId")),
                "pointsAwarded": a.get("pointsAwarded"),
                "isCorrect": a.get("isCorrect"),
            }
            for a in (attempt.get("answers") or [])
        ],
    }
