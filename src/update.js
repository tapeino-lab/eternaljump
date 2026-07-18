import { config } from './config.js';
import { P_BD, getBd, P_MT, getMt, spawnParticles, P_PT, P_PL, P_IT, P_CN } from './entities.js';
import { RND, FLR, MAX, MIN, $ } from './utils.js';
import { logAIEvent, initGame } from './game.js';
import { RankingAPI } from './ranking.js';

export function updateBirds(game) {
  for (let i = game.birds.length - 1; i >= 0; i--) {
    let b = game.birds[i];
    b.update();
    if (b.y > game.cameraY + config.gameHeight + 100 || b.y < game.cameraY - 1000 || b.x < -50 || b.x > config.gameWidth + 50) {
      P_BD.push(b);
      game.birds.splice(i, 1);
    }
  }

  if (game.score > game.startScore + 1000 && game.score < 52000) {
    if (RND() < 0.012 && game.birds.filter(b => b.type === 2).length < 1) {
      let dir = RND() < 0.85 ? game.flockDir : -game.flockDir;
      let startX = dir === 1 ? -20 : config.gameWidth + 20;
      game.birds.push(getBd(2, startX, game.cameraY + 50 + RND() * (config.gameHeight * 0.5), false));
    }
    if (game.score >= 40000 && RND() < 0.02) {
      let bt = RND() < 0.8 ? 0 : 1;
      let num = 2 + FLR(RND() * 3);
      let dir = RND() < 0.85 ? game.flockDir : -game.flockDir;
      let startX = dir === 1 ? -20 : config.gameWidth + 20;
      let startY = game.cameraY + RND() * config.gameHeight;
      for (let j = 0; j < num; j++) {
        game.birds.push(getBd(bt, startX + (RND() - 0.5) * 20, startY + (RND() - 0.5) * 20, false));
      }
    }
  }
}


export function updateMeteors(game) {
  for (let i = game.meteors.length - 1; i >= 0; i--) {
    let m = game.meteors[i];
    m.update();
    if (m.y > game.cameraY + config.gameHeight + 100) {
      P_MT.push(m);
      game.meteors.splice(i, 1);
    } else if (game.state === 'playing' && !(game.player.hitTimer > 0) && game.player.x < m.x + m.w && game.player.x + game.player.w > m.x && game.player.y < m.y + m.h && game.player.y + game.player.h > m.y) {
      let isStomping = (game.player.vy > 0 && (game.player.y + game.player.h - game.player.vy) <= m.y + m.h * 0.5);
      if (isStomping) {
        m.hitTimer = 60;
        game.player.y = m.y - game.player.h;
        game.player.jump(config.jumpPower * 0.8);
        if (game.demoMode && game.aiActive) {
          game.player.highestReachedY = m.y;
          game.player.visitedHistory = [];
          game.player.stagnationTimer = 0;
          game.player.adventureMode = false;
          game.player.aiPath = [];
        }
        spawnParticles(m.x + m.w / 2, m.y, '#fff', 15, 4);
      } else {
        if (m.hitTimer > 0) continue;
        m.hitTimer = 60;
        if (game.demoMode && game.aiActive) game.player.aiPath = [];
        if (game.player.isPoweredUp) {
          game.player.history = [];
          game.player.savedVy = game.player.vy;
          game.player.savedVx = game.player.vx;
          game.player.isPoweredUp = false;
          game.state = 'powerdown_anim';
          game.player.animTimer = 48;
          game.player.baseY = game.player.y;
        } else {
          game.player.vy = 0;
          game.player.vx = game.player.x < m.x ? -1.5 : 1.5;
          game.shakeAmount = m.isLarge ? 8 : 4;
        }
      }
    }
  }

  if (game.score >= 80000 && game.score <= 120000 && game.state === 'playing') {
    let dF = (game.score - 80000) / 40000;
    let mM = dF < 0.33 ? 1 : (dF < 0.66 ? 2 : 3);
    if (game.meteors.length < mM && RND() < (0.015 + dF * 0.015) * config.scoreMultiplier) {
      game.meteors.push(getMt(10 + RND() * (config.gameWidth - 40), game.cameraY - 40, (RND() - 0.5) * 1.0, 0.8 + dF * 0.7));
    }
  }
}


export function updateParticles(game) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    let pt = game.particles[i];
    pt.update();
    if (pt.life <= 0) {
      P_PT.push(pt);
      game.particles.splice(i, 1);
    }
  }
}


