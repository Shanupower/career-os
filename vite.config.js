import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { discoveryApiPlugin } from './scripts/vite-discovery-api.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), discoveryApiPlugin()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  server: {
    watch: {
      // Dev API writes profile/intelligence/jobs under data/ — ignore to avoid full-page reloads
      ignored: ['**/data/**'],
    },
  },
})
