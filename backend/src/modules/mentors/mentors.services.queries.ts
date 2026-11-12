import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { MentorServiceInput } from './mentors.services.schemas.js';

type Queryable = Pool | PoolClient;

const SERVICE_SELECT_SQL = `
  SELECT id, title, description, price_cents AS "priceCents",
         duration_minutes AS "durationMinutes", is_active AS "isActive"
    FROM service`;

async function assertMentor(db: Queryable, userId: string): Promise<void> {
  const { rowCount } = await db.query('SELECT 1 FROM mentor WHERE user_id = $1', [userId]);
  if (!rowCount) throw new HttpError(403, 'not_a_mentor', 'Only mentors can manage services');
}

// Locks the service row so a concurrent update/deactivation serializes with this one, and
// rejects an id that does not exist or belongs to another mentor the same way (404), so a
// request against someone else's service looks the same as a request against no service.
async function lockOwnedService(
  client: PoolClient,
  userId: string,
  serviceId: string,
): Promise<void> {
  const { rowCount } = await client.query(
    'SELECT 1 FROM service WHERE id = $1 AND mentor_id = $2 FOR UPDATE',
    [serviceId, userId],
  );
  if (!rowCount) throw new HttpError(404, 'service_not_found', 'Service not found');
}

// Every service the mentor owns, active and inactive, for their own management page.
export async function listMentorServices(userId: string) {
  await assertMentor(pool, userId);
  const { rows } = await pool.query(`${SERVICE_SELECT_SQL} WHERE mentor_id = $1 ORDER BY title`, [
    userId,
  ]);
  return rows;
}

export async function createMentorService(
  client: PoolClient,
  userId: string,
  input: MentorServiceInput,
) {
  await assertMentor(client, userId);
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO service (mentor_id, title, description, price_cents, duration_minutes)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, input.title, input.description, input.priceCents, input.durationMinutes],
  );
  const { rows: service } = await client.query(`${SERVICE_SELECT_SQL} WHERE id = $1`, [rows[0].id]);
  return service[0];
}

// Changing title, description, price or duration only ever touches the service row: bookings
// keep the snapshot they were created with (see migration 009), so past agreements don't move.
export async function updateMentorService(
  client: PoolClient,
  userId: string,
  serviceId: string,
  input: MentorServiceInput,
) {
  await assertMentor(client, userId);
  await lockOwnedService(client, userId, serviceId);
  await client.query(
    `UPDATE service SET title = $2, description = $3, price_cents = $4, duration_minutes = $5
      WHERE id = $1`,
    [serviceId, input.title, input.description, input.priceCents, input.durationMinutes],
  );
  const { rows } = await client.query(`${SERVICE_SELECT_SQL} WHERE id = $1`, [serviceId]);
  return rows[0];
}

// Deactivating (or reactivating) only flips is_active. A deactivated service is filtered out
// of new checkouts and the public profile, but existing bookings keep referencing it untouched.
export async function setMentorServiceActive(
  client: PoolClient,
  userId: string,
  serviceId: string,
  isActive: boolean,
) {
  await assertMentor(client, userId);
  await lockOwnedService(client, userId, serviceId);
  await client.query('UPDATE service SET is_active = $2 WHERE id = $1', [serviceId, isActive]);
  const { rows } = await client.query(`${SERVICE_SELECT_SQL} WHERE id = $1`, [serviceId]);
  return rows[0];
}