export function updateNPCs(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode) {
  if (game.state === 'playing' && game.npcs.length > 0 && Math.random() < 0.00003) {
    let anyBalloon = game.npcs.some(n => n.balloonTimer > 0);
    if (!anyBalloon) {
      let activeNpcs = game.npcs.filter(n => n.active && n.y < game.cameraY + config.gameHeight + 300);
      if (activeNpcs.length > 0) {
        let rndIdx = Math.floor(Math.random() * activeNpcs.length);
        activeNpcs[rndIdx].balloonText = 'Load!';
        activeNpcs[rndIdx].balloonTimer = 90;
      }
    }
  }
  for (let i = game.npcs.length - 1; i >= 0; i--) {
    let npc = game.npcs[i];
    npc.update();

    if (npc.y > 1500) {
      game.npcs.splice(i, 1);
      continue;
    }
    if (npc.stagnationTimer > 1800 && npc.y > game.cameraY + config.gameHeight) {
      game.npcs.splice(i, 1);
      continue;
    }
    if (!npc.active) continue;

    if (game.state === 'playing' && !(game.player.hitTimer > 0) && !(npc.hitTimer > 0) && game.player.x < npc.x + npc.w && game.player.x + game.player.w > npc.x && game.player.y < npc.y + npc.h && game.player.y + game.player.h > npc.y) {
      let pStomp = (game.player.vy > 0 && (game.player.y + game.player.h - game.player.vy) <= npc.y + npc.h * 0.5);
      let nStomp = (npc.vy > 0 && (npc.y + npc.h - npc.vy) <= game.player.y + game.player.h * 0.5);
      
      if (pStomp) {
        game.player.y = npc.y - game.player.h;
        game.player.jump(config.jumpPower * 0.8);
        npc.vy = -3;
        npc.vx = npc.x > game.player.x ? 2 : -2;
        npc.hitTimer = 20;
        spawnParticles(npc.x + npc.w / 2, npc.y, '#fff', 5, 2);
      } else if (nStomp) {
        npc.y = game.player.y - npc.h;
        npc.jump(config.jumpPower * 0.8);
        game.player.vy = -3;
        game.player.vx = game.player.x > npc.x ? 2 : -2;
        game.player.hitTimer = 20;
        game.shakeAmount = 4;
        spawnParticles(game.player.x + game.player.w / 2, game.player.y, '#fff', 5, 2);
      }
    }

    let onG = false;
    if (npc.isIntro && npc.vy > 0) {
      game.platforms.forEach(p => {
        if (p.isGround && p.y === 240 && npc.x + npc.w > p.x && npc.x < p.x + p.w && npc.y + npc.h >= p.y && npc.y + npc.h < p.y + 15) {
          npc.y = p.y - npc.h;
          npc.vy = 0;
          onG = true;
        }
      });
    }

    if (!onG && npc.vy > 0) {
      game.platforms.forEach(p => {
        if (p.broken || p.isCrumbling) return;
        if (npc.isIntro && p.isGround) return;
        if (npc.x + npc.w > p.x && npc.x < p.x + p.w && npc.y + npc.h >= p.y && npc.y + npc.h < p.y + p.h + npc.vy) {
          if (p.type === 'goal') {
            npc.y = p.y - npc.h;
            npc.vy = -npc.vy * 0.1;
            if (game.state === 'playing') {
              game.state = 'gameover';
              document.body.classList.add('game-ended');
              game.endReason = 'NPC_CLEAR';
              game.clearTime = game.playTime;
              game.shakeAmount = 0;
              if (!isAttractMode) {
                pBtn.style.display = 'none';
                autoBtn.style.display = 'none';
              }
              $('tapToStartMsg').style.display = 'none';
              setIgnoreNextTap(true);
              spawnParticles(npc.x + npc.w / 2, p.y, '#f00', 5);
              let fA = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
              RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'NPC_CLEAR');
              if (!game.isBenchmarking) {
                setTimeout(() => {
                  if (game.state === 'gameover') {
                    if (!isAttractMode) RankingAPI.show('gameover');
                    else {
                      setIgnoreNextTap(false);
                      $('tapToStartMsg').style.display = 'block';
                    }
                  }
                }, 800);
              }
              if (game.demoMode && !game.isBenchmarking && !isAttractMode) {
                setTimeout(function() {
                  if (game.state === 'gameover') initGame(false);
                }, 5000);
              }
            }
            return;
          }

          if (npc.isIntro && !p.isGround) npc.isIntro = false;

          if (p.y < npc.highestReachedY - 5) {
            npc.highestReachedY = p.y;
            npc.visitedHistory = [];
            npc.stagnationTimer = 0;
            npc.adventureMode = false;
            npc.sameBounceCount = 0;
          } else {
            npc.stagnationTimer++;
          }

          npc.y = p.y - npc.h;
          let ap = config.jumpPower;
          if (p.isGlowing) ap = config.superJumpPower * config.glowingMovingJumpMultiplier;
          else if (p.type === 'super') ap = config.superJumpPower;
          else if (p.type === 'h-slide' || p.type === 'v-slide') ap = config.jumpPower * config.movingPlatformJumpMultiplier;

          if (npc.aiPath.length > 0 && npc.aiPath[0] === p) npc.aiPath.shift();

          if (npc.lastPlatform === p) {
            npc.sameBounceCount++;
            if (npc.sameBounceCount > 4) {
              p.blacklisted = true;
              if (npc.aiPath.length > 0) npc.aiPath[0].blacklisted = true;
              npc.aiPath = [];
              npc.sameBounceCount = 0;
            }
          } else {
            npc.sameBounceCount = 0;
            npc.lastPlatform = p;
          }

          if (ap <= config.superJumpPower) {
            npc.stagnationTimer = 0;
            npc.adventureMode = false;
          }
          if (!npc.visitedHistory.includes(p)) npc.visitedHistory.push(p);

          let seg = FLR((npc.x + npc.w / 2 - p.x) / config.platformW);
          if (seg < 0) seg = 0;
          if (seg >= p.count) seg = p.count - 1;
          p.squishTimers[seg] = 12;
          p.breakOnSquish[seg] = true;
          npc.squatTimer = 3;
          if (!p.isIcy && !p.noEffect) spawnParticles(npc.x + npc.w / 2, p.y, '#ccc', 3);
          npc.isSparkleJumping = (p.type === 'super' || p.isGlowing) && !p.noEffect;
          npc.jump(ap);
        }
      });
    }
  }
}

