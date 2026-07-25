#!/bin/bash
head -n 8 src/update.ts > src/update-entities.ts
sed -n '9,268p' src/update.ts >> src/update-entities.ts

head -n 8 src/update.ts > src/update-states.ts
sed -n '270,673p' src/update.ts >> src/update-states.ts

head -n 8 src/update.ts > src/update-physics.ts
echo 'import { updateParticles, updateFlyingCoins, updateNPCs, updateBirds, updateMeteors } from "./update-entities.js";' >> src/update-physics.ts
echo 'import { updatePlayingState, postUpdatePhysics, updateStateAnimations, updateIntroState } from "./update-states.js";' >> src/update-physics.ts
sed -n '675,711p' src/update.ts >> src/update-physics.ts

cat << 'INNER_EOF' > src/update.ts
export * from './update-entities.js';
export * from './update-states.js';
export * from './update-physics.js';
INNER_EOF

