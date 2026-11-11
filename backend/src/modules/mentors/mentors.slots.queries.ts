import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db/pool.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { MentorSlotInput } from './mentors.slots.schemas.js';

type Queryable = Pool | PoolClient;

const SLOT_SELECT_SQL = `
  SELECT slot.id, slot.service_id AS "serviceId", s.title AS "serviceTitle",
         to_char(slot.starts_at AT TIME ZONE 'Europe/Lisbon', 'YYYY-MM-DD') AS date,
         to_char(slot.starts_at AT TIME ZONE 'Europe/Lisbon', 'HH24:MI') AS "startTime",
         to_char(slot.ends_at AT TIME ZONE 'Europe/Lisbon', 'HH24:MI') AS "endTime",
         EXISTS (
           SELECT 1 FROM booking b
            WHERE b.availability_slot_id = slot.id AND b.status <> 'cancelled'
         ) AS booked
    FROM mentor_availability_slot slot
    JOIN service s ON s.id = slot.service_id`;

// Postgres' exclusion_violation error code, raised by mentor_availability_slot_no_overlap.
function isOverlapError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === '23P01'
  );
}

async function assertMentor(db: Queryable, userId: string): Promise<void> {
  const { rowCount } = await db.query('SELECT 1 FROM mentor WHERE user_id = $1', [userId]);
  if (!rowCount)
    throw new HttpError(403, 'not_a_mentor', 'Only mentors can manage availability slots');
}

async function assertNotBooked(client: PoolClient, slotId: string): Promise<void> {
  const { rowCount } = await client.query(
    `SELECT 1 FROM booking WHERE availability_slot_id = $1 AND status <> 'cancelled'`,
    [slotId],
  );
  if (rowCount) {
    throw new HttpError(
      409,
      'slot_booked',
      'This slot has an active reservation or booking and cannot be changed or removed',
    );
  }
}

// Resolves the slot's own service (owned by this mentor) and the start/end instants the
// input describes, rejecting anything the service rules out before the database is touched.
async function resolveSlotTimes(client: PoolClient, userId: string, input: MentorSlotInput) {
  const service = await client.query<{ duration_minutes: number }>(
    'SELECT duration_minutes FROM service WHERE id = $1 AND mentor_id = $2',
    [input.serviceId, userId],
  );
  if (service.rows.length === 0) {
    throw new HttpError(400, 'validation_error', 'Invalid input', {
      serviceId: 'Choose one of your own services',
    });
  }

  const times = await client.query<{ starts_at: Date; ends_at: Date }>(
    `SELECT (($1::date + $2::time) AT TIME ZONE 'Europe/Lisbon') AS starts_at,
            (($1::date + $3::time) AT TIME ZONE 'Europe/Lisbon') AS ends_at`,
    [input.date, input.startTime, input.endTime],
  );
  const { starts_at: startsAt, ends_at: endsAt } = times.rows[0];

  if (startsAt <= new Date()) {
    throw new HttpError(400, 'validation_error', 'Invalid input', {
      date: 'The slot must start in the future',
    });
  }
  if (endsAt <= startsAt) {
    throw new HttpError(400, 'validation_error', 'Invalid input', {
      endTime: 'End time must be after the start time',
    });
  }
  const durationMinutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;
  if (durationMinutes < service.rows[0].duration_minutes) {
    throw new HttpError(400, 'validation_error', 'Invalid input', {
      endTime: `This service needs at least ${service.rows[0].duration_minutes} minutes`,
    });
  }

  return { startsAt, endsAt };
}

export async function listMentorSlots(userId: string) {
  await assertMentor(pool, userId);
  const { rows } = await pool.query(
    `${SLOT_SELECT_SQL} WHERE slot.mentor_id = $1 ORDER BY slot.starts_at`,
    [userId],
  );
  return rows;
}

export async function createMentorSlot(client: PoolClient, userId: string, input: MentorSlotInput) {
  await assertMentor(client, userId);
  const { startsAt, endsAt } = await resolveSlotTimes(client, userId, input);

  let slotId: string;
  try {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO mentor_availability_slot (mentor_id, service_id, starts_at, ends_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, input.serviceId, startsAt, endsAt],
    );
    slotId = rows[0].id;
  } catch (error) {
    if (isOverlapError(error)) {
      throw new HttpError(409, 'slot_overlap', 'This slot overlaps one of your existing slots');
    }
    throw error;
  }

  const { rows } = await client.query(`${SLOT_SELECT_SQL} WHERE slot.id = $1`, [slotId]);
  return rows[0];
}

export async function updateMentorSlot(
  client: PoolClient,
  userId: string,
  slotId: string,
  input: MentorSlotInput,
) {
  await assertMentor(client, userId);
  const existing = await client.query(
    'SELECT id FROM mentor_availability_slot WHERE id = $1 AND mentor_id = $2 FOR UPDATE',
    [slotId, userId],
  );
  if (existing.rows.length === 0) throw new HttpError(404, 'slot_not_found', 'Slot not found');
  await assertNotBooked(client, slotId);

  const { startsAt, endsAt } = await resolveSlotTimes(client, userId, input);
  try {
    await client.query(
      `UPDATE mentor_availability_slot SET service_id = $2, starts_at = $3, ends_at = $4 WHERE id = $1`,
      [slotId, input.serviceId, startsAt, endsAt],
    );
  } catch (error) {
    if (isOverlapError(error)) {
      throw new HttpError(409, 'slot_overlap', 'This slot overlaps one of your existing slots');
    }
    throw error;
  }

  const { rows } = await client.query(`${SLOT_SELECT_SQL} WHERE slot.id = $1`, [slotId]);
  return rows[0];
}

export async function deleteMentorSlot(client: PoolClient, userId: string, slotId: string) {
  await assertMentor(client, userId);
  const existing = await client.query(
    'SELECT id FROM mentor_availability_slot WHERE id = $1 AND mentor_id = $2 FOR UPDATE',
    [slotId, userId],
  );
  if (existing.rows.length === 0) throw new HttpError(404, 'slot_not_found', 'Slot not found');
  await assertNotBooked(client, slotId);
  await client.query('DELETE FROM mentor_availability_slot WHERE id = $1', [slotId]);
}