export function updatePlayingState(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode) {
  game.items.forEach(function(i) {
    if (!i.collected && game.player.x < i.x + i.w && game.player.x + game.player.w > i.x && game.player.y < i.y + i.h && game.player.y + game.player.h > i.y) {
      i.collected = true;
      game.player.powerUp();
      spawnParticles(i.x + i.w / 2, i.y + i.h, '#ccc', 6);
      if (game.demoMode && game.aiActive) {
        if (game.player.aiPath.length > 0 && game.player.aiPath[0] === i) game.player.aiPath.shift();
        game.player.stagnationTimer = 0;
        game.player.adventureMode = false;
      }
    }
    if (!i.collected) {
      game.npcs.forEach(function(npc) {
        if (npc.active && npc.vy > 0 && npc.x < i.x + i.w && npc.x + npc.w > i.x && npc.y < i.y + i.h && npc.y + npc.h > i.y) {
          npc.y = i.y - npc.h;
          npc.jump(config.superJumpPower);
          npc.isSparkleJumping = true;
          npc.squatTimer = 3;
          spawnParticles(npc.x + npc.w / 2, i.y + i.h, '#ccc', 3);
          if (npc.aiPath.length > 0 && npc.aiPath[0] === i) npc.aiPath.shift();
        }
      });
    }
  });

  game.coins.forEach(function(c) {
    c.update();
    let ox = (c.hitW - c.w) / 2, oy = (c.hitH - c.h) / 2;
    if (!c.collected && game.player.x < c.x - ox + c.hitW && game.player.x + game.player.w > c.x - ox && game.player.y < c.y - oy + c.hitH && game.player.y + game.player.h > c.y - oy) {
      c.collected = true;
      c.animTimer = 30;
      c.vy = -5;
      if (game.scoreCoin < 999) game.scoreCoin++;
      spawnParticles(c.x + c.w / 2, c.y + c.h / 2, '#fd0', 3, 2);
    }
  });

  if (game.player.vy > 0) {
    game.platforms.forEach(function(p) {
      if (p.broken || p.isCrumbling) return;
      if (game.player.x + game.player.w > p.x && game.player.x < p.x + p.w && game.player.y + game.player.h >= p.y && game.player.y + game.player.h < p.y + p.h + game.player.vy) {
        if (p.type === 'goal') {
          let impact = game.player.vy;
          game.player.vy = -impact * 0.1;
          game.state = 'clear';
          document.body.classList.add('game-ended');
          game.endReason = 'CLEAR';
          game.clearTime = game.playTime;
          game.shakeAmount = 0;
          if (!isAttractMode) {
            pBtn.style.display = 'none';
            autoBtn.style.display = 'none';
          }
          $('tapToStartMsg').style.display = 'none';
          setIgnoreNextTap(true);
          spawnParticles(game.player.x + game.player.w / 2, p.y, '#ccc', 5);
          
          let fA = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
          RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'CLEAR');
          if (!game.isBenchmarking) {
            setTimeout(() => {
              if (game.state === 'clear') {
                if (!isAttractMode) RankingAPI.show('clear');
                else {
                  setIgnoreNextTap(false);
                  $('tapToStartMsg').style.display = 'block';
                }
              }
            }, 800);
          }
          
          if (game.demoMode && !game.isBenchmarking) {
            setTimeout(function() {
              if (game.state === 'gameover' || game.state === 'clear') initGame(isAttractMode ? true : false);
            }, isAttractMode ? 2000 : 5000);
          }
        } else {
          if (p.y < game.player.highestReachedY - 5) {
            game.player.highestReachedY = p.y;
            game.player.visitedHistory = [];
            game.player.stagnationTimer = 0;
            game.player.adventureMode = false;
            game.player.sameBounceCount = 0;
          } else {
            game.player.stagnationTimer++;
          }
          
          game.player.y = p.y - game.player.h;
          let ap = config.jumpPower;
          if (p.isGlowing) ap = config.superJumpPower * config.glowingMovingJumpMultiplier;
          else if (p.type === 'super') ap = config.superJumpPower;
          else if (p.type === 'h-slide' || p.type === 'v-slide') ap = config.jumpPower * config.movingPlatformJumpMultiplier;
          
          if (game.demoMode && game.aiActive) {
            if (game.player.aiPath.length > 0 && game.player.aiPath[0] === p) game.player.aiPath.shift();
            if (game.player.lastPlatform === p) {
              game.player.sameBounceCount++;
              if (game.player.sameBounceCount > 4) {
                p.blacklisted = true;
                if (game.player.aiPath.length > 0) game.player.aiPath[0].blacklisted = true;
                game.player.aiPath = [];
                game.player.sameBounceCount = 0;
              }
            } else {
              game.player.sameBounceCount = 0;
              game.player.lastPlatform = p;
            }
            if (ap <= config.superJumpPower) {
              game.player.stagnationTimer = 0;
              game.player.adventureMode = false;
            }
            if (!game.player.visitedHistory.includes(p)) game.player.visitedHistory.push(p);
          }
          
          let seg = FLR((game.player.x + game.player.w / 2 - p.x) / config.platformW);
          if (seg < 0) seg = 0;
          if (seg >= p.count) seg = p.count - 1;
          p.squishTimers[seg] = 12;
          p.breakOnSquish[seg] = true;
          game.player.squatTimer = 3;
          if (!p.isIcy && !p.noEffect) {
            spawnParticles(game.player.x + game.player.w / 2, p.y, '#ccc', 5);
          }
          game.player.isSparkleJumping = (p.type === 'super' || p.isGlowing) && !p.noEffect;
          game.player.jump(ap);
        }
      }
    });
  }
}

