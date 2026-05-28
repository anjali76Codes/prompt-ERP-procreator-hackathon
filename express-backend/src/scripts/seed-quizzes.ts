/**
 * Seed ~10 realistic quizzes built exactly like the manual create flow produces:
 * each quiz references a real teacher / division / subject, carries schema-valid
 * questions ({ text, type, points, options:[{ text, isCorrect }] }) and a status.
 *
 * Depends on `npm run seed:demo` having been run first (it creates the teachers,
 * divisions and subjects these quizzes attach to).
 *
 * Idempotent: deletes any previously-seeded quizzes (matched by title) and their
 * attempts before re-inserting, so it is safe to run repeatedly.
 *
 *   npm run seed:quizzes
 */

import { connectDatabase, disconnectDatabase } from '../config/db';
import { logger } from '../utils/logger';
import { Quiz, type QuizQuestion } from '../models/Quiz';
import { QuizAttempt } from '../models/QuizAttempt';
import { Teacher } from '../models/Teacher';
import { Division } from '../models/Division';
import { Subject } from '../models/Subject';

type QuizStatus = 'draft' | 'published';

/* ----------------------------------------------------------------------
 *  Question builders — mirror the shapes the backend validator accepts.
 * ------------------------------------------------------------------- */

const mcq = (text: string, options: string[], correctIndex: number, points = 2): QuizQuestion => ({
  text,
  type: 'single',
  points,
  options: options.map((t, i) => ({ text: t, isCorrect: i === correctIndex })),
});

const short = (text: string, points = 5): QuizQuestion => ({
  text,
  type: 'short',
  points,
  options: [],
});

/* ----------------------------------------------------------------------
 *  Quiz definitions — keyed to seeded teachers / subjects / divisions.
 *  Each teacher only owns quizzes for a subject + division they teach.
 * ------------------------------------------------------------------- */

interface QuizSeed {
  title: string;
  description: string;
  teacherEmail: string;   // existing seeded teacher
  subjectCode: string;    // existing seeded subject
  divisionCode: string;   // existing seeded division
  status: QuizStatus;
  timeLimitMinutes: number;
  questions: QuizQuestion[];
}

