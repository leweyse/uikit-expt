import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react-swc';
import { dirname, resolve } from 'pathe';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    glsl(),
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
    }),
  ],
});
