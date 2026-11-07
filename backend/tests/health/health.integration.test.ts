import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';

let server: Server;
let origin: string;
beforeAll(async () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'src/db/migrate.ts'], { env: process.env });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test listener');
  origin = `http://127.0.0.1:${address.port}`;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.end();
});
describe('deployment readiness', () => {
  it('identifies the running artifact and verifies its required migration', async () => {
    vi.stubEnv('DEPLOYMENT_REVISION', 'a'.repeat(40));
    vi.stubEnv('REQUIRED_MIGRATION', '008_mentor_professional_background.sql');
    const response = await fetch(`${origin}/api/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      status: 'ok',
      revision: 'a'.repeat(40),
      migration: '008_mentor_professional_background.sql',
    });
  });
  it('rejects a database missing the artifact’s migration', async () => {
    vi.stubEnv('REQUIRED_MIGRATION', '999_not_applied.sql');
    const response = await fetch(`${origin}/api/health`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
  });
  it('returns unavailable when the database query fails', async () => {
    vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Database unavailable') as never);
    const response = await fetch(`${origin}/api/health`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable' });
  });
});
