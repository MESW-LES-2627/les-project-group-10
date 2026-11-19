import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool.js';

// The database itself must refuse an account that is an admin and also a student or a mentor.
// Student and mentor may still overlap. Each test uses its own fresh user.

const CHECK_VIOLATION = '23514';
const created: string[] = [];

async function newUser() {
  const id = randomUUID();
  created.push(id);
  await pool.query(
    'INSERT INTO "user" (id, username, email, password_hash) VALUES ($1, $2, $3, $4)',
    [id, `roles-${id.slice(0, 8)}`, `${id}@example.com`, 'unused'],
  );
  return id;
}

const addAdmin = (id: string) => pool.query('INSERT INTO admin (user_id) VALUES ($1)', [id]);
const addStudent = (id: string) => pool.query('INSERT INTO student (user_id) VALUES ($1)', [id]);
const addMentor = (id: string) =>
  pool.query("INSERT INTO mentor (user_id, headline, bio) VALUES ($1, 'h', 'b')", [id]);

async function roles(id: string) {
  const { rows } = await pool.query<{ role: string }>(
    `SELECT 'admin' AS role FROM admin WHERE user_id = $1
     UNION ALL SELECT 'student' FROM student WHERE user_id = $1
     UNION ALL SELECT 'mentor' FROM mentor WHERE user_id = $1
     ORDER BY role`,
    [id],
  );
  return rows.map((row) => row.role);
}

beforeAll(() => {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
}, 30000);

afterAll(async () => {
  await pool.query('DELETE FROM "user" WHERE id = ANY($1::uuid[])', [created]);
  await pool.end();
});

describe('admin is separate from student and mentor', () => {
  it('rejects making a student an admin', async () => {
    const id = await newUser();
    await addStudent(id);
    await expect(addAdmin(id)).rejects.toMatchObject({ code: CHECK_VIOLATION });
    expect(await roles(id)).toEqual(['student']);
  });

  it('rejects making a mentor an admin', async () => {
    const id = await newUser();
    await addMentor(id);
    await expect(addAdmin(id)).rejects.toMatchObject({ code: CHECK_VIOLATION });
    expect(await roles(id)).toEqual(['mentor']);
  });

  it('rejects making an admin a student', async () => {
    const id = await newUser();
    await addAdmin(id);
    await expect(addStudent(id)).rejects.toMatchObject({ code: CHECK_VIOLATION });
    expect(await roles(id)).toEqual(['admin']);
  });

  it('rejects making an admin a mentor', async () => {
    const id = await newUser();
    await addAdmin(id);
    await expect(addMentor(id)).rejects.toMatchObject({ code: CHECK_VIOLATION });
    expect(await roles(id)).toEqual(['admin']);
  });

  it('rejects the whole transaction when one statement breaks the rule', async () => {
    const id = await newUser();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO admin (user_id) VALUES ($1)', [id]);
      await expect(
        client.query('INSERT INTO student (user_id) VALUES ($1)', [id]),
      ).rejects.toMatchObject({ code: CHECK_VIOLATION });
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    expect(await roles(id)).toEqual([]);
  });

  it('still allows an account that is both a student and a mentor', async () => {
    const id = await newUser();
    await addStudent(id);
    await addMentor(id);
    expect(await roles(id)).toEqual(['mentor', 'student']);
  });

  it('serializes two simultaneous inserts, so an admin and a student cannot both win', async () => {
    const id = await newUser();
    const first = await pool.connect();
    const second = await pool.connect();
    try {
      // The first transaction adds the admin row but has not committed yet.
      await first.query('BEGIN');
      await first.query('INSERT INTO admin (user_id) VALUES ($1)', [id]);

      // The second one must wait for it, not slip past the check.
      let settled = false;
      const pending = second
        .query('INSERT INTO student (user_id) VALUES ($1)', [id])
        .then(
          () => 'inserted',
          (error: { code?: string }) => error.code,
        )
        .finally(() => {
          settled = true;
        });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(settled).toBe(false);

      await first.query('COMMIT');
      expect(await pending).toBe(CHECK_VIOLATION);
    } finally {
      first.release();
      second.release();
    }
    expect(await roles(id)).toEqual(['admin']);
  });
});
