// viteReact.config.js
/* eslint-disable no-unused-vars */


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteReact from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true, // Allow external connections (for your --host flag)
    open: true, // Auto-open browser (for your --open flag)
    proxy: {
      // API requests proxy
      '/api': {
        target: 'http://127.0.0.1:3000',  
        changeOrigin: true,
        secure: false,
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
        }
      },
      // WebSocket proxy for real-time chat
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, socket, head) => {
            console.log('🚨 WebSocket Proxy Error:', err.message);
          });
          proxy.on('open', (proxySocket) => {
            console.log('🔌 WebSocket Proxy: Connection opened');
          });
          proxy.on('close', (res, socket, head) => {
            console.log('🔌 WebSocket Proxy: Connection closed');
          });
        }
      }
    }
  }
});