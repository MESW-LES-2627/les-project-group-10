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
  const response = JSON.parse(
    vercel([
      'deploy',
      '--prebuilt',
      '--prod',
      '--skip-domain',
      '--yes',
      '--json',
      '--non-interactive',
    ]),
  );
  const uploaded = response.deployment ?? response;
  if (
    uploaded.readyState !== 'READY' ||
    uploaded.target !== 'production' ||
    typeof uploaded.url !== 'string'
  ) {
    throw new Error('Vercel did not return a ready staged production deployment');
  }
  const deployment = new URL(uploaded.url);
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
  if (!process.argv.includes('--stage-only')) {
    const previous = JSON.parse(
      vercel(['inspect', environment.origin, '--json', '--non-interactive']),
    );
    if (!/^dpl_[a-zA-Z0-9]+$/.test(previous.id ?? ''))
      throw new Error('Cannot identify the current deployment for recovery');
    vercel(['promote', deployedUrl, '--yes', '--non-interactive']);
    try {
      const get = (urlPath) => run('curl', [...curlOptions, `${environment.origin}${urlPath}`]);
      for (let attempt = 0; ; attempt++) {
        try {
          verifyHealth(get('/api/health'));
          break;
        } catch (error) {
          if (attempt === 4) throw error;
          await setTimeout(2_000);
        }
      }
      const expectedHtml = await readFile(
        path.join(root, '.vercel/output/static/index.html'),
        'utf8',
      );
      const script = expectedHtml.match(/\bsrc="(\/assets\/[^"?#]+\.js)"/)?.[1];
      if (!script || !get('/').includes(script))
        throw new Error('The public frontend does not match this build');
      if (
        hash(get(script)) !== hash(await readFile(path.join(root, '.vercel/output/static', script)))
      )
        throw new Error('The public JavaScript does not match this build');
    } catch (error) {
      console.error('Public release verification failed; restoring the previous deployment');
      vercel(['rollback', previous.id, '--yes', '--non-interactive']);
      throw error;
    }
    console.log(`Released ${revision} at ${environment.origin}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = error.exitCode ?? 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
