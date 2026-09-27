import {fullDashboard} from './e2e/fullDashboard';
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:['feeding-powers.spec.ts','momentum-advanced.spec.ts'],outputDir:'test-results-feeding-powers',timeout:45000,workers:1,use:{storageState:fullDashboard('http://localhost:5199'),baseURL:'http://localhost:5199',channel:'chrome',headless:true,screenshot:'only-on-failure'},webServer:{command:'npm run dev -- --port 5199',port:5199,reuseExistingServer:true}});
