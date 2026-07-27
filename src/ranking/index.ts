import { safeStorage } from "../safeStorage.js";
import { RankingAPI } from './api.js';
import { hasLootLocker, syncPersonalBest, prefetchScores, getScores, saveScore, reset } from './core.js';
import { show, showResult, showRanking } from './ui.js';

RankingAPI.hasLootLocker = hasLootLocker;
RankingAPI.syncPersonalBest = syncPersonalBest;
RankingAPI.prefetchScores = prefetchScores;
RankingAPI.getScores = getScores;
RankingAPI.saveScore = saveScore;
RankingAPI.reset = reset;
RankingAPI.show = show;
RankingAPI.showResult = showResult;
RankingAPI.showRanking = showRanking;

    try {
      const oldKey = '8bitJump_Rankings';
      const oldPBKey = '8bitJump_PB';
      const newKey = 'EternalJumper_Rankings';
      const newPBKey = 'EternalJumper_PB';
      
      const oldVal = safeStorage.getItem(oldKey);
      const newVal = safeStorage.getItem(newKey);
      if (oldVal && !newVal) {
        safeStorage.setItem(newKey, oldVal);
      }

      const oldPBVal = safeStorage.getItem(oldPBKey);
      const newPBVal = safeStorage.getItem(newPBKey);
      if (oldPBVal && !newPBVal) {
        safeStorage.setItem(newPBKey, oldPBVal);
      }
    } catch (e) {}


export { RankingAPI };
