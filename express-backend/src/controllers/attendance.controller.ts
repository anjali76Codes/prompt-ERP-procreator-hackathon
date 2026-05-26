import { Types } from 'mongoose';
import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import * as attendance from '../services/attendance.service';
import { streamDivisionReportPdf, streamLectureRosterPdf } from '../services/pdf.service';
import { BadRequest, Unauthorized } from '../utils/http-errors';

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw Unauthorized();
  const lectureId = req.params.id;
  if (!lectureId) throw BadRequest('Lecture id required');
  const result = await attendance.markAttendance({
    lectureId,
    entries: req.body.entries,
    markedBy: new Types.ObjectId(req.auth.sub),
  });
  res.status(201).json(result);
});

export const getAttendanceForLecture = asyncHandler(async (req, res) => {
  const lectureId = req.params.id;
  if (!lectureId) throw BadRequest('Lecture id required');
  res.json({ attendance: await attendance.listAttendanceForLecture(lectureId) });
});

export const getStudentAttendance = asyncHandler(async (req, res) => {
  const studentId = req.params.id;
  if (!studentId) throw BadRequest('Student id required');
  const { subjectId } = req.query as Record<string, string | undefined>;
  res.json({ summary: await attendance.studentSubjectAttendance(studentId, subjectId) });
});

export const getMyAttendance = asyncHandler(async (req, res) => {
  if (!req.auth) throw Unauthorized();
  const { subjectId } = req.query as Record<string, string | undefined>;
  res.json({ summary: await attendance.studentSubjectAttendance(req.auth.sub, subjectId) });
});

export const getDivisionAttendanceStats = asyncHandler(async (req, res) => {
  const divisionId = req.params.id;
  if (!divisionId) throw BadRequest('Division id required');
  res.json({ stats: await attendance.divisionAttendanceStats(divisionId) });
});

export const getDivisionSubjectAverages = asyncHandler(async (req, res) => {
  const divisionId = req.params.id;
  if (!divisionId) throw BadRequest('Division id required');
  res.json({ averages: await attendance.divisionSubjectAverages(divisionId) });
});

export const getDivisionEligibility = asyncHandler(async (req, res) => {
  const divisionId = req.params.id;
  if (!divisionId) throw BadRequest('Division id required');
  res.json({ eligibility: await attendance.divisionEligibility(divisionId) });
});

/* ----- PDF exports (streamed; client must include Authorization header) ---- */

export const downloadLectureRosterPdf = asyncHandler(async (req, res) => {
  const lectureId = req.params.id;
  if (!lectureId) throw BadRequest('Lecture id required');
  await streamLectureRosterPdf(lectureId, res);
});

export const downloadDivisionReportPdf = asyncHandler(async (req, res) => {
  const divisionId = req.params.id;
  if (!divisionId) throw BadRequest('Division id required');
  await streamDivisionReportPdf(divisionId, res);
});
