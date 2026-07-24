import { getSupabaseAdmin } from './supabase';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';
import { sendPush } from './push.service';

type ReportCategory = 'suggestion' | 'complaint' | 'feedback' | 'improvement' | 'technical_issue';
type ReportPriority = 'low' | 'medium' | 'high';
type ReportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface ReportFeedback {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  className?: string;
  title: string;
  description: string;
  category: ReportCategory;
  priority: ReportPriority;
  status: ReportStatus;
  assignedTo?: string;
  assignedTeacherName?: string;
  remarks?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createReport(data: {
  userId: string;
  userName: string;
  userRole: string;
  className?: string;
  title: string;
  description: string;
  category: ReportCategory;
  priority: ReportPriority;
}) {
  const supabase = getSupabaseAdmin()!;
  const now = new Date().toISOString();
  const report = {
    user_id: data.userId,
    user_name: data.userName,
    user_role: data.userRole,
    class_name: data.className || null,
    title: data.title,
    description: data.description,
    category: data.category,
    priority: data.priority,
    status: 'open',
    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error } = await supabase
    .from('report_feedback')
    .insert(report)
    .select()
    .single();
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
      throw new Error('Report system is not configured yet. Please contact your administrator.');
    }
    throw error;
  }

  logger.info('Report created', { id: inserted.id, category: data.category });

  // Notify admins
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .in('role', ['admin', 'super_admin'])
    .eq('is_active', true);
  if (admins) {
    const notifications = admins.map((a: any) => ({
      userId: a.id,
      type: 'report',
      title: `New ${data.category.replace(/_/g, ' ')}`,
      body: `${data.userName} submitted: ${data.title}`,
      data: { reportId: inserted.id, category: data.category, priority: data.priority },
    }));
    for (const n of notifications) {
      await createNotificationInternal(n);
    }
  }

  return inserted;
}

async function createNotificationInternal(data: {
  userId: string; type: string; title: string; body: string; data?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin()!;
  const now = new Date().toISOString();
  await supabase.from('notifications').insert({
    user_id: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    data: data.data || {},
    priority: 'normal',
    read: false,
    read_at: null,
    created_at: now,
  });
  sendPush(data.userId, data.type, data.title, data.body, data.data);
}

export async function getReports(query: {
  page?: string;
  limit?: string;
  status?: string;
  category?: string;
  priority?: string;
  userRole?: string;
  className?: string;
  search?: string;
}) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  const offset = (page - 1) * limit;
  const supabase = getSupabaseAdmin()!;

  let base = supabase
    .from('report_feedback')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (query.status) base = base.eq('status', query.status);
  if (query.category) base = base.eq('category', query.category);
  if (query.priority) base = base.eq('priority', query.priority);
  if (query.userRole) base = base.eq('user_role', query.userRole);
  if (query.className) base = base.eq('class_name', query.className);
  if (query.search) {
    base = base.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%`);
  }

  const { data, count, error } = await base.range(offset, offset + limit - 1);
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
      logger.warn('report_feedback table not found — migration may not be applied');
      return { items: [], total: 0, page, limit };
    }
    throw error;
  }

  return {
    items: (data || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userRole: r.user_role,
      className: r.class_name,
      title: r.title,
      description: r.description,
      category: r.category,
      priority: r.priority,
      status: r.status,
      assignedTo: r.assigned_to,
      assignedTeacherName: r.assigned_teacher_name,
      remarks: r.remarks,
      resolvedAt: r.resolved_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    total: count || 0,
    page,
    limit,
  };
}

export async function getReportById(id: string) {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('report_feedback').select('*').eq('id', id).single();
  if (error || !data) throw new NotFoundError('Report not found');
  return data;
}

export async function updateReportStatus(id: string, data: {
  status?: ReportStatus;
  assignedTo?: string;
  assignedTeacherName?: string;
  remarks?: string;
}) {
  const supabase = getSupabaseAdmin()!;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.status) update.status = data.status;
  if (data.assignedTo) update.assigned_to = data.assignedTo;
  if (data.assignedTeacherName) update.assigned_teacher_name = data.assignedTeacherName;
  if (data.remarks !== undefined) update.remarks = data.remarks;
  if (data.status === 'resolved') update.resolved_at = new Date().toISOString();

  const { error } = await supabase.from('report_feedback').update(update).eq('id', id);
  if (error) throw error;
  logger.info('Report updated', { id, status: data.status });
}

export async function getReportStats() {
  const supabase = getSupabaseAdmin()!;
  const { data, error } = await supabase.from('report_feedback').select('status, category, user_role, class_name, priority');
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
      logger.warn('report_feedback table not found — migration may not be applied');
      return { byStatus: {}, byCategory: {}, byRole: {}, byClass: {}, total: 0 };
    }
    throw error;
  }

  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  const byClass: Record<string, number> = {};

  for (const r of data || []) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    byRole[r.user_role] = (byRole[r.user_role] || 0) + 1;
    if (r.class_name) byClass[r.class_name] = (byClass[r.class_name] || 0) + 1;
  }

  return { byStatus, byCategory, byRole, byClass, total: data?.length || 0 };
}
