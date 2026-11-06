import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';
import { hashPassword } from '../../src/modules/auth/password.js';
import { createSessionToken } from '../../src/modules/auth/session.js';

const ids = {
  owner: randomUUID(),
  other: randomUUID(),
  student: randomUUID(),
  incomplete: randomUUID(),
  banned: randomUUID(),
  deleted: randomUUID(),
};
const categoryNames = [`Profile ${randomUUID()}`, `Profile ${randomUUID()}`].sort();
const valid = {
  headline: 'Engineer',
  bio: 'Mentoring students',
  subjects: [categoryNames[0]],
  skills: ['TypeScript'],
};
let server: Server;
let origin: string;
let serviceId: string;
let bookingId: string;
let baseline: unknown;
const registeredIds: string[] = [];

function request(
  path: string,
  userId?: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'PUT',
) {
  return fetch(`${origin}/api${path}`, {
    method,
    headers: {
      ...(userId ? { Cookie: `session=${createSessionToken(userId)}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function profile(id = ids.owner) {
  const response = await request('/mentors/me/profile', id);
  expect(response.status).toBe(200);
  return (await response.json()).profile;
}
async function unrelatedRecords() {
  const { rows } = await pool.query(
    `SELECT row_to_json(s) AS service, row_to_json(b) AS booking,
    row_to_json(p) AS payment, row_to_json(slot) AS slot, m.onboarding_finished, m.tagline, m.professional_background
    FROM service s JOIN mentor m ON m.user_id = s.mentor_id
    JOIN booking b ON b.service_id = s.id JOIN payment p ON p.booking_id = b.id
    JOIN mentor_availability_slot slot ON slot.id = b.availability_slot_id WHERE s.id = $1`,
    [serviceId],
  );
  return rows;
}

beforeAll(async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
  const password = await hashPassword('ProfileTest123!');
  for (const [role, id] of Object.entries(ids)) {
    await pool.query(
      'INSERT INTO "user" (id, username, email, password_hash, is_banned, is_deleted) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, role, `${id}@example.com`, password, role === 'banned', role === 'deleted'],
    );
    if (role !== 'student')
      await pool.query(
        'INSERT INTO mentor (user_id, headline, bio, onboarding_finished) VALUES ($1,$2,$3,$4)',
        [id, 'Original headline', 'Original bio', role !== 'incomplete'],
      );
  }
  // The owner is deliberately both a student and a mentor.
  await pool.query('INSERT INTO student (user_id) VALUES ($1), ($2)', [ids.owner, ids.student]);
  for (const name of categoryNames)
    await pool.query('INSERT INTO category (name, slug) VALUES ($1,$2)', [name, randomUUID()]);
  await pool.query('INSERT INTO mentor_category SELECT $1, id FROM category WHERE name = $2', [
    ids.owner,
    categoryNames[0],
  ]);
  const service = await pool.query(
    'INSERT INTO service (mentor_id,title,description,price_cents,duration_minutes) VALUES ($1,$2,$3,3000,60) RETURNING id',
    [ids.owner, 'Session', 'Test session'],
  );
  serviceId = service.rows[0].id;
  const slot = await pool.query(
    "INSERT INTO mentor_availability_slot (mentor_id, starts_at) VALUES ($1, now() + interval '1 day') RETURNING id, starts_at",
    [ids.owner],
  );
  const booking = await pool.query(
    "INSERT INTO booking (student_id,service_id,scheduled_at,availability_slot_id,status) VALUES ($1,$2,$3,$4,'confirmed') RETURNING id",
    [ids.student, serviceId, slot.rows[0].starts_at, slot.rows[0].id],
  );
  bookingId = booking.rows[0].id;
  await pool.query(
    "INSERT INTO payment (booking_id,amount_cents,status) VALUES ($1,3150,'succeeded')",
    [bookingId],
  );
  await pool.query(
    "UPDATE mentor SET tagline = 'Legacy intro', professional_background = 'Legacy background' WHERE user_id = $1",
    [ids.owner],
  );
  baseline = await unrelatedRecords();
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
  await pool.query('DROP TRIGGER IF EXISTS profile_test_failure ON mentor_category');
  await pool.query('DROP FUNCTION IF EXISTS profile_test_failure()');
  if (bookingId) {
    await pool.query('DELETE FROM payment WHERE booking_id = $1', [bookingId]);
    await pool.query('DELETE FROM booking WHERE id = $1', [bookingId]);
  }
  await pool.query('DELETE FROM "user" WHERE id = ANY($1::uuid[])', [
    [...Object.values(ids), ...registeredIds],
  ]);
  await pool.query('DELETE FROM category WHERE name = ANY($1::text[])', [categoryNames]);
  await pool.end();
});

describe('mentor profile HTTP and persistence', () => {
  it('loads a legacy profile and authoritative subject options without caching', async () => {
    const response = await request('/mentors/me/profile', ids.owner);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const result = await response.json();
    expect(result.profile).toEqual({
      headline: 'Original headline',
      bio: 'Original bio',
      subjects: [categoryNames[0]],
      skills: [],
    });
    expect(result.subjectOptions).toEqual(expect.arrayContaining(categoryNames));
    expect(result.subjectOptions).toEqual([...result.subjectOptions].sort());
  });

  it('persists normalized changes, replacing subjects and updating anonymous reads', async () => {
    const response = await request('/mentors/me/profile', ids.owner, {
      ...valid,
      subjects: [categoryNames[1]],
      skills: [' React ', 'react', 'SQL'],
    });
    expect(response.status).toBe(200);
    const saved = (await response.json()).profile;
    expect(saved.skills).toEqual(['React', 'SQL']);
    expect(saved.subjects).toEqual([categoryNames[1]]);
    expect(await profile()).toEqual(saved);
    const publicResponse = await request(`/mentors/${ids.owner}`);
    const visible = (await publicResponse.json()).mentor;
    expect(visible).toMatchObject(saved);
    expect(visible).not.toHaveProperty('email');
    expect(visible).not.toHaveProperty('password_hash');
    const list = await (await request('/mentors')).json();
    expect(list.mentors.find((mentor: { id: string }) => mentor.id === ids.owner)).toMatchObject(
      saved,
    );
    expect(await unrelatedRecords()).toEqual(baseline);
  });

  it('retains saved values after logout and a new password sign-in', async () => {
    const saved = await profile();
    expect((await request('/auth/logout', ids.owner, undefined, 'POST')).status).toBe(204);
    const response = await request(
      '/auth/login',
      undefined,
      { email: `${ids.owner}@example.com`, password: 'ProfileTest123!' },
      'POST',
    );
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const reloaded = await fetch(`${origin}/api/mentors/me/profile`, {
      headers: { Cookie: cookie },
    });
    expect((await reloaded.json()).profile).toEqual(saved);
  });

  it.each([
    { bio: ' ' },
    { subjects: ['Missing category'] },
    { subjects: Array(5).fill(categoryNames[0]) },
    { skills: ['a'.repeat(41)] },
    { userId: ids.other },
  ])('rejects invalid updates without writes: %j', async (change) => {
    const previous = await profile();
    const response = await request('/mentors/me/profile', ids.owner, { ...valid, ...change });
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toBeDefined();
    expect(await profile()).toEqual(previous);
  });

  it('rolls back scalar fields and subject links when an insert fails', async () => {
    const previous = await profile();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await pool.query(
        `CREATE FUNCTION profile_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'profile test failure'; END $$`,
      );
      await pool.query(
        'CREATE TRIGGER profile_test_failure BEFORE INSERT ON mentor_category FOR EACH ROW EXECUTE FUNCTION profile_test_failure()',
      );
      expect(
        (await request('/mentors/me/profile', ids.owner, { ...valid, headline: 'Must roll back' }))
          .status,
      ).toBe(500);
      expect(await profile()).toEqual(previous);
    } finally {
      await pool.query('DROP TRIGGER IF EXISTS profile_test_failure ON mentor_category');
      await pool.query('DROP FUNCTION IF EXISTS profile_test_failure()');
      log.mockRestore();
    }
  });

  it.each([
    [undefined, 401],
    [ids.student, 403],
    [ids.incomplete, 409],
    [ids.banned, 403],
    [ids.deleted, 401],
  ] as const)('rejects unauthorized GET and PUT for %s', async (id, status) => {
    const previous = await profile();
    expect((await request('/mentors/me/profile', id)).status).toBe(status);
    expect((await request('/mentors/me/profile', id, valid)).status).toBe(status);
    expect(await profile()).toEqual(previous);
  });

  it('rejects invalid and expired session cookies', async () => {
    const expired = vi.spyOn(Date, 'now').mockReturnValue(Date.now() - 2 * 86400000);
    const token = createSessionToken(ids.owner);
    expired.mockRestore();
    for (const cookie of ['invalid', token]) {
      const response = await fetch(`${origin}/api/mentors/me/profile`, {
        headers: { Cookie: `session=${cookie}` },
      });
      expect(response.status).toBe(401);
    }
  });

  it('prevents another mentor from selecting an owner, while allowing self-updates', async () => {
    const previous = await profile();
    expect(
      (await request('/mentors/me/profile', ids.other, { ...valid, mentorId: ids.owner })).status,
    ).toBe(400);
    expect((await request(`/mentors/${ids.owner}`, ids.other, valid)).status).toBe(404);
    expect((await request('/mentors/me/profile', ids.other, valid)).status).toBe(200);
    expect(await profile()).toEqual(previous);
    expect(await profile(ids.other)).toEqual(valid);
  });

  it('serializes concurrent replacements without mixing fields', async () => {
    const a = { ...valid, headline: 'A', bio: 'Bio A', subjects: [categoryNames[0]] };
    const b = { ...valid, headline: 'B', bio: 'Bio B', subjects: [categoryNames[1]] };
    const responses = await Promise.all([
      request('/mentors/me/profile', ids.owner, a),
      request('/mentors/me/profile', ids.owner, b),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect([a, b]).toContainEqual(await profile());
    expect(await unrelatedRecords()).toEqual(baseline);
  });

  it.each([ids.incomplete, ids.banned, ids.deleted])(
    'keeps inactive mentor %s private',
    async (id) => {
      expect((await request(`/mentors/${id}`)).status).toBe(404);
    },
  );

  it('collects the biography once during onboarding and keeps the same text editable', async () => {
    const email = `${randomUUID()}@example.com`;
    const registration = await request(
      '/auth/register-mentor',
      undefined,
      {
        username: 'New Mentor',
        email,
        password: 'ProfileTest123!',
      },
      'POST',
    );
    expect(registration.status).toBe(201);
    const id = (await registration.json()).user.id;
    registeredIds.push(id);
    const initial = await pool.query(
      'SELECT bio, onboarding_finished FROM mentor WHERE user_id = $1',
      [id],
    );
    expect(initial.rows).toEqual([{ bio: '', onboarding_finished: false }]);
    expect((await request(`/mentors/${id}`)).status).toBe(404);
    const onboarding = {
      username: 'New Mentor',
      location: 'Porto',
      languages: ['English'],
      linkedinUrl: '',
      headline: 'Engineer',
      bio: 'My experience, background and how I help students.',
      subjects: [categoryNames[0]],
      skills: ['React'],
      services: [
        {
          title: 'Mentoring',
          description: 'Review software design together.',
          priceCents: 3000,
          durationMinutes: 60,
        },
      ],
    };
    expect((await request('/mentors/me/onboarding', id, onboarding, 'POST')).status).toBe(204);
    expect(await profile(id)).toEqual({
      headline: onboarding.headline,
      bio: onboarding.bio,
      subjects: onboarding.subjects,
      skills: onboarding.skills,
    });
    const update = { ...valid, bio: 'Updated biography with work and education.' };
    expect((await request('/mentors/me/profile', id, update)).status).toBe(200);
    expect(await profile(id)).toEqual(update);
    const visible = (await (await request(`/mentors/${id}`)).json()).mentor;
    expect(visible.bio).toBe(update.bio);
    expect(visible.services[0].description).toBe(onboarding.services[0].description);
    expect(visible).not.toHaveProperty('tagline');
    expect(visible).not.toHaveProperty('professionalBackground');
  });

  it('reruns the migration runner without changing saved profiles', async () => {
    const previous = await profile();
    execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
    expect(await profile()).toEqual(previous);
  });

  it('upgrades pre-existing mentor data with an empty background', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('CREATE SCHEMA profile_upgrade_test');
      await client.query('SET LOCAL search_path TO profile_upgrade_test');
      const files = (await readdir('db/migrations')).filter((file) => file.endsWith('.sql')).sort();
      for (const file of files.filter((file) => file < '008_'))
        await client.query(await readFile(`db/migrations/${file}`, 'utf8'));
      const user = await client.query(
        `INSERT INTO "user" (username,email,password_hash) VALUES ('Legacy','legacy@example.com','unused') RETURNING id`,
      );
      await client.query("INSERT INTO mentor (user_id,bio) VALUES ($1,'Original biography')", [
        user.rows[0].id,
      ]);
      await client.query(
        await readFile('db/migrations/008_mentor_professional_background.sql', 'utf8'),
      );
      const result = await client.query('SELECT bio, professional_background FROM mentor');
      expect(result.rows).toEqual([{ bio: 'Original biography', professional_background: '' }]);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
