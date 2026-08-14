# Zero-Downtime Database Migrations

## The Expand/Contract Pattern

Schema changes must not require downtime. Drizzle ORM migrations are fast, but some operations (ALTER TABLE with defaults on large tables, column renames) can lock tables for minutes. Use the Expand/Contract pattern:

### Phase 1: Expand (Add)
Add new columns as **nullable** or **with no default**. This is safe and non-blocking.

```sql
-- Safe: Add nullable column
ALTER TABLE users ADD COLUMN display_name_new TEXT;

-- Safe: Add column with no default
ALTER TABLE fee_payments ADD COLUMN receipt_url TEXT;

-- Safe: Add index (CONCURRENTLY to avoid locks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
```

**Drizzle migration:**
```ts
// migrations/xxxx_add_new_columns.ts
export const up = async (db: DrizzleDB) => {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name_new TEXT`);
};

export const down = async (db: DrizzleDB) => {
  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS display_name_new`);
};
```

### Phase 2: Migrate (Backfill)
Backfill the new column in batches to avoid long-running transactions.

```ts
async function backfillDisplayName(db: DrizzleDB) {
  const BATCH_SIZE = 1000;
  let processed = 0;

  while (true) {
    const result = await db.execute(sql`
      UPDATE users
      SET display_name_new = display_name
      WHERE display_name_new IS NULL
      LIMIT ${BATCH_SIZE}
      RETURNING id
    `);

    if (result.length === 0) break;
    processed += result.length;
    console.log(`Backfilled ${processed} users...`);
  }
}
```

### Phase 3: Deploy Code
Deploy application code that reads from the new column. Both old and new columns must be populated during the transition period.

### Phase 4: Contract (Drop)
Once the new column is fully populated and code has been deployed, drop the old column.

```sql
ALTER TABLE users DROP COLUMN IF EXISTS display_name;
```

---

## Migration Checklist

| Operation | Safe Online? | Notes |
|-----------|-------------|-------|
| Add nullable column | ✅ Yes | Instant metadata change |
| Add column with default | ⚠️ Caution | Rewrites table rows (locked) |
| Add index | ✅ Yes | Use `CONCURRENTLY` |
| Drop index | ✅ Yes | Instant |
| Add foreign key | ⚠️ Caution | Lock on referenced table |
| Drop column | ✅ Yes | Just metadata, but code must not reference it |
| Rename column | ❌ No | Requires Expand/Contract |
| Change column type | ❌ No | Requires Expand/Contract |
| Add NOT NULL | ⚠️ Caution | Must verify all rows have values first |
| Create table | ✅ Yes | Instant |
| Drop table | ⚠️ Caution | Code must not reference it |

---

## CI/CD Integration

```bash
# In CI workflow:
npx drizzle-kit generate --config drizzle.config.ts
git diff --exit-code supabase/migrations/ || (echo '⚠️  Migration out of sync'; exit 1)
```

This ensures migration files are committed alongside schema changes, and CI catches any drift.

---

## Rollback Procedure

```bash
# Rollback specific migration
npx drizzle-kit drop --config drizzle.config.ts

# Or manually (for DDL-only changes):
psql $DATABASE_URL -c "ALTER TABLE users DROP COLUMN IF EXISTS new_column;"
```

Always verify backward migration before applying forward migration.
