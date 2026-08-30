import { getSupabaseAdmin } from './supabase';
import { NotFoundError, ValidationError } from '../utils/errors';

interface InvoiceRow {
  id: string;
  invoice_number: string;
  student_id: string;
  parent_id?: string | null;
  school_id?: string | null;
  fee_structure_id: string;
  discount: number;
  payment_method?: string | null;
  transaction_id?: string | null;
  payment_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceComputed {
  invoice: InvoiceRow;
  student?: Record<string, unknown> | null;
  parent?: Record<string, unknown> | null;
  feeStructure?: Record<string, unknown> | null;
  className?: string | null;
  schoolName?: string | null;
  feeAmount: number;
  amountPaid: number;
  previousDue: number;
  discount: number;
  total: number;
  balance: number;
  paymentStatus: 'Paid' | 'Partially Paid' | 'Pending';
}

const pageSize = 1000;

async function fetchAll(builder: () => any): Promise<any[]> {
  const all: any[] = [];
  let from = 0;
  for (;;) {
    const query = builder().range(from, from + pageSize - 1);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load data: ${error.message}`);
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Look up the fee schedule's base amount (source of truth).
 */
async function getFeeAmount(feeStructureId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');
  const { data } = await supabase
    .from('fee_structures')
    .select('amount')
    .eq('id', feeStructureId)
    .maybeSingle();
  return toNumber((data as { amount?: unknown } | null)?.amount);
}

/**
 * Sum all payments recorded for a student against a fee schedule (source of truth),
 * plus the method/transaction/date of the most recent payment.
 */
async function getPaymentSummary(studentId: string, feeStructureId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');
  const { data } = await supabase
    .from('fee_payments')
    .select('amount, payment_method, transaction_id, paid_at, payment_date, created_at')
    .eq('student_id', studentId)
    .eq('fee_structure_id', feeStructureId)
    .order('created_at', { ascending: false });
  const rows = data || [];
  const amountPaid = rows.reduce((sum, r) => sum + toNumber(r.amount), 0);
  const latest = rows[0];
  return {
    amountPaid,
    paymentMethod: (latest?.payment_method as string) || null,
    transactionId: (latest?.transaction_id as string) || null,
    paymentDate: (latest?.paid_at as string) || (latest?.payment_date as string) || null,
  };
}

/**
 * Outstanding balance from OTHER fee schedules for this student across the school
 * (used as "Previous dues" context for the invoice).
 */
async function getPreviousDues(studentId: string, feeStructureId: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;
  const [structures, payments] = await Promise.all([
    fetchAll(() => {
      let q = supabase.from('fee_structures').select('id, amount, class_id');
      if (schoolId) q = q.eq('school_id', schoolId);
      return q;
    }),
    fetchAll(() => {
      let q = supabase.from('fee_payments').select('amount, fee_structure_id, student_id');
      if (schoolId) q = q.eq('school_id', schoolId);
      return q;
    }),
  ]);
  const studentClassIds = await getStudentClassIds(studentId);
  const targetId = feeStructureId;

  const applicable = structures.filter((f: any) => {
    if (f.id === targetId) return false;
    if (f.class_id == null) return true;
    return studentClassIds.includes(f.class_id);
  });
  const applicableIds = new Set(applicable.map((f: any) => f.id));
  const totalDue = applicable.reduce((sum, f: any) => sum + toNumber(f.amount), 0);
  const paid = payments
    .filter((p: any) => p.student_id === studentId && applicableIds.has(p.fee_structure_id))
    .reduce((sum, p: any) => sum + toNumber(p.amount), 0);
  return Math.max(0, totalDue - paid);
}

async function getStudentClassIds(studentId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from('users')
    .select('class_id, class_ids')
    .eq('id', studentId)
    .maybeSingle();
  const s = data as { class_id?: string | null; class_ids?: unknown } | null;
  const ids: string[] = [];
  if (s?.class_id) ids.push(s.class_id);
  if (Array.isArray(s?.class_ids)) ids.push(...(s.class_ids as string[]).filter(Boolean));
  return [...new Set(ids)];
}

async function findParentForStudent(studentId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from('users')
    .select('id, display_name, email, phone_number, children_ids')
    .eq('role', 'parent')
    .is('deleted_at', null)
    .limit(1000);
  const parents = data || [];
  const parent = parents.find((p: any) => {
    const kids = Array.isArray(p.children_ids) ? (p.children_ids as string[]) : [];
    return kids.includes(studentId);
  });
  return parent || null;
}

async function loadClassMap(ids: string[]): Promise<Record<string, string>> {
  const supabase = getSupabaseAdmin();
  const map: Record<string, string> = {};
  if (!supabase || ids.length === 0) return map;
  const { data } = await supabase
    .from('classes')
    .select('id, name, grade, section')
    .in('id', ids);
  for (const c of data || []) {
    map[c.id] = c.name || (c.grade && c.section ? `Class ${c.grade}-${c.section}` : c.id);
  }
  return map;
}

/**
 * Generate the next unique invoice number, e.g. INV-0001.
 */
async function generateInvoiceNumber(): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');
  let seq = 1;
  for (;;) {
    const { data, error } = await supabase
      .from('invoices')
      .select('id')
      .eq('invoice_number', `INV-${String(seq).padStart(4, '0')}`)
      .limit(1);
    if (error) throw new Error(`Failed to check invoice numbers: ${error.message}`);
    if (!data || data.length === 0) {
      return `INV-${String(seq).padStart(4, '0')}`;
    }
    seq += 1;
  }
}

/**
 * Compute all monetary figures for an invoice live from source-of-truth tables.
 */
export async function computeInvoice(invoice: InvoiceRow): Promise<InvoiceComputed> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');

  const [feeAmount, paymentSummary, previousDue] = await Promise.all([
    getFeeAmount(invoice.fee_structure_id),
    getPaymentSummary(invoice.student_id, invoice.fee_structure_id),
    getPreviousDues(invoice.student_id, invoice.fee_structure_id, invoice.school_id || undefined),
  ]);

  const { data: student } = await supabase
    .from('users')
    .select('id, display_name, email, phone_number, class_id, class_ids, student_id, roll_no, address, gender')
    .eq('id', invoice.student_id)
    .maybeSingle();

  const parent = invoice.parent_id
    ? (await supabase
        .from('users')
        .select('id, display_name, email, phone_number')
        .eq('id', invoice.parent_id)
        .maybeSingle()).data
    : await findParentForStudent(invoice.student_id);

  const { data: feeStructure } = await supabase
    .from('fee_structures')
    .select('*')
    .eq('id', invoice.fee_structure_id)
    .maybeSingle();

  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('id' as never, invoice.school_id as never)
    .maybeSingle();

  const studentClassIds = [
    ...((student as any)?.class_id ? [(student as any).class_id] : []),
    ...(Array.isArray((student as any)?.class_ids) ? ((student as any).class_ids as string[]) : []),
  ];
  const classMap = await loadClassMap([...new Set(studentClassIds)]);
  const className =
    (student as any)?.class_id && (classMap as any)[(student as any).class_id]
      ? (classMap as any)[(student as any).class_id]
      : Object.values(classMap)[0] || null;

  const discount = toNumber(invoice.discount);
  const total = Math.max(0, feeAmount + previousDue - discount);
  const balance = Math.max(0, total - paymentSummary.amountPaid);
  const paymentStatus: InvoiceComputed['paymentStatus'] =
    balance <= 0 ? 'Paid' : paymentSummary.amountPaid > 0 ? 'Partially Paid' : 'Pending';

  return {
    invoice,
    student: student || null,
    parent: parent || null,
    feeStructure: feeStructure || null,
    className,
    schoolName: (school as { name?: string } | null)?.name || null,
    feeAmount,
    amountPaid: paymentSummary.amountPaid,
    previousDue,
    discount,
    total,
    balance,
    paymentStatus,
  };
}

/**
 * Validate that a student and fee schedule both belong to the given school.
 */
async function validateStudentAndSchedule(studentId: string, feeStructureId: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');

  const { data: student } = await supabase
    .from('users')
    .select('id, role, school_id')
    .eq('id', studentId)
    .maybeSingle();
  if (!student) throw new NotFoundError('Student not found');
  if (student.role === 'parent') throw new ValidationError('Selected user is not a student');

  const { data: schedule } = await supabase
    .from('fee_structures')
    .select('id, school_id')
    .eq('id', feeStructureId)
    .maybeSingle();
  if (!schedule) throw new NotFoundError('Fee schedule not found');

  if (schoolId) {
    if ((student as any).school_id && (student as any).school_id !== schoolId) {
      throw new ValidationError('Student does not belong to this school');
    }
    if ((schedule as any).school_id && (schedule as any).school_id !== schoolId) {
      throw new ValidationError('Fee schedule does not belong to this school');
    }
  }
}

/**
 * Create a new invoice. Invoice number is auto-generated. All figures are computed live.
 */
export async function createInvoice(data: {
  studentId: string;
  feeStructureId: string;
  discount?: number;
  paymentMethod?: string;
  transactionId?: string;
  paymentDate?: string;
  schoolId?: string;
}): Promise<InvoiceComputed> {
  await validateStudentAndSchedule(data.studentId, data.feeStructureId, data.schoolId);
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');

  const invoiceNumber = await generateInvoiceNumber();

  const { data: inserted, error } = await supabase.from('invoices').insert({
    invoice_number: invoiceNumber,
    student_id: data.studentId,
    school_id: data.schoolId || null,
    fee_structure_id: data.feeStructureId,
    discount: toNumber(data.discount),
    payment_method: data.paymentMethod || null,
    transaction_id: data.transactionId || null,
    payment_date: data.paymentDate || null,
  } as never).select('*').maybeSingle();

  if (error) {
    if (/unique/i.test(error.message)) {
      throw new ValidationError('Invoice number collision; please retry');
    }
    throw new Error(`Failed to create invoice: ${error.message}`);
  }
  if (!inserted) throw new Error('Failed to create invoice');

  return computeInvoice(inserted as InvoiceRow);
}

/**
 * List invoices for a school with live-computed figures.
 */
export async function listInvoices(schoolId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');
  let builder = supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (schoolId) builder = builder.eq('school_id', schoolId);
  const { data, error } = await builder.limit(1000);
  if (error) throw new Error(`Failed to list invoices: ${error.message}`);
  const rows = (data || []) as InvoiceRow[];
  const results = await Promise.all(rows.map((r) => computeInvoice(r)));
  results.sort((a, b) => String(b.invoice.invoice_number).localeCompare(String(a.invoice.invoice_number)));
  return results;
}

/**
 * Get a single invoice with live-computed figures.
 */
export async function getInvoice(id: string, schoolId?: string): Promise<InvoiceComputed> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');
  const { data: row } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (!row) throw new NotFoundError('Invoice not found');
  const invoice = row as InvoiceRow;
  if (schoolId && invoice.school_id && invoice.school_id !== schoolId) {
    throw new NotFoundError('Invoice not found in this school');
  }
  return computeInvoice(invoice);
}

/**
 * Delete an invoice.
 */
export async function deleteInvoice(id: string, schoolId?: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');
  const invoice = await getInvoice(id, schoolId);
  const { error } = await supabase.from('invoices').delete().eq('id', invoice.invoice.id);
  if (error) throw new Error(`Failed to delete invoice: ${error.message}`);
}

/**
 * Preview data for the invoice creation form: student + parent info,
 * available fee schedules with their paid/balance figures, and total previous dues.
 */
export async function getInvoicePreviewData(studentId: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');

  const { data: student } = await supabase
    .from('users')
    .select('id, display_name, email, phone_number, class_id, class_ids, student_id, roll_no, address, gender')
    .eq('id', studentId)
    .maybeSingle();
  if (!student) throw new NotFoundError('Student not found');

  const parent = await findParentForStudent(studentId);

  const studentClassIds = await getStudentClassIds(studentId);
  const classMap = await loadClassMap(studentClassIds);
  const className =
    ((student as any)?.class_id && (classMap as any)[(student as any).class_id]
      ? (classMap as any)[(student as any).class_id]
      : Object.values(classMap)[0]) || null;

  const schedules = await listSchedulesForStudent(studentId, schoolId);
  const totalOutstanding = schedules.reduce((sum, s) => sum + toNumber(s.balance), 0);

  return {
    student: student || null,
    parent: parent || null,
    className,
    schedules,
    previousDue: totalOutstanding,
    totalOutstanding,
  };
}

/**
 * List fee schedules applicable to a student (by class) with live paid/balance figures.
 */
async function listSchedulesForStudent(studentId: string, schoolId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const [structures, payments] = await Promise.all([
    fetchAll(() => {
      let q = supabase.from('fee_structures').select('id, name, amount, due_date, class_id, academic_year');
      if (schoolId) q = q.eq('school_id', schoolId);
      return q;
    }),
    fetchAll(() => {
      let q = supabase.from('fee_payments').select('amount, fee_structure_id, student_id');
      if (schoolId) q = q.eq('school_id', schoolId);
      return q;
    }),
  ]);
  const studentClassIds = await getStudentClassIds(studentId);
  const applicable = structures.filter((f: any) => {
    if (f.class_id == null) return true;
    return studentClassIds.includes(f.class_id);
  });
  const paymentsBySchedule = new Map<string, number>();
  for (const p of payments) {
    if (p.student_id !== studentId) continue;
    paymentsBySchedule.set(p.fee_structure_id, (paymentsBySchedule.get(p.fee_structure_id) || 0) + toNumber(p.amount));
  }
  return applicable.map((f: any) => {
    const amount = toNumber(f.amount);
    const paid = paymentsBySchedule.get(f.id) || 0;
    return {
      scheduleId: f.id,
      name: f.name,
      amount,
      paid,
      balance: Math.max(0, amount - paid),
      dueDate: f.due_date || null,
      academicYear: f.academic_year || null,
    };
  });
}

/**
 * Stream a generated PDF into buffers (A4, professional invoice layout).
 */
export async function generateInvoicePdf(id: string, schoolId?: string): Promise<Buffer> {
  const computed = await getInvoice(id, schoolId);
  const PDFDocument = (await import('pdfkit')).default;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  const inv = computed.invoice;
  const student = computed.student as any;
  const parent = computed.parent as any;
  const fee = computed.feeStructure as any;
  const pageWidth = doc.page.width - 100;

  // Header
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#111').text(computed.schoolName || 'Genesis', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(14).font('Helvetica').fillColor('#444').text('INVOICE', { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor('#999').stroke();
  doc.moveDown(1);

  // Invoice meta
  doc.fontSize(10).font('Helvetica').fillColor('#333');
  doc.font('Helvetica-Bold').text(`Invoice No: ${inv.invoice_number}`);
  doc.font('Helvetica').text(`Invoice Date: ${new Date(inv.created_at || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  if (fee?.due_date) doc.text(`Due Date: ${fee.due_date}`);
  doc.moveDown(1.5);

  // Bill To
  doc.font('Helvetica-Bold').fillColor('#111').text('BILL TO');
  doc.font('Helvetica').fillColor('#333');
  doc.text(`Name: ${student?.display_name || 'N/A'}`);
  if (student?.email) doc.text(`Email: ${student.email}`);
  if (student?.phone_number) doc.text(`Phone: ${student.phone_number}`);
  if (computed.className) doc.text(`Class: ${computed.className}`);
  if (student?.roll_no) doc.text(`Roll No: ${student.roll_no}`);
  if (student?.address) doc.text(`Address: ${student.address}`);
  doc.moveDown(1);

  if (parent) {
    doc.font('Helvetica-Bold').fillColor('#111').text('PARENT / GUARDIAN');
    doc.font('Helvetica').fillColor('#333');
    doc.text(`Name: ${parent.display_name || 'N/A'}`);
    if (parent.email) doc.text(`Email: ${parent.email}`);
    if (parent.phone_number) doc.text(`Phone: ${parent.phone_number}`);
    doc.moveDown(1);
  }

  // Fee details
  doc.font('Helvetica-Bold').fillColor('#111').text('FEE DETAILS');
  doc.font('Helvetica').fillColor('#333');
  doc.text(`Fee: ${fee?.name || 'N/A'}`);
  if (fee?.academic_year) doc.text(`Academic Year: ${fee.academic_year}`);
  if (fee?.term) doc.text(`Term: ${fee.term}`);
  doc.moveDown(1);

  // Table
  const tableTop = doc.y;
  const rowHeight = 22;
  const colAmount = 70;
  const colValue = pageWidth - colAmount;
  const rightX = 50 + pageWidth;

  doc.moveTo(50, tableTop).lineTo(rightX, tableTop).strokeColor('#bbb').stroke();
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111');
  doc.text('DESCRIPTION', 50, tableTop + 6, { width: colValue });
  doc.text('AMOUNT', rightX - colAmount, tableTop + 6, { width: colAmount, align: 'right' });
  doc.moveTo(50, tableTop + rowHeight).lineTo(rightX, tableTop + rowHeight).strokeColor('#bbb').stroke();

  doc.font('Helvetica').fillColor('#333');
  const lines: Array<[string, number]> = [
    [fee?.name || 'Fee', computed.feeAmount],
  ];
  if (computed.previousDue > 0) lines.push(['Previous Dues', computed.previousDue]);
  if (computed.discount > 0) lines.push(['Discount', -computed.discount]);
  lines.push(['Total', computed.total]);

  let y = tableTop + rowHeight + 6;
  for (const [label, value] of lines) {
    doc.text(label, 55, y + 4, { width: colValue - 5 });
    doc.font('Helvetica-Bold').text(value.toFixed(2), rightX - colAmount, y + 4, { width: colAmount, align: 'right' });
    doc.font('Helvetica');
    y += rowHeight;
  }
  doc.moveTo(50, y).lineTo(rightX, y).strokeColor('#bbb').stroke();
  doc.moveDown(1);

  // Payment summary
  doc.font('Helvetica-Bold').fillColor('#111').text('PAYMENT SUMMARY');
  doc.font('Helvetica').fillColor('#333');
  doc.text(`Amount Paid: ${computed.amountPaid.toFixed(2)}`);
  doc.text(`Balance Due: ${computed.balance.toFixed(2)}`);
  if (inv.payment_method) doc.text(`Payment Method: ${inv.payment_method}`);
  if (inv.transaction_id) doc.text(`Transaction ID: ${inv.transaction_id}`);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fillColor(computed.balance <= 0 ? '#1a7f37' : '#b54708').text(`Status: ${computed.paymentStatus}`);
  doc.moveDown(2);

  doc.moveTo(50, doc.y).lineTo(rightX, doc.y).strokeColor('#ccc').stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).font('Helvetica').fillColor('#666')
    .text('This is a computer-generated invoice. Figures reflect the latest fee records.', { align: 'center' });

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}
