import PDFDocument from 'pdfkit';
import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';

export async function generateReceipt(paymentId: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');

  const { data: payment } = await supabase.from('fee_payments').select('*, fee_structure_id(*)').eq('id', paymentId).maybeSingle();
  if (!payment) throw new NotFoundError('Payment not found');

  const feeStructure = payment.fee_structure_id as any;
  const { data: student } = await supabase.from('users').select('display_name, email').eq('id', payment.student_id).maybeSingle();
  const { data: school } = await supabase.from('schools').select('name').limit(1).maybeSingle();

  const doc = new PDFDocument({ margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  const pageWidth = doc.page.width - 100;

  doc.fontSize(22).font('Helvetica-Bold').text(school?.name || 'School LMS', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica').text('Payment Receipt', { align: 'center' });
  doc.moveDown(1);

  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke();
  doc.moveDown(1);

  const receiptNo = payment.id.toString().slice(0, 8).toUpperCase();
  const date = new Date(payment.created_at || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.fontSize(10).font('Helvetica');
  doc.text(`Receipt No: ${receiptNo}`, { continued: true }).text(`Date: ${date}`, { align: 'right' });
  doc.moveDown(1.5);

  doc.font('Helvetica-Bold').text('Student Details');
  doc.font('Helvetica');
  doc.text(`Name: ${student?.display_name || 'N/A'}`);
  doc.text(`ID: ${payment.student_id}`);
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('Payment Details');
  doc.font('Helvetica');
  doc.text(`Fee: ${feeStructure?.name || 'N/A'}`);
  doc.text(`Amount Paid: ₹${Number(payment.amount).toFixed(2)}`);
  if (feeStructure?.due_date) doc.text(`Due Date: ${feeStructure.due_date}`);
  doc.moveDown(1);

  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').text(`Total Paid: ₹${Number(payment.amount).toFixed(2)}`, { align: 'right' });
  doc.moveDown(2);

  doc.fontSize(8).font('Helvetica').fillColor('#666').text('This is a computer-generated receipt.', { align: 'center' });

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}
