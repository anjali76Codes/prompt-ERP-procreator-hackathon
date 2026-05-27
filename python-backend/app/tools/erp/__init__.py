"""ERP tool surface exposed to the LangGraph agent.

Each module groups tools by domain. `erp_tools()` returns the flat list the
agent binds to the LLM for function calling.
"""

from __future__ import annotations

from langchain_core.tools import BaseTool

from app.tools.erp import academic, attendance, quizzes, resources


def erp_tools() -> list[BaseTool]:
    return [
        # Resolution helpers — turn human names into the ObjectIds the API needs.
        academic.list_divisions,
        academic.list_subjects,
        # Notes & assignments (resources).
        resources.create_resource,
        resources.publish_resource,
        resources.list_resources,
        # Quizzes.
        quizzes.create_quiz,
        quizzes.publish_quiz,
        quizzes.list_quizzes,
        quizzes.get_quiz,
        quizzes.quiz_metrics,
        # Attendance.
        attendance.list_lectures,
        attendance.get_lecture_roster,
        attendance.mark_attendance,
        attendance.mark_attendance_for_all,
        attendance.division_attendance_stats,
        attendance.student_attendance,
    ]
