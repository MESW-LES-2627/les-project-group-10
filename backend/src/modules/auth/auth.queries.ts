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
  username: string,
  email: string,
  passwordHash: string,
): Promise<UserRow> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO "user" (username, email, password_hash) VALUES ($1,$2,$3) RETURNING ${COLUMNS}`,
    [username, email, passwordHash],
  );
  return rows[0];
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
