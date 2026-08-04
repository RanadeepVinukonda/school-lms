import pkg from 'pg';
import 'dotenv/config';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
async function q(t, p) { const { rows } = await pool.query(t, p); return rows; }

const tables = ['schools','subscriptions','users','classes','subjects','enrollments','student_class_enrollments',
'attendance','exams','grades','timetable','notifications','staff_records','staff_attendance',
'exam_attempts','quiz_attempts','submissions','student_resources','resource_requests',
'teacher_class_subject_assignments','class_subjects','class_teachers','notice_board',
'curriculum_plans','concept_mastery','concept_progress','ai_usage','ai_tutor_sessions',
'firestore_docs','nosql_docs','document_store','concept_releases','report_feedback','quizv2'];

async function main(){
  for(const t of tables){
    try{
      const cols = await q(`select column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,[t]);
      console.log(`\n@@@ ${t}`);
      console.log(cols.map(c=>`${c.column_name}:${c.data_type}${c.is_nullable==='NO'?'!':''}${c.column_default?'='+c.column_default:''}`).join(' | '));
    }catch(e){ console.log(`\n@@@ ${t}: ERR ${e.message}`); }
  }
  console.log('\n@@@ schools data'); console.table(await q(`select * from public.schools`).catch(()=>[]));
  console.log('@@@ subscriptions data'); console.table(await q(`select * from public.subscriptions`).catch(()=>[]));
  console.log('@@@ classes data'); console.table(await q(`select * from public.classes`).catch(()=>[]));
  console.log('@@@ subjects data'); console.table(await q(`select * from public.subjects limit 20`).catch(()=>[]));
  console.log('@@@ enrollments'); console.table(await q(`select * from public.enrollments limit 10`).catch(()=>[]));
  console.log('@@@ student_class_enrollments'); console.table(await q(`select * from public.student_class_enrollments limit 10`).catch(()=>[]));
  console.log('@@@ teacher_class_subject_assignments'); console.table(await q(`select * from public.teacher_class_subject_assignments limit 10`).catch(()=>[]));
}
main().catch(e=>{console.error('FATAL',e.message);process.exit(1);}).finally(()=>pool.end());