export function postUpdatePhysics(game, setIgnoreNextTap, pBtn, autoBtn, isAttractMode, initGame, spawnPlatform) {
  let upB = game.cameraY + config.gameHeight * 0.4, lowB = game.cameraY + config.gameHeight * 0.6, nY = game.cameraY;
  if (game.player.y < upB) nY -= (upB - game.player.y) * 0.15;
  else if (game.player.y > lowB) nY += (game.player.y - lowB) * 0.15;
  
  let mY = game.goalY - config.gameHeight * 0.25;
  if (nY < mY) nY = mY;
  if (nY < game.highestCameraY) game.highestCameraY = nY;
  
  game.cameraY = MIN(nY, game.highestCameraY + config.gameHeight * config.recoveryScreens);
  if (game.player.y < game.highestPlayerY) game.highestPlayerY = game.player.y;
  
  game.score = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
  
  let lowestY = game.player.y;
  game.npcs.forEach(n => {
    if (n.y > lowestY && n.y < 1500) lowestY = n.y;
  });
  
  let dL = Math.max(game.cameraY, lowestY) + config.gameHeight * (1 + config.recoveryScreens);
  for (let i = game.platforms.length - 1; i >= 0; i--) {
    let p = game.platforms[i];
    if (p.broken || (!p.isGround && p.y >= dL)) {
      P_PL.push(p);
      game.platforms.splice(i, 1);
    }
  }
  for (let i = game.items.length - 1; i >= 0; i--) {
    if (game.items[i].y >= dL || game.items[i].collected) {
      P_IT.push(game.items[i]);
      game.items.splice(i, 1);
    }
  }
  for (let i = game.coins.length - 1; i >= 0; i--) {
    let c = game.coins[i];
    if (c.y >= dL || c.dead) {
      P_CN.push(c);
      game.coins.splice(i, 1);
    }
  }
  
  while (game.platforms.length > 0 && game.platforms[game.platforms.length - 1].type !== 'goal' && game.platforms[game.platforms.length - 1].y > game.cameraY - config.gameHeight) {
    spawnPlatform();
  }
  
  if (game.player.y + game.player.h >= game.cameraY + config.gameHeight && game.state !== 'powerdown_anim') {
    if (game.player.isPoweredUp) {
      game.player.y = game.cameraY + config.gameHeight - config.playerSize * 2;
      game.player.isPoweredUp = false;
      game.state = 'powerdown_anim';
      game.player.animTimer = 48;
      game.player.baseY = game.player.y;
      if (game.demoMode && game.aiActive) {
        game.player.adventureMode = false;
        game.player.stagnationTimer = 0;
        game.player.aiPath = [];
      }
    } else {
      if (game.state !== 'gameover') {
        logAIEvent('DEATH_FALL', 'adv:' + game.player.adventureMode + ' vy:' + game.player.vy.toFixed(1));
        game.shakeAmount = 0;
        game.state = 'gameover';
        document.body.classList.add('game-ended');
        game.endReason = 'DEATH_FALL';
        game.player.y = game.cameraY + config.gameHeight - game.player.h * 0.5;
        
        if (!isAttractMode) {
          pBtn.style.display = 'none';
          autoBtn.style.display = 'none';
        }
        $('tapToStartMsg').style.display = 'none';
        setIgnoreNextTap(true);
        
        let fA = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
        RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'DEATH_FALL');
        if (!game.isBenchmarking) {
          setTimeout(() => {
            if (game.state === 'gameover') {
              if (!isAttractMode) RankingAPI.show('gameover');
              else {
                setIgnoreNextTap(false);
                $('tapToStartMsg').style.display = 'block';
              }
            }
          }, 800);
        }
        
        if (game.demoMode && !game.isBenchmarking) {
          setTimeout(function() {
            if (game.state === 'gameover' || game.state === 'clear') initGame(isAttractMode ? true : false);
          }, isAttractMode ? 2000 : 5000);
        }
      }
    }
  }
  
  if (game.playTime >= config.timeLimit * 1000 && game.state !== 'gameover' && game.state !== 'clear') {
    logAIEvent('TIME_UP', '');
    game.shakeAmount = 0;
    game.state = 'gameover';
    document.body.classList.add('game-ended');
    game.endReason = 'TIME_UP';
    if (!isAttractMode) {
      pBtn.style.display = 'none';
      autoBtn.style.display = 'none';
    }
    $('tapToStartMsg').style.display = 'none';
    setIgnoreNextTap(true);
    
    let fA = MIN(config.goalScore, MAX(game.startScore, FLR((game.baseScoreY - game.highestPlayerY) * config.scoreMultiplier)));
    RankingAPI.saveScore(fA, game.playTime, game.scoreCoin, 'TIME_UP');
    if (!game.isBenchmarking) {
      setTimeout(() => {
        if (game.state === 'gameover') {
          if (!isAttractMode) RankingAPI.show('gameover');
          else {
            setIgnoreNextTap(false);
            $('tapToStartMsg').style.display = 'block';
          }
        }
      }, 800);
    }
    
    if (game.demoMode && !game.isBenchmarking) {
      setTimeout(function() {
        if (game.state === 'gameover' || game.state === 'clear') initGame(isAttractMode ? true : false);
      }, isAttractMode ? 2000 : 5000);
    }
  }
}
