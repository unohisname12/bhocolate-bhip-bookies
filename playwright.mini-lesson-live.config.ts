import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'mini-lesson-pilot.spec.ts',outputDir:'.pilot-private/live-results',workers:1,timeout:60000,use:{channel:'chrome',headless:true}});
