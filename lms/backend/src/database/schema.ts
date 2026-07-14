// Typed table definitions — SQL column sets and camelCase conversion helpers

export const TYPED_TABLES: Record<string, Set<string>> = {
  users: new Set(['id','email','display_name','role','phone_number','photo_url','is_active','class_ids','class_id','student_id','roll_no','academic_year','children_ids','gender','password','streak_count','last_active_date','language','created_at','updated_at','data','tutorial_seen','instance_id','aud','encrypted_password','email_confirmed_at','invited_at','confirmation_token','confirmation_sent_at','recovery_token','recovery_sent_at','email_change_token_new','email_change','email_change_sent_at','last_sign_in_at','raw_app_meta_data','raw_user_meta_data','is_super_admin','phone','phone_confirmed_at','phone_change','phone_change_token','phone_change_sent_at','confirmed_at','email_change_token_current','email_change_confirm_status','banned_until','reauthentication_token','reauthentication_sent_at','is_sso_user','deleted_at','is_anonymous','school_id']),
  schools: new Set(['id','name','subdomain','logo_url','primary_color','plan','created_at','updated_at']),
  subscriptions: new Set(['id','school_id','plan','status','student_limit','teacher_limit','features','starts_at','expires_at','created_at']),
  revoked_tokens: new Set(['id','token_hash','revoked_at']),
  user_mfa: new Set(['user_id','secret','verified','created_at']),
  textbooks: new Set(['id','title','subject_id','class_id','teacher_id','description','cover_image','storage_path','pdf_url','academic_year','status','chapter_count','total_concepts','completed_concepts','failure_reason','logs','processing_stage','processing_progress','created_at','updated_at','data','school_id']),
  chapters: new Set(['id','textbook_id','title','order','summary','created_at','updated_at','data','school_id']),
  concepts: new Set(['id','chapter_id','textbook_id','title','order','notes','video_links','created_at','updated_at','data','school_id']),
  concept_notes: new Set(['id','concept_id','textbook_id','chapter_id','summary','notes','key_points','formulas','examples','learning_objectives','embedding','updated_at','data','school_id']),
  concept_videos: new Set(['id','concept_id','textbook_id','chapter_id','video_id','title','description','channel','thumbnail','duration','score','embedding','created_at','data','school_id']),
  concept_questions: new Set(['id','concept_id','textbook_id','chapter_id','question','type','difficulty','options','answer','explanation','passage_text','created_at','data','school_id']),
  concept_resources: new Set(['id','concept_id','textbook_id','chapter_id','title','url','source','description','score','embedding','created_at','data','school_id']),
  processing_jobs: new Set(['id','textbook_id','status','progress','current_step','error','updated_at','data']),
  raw_pages: new Set(['id','textbook_id','page_num','text','created_at','data']),
  subjects: new Set(['id','name','code','description','type','creditHours','icon','color','classId','teacherId','isActive','academicYear','academic_year','createdAt','updatedAt','category','school_id']),
  enrollments: new Set(['id','studentId','courseId','status','role']),
  classes: new Set(['id','name','code','description','grade','section','academicYear','roomNumber','teacherIds','subjectIds','studentCount','teacherCount','maxStudents','startDate','endDate','academic_year','status','isActive','createdAt','updatedAt','school_id']),
  grades: new Set(['id','studentId','courseId','assignmentId','score','maxScore','letterGrade','comments','date','semester','academicYear','academic_year','createdAt','created_at']),
  assignments: new Set(['id','title','description','subjectId','subjectName','chapterId','textbookId','lessonId','courseId','dueDate','points','maxAttempts','allowLateSubmission','latePenaltyPercent','passingGrade','status','submissionCount','isPublished','academicYear','academic_year','createdAt','updatedAt','school_id']),
  exams: new Set(['id','title','description','subjectId','subjectName','courseId','duration','totalPoints','passingScore','questions','status','startDate','endDate','isProctored','shuffleQuestions','showResults','academicYear','academic_year','createdAt','updatedAt','school_id']),
  notifications: new Set(['id','userId','title','message','type','read','readAt','createdAt','school_id']),
  submissions: new Set(['id','assignmentId','studentId','content','attachments','submittedAt','status','attemptNumber','grade','feedback','gradedBy','gradedAt']),
  corrections: new Set(['id','examId','studentId','teacherId','questionMarks','totalMarks','overallFeedback','status','correctedAt']),
  quizzes: new Set(['id','title','description','lessonId','chapterId','textbookId','subjectId','subjectName','timeLimit','questions','questionCount','status','school_id']),
  quizv2: new Set(['id','title','description','lessonId','chapterId','textbookId','subjectId','subjectName','timeLimit','questions','questionCount','status','school_id']),
  timetable: new Set(['id','class_id','day','period','subject_id','teacher_id','room','start_time','end_time','academic_year','created_at','updated_at','status','archived_at','deleted_at','school_id']),
  lessons: new Set(['id','textbookId','chapterId','title','contentType','videoUrl','content','duration','order','quizId','assignmentId','school_id']),
  attendance: new Set(['id','student_id','class_id','date','status','marked_by','note','marked_at','academic_year','school_id','created_at','updated_at']),
  auditlogs: new Set(['id','action','targetId','targetType','targetName','performedBy','performedByName','performedByRole','oldValue','newValue','summary','timestamp']),
  auditLogs: new Set(['id','action','targetId','targetType','targetName','performedBy','performedByName','performedByRole','oldValue','newValue','summary','timestamp']),
  concept_releases: new Set(['id','class_id','textbook_id','chapter_id','concept_id','teacher_id','question_bank_released','assignments_released','mind_map_released','updated_at','completed','notes_released','lecture_released','test_released','school_id']),
};

