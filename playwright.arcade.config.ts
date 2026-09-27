import { fullDashboard } from './e2e/fullDashboard';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'arcade.spec.ts', outputDir: 'test-results-arcade', workers: 1, timeout: 45000,
  use: { storageState: fullDashboard('http://localhost:5007'), baseURL: 'http://localhost:5007', channel: 'chrome', headless: true, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5007 --strictPort', url: 'http://localhost:5007', reuseExistingServer: true },
});
