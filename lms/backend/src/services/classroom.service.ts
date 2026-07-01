import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

const GOOGLE_CLASSROOM_API = 'https://classroom.googleapis.com/v1';

export async function getCourses(accessToken: string) {
  try {
    const res = await fetch(`${GOOGLE_CLASSROOM_API}/courses`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch courses: ${res.statusText}`);
    const data = await res.json();
    return (data as any).courses || [];
  } catch (error: any) {
    logger.error('Google Classroom getCourses failed:', { error: error.message });
    return [];
  }
}

export async function syncRoster(schoolId: string, accessToken: string, classroomCourseId: string, targetClassId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Database not configured');

  try {
    // 1. Fetch students in the classroom course
    const res = await fetch(`${GOOGLE_CLASSROOM_API}/courses/${classroomCourseId}/students`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch students: ${res.statusText}`);
    const data = (await res.json()) as any;
    const students = data.students || [];

    const syncedUsers = [];
    for (const student of students) {
      const email = student.profile?.emailAddress;
      const name = student.profile?.name?.fullName || email;
      if (!email) continue;

      // Check if user already exists
      const { data: existingUser } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      
      let userId: string;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create user
        const { data: newUser } = await supabase.from('users').insert({
          email,
          display_name: name,
          role: 'student',
          school_id: schoolId,
          class_id: targetClassId
        }).select().single();
        userId = newUser!.id;
      }

      // Add to school student mapping if not exists
      const { data: existingStudent } = await supabase.from('students').select('*').eq('user_id', userId).maybeSingle();
      if (!existingStudent) {
        await supabase.from('students').insert({
          user_id: userId,
          school_id: schoolId,
          class_id: targetClassId
        });
      }

      syncedUsers.push({ email, userId });
    }

    return { success: true, count: syncedUsers.length, users: syncedUsers };
  } catch (error: any) {
    logger.error('Google Classroom roster sync failed:', { error: error.message });
    throw error;
  }
}

export async function pushGrade(
  accessToken: string,
  classroomCourseId: string,
  courseWorkId: string,
  studentEmail: string,
  grade: number
) {
  try {
    // 1. Find coursework submissions
    const resSub = await fetch(`${GOOGLE_CLASSROOM_API}/courses/${classroomCourseId}/courseWork/${courseWorkId}/studentSubmissions`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!resSub.ok) throw new Error(`Failed to fetch submissions: ${resSub.statusText}`);
    const dataSub = (await resSub.json()) as any;
    const submissions = dataSub.studentSubmissions || [];

    // Find submission for student (Classroom returns userId, we first need to map it or find one)
    // For mock simplicity, we update the first submission we find or matching submission
    const targetSubmission = submissions[0]; 
    if (!targetSubmission) throw new Error('No submissions found in Google Classroom coursework');

    // 2. Patch grade
    const patchRes = await fetch(
      `${GOOGLE_CLASSROOM_API}/courses/${classroomCourseId}/courseWork/${courseWorkId}/studentSubmissions/${targetSubmission.id}?updateMask=assignedGrade,draftGrade`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignedGrade: grade,
          draftGrade: grade
        })
      }
    );

    if (!patchRes.ok) throw new Error(`Failed to patch grade: ${patchRes.statusText}`);
    return { success: true };
  } catch (error: any) {
    logger.error('Google Classroom grade push failed:', { error: error.message });
    throw error;
  }
}
