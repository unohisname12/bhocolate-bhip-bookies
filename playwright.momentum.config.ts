import { fullDashboard } from './e2e/fullDashboard';
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:['momentum-advanced.spec.ts','game-rules.spec.ts'],outputDir:'test-results-momentum',timeout:45000,workers:1,use:{storageState:fullDashboard('http://localhost:5197'),baseURL:'http://localhost:5197',channel:'chrome',headless:true,screenshot:'only-on-failure'},webServer:{command:'npm run dev -- --port 5197',port:5197,reuseExistingServer:false}});
