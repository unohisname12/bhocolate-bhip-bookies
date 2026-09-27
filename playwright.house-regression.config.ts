import {defineConfig} from '@playwright/test';
import {fullDashboard} from './e2e/fullDashboard';
export default defineConfig({testDir:'./e2e',testMatch:'home-base.spec.ts',outputDir:'test-results-house-regression',workers:1,timeout:45000,use:{storageState:fullDashboard('http://localhost:5208'),baseURL:'http://localhost:5208',channel:'chrome',headless:true,screenshot:'only-on-failure'},webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5208 --strictPort',url:'http://localhost:5208',reuseExistingServer:false}});
