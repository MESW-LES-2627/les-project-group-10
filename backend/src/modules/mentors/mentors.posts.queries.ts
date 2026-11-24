import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { MentorPostInput } from './mentors.posts.schemas.js';

type Queryable = Pool | PoolClient;

export type MentorPostRow = {
  id: string;
  title: string;
  body: string;
  publishedAt: Date;
  updatedAt: Date;
};

export type PublicMentorPostRow = MentorPostRow & {
  mentorId: string;
  mentorName: string;
  mentorHeadline: string;
};

const POST_COLUMNS = `id, title, body, published_at AS "publishedAt", updated_at AS "updatedAt"`;

async function assertMentor(db: Queryable, userId: string): Promise<void> {
  const { rows } = await db.query<{ onboarding_finished: boolean }>(
    'SELECT onboarding_finished FROM mentor WHERE user_id = $1',
    [userId],
  );
  if (rows.length === 0) {
    throw new HttpError(403, 'not_a_mentor', 'Only mentors can manage free posts');
  }
  if (!rows[0].onboarding_finished) {
    throw new HttpError(409, 'onboarding_required', 'Complete mentor onboarding first');
  }
}

// Locks the post row so concurrent edits/deletes serialize, and rejects an id that does not
// exist or belongs to another mentor with 404 so foreign posts cannot be probed or modified.
async function lockOwnedPost(client: PoolClient, userId: string, postId: string): Promise<void> {
  const { rowCount } = await client.query(
    'SELECT 1 FROM mentor_post WHERE id = $1 AND mentor_id = $2 FOR UPDATE',
    [postId, userId],
  );
  if (!rowCount) throw new HttpError(404, 'post_not_found', 'Post not found');
}

export async function listMentorPosts(userId: string): Promise<MentorPostRow[]> {
  await assertMentor(pool, userId);
  const { rows } = await pool.query<MentorPostRow>(
    `SELECT ${POST_COLUMNS}
       FROM mentor_post
      WHERE mentor_id = $1
      ORDER BY published_at DESC, id DESC`,
    [userId],
  );
  return rows;
}

export async function createMentorPost(
  client: PoolClient,
  userId: string,
  input: MentorPostInput,
): Promise<MentorPostRow> {
  await assertMentor(client, userId);
  const { rows } = await client.query<MentorPostRow>(
    `INSERT INTO mentor_post (mentor_id, title, body)
     VALUES ($1, $2, $3)
     RETURNING ${POST_COLUMNS}`,
    [userId, input.title, input.body],
  );
  return rows[0];
}

export async function updateMentorPost(
  client: PoolClient,
  userId: string,
  postId: string,
  input: MentorPostInput,
): Promise<MentorPostRow> {
  await assertMentor(client, userId);
  await lockOwnedPost(client, userId, postId);
  const { rows } = await client.query<MentorPostRow>(
    `UPDATE mentor_post
        SET title = $2, body = $3, updated_at = now()
      WHERE id = $1
      RETURNING ${POST_COLUMNS}`,
    [postId, input.title, input.body],
  );
  return rows[0];
}

export async function deleteMentorPost(
  client: PoolClient,
  userId: string,
  postId: string,
): Promise<void> {
  await assertMentor(client, userId);
  await lockOwnedPost(client, userId, postId);
  await client.query('DELETE FROM mentor_post WHERE id = $1', [postId]);
}

export async function findPublicMentorPost(
  mentorId: string,
  postId: string,
): Promise<PublicMentorPostRow | undefined> {
  const { rows } = await pool.query<PublicMentorPostRow>(
    `SELECT p.id,
            p.mentor_id AS "mentorId",
            u.username AS "mentorName",
            COALESCE(m.headline, '') AS "mentorHeadline",
            p.title,
            p.body,
            p.published_at AS "publishedAt",
            p.updated_at AS "updatedAt"
       FROM mentor_post p
       JOIN mentor m ON m.user_id = p.mentor_id
       JOIN "user" u ON u.id = m.user_id
      WHERE p.id = $1
        AND p.mentor_id = $2
        AND m.onboarding_finished
        AND NOT u.is_banned
        AND NOT u.is_deleted`,
    [postId, mentorId],
  );
  return rows[0];
}
