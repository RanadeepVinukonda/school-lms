/**
 * Read-only inventory of seed-created demo data (v2 — regex-based).
 *
 * Usage: npx tsx src/scripts/inspectSeedData.ts
 *
 * Seed detUuid() IDs have a deterministic shape: group5 is `0000` + first
 * 8 hex chars, and the 3rd group starts with `5`:
 *   `05f59da8-05f5-505f-9da8-000005f59da8`
 * PostgREST `like` treats `_` literally, so we use the regex operator `~`.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const SEED_ID_RE = '^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[0-9a-f]{4}-0000[0-9a-f]{8}$';

async function countTotal(table: string): Promise<number> {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true });
  if (error) return -1;
  return count ?? 0;
}

async function countSeed(table: string): Promise<number> {
  const { count, error } = await sb.from(table).select('*', { count: 'exact', head: true }).or(`id~${SEED_ID_RE}`);
  if (error) return -1;
  return count ?? 0;
}

async function main() {
  console.log('=== SEED DATA INVENTORY v2 ===');
  console.log(`Project: ${process.env.SUPABASE_URL}\n`);

  const tables = ['classes', 'subjects', 'class_subjects', 'teacher_class_subject_assignments', 'class_teachers', 'fee_payments', 'fee_structures', 'exams', 'grades', 'notifications'];
  for (const t of tables) {
    const total = await countTotal(t);
    const seed = await countSeed(t);
    console.log(`  ${t}: total=${total} | seed-id=${seed} | legacy=${total >= 0 && seed >= 0 ? total - seed : 'n/a'}`);
  }

  // firestore_docs counts per collection (paged, head-count per collection is not
  // supported without a filter — count by fetching id per filtered collection)
  console.log('\n  firestore_docs by collection:');
  for (const col of ['examV2', 'examAttemptV2', 'quizV2', 'quizAttemptV2', 'teacherClassSubject']) {
    const { count, error } = await sb.from('firestore_docs').select('*', { count: 'exact', head: true }).eq('collection', col);
    console.log(`    ${col}: ${error ? 'ERR ' + error.message : count ?? 0}`);
  }
  const { count: docsTotal } = await sb.from('firestore_docs').select('*', { count: 'exact', head: true });
  console.log(`    (all collections total: ${docsTotal ?? 'n/a'})`);

  // Legacy student profiles (present in users but have NO Supabase auth account)
  console.log('\n  Legacy-derived analysis:');
  // list ALL auth uids for the legacy check
  const authUids = new Set<string>();
  {
    let page = 1;
    while (true) {
      const { data } = await sb.auth.admin.listUsers({ page, perPage: 100 });
      const users = data?.users || [];
      for (const u of users) authUids.add(u.id);
      if (!users || users.length < 100) break;
      page++;
    }
  }
  const { data: allProfiles } = await sb.from('users').select('id, email, role, class_id');
  const orphanProfiles = (allProfiles || []).filter((p: any) => !authUids.has(p.id));
  console.log(`  Auth users: ${authUids.size} | users.profiles: ${(allProfiles || []).length}`);
  console.log(`  Profiles without auth (legacy FK-protected): ${orphanProfiles.length}`);
  for (const p of orphanProfiles) console.log(`    * [${p.role}] ${p.email} id=${p.id} class_id=${p.class_id || ''}`);

  // Legacy classes: non-detUuid ids
  const { data: classes } = await sb.from('classes').select('id, name, academic_year, code');
  const legacyClasses = (classes || []).filter((c: any) => !new RegExp('^' + SEED_ID_RE.slice(1, -1) + '$').test(c.id));
  console.log(`\n  Non-seed classes (${legacyClasses.length}):`);
  for (const c of legacyClasses) console.log(`    * ${c.name} (${c.academic_year}) code=${c.code || ''} id=${c.id}`);

  // Enrollments/attendance rows that reference legacy students (should be preserved, if any)
  const legacyIds = orphanProfiles.map((p: any) => p.id);
  console.log(`\n  Enrollments referencing legacy students (${legacyIds.length} ids):`);
  for (const id of legacyIds) {
    const { count, error } = await sb.from('student_class_enrollments').select('*', { count: 'exact', head: true }).eq('student_id', id);
    console.log(`    student ${id}: ${error ? 'ERR' : count ?? 0}`);
  }
  console.log('  Attendance referencing legacy students:');
  for (const id of legacyIds) {
    const { count, error } = await sb.from('attendance').select('*', { count: 'exact', head: true }).eq('student_id', id);
    console.log(`    student ${id}: ${error ? 'ERR' : count ?? 0}`);
  }

  console.log('\n=== END (no writes performed) ===');
}

main().catch((e) => { console.error('Inventory failed:', e); process.exit(1); });