function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

export async function withAdvisoryLock<T>(
  lockId: string,
  fn: () => Promise<T>,
  client: any,
  _timeoutMs = 5000
): Promise<T> {
  const lockHash = hashCode(lockId);
  try {
    const acquired = await client.query('SELECT pg_try_advisory_lock($1)', [lockHash]);
    if (!acquired.rows[0].pg_try_advisory_lock) {
      throw new Error(`Could not acquire lock: ${lockId}`);
    }
    return await fn();
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [lockHash]);
  }
}
