import { fullDashboard } from './e2e/fullDashboard';
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:['learning-upgrade.spec.ts','arcade.spec.ts'],outputDir:'test-results-learning',workers:1,timeout:45000,use:{storageState:fullDashboard('http://127.0.0.1:5129'),baseURL:'http://127.0.0.1:5129',channel:'chrome',headless:true,screenshot:'only-on-failure'},webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5129 --strictPort',url:'http://127.0.0.1:5129',reuseExistingServer:false}});
