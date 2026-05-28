"""ERP tool surface exposed to the LangGraph agent.

Each module groups tools by domain. `erp_tools()` returns the flat list the
agent binds to the LLM for function calling.
"""

from __future__ import annotations

from langchain_core.tools import BaseTool

from app.tools.erp import (
    academic,
    attendance,
    generate,
    grading,
    quizzes,
    resources,
    schedule,
    student,
    submissions,
    vapi_call,
    whatsapp,
)


def erp_tools() -> list[BaseTool]:
    return [
        # Resolution helpers — turn human names into the ObjectIds the API needs.
        academic.list_divisions,
        academic.list_subjects,
        # Notes & assignments (resources).
        resources.create_resource,
        resources.publish_resource,
        resources.list_resources,
        resources.get_resource,
        resources.update_resource,
        resources.notify_non_submitters,
        resources.read_resource_text,
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
        attendance.export_division_attendance_pdf,
        attendance.export_lecture_roster_pdf,
        # Submissions (viewing + per-submission grading).
        submissions.list_submissions,
        submissions.submission_stats,
        submissions.grade_submission,
        submissions.request_resubmit,
        # Composite generators.
        generate.generate_assignment_from_notes,
        # Rubric-based AI grading.
        grading.set_rubric,
        grading.parse_rubric_from_chat_attachment,
        grading.grade_submissions_with_rubric,
        grading.ask_grading_permission,
        grading.publish_proposed_grades,
        grading.publish_one_grade,
        # Student-facing flows (feed, submit, quiz attempts).
        student.list_my_assignments_and_notes,
        student.submit_assignment,
        student.my_submission_for_assignment,
        student.list_my_submissions,
        student.list_my_quizzes,
        student.list_my_quiz_attempts,
        student.start_quiz_attempt,
        student.submit_quiz_attempt,
        # WhatsApp (out-of-band notifications via n8n).
        whatsapp.send_whatsapp_message,
        # Vapi (outbound voice reminder calls).
        vapi_call.make_reminder_call,
        # Schedule — today's lectures + cancel/restore.
        schedule.get_my_schedule_today,
        schedule.cancel_lecture,
        schedule.restore_lecture,
    ]
