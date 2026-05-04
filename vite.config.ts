import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5050',
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('react')) return 'react';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('lucide-react') || id.includes('react-hot-toast')) return 'ui';
          return 'vendor';
        },
      },
    },
  },
});
