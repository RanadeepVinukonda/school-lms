import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function createFeeSchedule(data: {
  name: string;
  amount: number;
  dueDate: string;
  classId: string;
  academicYear: string;
  description?: string;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const schedule = { id, ...data, createdAt: now, updatedAt: now };
  await collections.feeSchedules().doc(id).set(schedule);
  logger.info('Fee schedule created', { id, name: data.name });
  return schedule;
}

export async function listFeeSchedules(classId?: string, academicYear?: string) {
  let query: FirebaseFirestore.Query = collections.feeSchedules();
  if (classId) query = query.where('classId', '==', classId);
  if (academicYear) query = query.where('academicYear', '==', academicYear);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}

export async function getFeeSchedule(id: string) {
  const doc = await collections.feeSchedules().doc(id).get();
  if (!doc.exists) throw new NotFoundError('Fee schedule not found');
  return { ...doc.data(), id: doc.id };
}

export async function recordPayment(data: {
  studentId: string;
  feeScheduleId: string;
  amountPaid: number;
  paymentMethod: string;
  transactionId?: string;
  status?: string;
}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const payment = {
    id,
    ...data,
    status: data.status || 'completed',
    paymentDate: now,
    createdAt: now,
    updatedAt: now,
  };
  await collections.payments().doc(id).set(payment);
  logger.info('Payment recorded', { id, studentId: data.studentId, amount: data.amountPaid });
  return payment;
}

export async function getStudentPayments(studentId: string) {
  const snapshot = await collections.payments().where('studentId', '==', studentId).get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}

export async function getClassPayments(classId: string) {
  const schedules = await listFeeSchedules(classId);
  const scheduleIds = schedules.map((s: any) => s.id);
  if (scheduleIds.length === 0) return [];
  const snapshot = await collections.payments().where('feeScheduleId', 'in', scheduleIds).get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}

export async function getOutstandingReport() {
  const schedules: any[] = await listFeeSchedules() as any[];
  const payments: any[] = await getAllPayments();

  const report: Record<string, { studentId: string; totalDue: number; totalPaid: number; balance: number; schedules: any[] }> = {};

  for (const s of schedules) {
    const studentPayments = payments.filter((p: any) => p.feeScheduleId === s.id);
    for (const rp of studentPayments) {
      if (!report[rp.studentId]) {
        report[rp.studentId] = { studentId: rp.studentId, totalDue: 0, totalPaid: 0, balance: 0, schedules: [] };
      }
      const entry = report[rp.studentId];
      entry.totalDue += s.amount;
      entry.totalPaid += rp.amountPaid;
      entry.balance = entry.totalDue - entry.totalPaid;
      entry.schedules.push({ scheduleId: s.id, name: s.name, amount: s.amount, paid: rp.amountPaid });
    }
  }

  return Object.values(report);
}

async function getAllPayments() {
  const snapshot = await collections.payments().get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as any));
}
