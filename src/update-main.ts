
import { updateParticles, updateFlyingCoins, updateNPCs, updateBirds, updateMeteors } from "./update-entities.js";
import { updatePlayingState, postUpdatePhysics, updateStateAnimations, updateIntroState } from "./update-states.js";
import type { GameState } from "./types.js";
import { applyCoinCountUp } from './ui-effects.js';
import { config } from './config.js';
import { P_BD, getBd, P_MT, getMt, spawnParticles, P_PT, P_PL, P_IT, P_CN, P_CL, FlyingCoin } from './entities/index.js';
import { RND, FLR, MAX, MIN, $ } from './utils.js';
import { initGame } from './game.js';
import { RankingAPI } from './ranking.js';

    export function updatePhysicsMain(args: { game: GameState, isAttractMode: boolean, demoState: any, config: any, inputHandler: any, IMG: any, setIgnoreNextTap: (val: boolean) => void, pBtn: HTMLElement | null, initGame: any, spawnPlatform: any, fireworksSystem: any, airplaneSystem: any, runAI: any, FLR: any, spawnParticles: any }) {
  const { game, isAttractMode, demoState, config, inputHandler, IMG, setIgnoreNextTap, pBtn, initGame, spawnPlatform, fireworksSystem, airplaneSystem, runAI, FLR, spawnParticles } = args;

  if (game.state === 'shop') return;
      updateParticles(game);
      updateFlyingCoins(game);
      fireworksSystem.update(game, isAttractMode);
      airplaneSystem.update(game, isAttractMode);
      
      
      
      if (game.state === 'powerup_anim' || game.state === 'powerdown_anim' || game.state === 'clear' || (game.state as any) === 'intro_anim') {
        updateStateAnimations(game, config, FLR);
      } else if (game.state !== 'gameover') {
        if (game.demoMode && game.aiActive && (game.state === 'playing' || game.state === 'intro')) runAI(game.player);
        game.player.update();
        
        updateBirds(game);
        updateNPCs(game, setIgnoreNextTap, pBtn, isAttractMode);
        
        if (game.state !== 'intro' && (game.state as any) !== 'intro_anim') {
          if (game.player.y < game.goalY - 120) {
            game.player.y = game.goalY - 120;
            if (game.player.vy < 0) game.player.vy = 0;
          }
          if (game.player.y < game.goalY && game.player.vy > 1.5) game.player.vy = 1.5;
        }
        
        game.platforms.forEach(function(p) { p.update(); });
        
        updateMeteors(game);
        
        if (game.state === 'intro') {
          updateIntroState(game, config, FLR, isAttractMode, demoState, IMG, inputHandler, spawnParticles);
        } else if ((game.state as any) !== 'intro_anim') {
          updatePlayingState(game, setIgnoreNextTap, pBtn, isAttractMode);
        }
        
        postUpdatePhysics(game, setIgnoreNextTap, pBtn, isAttractMode, initGame, spawnPlatform);
      }
    }
