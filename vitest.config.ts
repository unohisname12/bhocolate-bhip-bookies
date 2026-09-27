import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'worker/**/*.test.ts'],
    environment: 'node',
    globals: false,
    exclude: [
      'e2e/**',
      'node_modules/**',
      'dist/**',
    ],
  },
});
