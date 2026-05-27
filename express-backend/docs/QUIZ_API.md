# Quiz Management API (Backend)

This document lists the Quiz Management API endpoints implemented in the backend for frontend integration.

Base path: `/api` (router mounting follows existing project; endpoints shown relative to router)

## Auth / middleware
- All endpoints require authentication via existing `requireAuth` and `requireActiveAccount` middleware.
- Role-restricted endpoints use `requireRole('teacher'|'admin'|'student')` where indicated.

## Teacher endpoints

### Create quiz
POST /quizzes
Body: `CreateQuizInput`
{
  title, description?, division, subject, settings?, questions: [{ text, type, points, options?: [{ text, isCorrect }] }]
}
Response: 201 { quiz }

### Update quiz
PATCH /quizzes/:id
Body: partial `UpdateQuizInput` (questions array replaces existing questions)
Response: { quiz }

### Publish / Unpublish
POST /quizzes/:id/publish -> { quiz }
POST /quizzes/:id/unpublish -> { quiz }

### Delete quiz
DELETE /quizzes/:id -> 204

### List quizzes
GET /quizzes?divisionId=&subjectId=&teacherId=&status=&search=&page=&pageSize=
Response: { total, quizzes }

### Get quiz
GET /quizzes/:id -> { quiz }

### Attempts (teacher)
GET /quizzes/:id/attempts -> { attempts }
GET /quizzes/attempts/:id -> { attempt }
POST /quizzes/attempts/:id/grade
Body: { perQuestion: { [questionId]: points } }
Response: { attempt }

### Metrics
GET /quizzes/:id/metrics -> { totalAttempts, submitted, graded, avgScore, leaderboard }

## Student endpoints

### Start attempt
POST /quizzes/:id/start -> 201 { attempt }

### Submit attempt
POST /quizzes/submit
Body: { quizId, attemptId?, answers: [{ questionId, selectedOptionIds?, textAnswer? }], durationSeconds? }
Response: { attempt }

Notes
- No dummy data is used; all stats are computed from `QuizAttempt` and `Quiz` collections.
- Auto-grading currently applies to `single` and `multiple` choice question types (exact match), short/numeric require manual grading.
- Frontend should request `GET /quizzes/:id` to fetch question text and options; for student views, consider stripping `isCorrect` flags client-side or via a custom endpoint if you want to prevent exposing answers.
