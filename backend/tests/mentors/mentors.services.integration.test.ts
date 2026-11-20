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
const valid = {
  title: 'Mock interview',
  description: 'Practice interview with feedback.',
  priceCents: 3000,
  durationMinutes: 60,
};
let server: Server;
let origin: string;
let otherServiceId: string;
let bookedServiceId: string;
let bookingId: string;

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

async function services(id = ids.owner) {
  const response = await request('/mentors/me/services', id);
  expect(response.status).toBe(200);
  return (await response.json()).services;
}

async function publicServices(id = ids.owner) {
  const response = await request(`/mentors/${id}`);
  expect(response.status).toBe(200);
  return (await response.json()).mentor.services;
}

beforeAll(async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
  const password = await hashPassword('ServicesTest123!');
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

  const other = await pool.query(
    "INSERT INTO service (mentor_id,title,description,price_cents,duration_minutes) VALUES ($1,'Other mentor session','Desc',2000,60) RETURNING id",
    [ids.other],
  );
  otherServiceId = other.rows[0].id;

  const booked = await pool.query(
    "INSERT INTO service (mentor_id,title,description,price_cents,duration_minutes) VALUES ($1,'Original title','Original description',3000,60) RETURNING id",
    [ids.owner],
  );
  bookedServiceId = booked.rows[0].id;
  const slot = await pool.query(
    "INSERT INTO mentor_availability_slot (mentor_id, service_id, starts_at, ends_at) VALUES ($1, $2, now() + interval '1 day', now() + interval '1 day 1 hour') RETURNING id, starts_at",
    [ids.owner, bookedServiceId],
  );
  const booking = await pool.query(
    `INSERT INTO booking (student_id, service_id, scheduled_at, availability_slot_id, status,
                           service_title, service_duration_minutes, service_price_cents)
     VALUES ($1, $2, $3, $4, 'confirmed', 'Original title', 60, 3000) RETURNING id`,
    [ids.student, bookedServiceId, slot.rows[0].starts_at, slot.rows[0].id],
  );
  bookingId = booking.rows[0].id;
  await pool.query(
    "INSERT INTO payment (booking_id, amount_cents, status) VALUES ($1,3150,'succeeded')",
    [bookingId],
  );

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
  await pool.query('DELETE FROM payment WHERE booking_id = $1', [bookingId]);
  await pool.query('DELETE FROM booking WHERE id = $1', [bookingId]);
  await pool.query('DELETE FROM "user" WHERE id = ANY($1::uuid[])', [Object.values(ids)]);
  await pool.end();
});

