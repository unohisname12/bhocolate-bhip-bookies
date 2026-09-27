import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Serve fonts as same-origin files, matching the classroom Content Security Policy.
  build: { assetsInlineLimit: (path) => /\.woff2?$/.test(path) ? false : undefined },
  server: {
    port: 5000,
  },
})
