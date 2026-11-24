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
  admin: randomUUID(),
  incomplete: randomUUID(),
  banned: randomUUID(),
  deleted: randomUUID(),
};

const valid = {
  title: 'Understanding SOLID principles',
  body: 'Single responsibility keeps modules focused.\n\nOpen-closed lets you extend behavior cleanly.',
};

let server: Server;
let origin: string;

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

async function myPosts(id = ids.owner) {
  const response = await request('/mentors/me/posts', id);
  expect(response.status).toBe(200);
  return (await response.json()).posts;
}

async function publicProfilePosts(id = ids.owner) {
  const response = await request(`/mentors/${id}`);
  expect(response.status).toBe(200);
  return (await response.json()).mentor.posts;
}

beforeAll(async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
  const password = await hashPassword('PostsTest123!');
  for (const [role, id] of Object.entries(ids)) {
    await pool.query(
      'INSERT INTO "user" (id, username, email, password_hash, is_banned, is_deleted) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, role, `${id}@example.com`, password, role === 'banned', role === 'deleted'],
    );
    if (role !== 'student' && role !== 'admin') {
      await pool.query(
        'INSERT INTO mentor (user_id, headline, bio, onboarding_finished) VALUES ($1,$2,$3,$4)',
        [id, 'Headline', 'Bio', role !== 'incomplete'],
      );
    }
  }
  await pool.query('INSERT INTO student (user_id) VALUES ($1)', [ids.student]);
  await pool.query('INSERT INTO admin (user_id) VALUES ($1)', [ids.admin]);

  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing HTTP test address');
  origin = `http://127.0.0.1:${address.port}`;
}, 30000);

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  await pool.query('DELETE FROM "user" WHERE id = ANY($1::uuid[])', [Object.values(ids)]);
  await pool.end();
});

