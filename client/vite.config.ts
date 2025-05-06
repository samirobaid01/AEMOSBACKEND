import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Proxy disabled - using direct API calls to backend
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3000',
    //     changeOrigin: true,
    //     secure: false,
    //   },
    //   '/socket.io': {
    //     target: 'http://localhost:3000',
    //     changeOrigin: true,
    //     secure: false,
    //     ws: true,
    //   },
    // },
  },
})
