import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';
import { hashPassword } from '../../src/modules/auth/password.js';
import { createSessionToken } from '../../src/modules/auth/session.js';

const ids = {
  owner: randomUUID(),
  other: randomUUID(),
  student: randomUUID(),
  banned: randomUUID(),
  deleted: randomUUID(),
};
let server: Server;
let origin: string;
let hourService: string; // owner's service, 60 minutes
let quickService: string; // owner's service, 30 minutes
let otherService: string; // belongs to `other`, not `owner`

function request(path: string, userId?: string, body?: unknown, method?: string) {
  return fetch(`${origin}/api${path}`, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: {
      ...(userId ? { Cookie: `session=${createSessionToken(userId)}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function slots(id = ids.owner) {
  const response = await request('/mentors/me/slots', id);
  expect(response.status).toBe(200);
  return (await response.json()).slots;
}

// Days far enough in the future that "now" never catches up with the fixture during a run.
function futureDate(daysFromNow: number): string {
  const date = new Date(Date.now() + daysFromNow * 86_400_000);
  return date.toISOString().slice(0, 10);
}
const day = futureDate(20);

beforeAll(async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
  const password = await hashPassword('SlotsTest123!');
  for (const [role, id] of Object.entries(ids)) {
    await pool.query(
      'INSERT INTO "user" (id, username, email, password_hash, is_banned, is_deleted) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, role, `${id}@example.com`, password, role === 'banned', role === 'deleted'],
    );
    if (role !== 'student')
      await pool.query(
        'INSERT INTO mentor (user_id, headline, bio, onboarding_finished) VALUES ($1,$2,$3,true)',
        [id, 'Headline', 'Bio'],
      );
  }
  await pool.query('INSERT INTO student (user_id) VALUES ($1)', [ids.student]);

  const hour = await pool.query(
    "INSERT INTO service (mentor_id,title,description,price_cents,duration_minutes) VALUES ($1,'Hour session','Desc',3000,60) RETURNING id",
    [ids.owner],
  );
  hourService = hour.rows[0].id;
  const quick = await pool.query(
    "INSERT INTO service (mentor_id,title,description,price_cents,duration_minutes) VALUES ($1,'Quick session','Desc',1500,30) RETURNING id",
    [ids.owner],
  );
  quickService = quick.rows[0].id;
  const other = await pool.query(
    "INSERT INTO service (mentor_id,title,description,price_cents,duration_minutes) VALUES ($1,'Other mentor session','Desc',2000,60) RETURNING id",
    [ids.other],
  );
  otherService = other.rows[0].id;

  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing HTTP test address');
  origin = `http://127.0.0.1:${address.port}`;
}, 30000);

afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await pool.query('DELETE FROM booking WHERE student_id = $1', [ids.student]);
  await pool.query('DELETE FROM "user" WHERE id = ANY($1::uuid[])', [Object.values(ids)]);
  await pool.end();
});

describe('mentor availability slot management', () => {
  it('creates a future slot and lists it after refresh', async () => {
    const response = await request('/mentors/me/slots', ids.owner, {
      serviceId: hourService,
      date: day,
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(response.status).toBe(201);
    const created = (await response.json()).slot;
    expect(created).toMatchObject({
      serviceId: hourService,
      serviceTitle: 'Hour session',
      date: day,
      startTime: '09:00',
      endTime: '10:00',
      booked: false,
    });
    expect(await slots()).toContainEqual(created);
  });

  it('rejects an overlapping slot, even for a different service, without writing it', async () => {
    const before = await slots();
    const response = await request('/mentors/me/slots', ids.owner, {
      serviceId: quickService,
      date: day,
      startTime: '09:30',
      endTime: '10:30',
    });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe('slot_overlap');
    expect(await slots()).toEqual(before);
  });

  it('allows a back-to-back slot sharing a boundary with another', async () => {
    const response = await request('/mentors/me/slots', ids.owner, {
      serviceId: quickService,
      date: day,
      startTime: '10:00',
      endTime: '10:30',
    });
    expect(response.status).toBe(201);
  });

  it.each([
    [
      'is in the past',
      () => ({ serviceId: hourService, date: '2020-01-01', startTime: '09:00', endTime: '10:00' }),
      'date',
    ],
    [
      'ends before it starts',
      () => ({
        serviceId: hourService,
        date: futureDate(21),
        startTime: '12:00',
        endTime: '11:00',
      }),
      'endTime',
    ],
    [
      'is shorter than the service requires',
      () => ({
        serviceId: hourService,
        date: futureDate(21),
        startTime: '12:00',
        endTime: '12:30',
      }),
      'endTime',
    ],
    [
      "references another mentor's service",
      () => ({
        serviceId: otherService,
        date: futureDate(21),
        startTime: '12:00',
        endTime: '13:00',
      }),
      'serviceId',
    ],
  ] as const)('rejects a slot that %s, without writing it', async (_label, buildPayload, field) => {
    const before = await slots();
    const response = await request('/mentors/me/slots', ids.owner, buildPayload());
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toHaveProperty(field);
    expect(await slots()).toEqual(before);
  });

  it('moves an available slot to a new time, visible after refresh', async () => {
    const created = (
      await (
        await request('/mentors/me/slots', ids.owner, {
          serviceId: quickService,
          date: futureDate(22),
          startTime: '09:00',
          endTime: '09:30',
        })
      ).json()
    ).slot;
    const response = await request(
      `/mentors/me/slots/${created.id}`,
      ids.owner,
      { serviceId: quickService, date: futureDate(22), startTime: '15:00', endTime: '15:30' },
      'PUT',
    );
    expect(response.status).toBe(200);
    const updated = (await response.json()).slot;
    expect(updated).toMatchObject({ startTime: '15:00', endTime: '15:30' });
    expect(await slots()).toContainEqual(updated);
  });

  it('refuses to change or remove a slot with an active booking', async () => {
    const created = (
      await (
        await request('/mentors/me/slots', ids.owner, {
          serviceId: hourService,
          date: futureDate(23),
          startTime: '09:00',
          endTime: '10:00',
        })
      ).json()
    ).slot;
    const starts = await pool.query(
      'SELECT starts_at FROM mentor_availability_slot WHERE id = $1',
      [created.id],
    );
    const booking = await pool.query(
      `INSERT INTO booking (student_id, service_id, scheduled_at, availability_slot_id, status)
       VALUES ($1, $2, $3, $4, 'pending_payment') RETURNING id`,
      [ids.student, hourService, starts.rows[0].starts_at, created.id],
    );

    const putResponse = await request(
      `/mentors/me/slots/${created.id}`,
      ids.owner,
      { serviceId: hourService, date: futureDate(23), startTime: '11:00', endTime: '12:00' },
      'PUT',
    );
    expect(putResponse.status).toBe(409);
    expect((await putResponse.json()).error.code).toBe('slot_booked');

    const deleteResponse = await request(
      `/mentors/me/slots/${created.id}`,
      ids.owner,
      undefined,
      'DELETE',
    );
    expect(deleteResponse.status).toBe(409);
    expect((await deleteResponse.json()).error.code).toBe('slot_booked');
    expect((await slots()).find((slot: { id: string }) => slot.id === created.id)).toMatchObject({
      startTime: '09:00',
      booked: true,
    });

    await pool.query("UPDATE booking SET status = 'cancelled' WHERE id = $1", [booking.rows[0].id]);
    const afterCancel = await request(
      `/mentors/me/slots/${created.id}`,
      ids.owner,
      undefined,
      'DELETE',
    );
    expect(afterCancel.status).toBe(204);
    expect(await slots()).not.toContainEqual(expect.objectContaining({ id: created.id }));
  });

  it("prevents another mentor from reading, changing or removing someone else's slots", async () => {
    const created = (
      await (
        await request('/mentors/me/slots', ids.owner, {
          serviceId: quickService,
          date: futureDate(24),
          startTime: '09:00',
          endTime: '09:30',
        })
      ).json()
    ).slot;
    expect(await slots(ids.other)).not.toContainEqual(expect.objectContaining({ id: created.id }));
    expect(
      (
        await request(
          `/mentors/me/slots/${created.id}`,
          ids.other,
          { serviceId: otherService, date: futureDate(24), startTime: '10:00', endTime: '11:00' },
          'PUT',
        )
      ).status,
    ).toBe(404);
    expect(
      (await request(`/mentors/me/slots/${created.id}`, ids.other, undefined, 'DELETE')).status,
    ).toBe(404);
    expect(await slots()).toContainEqual(created);
  });

  it.each([
    [undefined, 401],
    [ids.student, 403],
    [ids.banned, 403],
    [ids.deleted, 401],
  ] as const)('rejects unauthorized slot management for %s', async (id, status) => {
    const payload = {
      serviceId: hourService,
      date: futureDate(25),
      startTime: '09:00',
      endTime: '10:00',
    };
    expect((await request('/mentors/me/slots', id)).status).toBe(status);
    expect((await request('/mentors/me/slots', id, payload)).status).toBe(status);
  });
});
