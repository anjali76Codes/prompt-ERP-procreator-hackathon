import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { Lecture } from '../models/Lecture';
import { Division } from '../models/Division';
import { NotFound } from '../utils/http-errors';
import {
  lectureRoster as fetchRoster,
  divisionAttendanceStats,
  divisionSubjectAverages,
  divisionEligibility,
} from './attendance.service';

const HEADER_COLOR = '#0F172A';
const ACCENT = '#0047FF';
const MUTED = '#64748B';

interface PopulatedName { code?: string; name?: string }

const pickName = (v: unknown, fallback = '—'): string => {
  if (!v) return fallback;
  if (typeof v === 'string') return v;
  const obj = v as PopulatedName;
  return obj.code ? `${obj.code} · ${obj.name ?? ''}` : (obj.name ?? fallback);
};

const drawHeader = (doc: PDFKit.PDFDocument, title: string, subtitle?: string): void => {
  doc.fillColor(HEADER_COLOR).font('Helvetica-Bold').fontSize(20).text(title);
  if (subtitle) {
    doc.moveDown(0.2).fillColor(MUTED).font('Helvetica').fontSize(10).text(subtitle);
  }
  doc.moveDown(0.4)
    .strokeColor('#E2E8F0').lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.8);
};

const drawFooter = (doc: PDFKit.PDFDocument): void => {
  const bottom = doc.page.height - doc.page.margins.bottom + 12;
  doc.fontSize(8).fillColor(MUTED).font('Helvetica')
    .text(
      `Prompt ERP · Generated ${new Date().toLocaleString()}`,
      doc.page.margins.left, bottom,
      { align: 'left', width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
    );
};

/* ----------------------------------------------------------------------
 *  Lecture roster PDF
 * ------------------------------------------------------------------- */

export const streamLectureRosterPdf = async (lectureId: string, res: Response): Promise<void> => {
  const lecture = await Lecture.findById(lectureId).populate('division subject teacher');
  if (!lecture) throw NotFound('Lecture not found');

  const roster = await fetchRoster(lectureId);

  const filename = `lecture-${lectureId}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.pipe(res);

  drawHeader(
    doc,
    'Lecture Attendance Report',
    `${pickName(lecture.subject)}  ·  ${pickName(lecture.division)}  ·  ${new Date(lecture.date).toLocaleDateString()}  ·  ${lecture.startTime}–${lecture.endTime}  ·  ${lecture.room}`
  );

  const total = roster.length;
  const present = roster.filter(r => r.attendance && (r.attendance.status === 'present' || r.attendance.status === 'late')).length;
  const absent = total - present;
  doc.fillColor(HEADER_COLOR).font('Helvetica-Bold').fontSize(11)
    .text(`Total: ${total}    Present: ${present}    Absent: ${absent}    %: ${total ? Math.round((present / total) * 100) : 0}%`);
  doc.moveDown(0.8);

  // Table header
  const cols = [
    { key: 'roll',   label: 'Roll',    width: 70 },
    { key: 'name',   label: 'Student', width: 230 },
    { key: 'status', label: 'Status',  width: 80 },
    { key: 'remarks',label: 'Remarks', width: 140 },
  ];
  const left = doc.page.margins.left;
  let y = doc.y;
  doc.fontSize(9).fillColor(MUTED).font('Helvetica-Bold');
  let x = left;
  for (const c of cols) { doc.text(c.label, x, y, { width: c.width }); x += c.width; }
  y += 14;
  doc.strokeColor('#E2E8F0').moveTo(left, y - 4).lineTo(left + cols.reduce((a, c) => a + c.width, 0), y - 4).stroke();

  doc.font('Helvetica').fontSize(10);
  for (const r of roster) {
    if (y > doc.page.height - 80) { doc.addPage(); y = doc.page.margins.top; }
    x = left;
    const status = r.attendance?.status ?? 'absent';
    const isAbsent = status === 'absent';
    doc.fillColor(MUTED).text(r.student.rollNumber ?? '—', x, y, { width: cols[0]!.width }); x += cols[0]!.width;
    doc.fillColor(isAbsent ? '#EF4444' : HEADER_COLOR).text(r.student.name, x, y, { width: cols[1]!.width }); x += cols[1]!.width;
    doc.fillColor(status === 'present' ? '#10B981' : isAbsent ? '#EF4444' : ACCENT)
      .text(status.toUpperCase(), x, y, { width: cols[2]!.width });
    x += cols[2]!.width;
    doc.fillColor(MUTED).text(r.attendance?.remarks ?? '—', x, y, { width: cols[3]!.width });
    y += 16;
  }

  drawFooter(doc);
  doc.end();
};

/* ----------------------------------------------------------------------
 *  Division report PDF (stats + subject averages + eligibility)
 * ------------------------------------------------------------------- */

export const streamDivisionReportPdf = async (divisionId: string, res: Response): Promise<void> => {
  const division = await Division.findById(divisionId).populate('branch academicYear');
  if (!division) throw NotFound('Division not found');

  const [stats, subjects, eligibility] = await Promise.all([
    divisionAttendanceStats(divisionId),
    divisionSubjectAverages(divisionId),
    divisionEligibility(divisionId),
  ]);

  const filename = `division-${division.code}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.pipe(res);

  drawHeader(
    doc,
    `Attendance Report · ${division.code}`,
    `${pickName(division.branch)}  ·  ${pickName(division.academicYear)}  ·  ${division.name}`
  );

  // Summary stats
  const total = stats.length;
  const avg = total ? Math.round(stats.reduce((a, s) => a + s.pct, 0) / total) : 0;
  const below = stats.filter(s => s.pct < 75).length;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(HEADER_COLOR)
    .text(`Students: ${total}    Class Avg: ${avg}%    Below 75%: ${below}    Ineligible: ${eligibility.filter(e => !e.overallEligible).length}`);
  doc.moveDown(0.8);

  // Subject averages
  doc.font('Helvetica-Bold').fontSize(12).fillColor(HEADER_COLOR).text('Subject Averages');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10);
  for (const s of subjects) {
    doc.fillColor(HEADER_COLOR)
      .text(`${s.code}  ${s.name}`, { continued: true })
      .fillColor(s.pct >= 80 ? '#10B981' : s.pct >= 65 ? ACCENT : '#EF4444')
      .text(`    ${Math.round(s.pct)}%   (${s.present}/${s.total})`);
  }
  if (subjects.length === 0) doc.fillColor(MUTED).text('No attendance data yet.');
  doc.moveDown(0.8);

  // Student attendance table
  doc.font('Helvetica-Bold').fontSize(12).fillColor(HEADER_COLOR).text('Per-student Attendance');
  doc.moveDown(0.3);
  const cols = [
    { label: 'Roll',         width: 70 },
    { label: 'Student',      width: 200 },
    { label: 'Attendance %', width: 80 },
    { label: 'P / Total',    width: 70 },
    { label: 'Eligibility',  width: 100 },
  ];
  const left = doc.page.margins.left;
  let y = doc.y;
  doc.fontSize(9).fillColor(MUTED).font('Helvetica-Bold');
  let x = left;
  for (const c of cols) { doc.text(c.label, x, y, { width: c.width }); x += c.width; }
  y += 14;
  doc.strokeColor('#E2E8F0').moveTo(left, y - 4).lineTo(left + cols.reduce((a, c) => a + c.width, 0), y - 4).stroke();

  const eligibleById = new Map(eligibility.map(e => [e.studentId, e.overallEligible]));

  doc.font('Helvetica').fontSize(10);
  for (const s of stats) {
    if (y > doc.page.height - 80) { doc.addPage(); y = doc.page.margins.top; }
    x = left;
    doc.fillColor(MUTED).text(s.rollNumber ?? '—', x, y, { width: cols[0]!.width }); x += cols[0]!.width;
    doc.fillColor(HEADER_COLOR).text(s.name, x, y, { width: cols[1]!.width }); x += cols[1]!.width;
    doc.fillColor(s.pct >= 75 ? '#10B981' : '#EF4444').text(`${Math.round(s.pct)}%`, x, y, { width: cols[2]!.width }); x += cols[2]!.width;
    doc.fillColor(MUTED).text(`${s.present} / ${s.total}`, x, y, { width: cols[3]!.width }); x += cols[3]!.width;
    const ok = eligibleById.get(s.studentId) ?? false;
    doc.fillColor(ok ? '#10B981' : '#EF4444').text(ok ? 'Eligible' : 'Ineligible', x, y, { width: cols[4]!.width });
    y += 16;
  }
  if (stats.length === 0) {
    doc.fillColor(MUTED).text('No attendance data yet.');
  }

  drawFooter(doc);
  doc.end();
};
