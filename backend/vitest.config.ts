import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
    env: {
      JWT_SECRET: 'test-jwt-secret-used-only-in-unit-tests-32chars',
    },
  },
});
