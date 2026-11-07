import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

// Publish a built artifact without importing the private school Git repository.
const root = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2];
const environments = {
  staging: {
    projectId: 'prj_BaFanLLpy6enxObnHC4EFFCYz7q9',
    origin: 'https://les-staging.simaob.com',
  },
  production: { projectId: 'prj_Vk1vscCrsqdTws1zzGKvluEryXw3', origin: 'https://les.simaob.com' },
};
if (!Object.hasOwn(environments, target)) {
  throw new Error('Use: node scripts/publish-deployment.mjs staging|production [--stage-only]');
}
if (process.argv.slice(3).some((arg) => arg !== '--stage-only'))
  throw new Error('Unknown publisher option');
const environment = environments[target];
const expectedName = `feup-connect-${target}`;
const expectedOrgId = 'team_cG3CveVNJvYQfNudXEr9srwt';
const project =
  process.env.VERCEL_PROJECT_ID || process.env.VERCEL_ORG_ID
    ? { projectId: process.env.VERCEL_PROJECT_ID, orgId: process.env.VERCEL_ORG_ID }
    : JSON.parse(await readFile(path.join(root, '.vercel', target, 'project.json'), 'utf8'));
if (project.projectId !== environment.projectId || project.orgId !== expectedOrgId) {
  throw new Error(`Vercel project configuration does not match the ${target} environment`);
}
const config = JSON.parse(
  await readFile(
    path.join(root, '.vercel/output/functions/api/index.func/.vc-config.json'),
    'utf8',
  ),
);
const { DEPLOYMENT_REVISION: revision, REQUIRED_MIGRATION: migration } = config.environment ?? {};
if (!/^[a-f0-9]{40}$/.test(revision ?? '') || !/^\d+_[\w-]+\.sql$/.test(migration ?? '')) {
  throw new Error('Build a deployment with a commit and required migration before publishing');
}
if (process.env.GITHUB_SHA && revision !== process.env.GITHUB_SHA)
  throw new Error('Artifact commit does not match this workflow run');
const temporary = await mkdtemp(path.join(tmpdir(), 'feup-connect-deploy-'));
const curlOptions = [
  '--fail',
  '--silent',
  '--show-error',
  '--connect-timeout',
  '10',
  '--max-time',
  '30',
  '--retry',
  '3',
  '--retry-delay',
  '2',
  '--retry-all-errors',
];
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: temporary,
    encoding: 'utf8',
    timeout: 8 * 60_000,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, VERCEL_TELEMETRY_DISABLED: '1', NO_UPDATE_NOTIFIER: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error(
      `${command} ${args.includes('curl') ? 'health request' : 'command'} failed (exit ${result.status}): ${result.stderr ?? ''}`,
    );
    error.exitCode = result.status ?? 1;
    throw error;
  }
  return result.stdout;
}
function vercel(args) {
  return run('npx', ['--yes', 'vercel@65.12.0', ...args]);
}
function verifyHealth(body) {
  const health = JSON.parse(body);
  if (health.status !== 'ok' || health.revision !== revision || health.migration !== migration) {
    throw new Error('Health check did not verify the expected commit and database migration');
  }
}
function hash(contents) {
  return createHash('sha256').update(contents).digest('hex');
}
try {
  await cp(path.join(root, '.vercel/output'), path.join(temporary, '.vercel/output'), {
    recursive: true,
  });
  await mkdir(path.join(temporary, '.vercel'), { recursive: true });
  await writeFile(path.join(temporary, '.vercel/project.json'), JSON.stringify(project));
  const inspection = vercel(['project', 'inspect', '--non-interactive', '--json']);
  const inspectedProject = JSON.parse(inspection);
  if (inspectedProject.id !== project.projectId || inspectedProject.name !== expectedName) {
    throw new Error(`Vercel project verification failed for ${expectedName}; deployment stopped.`);
  }
  const deployment = new URL(
    vercel(['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes']).trim(),
  );
  if (
    deployment.protocol !== 'https:' ||
    deployment.origin !== deployment.href.replace(/\/$/, '') ||
    !deployment.hostname.startsWith(`${expectedName}-`) ||
    !deployment.hostname.endsWith('.vercel.app')
  ) {
    throw new Error('Vercel returned an unexpected deployment URL');
  }
  const deployedUrl = deployment.origin;
  console.log(`Staged ${target} deployment: ${deployedUrl}`);
  const get = (urlPath) =>
    vercel(['curl', urlPath, '--deployment', deployedUrl, '--', ...curlOptions]);
  verifyHealth(get('/api/health'));
  const expectedHtml = await readFile(path.join(root, '.vercel/output/static/index.html'), 'utf8');
  const script = expectedHtml.match(/\bsrc="(\/assets\/[^"?#]+\.js)"/)?.[1];
  if (!script || !get('/').includes(script))
    throw new Error('The staged frontend does not match this build');
  if (
    hash(get(script)) !== hash(await readFile(path.join(root, '.vercel/output/static', script)))
  ) {
    throw new Error('The staged JavaScript does not match this build');
  }
  console.log(`Verified commit ${revision}, database migration, and frontend bundle`);
  if (!process.argv.includes('--stage-only')) {
    vercel(['promote', deployedUrl, '--yes']);
    // Check the public domain without bypass credentials, including alias propagation.
    for (let attempt = 0; ; attempt++) {
      try {
        verifyHealth(run('curl', [...curlOptions, `${environment.origin}/api/health`]));
        break;
      } catch (error) {
        if (attempt === 4) throw error;
        await setTimeout(2_000);
      }
    }
    console.log(`Released ${revision} at ${environment.origin}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = error.exitCode ?? 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
