import PDFDocument from 'pdfkit';
import { collections } from '../database/registry';
import { logger } from '../utils/logger';

export async function getReportById(reportId: string) {
  const doc = await collections.reports().doc(reportId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function getLatestReport(type: string) {
  const snap = await collections.reports()
    .where('type', '==', type)
    .orderBy('generatedAt', 'desc')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export function generateReportPdf(report: Record<string, unknown>): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(20).text(`${String(report.type || 'Report').toUpperCase()} REPORT`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Period: ${new Date(report.periodStart as string).toLocaleDateString()} — ${new Date(report.periodEnd as string).toLocaleDateString()}`, { align: 'center' });
  doc.text(`Generated: ${new Date(report.generatedAt as string).toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  const lineY = doc.y;
  doc.moveTo(50, lineY).lineTo(545, lineY).stroke();
  doc.moveDown();

  const fields: Array<{ label: string; key: string }> = [
    { label: 'Total Students', key: 'totalStudents' },
    { label: 'Total Teachers', key: 'totalTeachers' },
    { label: 'Total Courses', key: 'totalCourses' },
    { label: 'Total Assignments', key: 'totalAssignments' },
    { label: 'Submissions in Period', key: 'submissionsInPeriod' },
    { label: 'Average Grade', key: 'averageGrade' },
  ];

  fields.forEach(({ label, key }) => {
    doc.fontSize(12).text(`${label}:  ${report[key] ?? 'N/A'}`, { indent: 20 });
  });

  doc.end();
  return doc;
}
