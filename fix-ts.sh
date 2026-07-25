sed -i 's/pBtn: HTMLElement/pBtn: HTMLElement | null/g' src/update-states.ts src/update-entities.ts src/update-main.ts
sed -i 's/spawnPlatform()/spawnPlatform(game.cameraY - config.gameHeight, "normal")/g' src/update-states.ts
sed -i 's/initGame(false)/initGame()/g' src/update-states.ts
