import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

function versionJsonPlugin() {
  return {
    name: 'generate-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: packageJson.version, timestamp: Date.now() }, null, 2)
      });
    },
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && (req.url.startsWith('/version.json') || req.url === './version.json')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.end(JSON.stringify({ version: packageJson.version, timestamp: Date.now() }));
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
    },
    base: process.env.VITE_BASE_PATH || './',
    plugins: [
      tailwindcss(),
      versionJsonPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icon.svg', 'version.json'],
        manifest: {
          name: 'FOLLOW ME!',
          short_name: 'FOLLOW ME!',
          description: 'An endless jumping game',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'landscape',
          icons: [
            {
              src: 'icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf,cjs}'],
          runtimeCaching: [
            {
              urlPattern: /.*version\.json/i,
              handler: 'NetworkOnly'
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
// Trigger UI sync

