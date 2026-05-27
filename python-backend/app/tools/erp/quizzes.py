"""Quiz tools.

The agent itself generates the quiz questions (from a topic / chapter the user
names) and passes them here; this tool just maps them to the Express payload
shape and POSTs to /quizzes. Question types: single, multiple, short, numeric.
Only single/multiple are auto-graded by the backend.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from langchain_core.tools import tool
from pydantic import BaseModel, Field

from app.agents.run_context import current_run_context
from app.tools.erp._util import erp_safe


class QuizOption(BaseModel):
    text: str = Field(description="Option text shown to the student.")
    is_correct: bool = Field(default=False, description="True if this is a correct answer.")


class QuizQuestion(BaseModel):
    text: str = Field(description="The question prompt.")
    type: Literal["single", "multiple", "short", "numeric"] = Field(
        description="single = one correct option; multiple = several correct; "
        "short = free text; numeric = a number. Only single/multiple are auto-graded."
    )
    points: float = Field(default=1, description="Marks for this question.")
    options: list[QuizOption] = Field(
        default_factory=list,
        description="Choices for single/multiple questions. Omit for short/numeric.",
    )


def _slim(quiz: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(quiz.get("_id") or quiz.get("id")),
        "title": quiz.get("title"),
        "status": quiz.get("status"),
        "questions": len(quiz.get("questions", []) or []),
    }


@tool
@erp_safe
async def create_quiz(
    title: str,
    division_id: str,
    subject_id: str,
    questions: list[QuizQuestion],
    description: Optional[str] = None,
    time_limit_minutes: Optional[int] = None,
    max_attempts: Optional[int] = None,
) -> dict[str, Any]:
    """Create a quiz for a division + subject with the given questions.

    Resolve `division_id` and `subject_id` first via list_divisions/list_subjects.
    Generate the `questions` yourself from the topic/chapter the user names. If
    the user didn't specify how many questions, what marks each carries, or the
    difficulty, ASK before generating. The quiz is created as a draft — call
    publish_quiz to release it to students.
    """
    ctx = current_run_context()
    settings: dict[str, Any] = {}
    if time_limit_minutes is not None:
        settings["timeLimitMinutes"] = time_limit_minutes
    if max_attempts is not None:
        settings["maxAttempts"] = max_attempts

    body: dict[str, Any] = {
        "title": title,
        "division": division_id,
        "subject": subject_id,
        "questions": [
            {
                "text": q.text,
                "type": q.type,
                "points": q.points,
                "options": [{"text": o.text, "isCorrect": o.is_correct} for o in q.options],
            }
            for q in questions
        ],
    }
    if description:
        body["description"] = description
    if settings:
        body["settings"] = settings

    data = await ctx.erp().post("/quizzes", json=body)
    quiz = data.get("quiz", data) if isinstance(data, dict) else data
    return {"created": _slim(quiz)}


@tool
@erp_safe
async def publish_quiz(quiz_id: str) -> dict[str, Any]:
    """Publish a draft quiz so students can attempt it."""
    data = await current_run_context().erp().post(f"/quizzes/{quiz_id}/publish")
    quiz = data.get("quiz", data) if isinstance(data, dict) else data
    return {"published": _slim(quiz)}


@tool
@erp_safe
async def list_quizzes(
    division_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    status: Optional[Literal["draft", "published", "archived"]] = None,
    search: Optional[str] = None,
) -> dict[str, Any]:
    """List quizzes, optionally filtered by division, subject, status, or a
    title search string."""
    params = {
        "divisionId": division_id,
        "subjectId": subject_id,
        "status": status,
        "search": search,
    }
    data = await current_run_context().erp().get("/quizzes", params=params)
    rows = data.get("quizzes", []) if isinstance(data, dict) else []
    return {"total": data.get("total", len(rows)), "quizzes": [_slim(q) for q in rows]}


@tool
@erp_safe
async def get_quiz(quiz_id: str) -> dict[str, Any]:
    """Fetch one quiz with its full questions and settings."""
    data = await current_run_context().erp().get(f"/quizzes/{quiz_id}")
    return data.get("quiz", data) if isinstance(data, dict) else {"quiz": data}


@tool
@erp_safe
async def quiz_metrics(quiz_id: str) -> dict[str, Any]:
    """Fetch attempt metrics for a quiz: totalAttempts, submitted, graded,
    avgScore, and a leaderboard."""
    return await current_run_context().erp().get(f"/quizzes/{quiz_id}/metrics")
