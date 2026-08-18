import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    // Fix: tabrakan nama minifikasi esbuild pada bundle besar (contoh: docx PageNumber
    // menjadi 'Ge' yang bentrok dengan fungsi jszip -> 'Ge is not a constructor').
    // Minifikasi dimatikan total agar tidak ada collision nama kelas saat runtime.
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
