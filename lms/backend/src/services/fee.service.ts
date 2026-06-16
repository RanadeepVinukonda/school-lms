import { v4 as uuidv4 } from 'uuid';
import { collections } from '../firebase/firestore';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { createBulkNotifications } from './notification.service';

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

  // Send fee receipt notification to parents
  try {
    const [studentDoc, scheduleDoc] = await Promise.all([
      collections.users().doc(data.studentId).get(),
      collections.feeSchedules().doc(data.feeScheduleId).get(),
    ]);
    const studentName = studentDoc.exists ? (studentDoc.data()?.displayName || 'Student') : 'Student';
    const scheduleName = scheduleDoc.exists ? (scheduleDoc.data()?.name || 'Fee') : 'Fee';
    const scheduleAmount = scheduleDoc.exists ? (scheduleDoc.data()?.amount || 0) : 0;

    const allPayments = await getStudentPayments(data.studentId);
    const totalPaid = allPayments.reduce((sum: number, p: any) => sum + p.amountPaid, 0);
    const balance = scheduleAmount - totalPaid;

    const allParents = await getAllParents();
    const linkedParents = allParents.filter((p: any) => {
      const kids = p.childrenIds || [];
      return kids.includes(data.studentId);
    });

    if (linkedParents.length > 0) {
      const notifications = linkedParents.map((p: any) => ({
        userId: p.id,
        type: 'fee_payment',
        title: 'Fee Payment Received',
        body: `Rs. ${data.amountPaid} received for ${studentName} — ${scheduleName}. Remaining: Rs. ${balance}`,
        data: {
          studentId: data.studentId,
          feeScheduleId: data.feeScheduleId,
          amountPaid: data.amountPaid,
          remainingBalance: balance,
        },
      }));
      await createBulkNotifications(notifications);
      logger.info('Fee payment notifications sent to parents', { count: linkedParents.length, studentId: data.studentId });
    }
  } catch (err) {
    logger.error('Failed to send fee payment notifications', { error: err });
  }

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
  const [schedules, allPayments, allStudents] = await Promise.all([
    listFeeSchedules() as Promise<any[]>,
    getAllPayments(),
    getAllStudents(),
  ]);

  const reportMap: Record<string, {
    studentId: string;
    studentName: string;
    className: string;
    totalDue: number;
    totalPaid: number;
    balance: number;
    schedules: Array<{ scheduleId: string; name: string; amount: number; paid: number; dueDate: string }>;
  }> = {};

  // Fetch class names
  const classIds = [...new Set(schedules.map((s: any) => s.classId))];
  const classSnapshots = await Promise.all(classIds.map((cid: string) => collections.classes().doc(cid).get()));
  const classMap: Record<string, string> = {};
  for (const snap of classSnapshots) {
    if (snap.exists) classMap[snap.id] = snap.data()?.name || snap.id;
  }

  // Build report: pair every schedule with every student
  for (const s of schedules) {
    for (const st of allStudents) {
      if (!reportMap[st.id]) {
        reportMap[st.id] = {
          studentId: st.id,
          studentName: st.displayName || st.id,
          className: classMap[s.classId] || s.classId,
          totalDue: 0, totalPaid: 0, balance: 0, schedules: [],
        };
      }
      reportMap[st.id].totalDue += s.amount;
      reportMap[st.id].schedules.push({
        scheduleId: s.id, name: s.name, amount: s.amount, paid: 0, dueDate: s.dueDate,
      });
    }
  }

  // Apply payments
  for (const p of allPayments) {
    if (reportMap[p.studentId]) {
      reportMap[p.studentId].totalPaid += p.amountPaid;
      const sched = reportMap[p.studentId].schedules.find((sc: any) => sc.scheduleId === p.feeScheduleId);
      if (sched) sched.paid = (sched.paid || 0) + p.amountPaid;
    } else {
      // Payment exists but student not matched via class — still show
      if (!reportMap[p.studentId]) {
        reportMap[p.studentId] = {
          studentId: p.studentId, studentName: p.studentId, className: '', totalDue: 0, totalPaid: 0, balance: 0, schedules: [],
        };
      }
      reportMap[p.studentId].totalPaid += p.amountPaid;
    }
  }

  // Calculate balances
  for (const key of Object.keys(reportMap)) {
    reportMap[key].balance = reportMap[key].totalDue - reportMap[key].totalPaid;
  }

  return Object.values(reportMap).filter(r => r.totalDue > 0 || r.totalPaid > 0);
}

async function getAllPayments() {
  const snapshot = await collections.payments().get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as any));
}

async function getAllStudents(): Promise<any[]> {
  const snapshot = await collections.users().where('role', '==', 'student').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getAllParents(): Promise<any[]> {
  const snapshot = await collections.users().where('role', '==', 'parent').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
