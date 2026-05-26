import { Branch, type BranchDoc } from '../models/Branch';
import { AcademicYear, type AcademicYearDoc } from '../models/AcademicYear';
import { Division, type DivisionDoc } from '../models/Division';
import { Subject, type SubjectDoc } from '../models/Subject';
import { Student, type StudentDoc } from '../models/Student';
import { Teacher, type TeacherDoc } from '../models/Teacher';
import type { Types } from 'mongoose';
import { NotFound } from '../utils/http-errors';

export const listBranches = (): Promise<BranchDoc[]> => Branch.find().sort({ code: 1 });
export const listAcademicYears = (): Promise<AcademicYearDoc[]> =>
  AcademicYear.find().sort({ startsAt: -1 });
export const currentAcademicYear = (): Promise<AcademicYearDoc | null> =>
  AcademicYear.findOne({ isCurrent: true });

export const listDivisions = (filter: { branch?: string; year?: string } = {}): Promise<DivisionDoc[]> => {
  const q: Record<string, unknown> = {};
  if (filter.branch) q.branch = filter.branch;
  if (filter.year) q.year = filter.year;
  return Division.find(q).populate('branch academicYear').sort({ code: 1 });
};

export const findDivision = async (id: string): Promise<DivisionDoc> => {
  const doc = await Division.findById(id).populate('branch academicYear');
  if (!doc) throw NotFound('Division not found');
  return doc;
};

export const listSubjects = (filter: { branch?: string; year?: string } = {}): Promise<SubjectDoc[]> => {
  const q: Record<string, unknown> = {};
  if (filter.branch) q.branch = filter.branch;
  if (filter.year) q.year = filter.year;
  return Subject.find(q).populate('branch').sort({ code: 1 });
};

export const findSubject = async (id: string): Promise<SubjectDoc> => {
  const doc = await Subject.findById(id).populate('branch');
  if (!doc) throw NotFound('Subject not found');
  return doc;
};

export const listStudentsInDivision = (divisionId: Types.ObjectId | string): Promise<StudentDoc[]> => {
  return Student.find({ divisionRef: divisionId }).sort({ rollNumber: 1, name: 1 });
};

export const findTeacher = async (id: string): Promise<TeacherDoc> => {
  const doc = await Teacher.findById(id)
    .populate('divisionRefs subjectRefs branchRef');
  if (!doc) throw NotFound('Teacher not found');
  return doc;
};
