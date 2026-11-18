import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';

const names = [`Zeta ${randomUUID()}`, `Alpha ${randomUUID()}`];
let server: Server;
let origin: string;

beforeAll(async () => {
  for (const name of names) {
    await pool.query('INSERT INTO category (name, slug) VALUES ($1,$2)', [name, randomUUID()]);
  }
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing HTTP test address');
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await pool.query('DELETE FROM category WHERE name = ANY($1::text[])', [names]);
  await pool.end();
});

describe('GET /api/categories', () => {
  it('is public and lists id and name for every category, sorted by name', async () => {
    const response = await fetch(`${origin}/api/categories`);
    expect(response.status).toBe(200);
    const { categories } = (await response.json()) as {
      categories: { id: string; name: string }[];
    };

    const listed = categories.map((c) => c.name);
    expect(listed).toEqual([...listed].sort((a, b) => a.localeCompare(b, 'en')));
    for (const name of names) expect(listed).toContain(name);
    expect(categories[0]).toEqual({ id: expect.any(String), name: expect.any(String) });
  });
});
