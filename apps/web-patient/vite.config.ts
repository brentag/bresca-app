import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const buildVersion = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'dev'; }
})();

// Escribe public/version.json en cada arranque (dev + build)
// para que las páginas HTML estáticas puedan fetchear /version.json
writeFileSync(
  resolve(__dirname, 'public', 'version.json'),
  JSON.stringify({ v: buildVersion }),
);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: false, // usamos public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*365 } },
        }],
      },
    }),
  ],
  define: { __BUILD_VERSION__: JSON.stringify(buildVersion) },
  resolve: { alias: { '@': '/src' } },
  server: { port: 5174 },
});
