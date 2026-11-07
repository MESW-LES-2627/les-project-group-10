import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.vercel/output');
const functionDir = path.join(output, 'functions/api/index.func');
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
if (git.status !== 0) throw new Error('Cannot identify the deployment commit');
const revision = git.stdout.trim();
if (
  !/^[a-f0-9]{40}$/.test(revision) ||
  (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== revision)
) {
  throw new Error('The deployment checkout does not match the requested commit');
}
const migration = (await readdir(path.join(root, 'backend/db/migrations')))
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .at(-1);
if (!migration) throw new Error('No database migrations found');

function run(args, cwd = root) {
  const result = spawnSync('npm', args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Only this generated folder is removed. Server data and local secrets are untouched.
await rm(output, { recursive: true, force: true });
run(['--prefix', 'backend', 'run', 'build']);
run(['--prefix', 'frontend', 'run', 'build']);
await mkdir(functionDir, { recursive: true });
await cp(path.join(root, 'frontend/dist'), path.join(output, 'static'), { recursive: true });
await writeFile(path.join(output, 'static/404.html'), 'Not found\n');
const entry = path.join(functionDir, 'entry.mjs');
const handler = path.join(functionDir, 'serve.cjs');
await writeFile(
  entry,
  `export { app as default } from ${JSON.stringify(path.join(root, 'backend/dist/app.js'))};\n`,
);
const bundle = spawnSync(
  path.join(root, 'backend/node_modules/.bin/esbuild'),
  [entry, '--bundle', '--platform=node', '--target=node22', '--format=cjs', `--outfile=${handler}`],
  { cwd: root, stdio: 'inherit', env: process.env },
);
if (bundle.error) throw bundle.error;
if (bundle.status !== 0) process.exit(bundle.status ?? 1);
await writeFile(
  handler,
  `${await readFile(handler, 'utf8')}\nmodule.exports = module.exports.default;\n`,
);
await rm(entry, { force: true });
await writeFile(
  path.join(functionDir, '.vc-config.json'),
  JSON.stringify({
    runtime: 'nodejs22.x',
    handler: 'serve.cjs',
    launcherType: 'Nodejs',
    shouldAddHelpers: true,
    maxDuration: 60,
    regions: ['fra1'],
    environment: { DEPLOYMENT_REVISION: revision, REQUIRED_MIGRATION: migration },
  }),
);
await writeFile(
  path.join(output, 'config.json'),
  JSON.stringify({
    version: 3,
    routes: [
      { src: '/api(?:/.*)?', dest: '/api/index', headers: { 'Cache-Control': 'no-store' } },
      { handle: 'filesystem' },
      { src: '/assets/.*', status: 404, dest: '/404.html' },
      { src: '/.*', dest: '/index.html', headers: { 'Cache-Control': 'no-cache' } },
    ],
  }),
);
const config = JSON.parse(await readFile(path.join(output, 'config.json'), 'utf8'));
if (config.version !== 3) throw new Error('Invalid deployment output');
console.log(
  'Prepared .vercel/output: React site and one Node.js API function. No secrets included.',
);
