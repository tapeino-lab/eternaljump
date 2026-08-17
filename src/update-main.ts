
import { updateParticles, updateFlyingCoins, updateNPCs, updateBirds, updateMeteors } from "./update-entities.js";
import { updatePlayingState } from './update-playing.js';
import { postUpdatePhysics, updateStateAnimations, updateIntroState } from './update-post.js';

import type { GameState } from "./types.js";
import { applyCoinCountUp } from './ui-effects.js';
import { config } from './config.js';
import { P_BD, getBd, P_MT, getMt, spawnParticles, P_PT, P_PL, P_IT, P_CN, P_CL, FlyingCoin } from './entities/index.js';
import { RND, FLR, MAX, MIN, $ } from './utils.js';
import { initGame } from './lifecycle.js';

import { RankingAPI } from './ranking.js';

    export function updatePhysicsMain(
      game: GameState, isAttractMode: boolean, demoState: any, config: any, inputHandler: any, IMG: any,
      setIgnoreNextTap: (val: boolean) => void, pBtn: HTMLElement | null, initGame: any, spawnPlatform: any,
      fireworksSystem: any, airplaneSystem: any, runAI: any, FLR: any, spawnParticles: any
    ) {

  if (game.state === 'shop') return;
      updateParticles(game);
      updateFlyingCoins(game);
      fireworksSystem.update(game, isAttractMode);
      airplaneSystem.update(game, isAttractMode);
      
      
      
      if (game.state === 'powerup_anim' || game.state === 'powerdown_anim' || game.state === 'clear' || (game.state as any) === 'intro_anim') {
        updateStateAnimations(game, config, FLR);
      } else if (game.state !== 'gameover') {
        if ((game.demoMode || (game.equipped && (game.equipped['autocruise'] || game.equipped['autocruise2']))) && game.aiActive && (game.state === 'playing' || game.state === 'intro')) runAI(game.player);
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
        
        for (let _idx_plats = 0; _idx_plats < game.platforms.length; _idx_plats++) {
    let p = game.platforms[_idx_plats]; p.update(); }
        
        updateMeteors(game);
        
        if (game.state === 'intro') {
          updateIntroState(game, config, FLR, isAttractMode, demoState, IMG, inputHandler, spawnParticles);
        } else if ((game.state as any) !== 'intro_anim') {
          updatePlayingState(game, setIgnoreNextTap, pBtn, isAttractMode);
        }
        
        postUpdatePhysics(game, setIgnoreNextTap, pBtn, isAttractMode, initGame, spawnPlatform);
      }
    }
