import type { PoolClient } from 'pg';
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
