import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Default 3000 — matches Google OAuth “Authorized JavaScript origins” (e.g. http://localhost:3000)
    port: 3000,
    // If 3000 is already taken, Vite picks the next free port (add that origin in Google Cloud Console too)
    strictPort: false,
    // Proxy API to Django so the browser calls same origin (no CORS issues in dev)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
