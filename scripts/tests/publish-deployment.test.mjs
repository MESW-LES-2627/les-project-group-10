import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const orgId = 'team_cG3CveVNJvYQfNudXEr9srwt';
const projects = {
  staging: 'prj_BaFanLLpy6enxObnHC4EFFCYz7q9',
  production: 'prj_Vk1vscCrsqdTws1zzGKvluEryXw3',
};

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'les-publish-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'scripts'));
  await mkdir(path.join(directory, 'bin'));
  await mkdir(path.join(directory, 'tmp'));
  await mkdir(path.join(directory, '.vercel/output'), { recursive: true });
  await writeFile(path.join(directory, '.vercel/output/config.json'), '{"version":3}');
  await cp(
    new URL('../publish-deployment.mjs', import.meta.url),
    path.join(directory, 'scripts/publish-deployment.mjs'),
  );
  await writeFile(
    path.join(directory, 'bin/npx'),
    `#!${process.execPath}
const fs = require('node:fs');
const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
const args = process.argv.slice(2);
fs.appendFileSync(process.env.EVENTS, JSON.stringify({args, project}) + '\\n');
if (args.includes('inspect')) {
  console.log(process.env.BAD_INSPECTION ? 'wrong project' : project.projectId + ' feup-connect-' + process.env.TEST_TARGET);
} else {
  if (!fs.existsSync('.vercel/output/config.json')) process.exit(90);
  process.exit(Number(process.env.DEPLOY_EXIT || 0));
}
`,
    { mode: 0o755 },
  );
  return {
    directory,
    run(target, overrides = {}) {
      return spawnSync(process.execPath, ['scripts/publish-deployment.mjs', target], {
        cwd: directory,
        encoding: 'utf8',
        env: {
          PATH: path.join(directory, 'bin'),
          TMPDIR: path.join(directory, 'tmp'),
          EVENTS: path.join(directory, 'events'),
          TEST_TARGET: target,
          VERCEL_ORG_ID: orgId,
          VERCEL_PROJECT_ID: projects[target],
          ...overrides,
        },
      });
    },
    async events() {
      return (await readFile(path.join(directory, 'events'), 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
    },
    async assertClean() {
      assert.deepEqual(await readdir(path.join(directory, 'tmp')), []);
    },
  };
}

for (const target of Object.keys(projects)) {
  test(`publishes ${target} from CI IDs without local link files`, async (t) => {
    const f = await fixture(t);
    const result = f.run(target);
    assert.equal(result.status, 0, result.stderr);
    const events = await f.events();
    assert.equal(events.length, 2);
    assert.ok(events[0].args.includes('inspect'));
    assert.ok(events[1].args.includes('deploy'));
    assert.ok(events[1].args.includes('--prebuilt'));
    for (const event of events) {
      assert.deepEqual(event.project, { projectId: projects[target], orgId });
    }
    await f.assertClean();
  });
}

test('supports an existing local staging link', async (t) => {
  const f = await fixture(t);
  await mkdir(path.join(f.directory, '.vercel/staging'));
  await writeFile(
    path.join(f.directory, '.vercel/staging/project.json'),
    JSON.stringify({ projectId: projects.staging, orgId }),
  );
  const result = f.run('staging', { VERCEL_PROJECT_ID: '', VERCEL_ORG_ID: '' });
  assert.equal(result.status, 0, result.stderr);
  await f.assertClean();
});

test('rejects the other environment or organization before invoking Vercel', async (t) => {
  const f = await fixture(t);
  for (const overrides of [
    { VERCEL_PROJECT_ID: projects.production },
    { VERCEL_ORG_ID: 'wrong-team' },
    { VERCEL_PROJECT_ID: '' },
  ]) {
    const result = f.run('staging', overrides);
    assert.notEqual(result.status, 0);
  }
  await assert.rejects(readFile(path.join(f.directory, 'events')), { code: 'ENOENT' });
});

test('does not deploy when project inspection fails and cleans temporary files', async (t) => {
  const f = await fixture(t);
  assert.notEqual(f.run('staging', { BAD_INSPECTION: '1' }).status, 0);
  assert.equal((await f.events()).length, 1);
  await f.assertClean();
});

test('propagates deployment failure and cleans temporary files', async (t) => {
  const f = await fixture(t);
  assert.equal(f.run('staging', { DEPLOY_EXIT: '42' }).status, 42);
  await f.assertClean();
});
