import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import * as academic from '../services/academic.service';
import { Teacher } from '../models/Teacher';
import { BadRequest, Unauthorized } from '../utils/http-errors';

export const getBranches = asyncHandler(async (_req, res) => {
  res.json({ branches: await academic.listBranches() });
});

export const getAcademicYears = asyncHandler(async (_req, res) => {
  res.json({
    years: await academic.listAcademicYears(),
    current: await academic.currentAcademicYear(),
  });
});

export const getDivisions = asyncHandler(async (req: Request, res: Response) => {
  const { branch, year, mine } = req.query as Record<string, string | undefined>;
  if (mine && req.auth?.role === 'teacher') {
    const teacher = await Teacher.findById(req.auth.sub).populate('divisionRefs');
    if (!teacher) throw Unauthorized();
    res.json({ divisions: teacher.divisionRefs });
    return;
  }
  res.json({ divisions: await academic.listDivisions({ branch, year }) });
});

export const getDivisionById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Division id required');
  res.json({ division: await academic.findDivision(id) });
});

export const getDivisionStudents = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) throw BadRequest('Division id required');
  res.json({ students: await academic.listStudentsInDivision(id) });
});

export const getSubjects = asyncHandler(async (req: Request, res: Response) => {
  const { branch, year, mine } = req.query as Record<string, string | undefined>;
  if (mine && req.auth?.role === 'teacher') {
    const teacher = await Teacher.findById(req.auth.sub).populate('subjectRefs');
    if (!teacher) throw Unauthorized();
    res.json({ subjects: teacher.subjectRefs });
    return;
  }
  res.json({ subjects: await academic.listSubjects({ branch, year }) });
});
