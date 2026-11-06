import { defineConfig } from 'vitest/config';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString || !new URL(connectionString).pathname.endsWith('_test')) {
  throw new Error(
    'TEST_DATABASE_URL must point to a disposable database with a name ending in _test',
  );
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.integration.test.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: connectionString,
      JWT_SECRET: 'profile-integration-secret-used-only-in-tests-32chars',
      STRIPE_SECRET_KEY: 'sk_test_profile_integration',
    },
  },
});
