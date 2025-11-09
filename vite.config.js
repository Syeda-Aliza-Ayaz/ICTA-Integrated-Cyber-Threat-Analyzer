import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['emsdk'], // ← IGNORE EMSDK
  },
  server: {
    fs: {
      allow: [
        '..',
        'C:/Users/Syeda Aliza Ayaz/Documents/ICTA/dsa-project',
      ],
    },
  },
  assetsInclude: ['**/*.wasm'], // ← Add this to serve WASM files
});