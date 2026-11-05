import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      JWT_SECRET: 'test-jwt-secret-used-only-in-unit-tests-32chars',
    },
  },
});
