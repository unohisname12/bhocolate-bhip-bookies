import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'first-session.spec.ts', globalSetup: './e2e/pilot-setup.ts',
  outputDir: 'test-results-first-session', workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:8831', channel: 'chrome', headless: true },
  webServer: { command: 'npx wrangler dev --ip 127.0.0.1 --port 8831 --persist-to .wrangler/pilot-test-state', url: 'http://127.0.0.1:8831', reuseExistingServer: false, timeout: 60000 },
});
