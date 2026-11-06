import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';

export type UserRow = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  is_banned: boolean;
  is_deleted: boolean;
};

const COLUMNS = 'id, username, email, password_hash, is_banned, is_deleted';

export async function insertUser(
  client: PoolClient,
  username: string,
  email: string,
  passwordHash: string,
): Promise<UserRow> {
  const { rows } = await client.query<UserRow>(
    `INSERT INTO "user" (username, email, password_hash) VALUES ($1,$2,$3) RETURNING ${COLUMNS}`,
    [username, email, passwordHash],
  );
  return rows[0];
}

export async function insertStudent(client: PoolClient, userId: string): Promise<void> {
  await client.query('INSERT INTO student (user_id) VALUES ($1)', [userId]);
}

// headline stays NULL and onboarding_finished takes its default (false) until onboarding
export async function insertMentor(client: PoolClient, userId: string): Promise<void> {
  await client.query("INSERT INTO mentor (user_id, bio) VALUES ($1, '')", [userId]);
}

// a user's roles are whichever role rows exist
export async function findRoles(userId: string) {
  const student = await pool.query('SELECT 1 FROM student WHERE user_id = $1', [userId]);
  const mentor = await pool.query<{ onboarding_finished: boolean }>(
    'SELECT onboarding_finished FROM mentor WHERE user_id = $1',
    [userId],
  );
  return {
    isStudent: student.rows.length > 0,
    isMentor: mentor.rows.length > 0,
    onboardingFinished: mentor.rows[0]?.onboarding_finished ?? false,
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const { rows } = await pool.query<UserRow>(`SELECT ${COLUMNS} FROM "user" WHERE email = $1`, [
    email,
  ]);
  return rows[0];
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const { rows } = await pool.query<UserRow>(`SELECT ${COLUMNS} FROM "user" WHERE id = $1`, [id]);
  return rows[0];
}
