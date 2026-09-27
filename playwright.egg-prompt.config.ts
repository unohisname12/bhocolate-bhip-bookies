import { fullDashboard } from './e2e/fullDashboard';
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'egg-prompt.spec.ts',globalSetup:'./e2e/pilot-setup.ts',outputDir:'test-results-egg-prompt',workers:1,timeout:60000,use:{storageState:fullDashboard('http://127.0.0.1:8798'),baseURL:'http://127.0.0.1:8798',channel:'chrome',headless:true},webServer:{command:'npx wrangler dev --ip 127.0.0.1 --port 8798 --persist-to .wrangler/pilot-test-state',url:'http://127.0.0.1:8798',reuseExistingServer:false,timeout:60000}});
