import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'pet-room-layout.spec.ts',outputDir:'test-results-pet-room',workers:1,use:{baseURL:'http://127.0.0.1:5207',channel:'chrome'},webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5207 --strictPort',url:'http://127.0.0.1:5207'}});
