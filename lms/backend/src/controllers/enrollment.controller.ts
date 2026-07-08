import type { Request, Response } from 'express';
import { getSupabaseAdmin } from '../services/supabase';

/**
 * Get current student's enrollments and a consolidated list of concept release statuses 
 * for all textbooks they have access to.
 */
export async function getMyEnrollments(req: Request, res: Response) {
  const supabase = getSupabaseAdmin();
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    return;
  }

  const studentId = req.user.uid;
  
  // Fetch student user doc to get classId
  const { data: userRow } = await supabase.from('users').select('class_id').eq('id', studentId).maybeSingle();
  const studentClassId = userRow?.class_id as string | undefined;

  // Fetch student enrollments
  const { data: enrollmentRows } = await supabase.from('enrollments')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'active');
  const enrollments = (enrollmentRows || []).map((row: any) => ({ id: row.id, ...row }));

  // Fetch textbooks for the student's class
  const textbooks: any[] = [];
  if (studentClassId) {
    const { data: textbookRows } = await supabase.from('textbooks')
      .select('*')
      .eq('class_id', studentClassId);
    textbooks.push(...(textbookRows || []).map((row: any) => ({ id: row.id, ...row })));
  }

  // Fetch concept release statuses for all textbooks
  const conceptReleases: any[] = [];
  if (studentClassId && textbooks.length > 0) {
    const tbIds = textbooks.map((t) => t.id);
    const { data: releaseRows } = await supabase.from('firestore_docs')
      .select('doc_id, data')
      .eq('collection', 'conceptReleases')
      .in('data->>textbookId', tbIds);
    conceptReleases.push(...(releaseRows || []).map((row: any) => ({ id: row.doc_id, ...(row.data as object) })));
  }

  res.json({
    success: true,
    data: {
      enrollments,       // Course enrollments
      conceptReleases,   // All concept release statuses (textbookId, conceptId, questionBankReleased, etc)
    }
  });
}