import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';
import { hashPassword } from '../../src/modules/auth/password.js';
import { createSessionToken } from '../../src/modules/auth/session.js';

// The test database is shared with other suites, so these tests create their own users and
// never assert exact totals. Their created_at is far in the future, so with the newest-first
// order they always come first.
const ids: Record<string, string> = {
  admin: randomUUID(),
  bannedAdmin: randomUUID(),
  student: randomUUID(), // student only
  mentor: randomUUID(), // mentor only (onboarding not finished)
  both: randomUUID(), // student and mentor
  banned: randomUUID(), // banned student
  deleted: randomUUID(), // soft-deleted student and mentor
};
const createdAt = {
  both: '2099-01-04T10:00:00Z',
  banned: '2099-01-03T10:00:00Z',
  student: '2099-01-02T10:00:00Z',
  mentor: '2099-01-02T10:00:00Z',
  deleted: '2099-01-05T10:00:00Z',
};
let server: Server;
let origin: string;

function get(path: string, userId?: string) {
  return fetch(`${origin}${path}`, {
    headers: userId ? { Cookie: `session=${createSessionToken(userId)}` } : {},
  });
}

beforeAll(async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
  const password = await hashPassword('AdminTest123!');
  const users: [string, string | null, boolean, boolean][] = [
    // [id, created_at (null = now), is_banned, is_deleted]
    [ids.admin, null, false, false],
    [ids.bannedAdmin, null, true, false],
    [ids.student, createdAt.student, false, false],
    [ids.mentor, createdAt.mentor, false, false],
    [ids.both, createdAt.both, false, false],
    [ids.banned, createdAt.banned, true, false],
    [ids.deleted, createdAt.deleted, false, true],
  ];
  for (const [id, created, isBanned, isDeleted] of users) {
    await pool.query(
      `INSERT INTO "user" (id, username, email, password_hash, is_banned, is_deleted, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()))`,
      [id, `user-${id.slice(0, 8)}`, `${id}@example.com`, password, isBanned, isDeleted, created],
    );
  }
  await pool.query('INSERT INTO admin (user_id) VALUES ($1), ($2)', [ids.admin, ids.bannedAdmin]);
  await pool.query('INSERT INTO student (user_id) VALUES ($1), ($2), ($3), ($4)', [
    ids.student,
    ids.both,
    ids.banned,
    ids.deleted,
  ]);
  await pool.query(
    `INSERT INTO mentor (user_id, headline, bio)
     VALUES ($1, 'Mentor', 'bio'), ($2, 'Both', 'bio'), ($3, 'Deleted', 'bio')`,
    [ids.mentor, ids.both, ids.deleted],
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
  await pool.end();
});

describe.each(['students', 'mentors'])('access control: GET /api/admin/%s', (kind) => {
  const path = `/api/admin/${kind}`;

  it('returns 401 without a session', async () => {
    const response = await get(path);
    expect(response.status).toBe(401);
  });

  it('returns 403 not_an_admin for a student', async () => {
    const response = await get(path, ids.student);
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('not_an_admin');
  });

  it('returns 403 not_an_admin for a mentor', async () => {
    const response = await get(path, ids.mentor);
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('not_an_admin');
  });

  it('returns 403 banned for a banned admin', async () => {
    const response = await get(path, ids.bannedAdmin);
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('banned');
  });

  it('returns 400 for an invalid page or page size', async () => {
    for (const query of ['page=0', 'page=abc', 'pageSize=0', 'pageSize=51']) {
      const response = await get(`${path}?${query}`, ids.admin);
      expect(response.status, query).toBe(400);
      expect((await response.json()).error.code).toBe('validation_error');
    }
  });
});

