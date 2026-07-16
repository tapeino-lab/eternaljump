const fs = require('fs');
let code = fs.readFileSync('.github/workflows/deploy.yml', 'utf-8');

code = code.replace(
  'VITE_BASE_PATH: /${{ github.event.repository.name }}/',
  'VITE_BASE_PATH: /${{ github.event.repository.name }}/\n          VITE_LOOTLOCKER_API_KEY: ${{ secrets.VITE_LOOTLOCKER_API_KEY }}\n          VITE_LOOTLOCKER_DOMAIN_KEY: ${{ secrets.VITE_LOOTLOCKER_DOMAIN_KEY }}\n          VITE_LOOTLOCKER_LEADERBOARD_ID: ${{ secrets.VITE_LOOTLOCKER_LEADERBOARD_ID }}'
);

fs.writeFileSync('.github/workflows/deploy.yml', code);
