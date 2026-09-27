import { fullDashboard } from './e2e/fullDashboard';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'nonbattle-balance.spec.ts', outputDir: 'test-results-balance', timeout: 45000,
  use: { storageState: fullDashboard('http://localhost:5190'), baseURL: 'http://localhost:5190', channel: 'chrome', headless: true, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run preview -- --outDir .pilot-private/balance-dist --port 5190', port: 5190, reuseExistingServer: false },
});
