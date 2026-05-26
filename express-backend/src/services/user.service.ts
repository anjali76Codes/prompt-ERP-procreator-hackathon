import { User, type UserDoc } from '../models/User';
import { Student, type StudentDoc } from '../models/Student';
import { Teacher, type TeacherDoc } from '../models/Teacher';
import { hashPassword } from './auth.service';
import { Conflict, NotFound } from '../utils/http-errors';
import type {
  StudentRegisterInput, TeacherRegisterInput,
} from '../validators/auth.validator';
import type {
  StudentProfileUpdateInput, TeacherProfileUpdateInput,
} from '../validators/profile.validator';

const ensureEmailAvailable = async (email: string) => {
  const existing = await User.findOne({ email });
  if (existing) throw Conflict('An account with this email already exists');
};

export const createStudent = async (input: StudentRegisterInput): Promise<StudentDoc> => {
  await ensureEmailAvailable(input.email);
  const passwordHash = await hashPassword(input.password);
  const doc = await Student.create({
    email: input.email,
    passwordHash,
    name: input.name,
    branch: input.branch,
    year: input.year,
    division: input.division,
    rollNumber: input.rollNumber,
    status: 'active',
  });
  return doc;
};

export const createTeacher = async (input: TeacherRegisterInput): Promise<TeacherDoc> => {
  await ensureEmailAvailable(input.email);
  const passwordHash = await hashPassword(input.password);
  const doc = await Teacher.create({
    email: input.email,
    passwordHash,
    name: input.name,
    branch: input.branch,
    department: input.department,
    courses: input.courses,
    assignedDivisions: input.assignedDivisions,
    status: 'pending',
  });
  return doc;
};

export const findUserByEmailWithPassword = async (email: string): Promise<UserDoc | null> => {
  return User.findOne({ email }).select('+passwordHash');
};

export const findUserById = async (id: string): Promise<UserDoc | null> => {
  return User.findById(id);
};

export const updateStudentProfile = async (
  id: string, patch: StudentProfileUpdateInput
): Promise<StudentDoc> => {
  const doc = await Student.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  if (!doc) throw NotFound('Student profile not found');
  return doc;
};

export const updateTeacherProfile = async (
  id: string, patch: TeacherProfileUpdateInput
): Promise<TeacherDoc> => {
  const doc = await Teacher.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  if (!doc) throw NotFound('Teacher profile not found');
  return doc;
};

export const listPendingTeachers = async (): Promise<TeacherDoc[]> => {
  return Teacher.find({ status: 'pending' }).sort({ createdAt: -1 });
};

export const setTeacherStatus = async (
  id: string, status: 'active' | 'rejected'
): Promise<TeacherDoc> => {
  const doc = await Teacher.findOneAndUpdate(
    { _id: id, role: 'teacher' },
    { status },
    { new: true }
  );
  if (!doc) throw NotFound('Teacher not found');
  return doc;
};
