import { fullDashboard } from './e2e/fullDashboard';
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'pet-hunt.spec.ts',globalSetup:'./e2e/pet-hunt-setup.ts',outputDir:'test-results-pet-hunt',workers:1,timeout:90000,use:{storageState:fullDashboard('http://127.0.0.1:8842'),baseURL:'http://127.0.0.1:8842',channel:'chrome',headless:true,screenshot:'only-on-failure'},webServer:{command:'npx wrangler dev --ip 127.0.0.1 --port 8842 --persist-to .wrangler/pet-hunt-test-state',url:'http://127.0.0.1:8842',reuseExistingServer:false,timeout:60000}});
