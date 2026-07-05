import PDFDocument from 'pdfkit';
import { getSupabaseClient } from './supabase';
import { logger } from '../utils/logger';

export async function getReportById(reportId: string) {
  const supabase = getSupabaseClient()!;
  const { data, error } = await supabase.from('nosql_docs').select('doc_id, data')
    .eq('collection', 'reports').eq('doc_id', reportId).maybeSingle();
  if (error) throw new Error('Failed to fetch report: ' + error.message);
  if (!data) return null;
  return { id: data.doc_id, ...data.data as Record<string, unknown> };
}

export async function getLatestReport(type: string) {
  const supabase = getSupabaseClient()!;
  const { data: rows, error } = await supabase.from('nosql_docs').select('doc_id, data')
    .eq('collection', 'reports')
    .contains('data', { type })
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error('Failed to fetch latest report: ' + error.message);
  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  return { id: row.doc_id, ...row.data as Record<string, unknown> };
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