describe('mentor free educational posts', () => {
  it('publishes a free post onto the public profile and allows anonymous reading without payment', async () => {
    const response = await request('/mentors/me/posts', ids.owner, valid);
    expect(response.status).toBe(201);
    const created = (await response.json()).post;
    expect(created).toMatchObject({ title: valid.title, body: valid.body });

    expect(await myPosts()).toContainEqual(created);
    expect(await publicProfilePosts()).toContainEqual(
      expect.objectContaining({ id: created.id, title: valid.title, body: valid.body }),
    );

    const publicPostResponse = await request(`/mentors/${ids.owner}/posts/${created.id}`);
    expect(publicPostResponse.status).toBe(200);
    expect(publicPostResponse.headers.get('cache-control')).toBe('no-store');
    expect((await publicPostResponse.json()).post).toMatchObject({
      id: created.id,
      mentorId: ids.owner,
      mentorName: 'owner',
      title: valid.title,
      body: valid.body,
    });
  });

  it('edits a published post so updated title and body persist publicly', async () => {
    const created = (await (await request('/mentors/me/posts', ids.owner, valid)).json()).post;
    const updatedInput = {
      title: 'Updated SOLID guide',
      body: 'Revised explanation with concrete TypeScript examples.',
    };

    const response = await request(
      `/mentors/me/posts/${created.id}`,
      ids.owner,
      updatedInput,
      'PUT',
    );
    expect(response.status).toBe(200);
    const updated = (await response.json()).post;
    expect(updated).toMatchObject({ id: created.id, ...updatedInput });

    expect(await myPosts()).toContainEqual(updated);
    expect(await publicProfilePosts()).toContainEqual(
      expect.objectContaining({ id: created.id, ...updatedInput }),
    );
    const publicPostResponse = await request(`/mentors/${ids.owner}/posts/${created.id}`);
    expect(publicPostResponse.status).toBe(200);
    expect((await publicPostResponse.json()).post).toMatchObject({
      id: created.id,
      ...updatedInput,
    });
  });

  it('deletes a post from the public profile and makes its public link return 404', async () => {
    const created = (await (await request('/mentors/me/posts', ids.owner, valid)).json()).post;
    const publicLink = `/mentors/${ids.owner}/posts/${created.id}`;
    expect((await request(publicLink)).status).toBe(200);

    const delResponse = await request(
      `/mentors/me/posts/${created.id}`,
      ids.owner,
      undefined,
      'DELETE',
    );
    expect(delResponse.status).toBe(204);

    expect(await myPosts()).not.toContainEqual(expect.objectContaining({ id: created.id }));
    expect(await publicProfilePosts()).not.toContainEqual(
      expect.objectContaining({ id: created.id }),
    );
    const afterDelete = await request(publicLink);
    expect(afterDelete.status).toBe(404);
    expect((await afterDelete.json()).error.code).toBe('post_not_found');
  });

  it.each([
    ['blank title', { title: '   ', body: valid.body }, 'title'],
    ['empty title', { title: '', body: valid.body }, 'title'],
    ['blank body', { title: valid.title, body: '  \n\t ' }, 'body'],
    ['empty body', { title: valid.title, body: '' }, 'body'],
    ['overlong title', { title: 'a'.repeat(151), body: valid.body }, 'title'],
    ['overlong body', { title: valid.title, body: 'b'.repeat(10_001) }, 'body'],
  ] as const)(
    'rejects invalid post changes (%s) and preserves the last saved version',
    async (_label, invalidBody, field) => {
      const created = (await (await request('/mentors/me/posts', ids.owner, valid)).json()).post;
      const before = await myPosts();

      const createResponse = await request('/mentors/me/posts', ids.owner, invalidBody);
      expect(createResponse.status).toBe(400);
      expect((await createResponse.json()).error.fields).toHaveProperty(field);
      expect(await myPosts()).toEqual(before);

      const editResponse = await request(
        `/mentors/me/posts/${created.id}`,
        ids.owner,
        invalidBody,
        'PUT',
      );
      expect(editResponse.status).toBe(400);
      expect((await editResponse.json()).error.fields).toHaveProperty(field);
      expect(await myPosts()).toContainEqual(created);
      expect(await publicProfilePosts()).toContainEqual(
        expect.objectContaining({ id: created.id, title: valid.title, body: valid.body }),
      );
    },
  );

  it('prevents another user from publishing under the mentor identity or editing or deleting their posts', async () => {
    const created = (await (await request('/mentors/me/posts', ids.owner, valid)).json()).post;

    // Attempting to supply another mentorId in the payload is rejected.
    const spoofBodyResponse = await request('/mentors/me/posts', ids.other, {
      ...valid,
      mentorId: ids.owner,
    });
    expect(spoofBodyResponse.status).toBe(400);
    expect(await publicProfilePosts(ids.owner)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id })]),
    );

    // Attempting to post directly to another mentor's public route is rejected.
    expect((await request(`/mentors/${ids.owner}/posts`, ids.other, valid)).status).toBe(404);

    // Another mentor cannot see, edit, or delete owner's post.
    expect(await myPosts(ids.other)).not.toContainEqual(
      expect.objectContaining({ id: created.id }),
    );
    expect(
      (
        await request(
          `/mentors/me/posts/${created.id}`,
          ids.other,
          { title: 'Hijacked', body: 'Hijacked content' },
          'PUT',
        )
      ).status,
    ).toBe(404);
    expect(
      (await request(`/mentors/me/posts/${created.id}`, ids.other, undefined, 'DELETE')).status,
    ).toBe(404);

    // Owner's saved post remains intact.
    expect(await myPosts()).toContainEqual(created);
  });

  it('hides posts of banned, deleted, or incomplete mentors from public post links', async () => {
    const postId = randomUUID();
    await pool.query(
      'INSERT INTO mentor_post (id, mentor_id, title, body) VALUES ($1, $2, $3, $4)',
      [postId, ids.banned, 'Banned post', 'Hidden body'],
    );
    expect((await request(`/mentors/${ids.banned}/posts/${postId}`)).status).toBe(404);
  });

  it.each([
    [undefined, 401],
    [ids.student, 403],
    [ids.admin, 403],
    [ids.incomplete, 409],
    [ids.banned, 403],
    [ids.deleted, 401],
  ] as const)('rejects unauthorized post management for %s', async (id, status) => {
    expect((await request('/mentors/me/posts', id)).status).toBe(status);
    expect((await request('/mentors/me/posts', id, valid)).status).toBe(status);
  });
});
