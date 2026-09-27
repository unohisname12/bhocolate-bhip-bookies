import { fullDashboard } from './e2e/fullDashboard';
import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',testMatch:'party.spec.ts',globalSetup:'./e2e/pilot-setup.ts',outputDir:'test-results-party',workers:1,timeout:90000,
 use:{storageState:fullDashboard('http://127.0.0.1:8792'),baseURL:'http://127.0.0.1:8792',channel:'chrome',headless:true,screenshot:'only-on-failure',extraHTTPHeaders:{'X-Pilot-Request':'1'}},
 webServer:{command:'npx wrangler dev --ip 127.0.0.1 --port 8792 --persist-to .wrangler/pilot-test-state',url:'http://127.0.0.1:8792',reuseExistingServer:false,timeout:60000},
});
