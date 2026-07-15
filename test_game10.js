import re
content = open('src/entities.js', 'r').read()
content = content.replace('this.waitTimer += frameDuration;', 'this.waitTimer += 1000 / config.targetFPS;')
open('src/entities.js', 'w').write(content)
