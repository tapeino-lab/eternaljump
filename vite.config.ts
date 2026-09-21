import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

function adminHtmlPlugin() {
  const currentPass = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '';
  const defaultHash = '05e9824f196ce156b8dc7c618f989a87d58ebf32881de8eda2e5fb9ce123a91d'; // hash of zxcv0987
  const adminHash = currentPass ? crypto.createHash('sha256').update(currentPass.trim()).digest('hex') : defaultHash;

  return {
    name: 'admin-html-password-hash',
    transformIndexHtml(html: string) {
      return html.replace(/__ADMIN_PASSWORD_HASH__/g, adminHash);
    },
    closeBundle() {
      const distAdmin = path.join(process.cwd(), 'dist', 'admin.html');
      if (fs.existsSync(distAdmin)) {
        let content = fs.readFileSync(distAdmin, 'utf-8');
        if (content.includes('__ADMIN_PASSWORD_HASH__')) {
          content = content.replace(/__ADMIN_PASSWORD_HASH__/g, adminHash);
          fs.writeFileSync(distAdmin, content, 'utf-8');
        }
      }
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
      adminHtmlPlugin(),
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
          navigateFallbackDenylist: [/admin/i, /api/i],
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

