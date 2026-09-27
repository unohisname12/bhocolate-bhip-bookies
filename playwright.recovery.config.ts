import { fullDashboard } from './e2e/fullDashboard';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['recovery-and-teacher.spec.ts', 'developer-polish.spec.ts', 'growth-and-nursery.spec.ts', 'discovery-week.spec.ts', 'teacher-profiles.spec.ts', 'learning-help.spec.ts', 'care-experience.spec.ts', 'woodland-adventure.spec.ts'],
  outputDir: 'test-results-recovery',
  timeout: 30_000,
  use: { storageState: fullDashboard('http://localhost:5182'), baseURL: 'http://localhost:5182', channel: 'chrome', headless: true, screenshot: 'only-on-failure' },
  webServer: { command: `npm run preview -- --port 5182${process.env.VPET_TEST_DIST ? ` --outDir ${process.env.VPET_TEST_DIST}` : ''}`, port: 5182, reuseExistingServer: false },
});
