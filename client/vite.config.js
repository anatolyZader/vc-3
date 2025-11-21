// viteReact.config.js
/* eslint-disable no-unused-vars */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // ✅ Only one React plugin needed
  base: '/',
  server: {
  port: 5173,
  strictPort: true, // Do not auto-pick a different port
    host: true, // Allow external connections
    open: false, // Don't auto-open browser
    proxy: {
      // API requests proxy (includes WebSocket at /api/ws)
      '/api': {
        target: 'http://localhost:3000',  // ✅ Consistent with your backend
        changeOrigin: true,
        secure: false,
        ws: true, // ✅ This handles WebSocket at /api/ws
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('🚨 API Proxy Error:', err.message);
            console.log('📍 Request URL:', req.url);
            console.log('🎯 Target:', options.target);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`🔄 Proxying API: ${req.method} ${req.url} → ${options.target}${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const status = proxyRes.statusCode;
            const statusIcon = status >= 200 && status < 300 ? '✅' : '❌';
            console.log(`${statusIcon} Proxy Response: ${status} for ${req.url}`);
          });
          // WebSocket specific logging
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            console.log('🔌 WebSocket Proxy: Upgrading connection to', options.target);
          });
          proxy.on('proxyResWs', (proxyRes, req, socket, head) => {
            console.log('🔌 WebSocket Proxy: Connection established');
          });
        }
      }
    }
  }
});