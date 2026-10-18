import { readFile } from 'node:fs/promises';
import { pool } from './pool.js';

const seedFile = new URL('../../db/seed.sql', import.meta.url);

try {
  const sql = await readFile(seedFile, 'utf8');
  await pool.query(sql);
  console.log('Seed complete');
} finally {
  await pool.end();
}
