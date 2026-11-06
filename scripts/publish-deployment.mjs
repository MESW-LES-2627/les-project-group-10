import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Publish a built artifact without linking/importing the private school Git repository.
const root = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2];
if (!['staging', 'production'].includes(target)) {
  throw new Error('Use: node scripts/publish-deployment.mjs staging|production');
}
const expectedProjects = {
  staging: 'prj_BaFanLLpy6enxObnHC4EFFCYz7q9',
  production: 'prj_Vk1vscCrsqdTws1zzGKvluEryXw3',
};
const expectedOrgId = 'team_cG3CveVNJvYQfNudXEr9srwt';
const projectPath = path.join(root, '.vercel', target, 'project.json');
let project;
if (process.env.VERCEL_PROJECT_ID || process.env.VERCEL_ORG_ID) {
  project = {
    projectId: process.env.VERCEL_PROJECT_ID,
    orgId: process.env.VERCEL_ORG_ID,
  };
} else {
  project = JSON.parse(await readFile(projectPath, 'utf8'));
}
if (!project.projectId || !project.orgId)
  throw new Error(`Link the ${target} Vercel project first`);
if (project.projectId !== expectedProjects[target] || project.orgId !== expectedOrgId) {
  throw new Error(`Vercel project configuration does not match the ${target} environment`);
}
const temporary = await mkdtemp(path.join(tmpdir(), 'feup-connect-deploy-'));
try {
  await cp(path.join(root, '.vercel/output'), path.join(temporary, '.vercel/output'), {
    recursive: true,
  });
  await cp(projectPath, path.join(temporary, '.vercel/project.json'));
  const expectedName = target === 'staging' ? 'feup-connect-staging' : 'feup-connect-production';
  const inspect = spawnSync(
    'npx',
    ['--yes', 'vercel@65.12.0', 'project', 'inspect', '--non-interactive'],
    {
      cwd: temporary,
      encoding: 'utf8',
      env: process.env,
    },
  );
  if (inspect.error) throw inspect.error;
  const inspection = `${inspect.stdout ?? ''}\n${inspect.stderr ?? ''}`;
  if (
    inspect.status !== 0 ||
    !inspection.includes(project.projectId) ||
    !inspection.includes(expectedName)
  ) {
    throw new Error(`Vercel project verification failed for ${expectedName}; deployment stopped.`);
  }
  process.stdout.write(inspection);
  const result = spawnSync(
    'npx',
    ['--yes', 'vercel@65.12.0', 'deploy', '--prebuilt', '--prod', '--yes'],
    {
      cwd: temporary,
      stdio: 'inherit',
      env: process.env,
    },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
