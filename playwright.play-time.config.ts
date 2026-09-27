import { fullDashboard } from './e2e/fullDashboard';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'play-time.spec.ts', globalSetup: './e2e/pilot-setup.ts',
  outputDir: 'test-results-play-time', workers: 1, timeout: 60000,
  use: { storageState: fullDashboard('http://127.0.0.1:8829'), baseURL: 'http://127.0.0.1:8829', channel: 'chrome', headless: true },
  webServer: { command: 'npx wrangler dev --ip 127.0.0.1 --port 8829 --persist-to .wrangler/pilot-test-state', url: 'http://127.0.0.1:8829', reuseExistingServer: false, timeout: 60000 },
});
