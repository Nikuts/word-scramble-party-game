
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    host: true, // Allow connections from local network
    open: true, // Automatically open the browser on dev server start
    // Proxy API requests to the Node server
    proxy: {
      '/socket.io': {
        target: `http://127.0.0.1:${process.env.PORT || 3000}`,
        ws: true,
        changeOrigin: true
      }
    }
  },
  test: {
    include: ['test/**/*.{test,spec}.{js,ts}'],
    exclude: ['e2e/**', 'node_modules/**']
  }
})
