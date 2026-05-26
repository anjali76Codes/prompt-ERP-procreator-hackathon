export type Role = 'student' | 'teacher' | 'admin';
export type AccountStatus = 'pending' | 'active' | 'rejected';
export type Year = 'FE' | 'SE' | 'TE' | 'BE';

export interface BaseUser {
  _id: string;
  id?: string;
  email: string;
  name: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudentUser extends BaseUser {
  role: 'student';
  branch: string;
  year: Year;
  division: string;
  rollNumber?: string;
}

export interface TeacherUser extends BaseUser {
  role: 'teacher';
  branch: string;
  department?: string;
  courses: string[];
  assignedDivisions: string[];
}

export interface AdminUser extends BaseUser {
  role: 'admin';
}

export type AppUser = StudentUser | TeacherUser | AdminUser;

export interface AuthResponse {
  token: string;
  user: AppUser;
  message?: string;
}

export interface StudentRegisterPayload {
  email: string;
  password: string;
  name: string;
  branch: string;
  year: Year;
  division: string;
  rollNumber?: string;
}

export interface TeacherRegisterPayload {
  email: string;
  password: string;
  name: string;
  branch: string;
  department?: string;
  courses: string[];
  assignedDivisions: string[];
}

export type RegisterPayload =
  | ({ kind: 'student' } & StudentRegisterPayload)
  | ({ kind: 'teacher' } & TeacherRegisterPayload);
