import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync } from 'fs';

// Plugin para copiar web.config para IIS
const copyWebConfig = () => ({
  name: 'copy-web-config',
  closeBundle() {
    const src = path.resolve(__dirname, 'web.config');
    const dest = path.resolve(__dirname, 'dist', 'web.config');
    if (existsSync(src)) {
      copyFileSync(src, dest);
      console.log('✅ web.config copiado para dist/');
    }
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), copyWebConfig()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