const quizSeeds: QuizSeed[] = [
  {
    title: 'Arrays & Linked Lists Quiz',
    description: 'Fundamentals of linear data structures. Negative marking does not apply.',
    teacherEmail: 'prof.adrian@university.edu',
    subjectCode: 'CS-301',
    divisionCode: 'TE-A',
    status: 'published',
    timeLimitMinutes: 20,
    questions: [
      mcq('What is the time complexity of accessing an element by index in an array?', ['O(n)', 'O(1)', 'O(log n)', 'O(n log n)'], 1, 2),
      mcq('Which operation is O(1) for a singly linked list with a head pointer?', ['Access by index', 'Insertion at head', 'Search by value', 'Access the last element'], 1, 2),
      mcq('A circular linked list is best described as one where', ['the last node points to null', 'the last node points back to the head', 'every node has two pointers', 'nodes are stored contiguously'], 1, 2),
      short('Explain one advantage and one disadvantage of a linked list compared to an array.', 4),
    ],
  },
  {
    title: 'Trees & Graph Traversal',
    description: 'Binary trees, BSTs and graph traversal techniques.',
    teacherEmail: 'prof.adrian@university.edu',
    subjectCode: 'CS-301',
    divisionCode: 'TE-B',
    status: 'published',
    timeLimitMinutes: 25,
    questions: [
      mcq('In-order traversal of a binary search tree yields nodes in', ['random order', 'descending order', 'ascending sorted order', 'level order'], 2, 2),
      mcq('Which traversal uses a queue as its core data structure?', ['Depth-first search', 'Breadth-first search', 'In-order traversal', 'Pre-order traversal'], 1, 2),
      mcq('The maximum number of nodes at level L of a binary tree (root at level 0) is', ['2^L', 'L^2', '2L', 'L'], 0, 2),
      short('Describe the difference between DFS and BFS and when you would prefer each.', 5),
    ],
  },
  {
    title: 'Sorting Algorithms',
    description: 'Comparison-based sorting and their complexities. (Draft)',
    teacherEmail: 'prof.adrian@university.edu',
    subjectCode: 'CS-301',
    divisionCode: 'TE-A',
    status: 'draft',
    timeLimitMinutes: 15,
    questions: [
      mcq('What is the average-case time complexity of Quick Sort?', ['O(n)', 'O(n^2)', 'O(n log n)', 'O(log n)'], 2, 2),
      mcq('Which sorting algorithm is stable and runs in O(n log n) worst case?', ['Quick Sort', 'Merge Sort', 'Heap Sort', 'Selection Sort'], 1, 2),
      mcq('Bubble sort has a best-case time complexity of', ['O(n)', 'O(n^2)', 'O(n log n)', 'O(1)'], 0, 2),
    ],
  },
  {
    title: 'OS Process & Threads',
    description: 'Processes, threads and inter-process communication.',
    teacherEmail: 'prof.adrian@university.edu',
    subjectCode: 'CS-302',
    divisionCode: 'TE-A',
    status: 'published',
    timeLimitMinutes: 20,
    questions: [
      mcq('A process in the "ready" state is', ['waiting for I/O to complete', 'currently executing on the CPU', 'waiting to be assigned to the CPU', 'terminated but not cleaned up'], 2, 2),
      mcq('Threads of the same process share', ['the same stack', 'the same code and heap', 'separate address spaces', 'separate file descriptors'], 1, 2),
      mcq('Which of these is NOT a valid IPC mechanism?', ['Shared memory', 'Message passing', 'Pipes', 'Branch prediction'], 3, 2),
      short('What is a context switch and why does it add overhead?', 4),
    ],
  },
  {
    title: 'CPU Scheduling',
    description: 'Scheduling algorithms and performance metrics.',
    teacherEmail: 'prof.adrian@university.edu',
    subjectCode: 'CS-302',
    divisionCode: 'TE-B',
    status: 'published',
    timeLimitMinutes: 20,
    questions: [
      mcq('Which scheduling algorithm can lead to starvation of long jobs?', ['First-Come First-Served', 'Round Robin', 'Shortest Job First', 'FCFS with aging'], 2, 2),
      mcq('Round Robin scheduling is primarily characterised by its', ['priority levels', 'time quantum', 'job length estimation', 'deadline awareness'], 1, 2),
      mcq('Turnaround time is defined as', ['burst time minus wait time', 'completion time minus arrival time', 'wait time plus response time', 'arrival time minus burst time'], 1, 2),
    ],
  },
  {
    title: 'DBMS Normalization',
    description: 'Functional dependencies and normal forms.',
    teacherEmail: 'prof.sarah@university.edu',
    subjectCode: 'CS-303',
    divisionCode: 'TE-A',
    status: 'published',
    timeLimitMinutes: 25,
    questions: [
      mcq('A relation is in 1NF if', ['it has no partial dependencies', 'all attributes hold atomic values', 'it has no transitive dependencies', 'every determinant is a candidate key'], 1, 2),
      mcq('Removing transitive dependencies achieves', ['1NF', '2NF', '3NF', 'BCNF'], 2, 2),
      mcq('BCNF is stricter than 3NF because it requires', ['no multi-valued attributes', 'every determinant to be a candidate key', 'no foreign keys', 'all attributes to be keys'], 1, 2),
      short('Give a real-world example of an update anomaly caused by poor normalization.', 5),
    ],
  },
  {
    title: 'SQL Joins & Queries',
    description: 'Writing and reasoning about SQL queries.',
    teacherEmail: 'prof.sarah@university.edu',
    subjectCode: 'CS-303',
    divisionCode: 'TE-C',
    status: 'published',
    timeLimitMinutes: 20,
    questions: [
      mcq('Which JOIN returns only rows with matching keys in both tables?', ['LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN'], 2, 2),
      mcq('The SQL clause used to filter groups after aggregation is', ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'], 1, 2),
      mcq('Which aggregate function counts non-null values in a column?', ['SUM()', 'COUNT()', 'AVG()', 'MAX()'], 1, 2),
      short('Write a SQL query to find the second highest salary from an Employees table.', 5),
    ],
  },
  {
    title: 'Transactions & Concurrency',
    description: 'ACID properties and concurrency control. (Draft)',
    teacherEmail: 'prof.sarah@university.edu',
    subjectCode: 'CS-303',
    divisionCode: 'TE-A',
    status: 'draft',
    timeLimitMinutes: 20,
    questions: [
      mcq('The "I" in ACID stands for', ['Integrity', 'Isolation', 'Indexing', 'Idempotency'], 1, 2),
      mcq('A deadlock requires which condition among others?', ['Pre-emption', 'Circular wait', 'Unlimited resources', 'Single transaction'], 1, 2),
      mcq('Two-phase locking guarantees', ['atomicity', 'serializability', 'durability', 'normalization'], 1, 2),
    ],
  },
  {
    title: 'ML Foundations & Regression',
    description: 'Supervised learning basics and linear regression.',
    teacherEmail: 'prof.mark@university.edu',
    subjectCode: 'CS-304',
    divisionCode: 'TE-A',
    status: 'published',
    timeLimitMinutes: 25,
    questions: [
      mcq('Supervised learning differs from unsupervised learning because it uses', ['unlabeled data only', 'labeled training data', 'no data at all', 'reinforcement signals'], 1, 2),
      mcq('Linear regression typically minimises', ['the number of features', 'the mean squared error', 'the learning rate', 'the number of epochs'], 1, 2),
      mcq('High variance in a model usually indicates', ['underfitting', 'overfitting', 'perfect generalisation', 'a linear relationship'], 1, 2),
      short('Explain the bias-variance tradeoff in one or two sentences.', 5),
    ],
  },
  {
    title: 'Classification & Evaluation',
    description: 'Classification algorithms and evaluation metrics.',
    teacherEmail: 'prof.mark@university.edu',
    subjectCode: 'CS-304',
    divisionCode: 'TE-B',
    status: 'published',
    timeLimitMinutes: 20,
    questions: [
      mcq('Precision is defined as', ['TP / (TP + FN)', 'TP / (TP + FP)', '(TP + TN) / total', 'TN / (TN + FP)'], 1, 2),
      mcq('Which metric is most useful for imbalanced classes?', ['Accuracy', 'F1-score', 'Mean squared error', 'R-squared'], 1, 2),
      mcq('A confusion matrix for binary classification has how many cells?', ['2', '3', '4', '6'], 2, 2),
      short('When would you prefer recall over precision? Give an example.', 5),
    ],
  },
];

/* ----------------------------------------------------------------------
 *  Entry
 * ------------------------------------------------------------------- */

const main = async () => {
  await connectDatabase();
  logger.info('Seeding quizzes…');

  const titles = quizSeeds.map((q) => q.title);

  // Clean re-seed: drop previously-seeded quizzes (by title) + their attempts.
  const existing = await Quiz.find({ title: { $in: titles } }).select('_id');
  if (existing.length) {
    const ids = existing.map((q) => q._id);
    const attempts = await QuizAttempt.deleteMany({ quiz: { $in: ids } });
    const quizzes = await Quiz.deleteMany({ _id: { $in: ids } });
    logger.info('Cleared previously-seeded quizzes', {
      quizzes: quizzes.deletedCount,
      attempts: attempts.deletedCount,
    });
  }

  let created = 0;
  const skipped: string[] = [];

  for (const seed of quizSeeds) {
    const [teacher, subject, division] = await Promise.all([
      Teacher.findOne({ email: seed.teacherEmail }).select('_id name'),
      Subject.findOne({ code: seed.subjectCode }).select('_id name'),
      Division.findOne({ code: seed.divisionCode }).select('_id name'),
    ]);

    if (!teacher || !subject || !division) {
      skipped.push(
        `${seed.title} (teacher:${!!teacher} subject:${!!subject} division:${!!division})`
      );
      continue;
    }

    await Quiz.create({
      title: seed.title,
      description: seed.description,
      teacher: teacher._id,
      division: division._id,
      subject: subject._id,
      status: seed.status,
      settings: {
        timeLimitMinutes: seed.timeLimitMinutes,
        shuffleQuestions: false,
        shuffleOptions: false,
        maxAttempts: 1,
        showAnswersAfter: false,
      },
      questions: seed.questions,
    });
    created += 1;
  }

  logger.info('Quiz seed complete', {
    created,
    published: quizSeeds.filter((q) => q.status === 'published').length,
    drafts: quizSeeds.filter((q) => q.status === 'draft').length,
    skipped: skipped.length ? skipped : 'none',
  });

  if (skipped.length) {
    logger.warn(
      'Some quizzes were skipped because their teacher/subject/division was missing. ' +
        'Run `npm run seed:demo` first, then re-run `npm run seed:quizzes`.'
    );
  }

  await disconnectDatabase();
  process.exit(0);
};

main().catch((err) => {
  logger.error('Quiz seed failed', err as Error);
  process.exit(1);
});
