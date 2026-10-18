import type { PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { MentorOnboardingInput } from './mentors.schemas.js';

// Saves the whole onboarding for one mentor. Call it inside a transaction: if anything
// throws, the transaction rolls back and nothing is saved.
export async function completeOnboarding(
  client: PoolClient,
  userId: string,
  input: MentorOnboardingInput,
): Promise<void> {
  // FOR UPDATE locks the mentor row, so two simultaneous submissions run one after the
  // other and the second one sees onboarding_finished = true.
  const { rows } = await client.query<{ onboarding_finished: boolean }>(
    'SELECT onboarding_finished FROM mentor WHERE user_id = $1 FOR UPDATE',
    [userId],
  );
  if (rows.length === 0) {
    throw new HttpError(403, 'not_a_mentor', 'Only mentors can complete mentor onboarding');
  }
  if (rows[0].onboarding_finished) {
    throw new HttpError(409, 'onboarding_finished', 'Your mentor profile is already set up');
  }

  await client.query('UPDATE "user" SET username = $2 WHERE id = $1', [userId, input.username]);

  await client.query(
    `UPDATE mentor
        SET headline = $2, bio = $3, location = $4, languages = $5, skills = $6,
            tagline = $7, linkedin_url = $8, onboarding_finished = true
      WHERE user_id = $1`,
    [
      userId,
      input.headline,
      input.bio,
      input.location,
      input.languages,
      input.skills,
      input.tagline,
      input.linkedinUrl || null,
    ],
  );

  // subjects arrive as category names; every name must match a category
  const subjects = [...new Set(input.subjects)];
  const linked = await client.query(
    `INSERT INTO mentor_category (mentor_id, category_id)
     SELECT $1, id FROM category WHERE name = ANY($2::text[])`,
    [userId, subjects],
  );
  if ((linked.rowCount ?? 0) !== subjects.length) {
    throw new HttpError(400, 'validation_error', 'Invalid input', {
      subjects: 'One of the chosen subjects does not exist',
    });
  }

  for (const service of input.services) {
    await client.query(
      `INSERT INTO service (mentor_id, title, description, price_cents, duration_minutes)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, service.title, service.description, service.priceCents, service.durationMinutes],
    );
  }
}

type MentorRow = {
  id: string;
  username: string;
  headline: string | null;
  tagline: string | null;
  bio: string;
  location: string | null;
  languages: string[];
  linkedin_url: string | null;
  skills: string[];
};

type ServiceRow = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  duration_minutes: number;
};

// A mentor's public profile. Only finished, active mentors are visible, so a mentor who is
// banned, deleted or still in onboarding looks the same as an id that does not exist.
export async function findPublicMentor(id: string) {
  const { rows } = await pool.query<MentorRow>(
    `SELECT m.user_id AS id, u.username, m.headline, m.tagline, m.bio, m.location,
            m.languages, m.linkedin_url, m.skills
       FROM mentor m
       JOIN "user" u ON u.id = m.user_id
      WHERE m.user_id = $1 AND m.onboarding_finished AND NOT u.is_banned AND NOT u.is_deleted`,
    [id],
  );
  const mentor = rows[0];
  if (!mentor) return undefined;

  const subjects = await pool.query<{ name: string }>(
    `SELECT c.name
       FROM mentor_category mc
       JOIN category c ON c.id = mc.category_id
      WHERE mc.mentor_id = $1
      ORDER BY c.name`,
    [id],
  );
  const services = await pool.query<ServiceRow>(
    `SELECT id, title, description, price_cents, duration_minutes
       FROM service
      WHERE mentor_id = $1 AND is_active
      ORDER BY price_cents, title`,
    [id],
  );

  return {
    id: mentor.id,
    username: mentor.username,
    headline: mentor.headline ?? '',
    tagline: mentor.tagline ?? '',
    bio: mentor.bio,
    location: mentor.location ?? '',
    languages: mentor.languages,
    linkedinUrl: mentor.linkedin_url ?? '',
    skills: mentor.skills,
    subjects: subjects.rows.map((row) => row.name),
    services: services.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      priceCents: row.price_cents,
      durationMinutes: row.duration_minutes,
    })),
  };
}
