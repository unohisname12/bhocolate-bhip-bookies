import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Serve fonts as same-origin files, matching the classroom Content Security Policy.
  // Keep hashed chunks for classroom tabs opened before the latest deployment.
  build: { emptyOutDir: mode === 'pilot' ? false : undefined, assetsInlineLimit: (path) => /\.woff2?$/.test(path) ? false : undefined },
  server: {
    port: 5000,
  },
}))
