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
  full: randomUUID(),
  empty: randomUUID(),
  mentorOnly: randomUUID(),
  patcher: randomUUID(),
};
const categoryNames = [`Student ${randomUUID()}`, `Student ${randomUUID()}`].sort();
let server: Server;
let origin: string;

function getProfile(userId?: string) {
  return fetch(`${origin}/api/students/me`, {
    headers: userId ? { Cookie: `session=${createSessionToken(userId)}` } : {},
  });
}

function patchProfile(userId: string, body: unknown) {
  return fetch(`${origin}/api/students/me`, {
    method: 'PATCH',
    headers: {
      Cookie: `session=${createSessionToken(userId)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function categoryIdsByName() {
  const { rows } = await pool.query<{ id: string; name: string }>(
    'SELECT id, name FROM category WHERE name = ANY($1::text[]) ORDER BY name',
    [categoryNames],
  );
  return rows;
}

beforeAll(async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
  const password = await hashPassword('StudentTest123!');
  for (const [role, id] of Object.entries(ids)) {
    await pool.query(
      'INSERT INTO "user" (id, username, email, password_hash) VALUES ($1,$2,$3,$4)',
      [id, role, `${id}@example.com`, password],
    );
  }
  await pool.query(
    `INSERT INTO student (user_id, programme, enrollment_year, study_level,
                          budget_min_cents, budget_max_cents)
     VALUES ($1, 'MESW', 2025, 'Master', 1500, 4000)`,
    [ids.full],
  );
  await pool.query('INSERT INTO student (user_id) VALUES ($1), ($2)', [ids.empty, ids.patcher]);
  await pool.query(
    'INSERT INTO mentor (user_id, headline, bio, onboarding_finished) VALUES ($1,$2,$3,true)',
    [ids.mentorOnly, 'Engineer', 'Mentor without a student profile'],
  );
  for (const name of categoryNames) {
    await pool.query('INSERT INTO category (name, slug) VALUES ($1,$2)', [name, randomUUID()]);
  }
  await pool.query(
    'INSERT INTO student_category (student_id, category_id) SELECT $1, id FROM category WHERE name = ANY($2::text[])',
    [ids.full, categoryNames],
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
  await pool.query('DELETE FROM "user" WHERE id = ANY($1::uuid[])', [Object.values(ids)]);
  await pool.query('DELETE FROM category WHERE name = ANY($1::text[])', [categoryNames]);
  await pool.end();
});

describe('GET /api/students/me', () => {
  it('returns every stored student field, with interests as id and name', async () => {
    const response = await getProfile(ids.full);
    expect(response.status).toBe(200);
    const profile = await response.json();
    expect(profile).toMatchObject({
      userId: ids.full,
      programme: 'MESW',
      enrollmentYear: 2025,
      studyLevel: 'Master',
      budgetMinCents: 1500,
      budgetMaxCents: 4000,
    });
    expect(profile.categories.map((c: { name: string }) => c.name)).toEqual(categoryNames);
    expect(profile.categoryIds).toHaveLength(2);
  });

  it('returns nulls and empty lists for a student who has not filled the profile', async () => {
    const response = await getProfile(ids.empty);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      programme: null,
      enrollmentYear: null,
      studyLevel: null,
      budgetMinCents: null,
      budgetMaxCents: null,
      categories: [],
      categoryIds: [],
    });
  });

  it('answers 403 for an account that has no student profile', async () => {
    expect((await getProfile(ids.mentorOnly)).status).toBe(403);
  });

  it('answers 401 without a session', async () => {
    expect((await getProfile()).status).toBe(401);
  });
});

describe('PATCH /api/students/me', () => {
  it('saves the onboarding answers and returns the updated profile', async () => {
    const categories = await categoryIdsByName();
    const response = await patchProfile(ids.patcher, {
      studyLevel: 'Master',
      budgetMinCents: 1500,
      budgetMaxCents: 4000,
      categoryIds: categories.map((c) => c.id),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      studyLevel: 'Master',
      budgetMinCents: 1500,
      budgetMaxCents: 4000,
      categories,
    });

    // a later read sees the same data, so it survives a refresh
    const saved = await (await getProfile(ids.patcher)).json();
    expect(saved).toMatchObject({ studyLevel: 'Master', categories });
  });

  it('rejects a budget whose maximum is below the minimum, in the shared error shape', async () => {
    const response = await patchProfile(ids.patcher, {
      budgetMinCents: 4000,
      budgetMaxCents: 1500,
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('validation_error');
    expect(body.error.fields.budgetMaxCents).toMatch(/Maximum budget/);
  });

  it('rejects an interest that does not exist and keeps the saved ones', async () => {
    const before = await (await getProfile(ids.patcher)).json();
    const response = await patchProfile(ids.patcher, { categoryIds: [randomUUID()] });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('validation_error');
    expect(body.error.fields.categoryIds).toBeTruthy();
    expect((await (await getProfile(ids.patcher)).json()).categories).toEqual(before.categories);
  });

  it('edits programme and enrollment year, and clears them with null', async () => {
    const saved = await patchProfile(ids.patcher, { programme: '  MESW ', enrollmentYear: 2024 });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ programme: 'MESW', enrollmentYear: 2024 });

    const cleared = await patchProfile(ids.patcher, { programme: null, enrollmentYear: null });
    expect(await cleared.json()).toMatchObject({ programme: null, enrollmentYear: null });
  });

  it('rejects an out-of-range enrollment year with a field message', async () => {
    const response = await patchProfile(ids.patcher, { enrollmentYear: 1850 });
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.enrollmentYear).toMatch(/2000 or later/);
  });

  it('answers 403 with a code for an account that has no student profile', async () => {
    const response = await patchProfile(ids.mentorOnly, { studyLevel: 'Master' });
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('not_a_student');
  });
});