describe('mentor service management', () => {
  it('adds a service that becomes available for new bookings', async () => {
    const response = await request('/mentors/me/services', ids.owner, valid);
    expect(response.status).toBe(201);
    const created = (await response.json()).service;
    expect(created).toMatchObject({ ...valid, isActive: true });
    expect(await services()).toContainEqual(created);
    expect(await publicServices()).toContainEqual({
      id: created.id,
      title: valid.title,
      description: valid.description,
      priceCents: valid.priceCents,
      durationMinutes: valid.durationMinutes,
      availability: [],
    });
  });

  it('updates a service so the new details persist for subsequent reads', async () => {
    const created = (await (await request('/mentors/me/services', ids.owner, valid)).json())
      .service;
    const update = {
      title: 'Updated title',
      description: 'Updated description.',
      priceCents: 4500,
      durationMinutes: 90,
    };
    const response = await request(`/mentors/me/services/${created.id}`, ids.owner, update, 'PUT');
    expect(response.status).toBe(200);
    const updated = (await response.json()).service;
    expect(updated).toMatchObject({ ...update, id: created.id, isActive: true });
    expect(await services()).toContainEqual(updated);
    expect(await publicServices()).toContainEqual({
      id: created.id,
      ...update,
      availability: [],
    });
  });

  it("retains an existing booking's title, duration, agreed price and payment amount after the service changes", async () => {
    const before = await (await request(`/bookings/${bookingId}`, ids.student)).json();
    expect(before.booking).toMatchObject({
      service_title: 'Original title',
      duration_minutes: 60,
      amount_cents: 3150,
      status: 'confirmed',
    });

    const response = await request(
      `/mentors/me/services/${bookedServiceId}`,
      ids.owner,
      {
        title: 'Renamed service',
        description: 'New description.',
        priceCents: 9000,
        durationMinutes: 120,
      },
      'PUT',
    );
    expect(response.status).toBe(200);

    const after = await (await request(`/bookings/${bookingId}`, ids.student)).json();
    expect(after.booking).toMatchObject({
      service_title: 'Original title',
      duration_minutes: 60,
      amount_cents: 3150,
      status: 'confirmed',
    });
    const snapshot = await pool.query(
      'SELECT service_title, service_duration_minutes, service_price_cents, status FROM booking WHERE id = $1',
      [bookingId],
    );
    expect(snapshot.rows[0]).toEqual({
      service_title: 'Original title',
      service_duration_minutes: 60,
      service_price_cents: 3000,
      status: 'confirmed',
    });
  });

  it('deactivates a service: hidden from the public profile, but the existing booking is unaffected', async () => {
    const response = await request(
      `/mentors/me/services/${bookedServiceId}/active`,
      ids.owner,
      { isActive: false },
      'PATCH',
    );
    expect(response.status).toBe(200);
    expect((await response.json()).service).toMatchObject({ isActive: false });

    expect(await services()).toContainEqual(
      expect.objectContaining({ id: bookedServiceId, isActive: false }),
    );
    expect(await publicServices()).not.toContainEqual(
      expect.objectContaining({ id: bookedServiceId }),
    );
    const activeFlag = await pool.query('SELECT is_active FROM service WHERE id = $1', [
      bookedServiceId,
    ]);
    expect(activeFlag.rows[0].is_active).toBe(false);

    const booking = await (await request(`/bookings/${bookingId}`, ids.student)).json();
    expect(booking.booking).toMatchObject({ status: 'confirmed', service_title: 'Original title' });

    await request(
      `/mentors/me/services/${bookedServiceId}/active`,
      ids.owner,
      { isActive: true },
      'PATCH',
    );
  });

  it.each([
    ['missing fields', () => ({ ...valid, title: '' }), 'title'],
    ['a negative price', () => ({ ...valid, priceCents: -100 }), 'priceCents'],
    [
      'a price with more than two decimal places',
      () => ({ ...valid, priceCents: 3000.5 }),
      'priceCents',
    ],
    ['a non-positive duration', () => ({ ...valid, durationMinutes: 0 }), 'durationMinutes'],
  ] as const)(
    'rejects adding a service with %s, without writing it',
    async (_label, build, field) => {
      const before = await services();
      const response = await request('/mentors/me/services', ids.owner, build());
      expect(response.status).toBe(400);
      expect((await response.json()).error.fields).toHaveProperty(field);
      expect(await services()).toEqual(before);
    },
  );

  it('rejects updating a service with invalid fields, without changing it', async () => {
    const created = (await (await request('/mentors/me/services', ids.owner, valid)).json())
      .service;
    const response = await request(
      `/mentors/me/services/${created.id}`,
      ids.owner,
      { ...valid, durationMinutes: -1 },
      'PUT',
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toHaveProperty('durationMinutes');
    expect(await services()).toContainEqual(created);
  });

  it("prevents another mentor from updating or deactivating someone else's service", async () => {
    const created = (await (await request('/mentors/me/services', ids.owner, valid)).json())
      .service;
    expect(await services(ids.other)).not.toContainEqual(
      expect.objectContaining({ id: created.id }),
    );
    expect(
      (
        await request(
          `/mentors/me/services/${created.id}`,
          ids.other,
          { ...valid, title: 'Hijacked' },
          'PUT',
        )
      ).status,
    ).toBe(404);
    expect(
      (await request(`/mentors/me/services/${created.id}`, ids.other, { isActive: false }, 'PATCH'))
        .status,
    ).toBe(404);
    expect(await services()).toContainEqual(created);

    expect(
      (await request(`/mentors/me/services/${otherServiceId}`, ids.owner, valid, 'PUT')).status,
    ).toBe(404);
    expect(
      (
        await request(
          `/mentors/me/services/${otherServiceId}/active`,
          ids.owner,
          { isActive: false },
          'PATCH',
        )
      ).status,
    ).toBe(404);
  });

  it.each([
    [undefined, 401],
    [ids.student, 403],
    [ids.banned, 403],
    [ids.deleted, 401],
  ] as const)('rejects unauthorized service management for %s', async (id, status) => {
    expect((await request('/mentors/me/services', id)).status).toBe(status);
    expect((await request('/mentors/me/services', id, valid)).status).toBe(status);
  });
});
