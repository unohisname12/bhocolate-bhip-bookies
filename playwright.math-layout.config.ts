import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'math-layout.spec.ts',outputDir:'test-results-math-layout',workers:1,use:{baseURL:'http://127.0.0.1:5208',channel:'chrome'},webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5208 --strictPort',url:'http://127.0.0.1:5208'}});
