import { Types } from 'mongoose';
import { Quiz, type QuizDoc } from '../models/Quiz';
import { QuizAttempt, type QuizAttemptDoc } from '../models/QuizAttempt';
import { Teacher } from '../models/Teacher';
import { Student } from '../models/Student';
import { BadRequest, Forbidden, NotFound } from '../utils/http-errors';
import type { CreateQuizInput, UpdateQuizInput } from '../validators/quiz.validator';

const POPULATE = [
  { path: 'teacher', select: 'name email' },
  { path: 'division', select: 'code name year branch' },
  { path: 'subject', select: 'code name credits year' },
];

export const createQuiz = async (
  input: CreateQuizInput,
  teacherId: string
): Promise<QuizDoc> => {
  // teacher scope validation: ensure teacher exists and is allowed to publish
  const teacher = await Teacher.findById(teacherId).select(
    'divisionRefs subjectRefs'
  );

  if (!teacher) throw Forbidden('Teacher profile not found');

  const teachesDivision = teacher.divisionRefs.some(
    d => d.toString() === input.division
  );

  const teachesSubject = teacher.subjectRefs.some(
    s => s.toString() === input.subject
  );

  if (!teachesDivision) {
    throw Forbidden('You are not assigned to this division');
  }

  if (!teachesSubject) {
    throw Forbidden('You are not assigned to teach this subject');
  }

  const doc = await Quiz.create({
    title: input.title,
    description: input.description,
    teacher: teacherId,
    division: input.division,
    subject: input.subject,
    settings: input.settings || {},
    questions: input.questions || [],
    status: 'draft',
  });

  return doc.populate(POPULATE);
};

export const updateQuiz = async (
  id: string,
  input: UpdateQuizInput,
  teacherId: string
): Promise<QuizDoc> => {
  const doc = await Quiz.findById(id);

  if (!doc) throw NotFound('Quiz not found');

  if (doc.teacher.toString() !== teacherId) {
    throw Forbidden('Only owner can modify the quiz');
  }

  if (input.title !== undefined) {
    doc.title = input.title;
  }

  if (input.description !== undefined) {
    doc.description = input.description;
  }

  if (input.settings !== undefined) {
    doc.settings = {
      ...doc.settings,
      ...input.settings,
    } as any;
  }

  if (input.questions !== undefined) {
    doc.questions = input.questions as any;
  }

  if (input.status !== undefined) {
    doc.status = input.status;
  }

  await doc.save();

  return doc.populate(POPULATE);
};

export const publishQuiz = async (
  id: string,
  teacherId: string
): Promise<QuizDoc> => {
  const doc = await Quiz.findById(id);

  if (!doc) throw NotFound('Quiz not found');

  if (doc.teacher.toString() !== teacherId) {
    throw Forbidden('Only owner can publish the quiz');
  }

  if (!doc.questions || doc.questions.length === 0) {
    throw BadRequest('Cannot publish a quiz with no questions');
  }

  doc.status = 'published';

  await doc.save();

  return doc.populate(POPULATE);
};

export const unpublishQuiz = async (
  id: string,
  teacherId: string
): Promise<QuizDoc> => {
  const doc = await Quiz.findById(id);

  if (!doc) throw NotFound('Quiz not found');

  if (doc.teacher.toString() !== teacherId) {
    throw Forbidden('Only owner can unpublish the quiz');
  }

  doc.status = 'draft';

  await doc.save();

  return doc.populate(POPULATE);
};

export interface QuizListFilter {
  divisionId?: string;
  subjectId?: string;
  teacherId?: string;
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  page?: number;
  pageSize?: number;
}

export const listQuizzes = async (
  opts: QuizListFilter
): Promise<{ total: number; quizzes: QuizDoc[] }> => {
  const q: Record<string, unknown> = {};

  if (opts.divisionId) q.division = opts.divisionId;
  if (opts.subjectId) q.subject = opts.subjectId;
  if (opts.teacherId) q.teacher = opts.teacherId;
  if (opts.status) q.status = opts.status;

  if (opts.search) {
    q.title = { $regex: opts.search, $options: 'i' };
  }

  const page = opts.page && opts.page > 0 ? opts.page : 1;

  const pageSize =
    opts.pageSize && opts.pageSize > 0 ? opts.pageSize : 20;

  const total = await Quiz.countDocuments(q);

  const quizzes = await Quiz.find(q)
    .populate(POPULATE)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  return { total, quizzes };
};

