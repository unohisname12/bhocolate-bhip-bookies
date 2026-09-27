import { fullDashboard } from './e2e/fullDashboard';
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:['number-merge-ui.spec.ts','nonbattle-balance.spec.ts','game-rules.spec.ts'],outputDir:'test-results-number-merge',workers:1,timeout:45000,use:{storageState:fullDashboard('http://127.0.0.1:5193'),baseURL:'http://127.0.0.1:5193',channel:'chrome',headless:true,screenshot:'only-on-failure'},webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5193 --strictPort',url:'http://127.0.0.1:5193',reuseExistingServer:true}});