export function isTyped(c: string): boolean { return c in TYPED_TABLES; }
export function table(c: string): string { return isTyped(c) ? c.toLowerCase() : 'firestore_docs'; }
export function typedCols(c: string): Set<string> | undefined { return TYPED_TABLES[c]; }

// ── camelCase ↔ snake_case with acronym support ──
const ACRONYMS = new Set(['url','pdf','id','html','css','json','xml','api','ui','ux','aws','http','https','sql','smtp']);

export function camelToSnake(s: string): string {
  let r = s.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2');
  r = r.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  return r.toLowerCase();
}

export function snakeToCamel(s: string): string {
  const parts = s.split('_');
  if (parts.length === 1) return parts[0];
  let r = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const w = parts[i];
    r += ACRONYMS.has(w) ? w.toUpperCase() : (w.charAt(0).toUpperCase() + w.slice(1));
  }
  return r;
}

const CAMEL_OVERRIDES: Record<string, string> = {
  photo_url: 'photoURL',
  pdf_url: 'pdfUrl',
  cover_image: 'coverImage',
  storage_path: 'storagePath',
  class_id: 'classId',
  class_ids: 'classIds',
};

export function toJsCol(_tableName: string, sqlKey: string): string {
  if (sqlKey === 'data' || sqlKey === 'id' || sqlKey === 'created_at' || sqlKey === 'updated_at') return sqlKey;
  return CAMEL_OVERRIDES[sqlKey] || snakeToCamel(sqlKey);
}

export function toSqlCol(c: string, jsKey: string): string {
  if (typedCols(c)?.has(jsKey)) return jsKey;
  return camelToSnake(jsKey);
}

export function buildDocData(row: Record<string, unknown>, c: string): Record<string, unknown> {
  const jsonb = (row.data as Record<string, unknown>) || {};
  const result: Record<string, unknown> = { ...jsonb };
  for (const [k, v] of Object.entries(row)) {
    if (k === 'data') continue;
    const jsKey = toJsCol(c, k);
    if (jsKey !== k || !(jsKey in jsonb)) result[jsKey] = v;
  }
  return result;
}
