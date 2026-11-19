import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';

const alpha = `Alpha ${randomUUID()}`;
const zeta = `Zeta ${randomUUID()}`;
const names = [zeta, alpha];
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
  it('is public and lists categories in name order', async () => {
    const response = await fetch(`${origin}/api/categories`);
    expect(response.status).toBe(200);
    const { categories } = (await response.json()) as {
      categories: { id: string; name: string }[];
    };

    // These fixtures have the same relative order across database collations.
    const fixtures = categories.filter((category) => names.includes(category.name));
    expect(fixtures).toEqual([
      { id: expect.any(String), name: alpha },
      { id: expect.any(String), name: zeta },
    ]);
  });
});
