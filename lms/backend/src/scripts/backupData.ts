/**
 * Logical data backup (pg_dump-free) — dumps every table in the `public`
 * schema to a timestamped JSON file under backups/ so seed-row deletion is
 * fully reversible.
 *
 * Usage: npx tsx src/scripts/backupData.ts
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { getConnectionPool } from '../database/connection-manager';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const pool = getConnectionPool();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.resolve(__dirname, '../../backups');
  fs.mkdirSync(outDir, { recursive: true });

  const tablesRes = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  const tables = tablesRes.rows.map((r: any) => r.table_name) as string[];

  const manifest: Record<string, number> = {};
  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT * FROM "${t}"`);
      const rows = res.rows;
      const file = path.join(outDir, `${ts}__${t}.json`);
      fs.writeFileSync(file, JSON.stringify(rows, null, 0));
      manifest[t] = rows.length;
      console.log(`  ${t}: ${rows.length} rows -> ${path.basename(file)}`);
    } catch (err: any) {
      console.log(`  ${t}: SKIP (${String(err.message).slice(0, 80)})`);
    }
  }

  fs.writeFileSync(path.join(outDir, `${ts}__manifest.json`), JSON.stringify(manifest, null, 2));
  console.log(`\nBackup complete. ${tables.length} tables -> ${outDir}`);
  console.log(`Manifest: ${ts}__manifest.json`);
  await pool.end();
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});