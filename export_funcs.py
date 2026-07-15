import re

content = open('src/entities.js', 'r').read()

content = content.replace('function spawnParticles', 'export function spawnParticles')
content = content.replace('function spawnDebris', 'export function spawnDebris')
content = content.replace('function trySpawnBirdsOnPlatform', 'export function trySpawnBirdsOnPlatform')

open('src/entities.js', 'w').write(content)

content2 = open('src/game.js', 'r').read()
content2 = content2.replace('getMt, getIt,', 'getMt, getIt, spawnParticles, spawnDebris, trySpawnBirdsOnPlatform,')
open('src/game.js', 'w').write(content2)