export const findQuiz = async (id: string): Promise<QuizDoc> => {
  const doc = await Quiz.findById(id).populate(POPULATE);

  if (!doc) throw NotFound('Quiz not found');

  return doc;
};

export const deleteQuiz = async (
  id: string,
  teacherId: string
): Promise<void> => {
  const doc = await Quiz.findById(id);

  if (!doc) throw NotFound('Quiz not found');

  if (doc.teacher.toString() !== teacherId) {
    throw Forbidden('Only owner can delete the quiz');
  }

  await Quiz.deleteOne({ _id: id });

  // cascade attempts
  await QuizAttempt.deleteMany({ quiz: id });
};

/* ---------------- Attempt lifecycle ------------------------------------ */

export const startAttempt = async (
  quizId: string,
  studentId: string
): Promise<QuizAttemptDoc> => {
  const quiz = await Quiz.findById(quizId);

  if (!quiz) throw NotFound('Quiz not found');

  if (quiz.status !== 'published') {
    throw BadRequest('Quiz is not available');
  }

  const student = await Student.findById(studentId).select(
    'divisionRef'
  );

  if (!student) {
    throw BadRequest('Student profile not found');
  }

  // ensure student belongs to quiz division
  if (
    !student.divisionRef ||
    student.divisionRef.toString() !== quiz.division.toString()
  ) {
    throw Forbidden('You are not eligible to attempt this quiz');
  }

  // enforce max attempts
  if (quiz.settings?.maxAttempts) {
    const prev = await QuizAttempt.countDocuments({
      quiz: quizId,
      student: studentId,
    });

    if (prev >= quiz.settings.maxAttempts) {
      throw BadRequest('Maximum attempts reached');
    }
  }

  const attempt = await QuizAttempt.create({
    quiz: quizId,
    student: studentId,
    status: 'in_progress',
    startedAt: new Date(),
  });

  return attempt;
};

/** Auto-grade single/multiple choice answers. */
const autoGrade = (
  quiz: QuizDoc,
  answers: any[]
): {
  total: number;
  perQuestion: Record<string, number | undefined>;
} => {
  const per: Record<string, number | undefined> = {};

  let total = 0;

  const qMap = new Map<string, any>();

  quiz.questions.forEach(q => {
    qMap.set(q._id!.toString(), q);
  });

  for (const a of answers) {
    const q = qMap.get(a.questionId.toString());

    if (!q) {
      per[a.questionId] = undefined;
      continue;
    }

    if (q.type === 'single' || q.type === 'multiple') {
      const correctOptionIds = (q.options || [])
        .filter((o: any) => o.isCorrect)
        .map((o: any) => o._id.toString())
        .sort();

      const selected = (a.selectedOptionIds || [])
        .map((s: any) => s.toString())
        .sort();

      // award full points only if exact match
      const ok =
        JSON.stringify(correctOptionIds) ===
        JSON.stringify(selected);

      const pts = ok ? q.points : 0;

      per[a.questionId] = pts;

      total += pts;
    } else {
      // short/numeric: cannot auto-grade reliably
      per[a.questionId] = undefined;
    }
  }

  return {
    total,
    perQuestion: per,
  };
};

