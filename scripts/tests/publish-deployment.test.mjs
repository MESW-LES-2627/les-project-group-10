import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const orgId = 'team_cG3CveVNJvYQfNudXEr9srwt';
const revision = 'a'.repeat(40);
const migration = '008_mentor_professional_background.sql';
const projects = {
  staging: 'prj_BaFanLLpy6enxObnHC4EFFCYz7q9',
  production: 'prj_Vk1vscCrsqdTws1zzGKvluEryXw3',
};
const html = '<div id="root"></div><script type="module" src="/assets/app.js"></script>';
const javascript = 'console.log("the tested frontend");';
const health = { status: 'ok', revision, migration };
async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'les-publish-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const sub of [
    'scripts',
    'bin',
    'tmp',
    '.vercel/output/functions/api/index.func',
    '.vercel/output/static/assets',
  ]) {
    await mkdir(path.join(directory, sub), { recursive: true });
  }
  await writeFile(path.join(directory, '.vercel/output/config.json'), '{"version":3}');
  await writeFile(
    path.join(directory, '.vercel/output/functions/api/index.func/.vc-config.json'),
    JSON.stringify({
      environment: { DEPLOYMENT_REVISION: revision, REQUIRED_MIGRATION: migration },
    }),
  );
  await writeFile(path.join(directory, '.vercel/output/static/index.html'), html);
  await writeFile(path.join(directory, '.vercel/output/static/assets/app.js'), javascript);
  await cp(
    new URL('../publish-deployment.mjs', import.meta.url),
    path.join(directory, 'scripts/publish-deployment.mjs'),
  );
  const fake = String.raw`#!${process.execPath}
const fs = require('node:fs');
const kind = require('node:path').basename(process.argv[1]);
const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
const args = process.argv.slice(kind === 'npx' ? 4 : 2);
const oldEvents = fs.existsSync(process.env.EVENTS) ? fs.readFileSync(process.env.EVENTS, 'utf8') : '';
fs.appendFileSync(process.env.EVENTS, JSON.stringify({kind, args, project}) + '\n');
const health = JSON.parse(process.env.HEALTH);
if (kind === 'curl') {
  const stale = process.env.PUBLIC_STALE_ONCE && !oldEvents.includes('"kind":"curl"');
  const url = args.at(-1);
  if (url.endsWith('/api/health')) console.log(process.env.BAD_HEALTH || JSON.stringify({...health, revision: stale ? 'old' : health.revision}));
  else if (url.endsWith('/')) {
    const staleHomepage = process.env.PUBLIC_HOMEPAGE_STALE_ONCE &&
      !oldEvents.includes(JSON.stringify(url));
    console.log(staleHomepage ? '<html>old build</html>' : process.env.BAD_HTML || process.env.HTML);
  }
  else process.stdout.write(process.env.BAD_ASSET || process.env.JAVASCRIPT);
} else if (args[0] === 'project') {
  console.log(JSON.stringify({id: process.env.BAD_INSPECTION ? 'wrong' : project.projectId, name: 'feup-connect-' + process.env.TEST_TARGET, accountId: project.orgId}));
} else if (args[0] === 'deploy') {
  if (!fs.existsSync('.vercel/output/config.json')) process.exit(90);
  if (process.env.DEPLOY_EXIT) process.exit(Number(process.env.DEPLOY_EXIT));
  const deployment = {url: process.env.DEPLOY_URL || 'https://feup-connect-' + process.env.TEST_TARGET + '-test.vercel.app', readyState: process.env.READY_STATE || 'READY', target:'production'};
  console.log(JSON.stringify(process.env.UNWRAPPED_DEPLOYMENT ? deployment : {status:'ok',deployment}));
} else if (args[0] === 'curl') {
  if (args[1] === '/api/health') console.log(process.env.BAD_HEALTH || JSON.stringify(health));
  else if (args[1] === '/') console.log(process.env.BAD_HTML || process.env.HTML);
  else process.stdout.write(process.env.BAD_ASSET || process.env.JAVASCRIPT);
} else if (args[0] === 'inspect') {
  console.log(JSON.stringify({id:'dpl_previous'}));
} else if (args[0] === 'rollback') {
  process.exit(0);
} else if (args[0] === 'promote') {
  process.exit(Number(process.env.PROMOTE_EXIT || 0));
} else process.exit(91);
`;
  for (const binary of ['npx', 'curl'])
    await writeFile(path.join(directory, 'bin', binary), fake, { mode: 0o755 });
  return {
    directory,
    run(target = 'staging', overrides = {}, args = []) {
      return spawnSync(process.execPath, ['scripts/publish-deployment.mjs', target, ...args], {
        cwd: directory,
        encoding: 'utf8',
        env: {
          PATH: path.join(directory, 'bin'),
          TMPDIR: path.join(directory, 'tmp'),
          EVENTS: path.join(directory, 'events'),
          TEST_TARGET: target,
          VERCEL_ORG_ID: orgId,
          VERCEL_PROJECT_ID: projects[target],
          HEALTH: JSON.stringify(health),
          HTML: html,
          JAVASCRIPT: javascript,
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
  test(`promotes ${target} after CI and verifies its public domain`, async (t) => {
    const f = await fixture(t);
    const result = f.run(target);
    assert.equal(result.status, 0, result.stderr);
    const events = await f.events();
    assert.deepEqual(
      events.map((e) => (e.kind === 'curl' ? 'public' : e.args[0])),
      ['project', 'deploy', 'inspect', 'promote', 'public', 'public', 'public'],
    );
    assert.ok(events[1].args.includes('--prebuilt'));
    assert.ok(events[1].args.includes('--prod'));
    assert.ok(events[1].args.includes('--skip-domain'));
    for (const event of events)
      assert.deepEqual(event.project, { projectId: projects[target], orgId });
    const deployment = `https://feup-connect-${target}-test.vercel.app`;
    assert.equal(events[3].args[1], deployment);
    assert.equal(
      events[4].args.at(-1),
      `https://les${target === 'staging' ? '-staging' : ''}.simaob.com/api/health`,
    );
    assert.ok(!events.some((e) => e.kind === 'npx' && e.args[0] === 'curl'));
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

test('accepts the CLI’s unwrapped JSON output as well as its agent envelope', async (t) => {
  const f = await fixture(t);
  const result = f.run('staging', { UNWRAPPED_DEPLOYMENT: '1' }, ['--stage-only']);
  assert.equal(result.status, 0, result.stderr);
  await f.assertClean();
});

test('rejects a deployment that is not ready before running smoke checks', async (t) => {
  const f = await fixture(t);
  assert.notEqual(f.run('staging', { READY_STATE: 'BUILDING' }).status, 0);
  assert.equal((await f.events()).length, 2);
  await f.assertClean();
});
test('rejects wrong environment, organization, or artifact before invoking Vercel', async (t) => {
  const f = await fixture(t);
  for (const overrides of [
    { VERCEL_PROJECT_ID: projects.production },
    { VERCEL_ORG_ID: 'wrong-team' },
    { VERCEL_PROJECT_ID: '' },
    { GITHUB_SHA: 'b'.repeat(40) },
  ]) {
    assert.notEqual(f.run('staging', overrides).status, 0);
  }
  await assert.rejects(readFile(path.join(f.directory, 'events')), { code: 'ENOENT' });
});
test('does not deploy when project inspection fails', async (t) => {
  const f = await fixture(t);
  assert.notEqual(f.run('staging', { BAD_INSPECTION: '1' }).status, 0);
  assert.equal((await f.events()).length, 1);
  await f.assertClean();
});
for (const badHealth of [
  'not json',
  JSON.stringify({ ...health, status: 'unavailable' }),
  JSON.stringify({ ...health, revision: 'old' }),
  JSON.stringify({ ...health, migration: '001_init.sql' }),
]) {
  test(`rolls back an unhealthy or different release: ${badHealth}`, async (t) => {
    const f = await fixture(t);
    assert.notEqual(f.run('staging', { BAD_HEALTH: badHealth }).status, 0);
    assert.ok(
      (await f.events()).some((e) => e.args[0] === 'rollback' && e.args[1] === 'dpl_previous'),
    );
    await f.assertClean();
  });
}
for (const overrides of [{ BAD_HTML: '<html>old build</html>' }, { BAD_ASSET: 'wrong bundle' }]) {
  test(`rolls back a mismatched frontend: ${Object.keys(overrides)[0]}`, async (t) => {
    const f = await fixture(t);
    assert.notEqual(f.run('staging', overrides).status, 0);
    assert.ok(
      (await f.events()).some((e) => e.args[0] === 'rollback' && e.args[1] === 'dpl_previous'),
    );
    await f.assertClean();
  });
}
test('does not promote an untrusted deployment URL', async (t) => {
  const f = await fixture(t);
  assert.notEqual(f.run('staging', { DEPLOY_URL: 'https://attacker.example' }).status, 0);
  assert.equal((await f.events()).length, 2);
  await f.assertClean();
});
for (const variable of ['DEPLOY_EXIT', 'PROMOTE_EXIT']) {
  test(`propagates ${variable} and cleans temporary files`, async (t) => {
    const f = await fixture(t);
    assert.equal(f.run('staging', { [variable]: '42' }).status, 42);
    assert.ok(!(await f.events()).some((e) => e.kind === 'curl'));
    await f.assertClean();
  });
}
test('can stage a candidate without protection requests or public traffic changes', async (t) => {
  const f = await fixture(t);
  const result = f.run('staging', {}, ['--stage-only']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!(await f.events()).some((e) => e.args[0] === 'promote' || e.kind === 'curl'));
  await f.assertClean();
});
test('waits for the public domain to serve the expected revision', async (t) => {
  const f = await fixture(t);
  const result = f.run('staging', { PUBLIC_STALE_ONCE: '1' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal((await f.events()).filter((e) => e.kind === 'curl').length, 4);
  await f.assertClean();
});

test('waits for the public homepage after health reports the new revision', async (t) => {
  const f = await fixture(t);
  const result = f.run('production', { PUBLIC_HOMEPAGE_STALE_ONCE: '1' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /public homepage does not reference the expected bundle/);
  const events = await f.events();
  assert.equal(events.filter((event) => event.args.at(-1) === 'https://les.simaob.com/').length, 2);
  assert.ok(!events.some((event) => event.args[0] === 'rollback'));
  await f.assertClean();
});
