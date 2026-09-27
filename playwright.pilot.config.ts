import { defineConfig } from '@playwright/test';
const port = Number(process.env.PILOT_TEST_PORT || 8788);
const url = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './e2e', testMatch: 'pilot.spec.ts',
  globalSetup: './e2e/pilot-setup.ts',
  outputDir: 'test-results-pilot', workers: 1, timeout: 45000,
  use: { baseURL: url, channel: 'chrome', headless: true, screenshot: 'only-on-failure', extraHTTPHeaders: { 'X-Pilot-Request': '1' } },
  webServer: { command: `npx wrangler dev --ip 127.0.0.1 --port ${port} --persist-to .wrangler/pilot-test-state`, url, reuseExistingServer: false, timeout: 60000 },
});