export const submitAttempt = async (
  quizId: string,
  studentId: string,
  answers: any[],
  durationSeconds?: number
): Promise<QuizAttemptDoc> => {
  const quiz = await Quiz.findById(quizId);

  if (!quiz) throw NotFound('Quiz not found');

  if (quiz.status !== 'published') {
    throw BadRequest('Quiz is not available');
  }

  const existing = await QuizAttempt.findOne({
    quiz: quizId,
    student: studentId,
    status: 'in_progress',
  });

  // if attempt exists use it, else create new (support resume flows)
  const attempt =
    existing ??
    new QuizAttempt({
      quiz: quizId,
      student: studentId,
      startedAt: new Date(),
    });

  attempt.answers = answers.map(a => ({
    questionId: a.questionId,
    selectedOptionIds: a.selectedOptionIds || [],
    textAnswer: a.textAnswer,
  }));

  attempt.submittedAt = new Date();
  attempt.durationSeconds = durationSeconds;
  attempt.status = 'submitted';

  // auto-grade objective questions
  const grading = autoGrade(quiz, attempt.answers as any[]);

  // apply per-question awarded points where available
  for (const ans of attempt.answers) {
    const pid = ans.questionId.toString();

    const pts = grading.perQuestion[pid];

    if (typeof pts === 'number') {
      ans.pointsAwarded = pts;
    }
  }

  // FIXED TS18048 ERROR HERE
  const autoSum = Object.values(grading.perQuestion).reduce<number>(
    (s, v) => s + (typeof v === 'number' ? v : 0),
    0
  );

  attempt.score = autoSum;

  await attempt.save();

  return attempt;
};

export const listAttempts = async (
  quizId: string
): Promise<QuizAttemptDoc[]> => {
  return QuizAttempt.find({ quiz: quizId })
    .populate([{ path: 'student', select: 'name email' }])
    .sort({ submittedAt: -1 });
};

export const findAttempt = async (
  id: string
): Promise<QuizAttemptDoc> => {
  const a = await QuizAttempt.findById(id).populate([
    { path: 'student', select: 'name email' },
  ]);

  if (!a) throw NotFound('Attempt not found');

  return a;
};

export const gradeAttempt = async (
  attemptId: string,
  teacherId: string,
  perQuestionPoints: Record<string, number>
): Promise<QuizAttemptDoc> => {
  const attempt = await QuizAttempt.findById(attemptId);

  if (!attempt) throw NotFound('Attempt not found');

  const quiz = await Quiz.findById(attempt.quiz);

  if (!quiz) throw NotFound('Quiz not found');

  if (quiz.teacher.toString() !== teacherId) {
    throw Forbidden('Only owner can grade attempts');
  }

  let total = 0;

  for (const ans of attempt.answers) {
    const key = ans.questionId.toString();

    if (perQuestionPoints[key] !== undefined) {
      ans.pointsAwarded = perQuestionPoints[key];
      total += perQuestionPoints[key];
    }
  }

  attempt.score = total;
  attempt.gradedAt = new Date();
  attempt.status = 'graded';

  await attempt.save();

  return attempt;
};

/* ---------------- Analytics ------------------------------------------------ */

export const quizMetrics = async (quizId: string) => {
  const quiz = await Quiz.findById(quizId);

  if (!quiz) throw NotFound('Quiz not found');

  const attempts = await QuizAttempt.find({ quiz: quizId });

  const totalAttempts = attempts.length;

  const submitted = attempts.filter(
    a => a.status === 'submitted' || a.status === 'graded'
  ).length;

  const graded = attempts.filter(
    a => a.status === 'graded'
  ).length;

  const avgScore =
    attempts
      .filter(a => typeof a.score === 'number')
      .reduce((s, a) => s + (a.score || 0), 0) /
    Math.max(
      1,
      attempts.filter(a => typeof a.score === 'number').length
    );

  // top performers by score
  const gradedAttempts = attempts.filter(
    a => typeof a.score === 'number'
  );

  gradedAttempts.sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  const leaderboard = gradedAttempts.slice(0, 10).map(a => ({
    student: a.student,
    score: a.score,
  }));

  return {
    totalAttempts,
    submitted,
    graded,
    avgScore: Number((avgScore || 0).toFixed(2)),
    leaderboard,
  };
};

export const listQuizzesForStudent = async (
  studentId: string
) => {
  const student = await Student.findById(studentId).select(
    'divisionRef'
  );

  if (!student || !student.divisionRef) {
    throw BadRequest('Student profile missing division');
  }

  const q = {
    division: student.divisionRef,
    status: 'published',
  } as any;

  const quizzes = await Quiz.find(q)
    .populate(POPULATE)
    .sort({ publishedAt: -1, updatedAt: -1 });

  return quizzes;
};