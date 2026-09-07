import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/cases': 'http://127.0.0.1:8000',
      '/evidence': 'http://127.0.0.1:8000',
      '/reviews': 'http://127.0.0.1:8000',
      '/failures': 'http://127.0.0.1:8000',
      '/ingestion': 'http://127.0.0.1:8000',
      '/experiment': 'http://127.0.0.1:8000',
      '/feedback': 'http://127.0.0.1:8000',
      '/audit': 'http://127.0.0.1:8000',
      '/dashboard': 'http://127.0.0.1:8000',
      '/settings': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000'
    }
  }
})
