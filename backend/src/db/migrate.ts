import { readdir, readFile } from 'node:fs/promises';
import { pool } from './pool.js';

// applies the numbered .sql files in order and records each one
const migrationsDir = new URL('../../db/migrations/', import.meta.url);

try {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migration (
            filename    TEXT PRIMARY KEY,
            applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )`,
  );

  const { rows } = await pool.query<{ filename: string }>('SELECT filename FROM schema_migration');

  const applied = new Set(rows.map((r) => r.filename));
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(new URL(file, migrationsDir), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migration (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  console.log('Migrations up to date');
} finally {
  await pool.end(); // end connection
}
