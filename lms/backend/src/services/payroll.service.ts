import PDFDocument from 'pdfkit';
import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export async function configureSalary(schoolId: string, data: { staff_id: string; base_salary: number; allowances?: number; deductions?: number }) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  
  const { data: existing, error: fetchErr } = await supabase.from('salary_config').select('id').eq('staff_id', data.staff_id).single();
  if (fetchErr && fetchErr.code !== 'PGRST116') throw new Error('Failed to fetch salary config: ' + fetchErr.message);
  
  if (existing) {
    const { data: result, error } = await supabase.from('salary_config').update(data).eq('staff_id', data.staff_id).select().single();
    if (error) throw new Error(`Failed to configure salary: ${error.message}`);
    return result;
  } else {
    const { data: result, error } = await supabase.from('salary_config').insert({ school_id: schoolId, ...data }).select().single();
    if (error) throw new Error(`Failed to configure salary: ${error.message}`);
    return result;
  }
}

export async function getSalaryConfig(schoolId: string, staffId: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;
  const { data, error } = await supabase.from('salary_config').select('*').eq('school_id', schoolId).eq('staff_id', staffId).single();
  if (error) throw new Error('Failed to fetch salary config: ' + error.message);
  return data;
}

export async function runPayroll(schoolId: string, staffId: string, month: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return null;

  // ponytail: duplicate-month check
  const { data: existing, error: dupErr } = await supabase.from('payroll_runs')
    .select('id').eq('staff_id', staffId).eq('month', month).maybeSingle();
  if (dupErr) throw new Error('Failed to check payroll run: ' + dupErr.message);
  if (existing) {
    logger.warn('Payroll already run for this month', { staffId, month });
    return null;
  }
  
  // 1. Fetch salary config
  const { data: config, error: configErr } = await supabase.from('salary_config').select('*').eq('staff_id', staffId).single();
  if (configErr) throw new Error('Failed to fetch salary config: ' + configErr.message);
  if (!config) throw new Error('Salary configuration not found for this staff member');
  
  const base = Number(config.base_salary);
  const allowances = Number(config.allowances || 0);
  const deductions = Number(config.deductions || 0);
  const net = base + allowances - deductions;
  
  // 2. Insert payroll run record
  const { data: result, error } = await supabase.from('payroll_runs').insert({
    school_id: schoolId,
    staff_id: staffId,
    month,
    base_paid: base,
    allowances_paid: allowances,
    deductions_paid: deductions,
    net_salary: net,
    status: 'paid'
  }).select().single();
  if (error) throw new Error(`Failed to run payroll: ${error.message}`);
  return result;
}

export async function getPayrollRuns(schoolId: string, month: string) {
  const supabase = getSupabaseAdmin(); if (!supabase) return [];
  const { data, error } = await supabase
    .from('payroll_runs')
    .select('*, staff:staff_records(*)')
    .eq('school_id', schoolId)
    .eq('month', month)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Failed to fetch payroll runs: ' + error.message);
  return data || [];
}

export async function generatePayslipPdf(schoolId: string, payrollId: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not available');

  const { data: run, error: runErr } = await supabase.from('payroll_runs').select('*, staff:staff_records(*)').eq('id', payrollId).eq('school_id', schoolId).single();
  if (runErr) throw new Error('Failed to fetch payroll run: ' + runErr.message);
  if (!run) throw new Error('Payroll run not found');

  const staff = run.staff as any;
  const { data: school, error: schoolErr } = await supabase.from('schools').select('name').limit(1).maybeSingle();
  if (schoolErr) throw new Error('Failed to fetch school: ' + schoolErr.message);

  const doc = new PDFDocument({ margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  const pageWidth = doc.page.width - 100;

  doc.fontSize(22).font('Helvetica-Bold').text(school?.name || 'School LMS', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica').text('Staff Payslip', { align: 'center' });
  doc.moveDown(1);

  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke();
  doc.moveDown(1);

  const date = new Date(run.created_at || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.fontSize(10).font('Helvetica');
  doc.text(`Month: ${run.month}`, { continued: true }).text(`Issue Date: ${date}`, { align: 'right' });
  doc.moveDown(1.5);

  doc.font('Helvetica-Bold').text('Staff Details');
  doc.font('Helvetica');
  doc.text(`Name: ${staff?.name || 'N/A'}`);
  doc.text(`Role: ${staff?.role || 'N/A'}`);
  doc.text(`Department: ${staff?.department || 'N/A'}`);
  doc.moveDown(1);

  doc.font('Helvetica-Bold').text('Earnings & Deductions');
  doc.font('Helvetica');
  doc.text(`Base Salary: ₹${Number(run.base_paid).toFixed(2)}`);
  doc.text(`Allowances: ₹${Number(run.allowances_paid).toFixed(2)}`);
  doc.text(`Deductions: ₹${Number(run.deductions_paid).toFixed(2)}`);
  doc.moveDown(1);

  doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').text(`Net Salary Paid: ₹${Number(run.net_salary).toFixed(2)}`, { align: 'right' });
  doc.moveDown(2);

  doc.fontSize(8).font('Helvetica').fillColor('#666').text('This is a computer-generated payslip.', { align: 'center' });

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}
