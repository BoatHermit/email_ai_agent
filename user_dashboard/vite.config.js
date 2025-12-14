import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

console.log('[vite] config loaded')
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api2': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api2/, ''),
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
