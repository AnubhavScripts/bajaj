import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // during local dev, /api/bfhl → http://localhost:3001/api/bfhl
      // Vercel handles this automatically in production
      '/api': 'http://localhost:3001'
    }
  }
})
