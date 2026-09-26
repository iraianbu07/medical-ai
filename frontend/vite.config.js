import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/vitals': 'http://localhost:8000',
      '/prediction': 'http://localhost:8000',
      '/patients': 'http://localhost:8000',
      '/devices': 'http://localhost:8000',
      '/events': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
    }
  }
})
