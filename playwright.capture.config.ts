import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'momentum-capture.spec.ts',outputDir:'test-results-capture',workers:1,timeout:30000,use:{baseURL:'http://127.0.0.1:5218',channel:'chrome',viewport:{width:1366,height:657}},webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5218 --strictPort',url:'http://127.0.0.1:5218'}});
