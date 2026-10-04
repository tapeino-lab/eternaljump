import { defineConfig } from 'vitest/config';
import fs from 'fs';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

// Unit tests run in jsdom without the app's Vite plugins (PWA, admin HTML injection).
export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'https://tapeino-lab.github.io/eternaljump/' },
    },
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    env: {
      VITE_APP_VERSION: packageJson.version,
      VITE_LOOTLOCKER_API_KEY: 'test_game_key',
      VITE_LOOTLOCKER_DOMAIN_KEY: 'testdomain',
    },
  },
});
