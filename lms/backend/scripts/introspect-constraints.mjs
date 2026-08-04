import pkg from 'pg';
import 'dotenv/config';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
async function main() {
  const r = await pool.query(
    `select conrelid::regclass tbl, conname, pg_get_constraintdef(oid) def
     from pg_constraint
     where conrelid::regclass::text in ('class_teachers','attendance','exams','staff_records','staff_attendance','notifications','classes','subjects','users','timetable','student_class_enrollments','teacher_class_subject_assignments')
       and contype='c'
     order by 1`
  );
  for (const x of r.rows) console.log(`${x.tbl}.${x.conname} => ${x.def}`);
  const fk = await pool.query(
    `select conrelid::regclass tbl, conname, pg_get_constraintdef(oid) def
     from pg_constraint
     where conrelid::regclass::text in ('student_class_enrollments','attendance','grades','teacher_class_subject_assignments','class_subjects','class_teachers','staff_records','document_store','student_resources','timetable','notifications','subjects','classes')
       and contype='f'`
  );
  console.log('\n--- FKs ---');
  for (const x of fk.rows) console.log(`${x.tbl}.${x.conname} => ${x.def}`);
}
main().catch((e) => { console.error('ERR', e.message); process.exit(1); }).finally(() => pool.end());