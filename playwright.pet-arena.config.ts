import{defineConfig}from'@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'pet-arena.spec.ts',workers:1,timeout:90000,use:{baseURL:'http://127.0.0.1:5232',channel:'chrome',headless:true,screenshot:'only-on-failure'},outputDir:'test-results-pet-arena'});
