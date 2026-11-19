import { pool } from '../../db/pool.js';

// Only these columns are ever selected: password_hash never leaves the database.
export type StudentListRow = {
  id: string;
  username: string;
  email: string;
  isBanned: boolean;
  createdAt: Date;
  alsoMentor: boolean;
};

export type MentorListRow = {
  id: string;
  username: string;
  email: string;
  isBanned: boolean;
  createdAt: Date;
  alsoStudent: boolean;
};

export type Page<T> = { users: T[]; total: number };

// Soft-deleted users are hidden. "id" breaks created_at ties so pages stay stable.
// $1 = page size, $2 = rows to skip.

export async function listStudents(page: number, pageSize: number): Promise<Page<StudentListRow>> {
  const { rows } = await pool.query<StudentListRow>(
    `SELECT u.id,
            u.username,
            u.email,
            u.is_banned AS "isBanned",
            u.created_at AS "createdAt",
            EXISTS (SELECT 1 FROM mentor m WHERE m.user_id = u.id) AS "alsoMentor"
     FROM student s
     JOIN "user" u ON u.id = s.user_id
     WHERE NOT u.is_deleted
     ORDER BY u.created_at DESC, u.id
     LIMIT $1 OFFSET $2`,
    [pageSize, (page - 1) * pageSize],
  );
  const { rows: count } = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM student s
     JOIN "user" u ON u.id = s.user_id
     WHERE NOT u.is_deleted`,
  );
  return { users: rows, total: Number(count[0].total) };
}

// Lists every mentor, including those who have not finished onboarding yet.
export async function listMentors(page: number, pageSize: number): Promise<Page<MentorListRow>> {
  const { rows } = await pool.query<MentorListRow>(
    `SELECT u.id,
            u.username,
            u.email,
            u.is_banned AS "isBanned",
            u.created_at AS "createdAt",
            EXISTS (SELECT 1 FROM student s WHERE s.user_id = u.id) AS "alsoStudent"
     FROM mentor m
     JOIN "user" u ON u.id = m.user_id
     WHERE NOT u.is_deleted
     ORDER BY u.created_at DESC, u.id
     LIMIT $1 OFFSET $2`,
    [pageSize, (page - 1) * pageSize],
  );
  const { rows: count } = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM mentor m
     JOIN "user" u ON u.id = m.user_id
     WHERE NOT u.is_deleted`,
  );
  return { users: rows, total: Number(count[0].total) };
}