describe('GET /api/admin/students', () => {
  it('returns the documented shape and nothing else, so no password hash leaks', async () => {
    const response = await get('/api/admin/students?pageSize=50', ids.admin);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(['page', 'pageSize', 'total', 'users']);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(50);
    expect(body.total).toBeGreaterThanOrEqual(3);
    for (const user of body.users) {
      expect(Object.keys(user).sort()).toEqual([
        'alsoMentor',
        'createdAt',
        'email',
        'id',
        'isBanned',
        'username',
      ]);
    }
    expect(JSON.stringify(body)).not.toContain('AdminTest123');
  });

  it('lists each student once, newest first, with ban status and the other role', async () => {
    const body = await (await get('/api/admin/students?pageSize=50', ids.admin)).json();
    const mine = body.users.filter((u: { id: string }) =>
      [ids.student, ids.both, ids.banned].includes(u.id),
    );
    expect(mine.map((u: { id: string }) => u.id)).toEqual([ids.both, ids.banned, ids.student]);
    const byId = Object.fromEntries(mine.map((u: { id: string }) => [u.id, u]));
    expect(byId[ids.both]).toMatchObject({ alsoMentor: true, isBanned: false });
    expect(byId[ids.banned]).toMatchObject({ alsoMentor: false, isBanned: true });
    expect(byId[ids.student]).toMatchObject({ alsoMentor: false, isBanned: false });
    const allIds = body.users.map((u: { id: string }) => u.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('does not list soft-deleted users, nor accounts that are not students', async () => {
    const body = await (await get('/api/admin/students?pageSize=50', ids.admin)).json();
    const listed = body.users.map((u: { id: string }) => u.id);
    expect(listed).not.toContain(ids.deleted);
    expect(listed).not.toContain(ids.mentor);
    expect(listed).not.toContain(ids.admin);
  });

  it('paginates: pages do not overlap and the total stays the same', async () => {
    const first = await (await get('/api/admin/students?page=1&pageSize=2', ids.admin)).json();
    const second = await (await get('/api/admin/students?page=2&pageSize=2', ids.admin)).json();
    expect(first.users.map((u: { id: string }) => u.id)).toEqual([ids.both, ids.banned]);
    expect(second.users[0].id).toBe(ids.student);
    expect(first.users).toHaveLength(2);
    expect(second.total).toBe(first.total);
  });

  it('returns an empty page, with the real total, past the last page', async () => {
    const body = await (
      await get('/api/admin/students?page=1000000&pageSize=50', ids.admin)
    ).json();
    expect(body.users).toEqual([]);
    expect(body.page).toBe(1000000);
    expect(body.total).toBeGreaterThanOrEqual(3);
  });

  it('uses page 1 and page size 20 by default', async () => {
    const body = await (await get('/api/admin/students', ids.admin)).json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
    expect(body.users.length).toBeLessThanOrEqual(20);
  });
});

describe('GET /api/admin/mentors', () => {
  it('returns the documented shape, with alsoStudent instead of alsoMentor', async () => {
    const response = await get('/api/admin/mentors?pageSize=50', ids.admin);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(['page', 'pageSize', 'total', 'users']);
    for (const user of body.users) {
      expect(Object.keys(user).sort()).toEqual([
        'alsoStudent',
        'createdAt',
        'email',
        'id',
        'isBanned',
        'username',
      ]);
    }
  });

  it('lists mentors even before onboarding, with the other role flag', async () => {
    const body = await (await get('/api/admin/mentors?pageSize=50', ids.admin)).json();
    const mine = body.users.filter((u: { id: string }) => [ids.mentor, ids.both].includes(u.id));
    expect(mine.map((u: { id: string }) => u.id)).toEqual([ids.both, ids.mentor]);
    const byId = Object.fromEntries(mine.map((u: { id: string }) => [u.id, u]));
    expect(byId[ids.both].alsoStudent).toBe(true);
    expect(byId[ids.mentor].alsoStudent).toBe(false);
  });

  it('does not list soft-deleted mentors, nor accounts that are not mentors', async () => {
    const body = await (await get('/api/admin/mentors?pageSize=50', ids.admin)).json();
    const listed = body.users.map((u: { id: string }) => u.id);
    expect(listed).not.toContain(ids.deleted);
    expect(listed).not.toContain(ids.student);
  });

  it('paginates and returns an empty page past the last page', async () => {
    const first = await (await get('/api/admin/mentors?page=1&pageSize=1', ids.admin)).json();
    const second = await (await get('/api/admin/mentors?page=2&pageSize=1', ids.admin)).json();
    expect(first.users.map((u: { id: string }) => u.id)).toEqual([ids.both]);
    expect(second.users.map((u: { id: string }) => u.id)).toEqual([ids.mentor]);
    const past = await (await get('/api/admin/mentors?page=1000000&pageSize=50', ids.admin)).json();
    expect(past.users).toEqual([]);
    expect(past.total).toBe(first.total);
  });
});

describe('GET /api/me', () => {
  it('reports isAdmin true for an admin and false for everyone else', async () => {
    const admin = await (await get('/api/me', ids.admin)).json();
    const student = await (await get('/api/me', ids.student)).json();
    expect(admin.user.isAdmin).toBe(true);
    expect(student.user.isAdmin).toBe(false);
  });

  it('reports an admin with no student or mentor role', async () => {
    const body = await (await get('/api/me', ids.admin)).json();
    expect(body.user).toMatchObject({ isAdmin: true, isStudent: false, isMentor: false });
  });
});
