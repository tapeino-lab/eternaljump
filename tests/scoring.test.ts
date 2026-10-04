import { describe, it, expect } from 'vitest';

describe('validatePhysicalScore', () => {
  it('accepts real records seen on the leaderboards', async () => {
    const { validatePhysicalScore } = await import('../src/security');
    expect(validatePhysicalScore(144000, 148, 154665).valid).toBe(true);
    expect(validatePhysicalScore(144000, 83, 66080).valid).toBe(true);
    expect(validatePhysicalScore(12420, 0, 30000).valid).toBe(true);
  });

  it('rejects impossible values', async () => {
    const { validatePhysicalScore } = await import('../src/security');
    expect(validatePhysicalScore(0, 0, 1000).valid).toBe(false);
    expect(validatePhysicalScore(144001, 0, 100000).valid).toBe(false);
    expect(validatePhysicalScore(144000, 1000, 100000).valid).toBe(false);
    expect(validatePhysicalScore(144000, 10, 19999).valid).toBe(false);
    expect(validatePhysicalScore(60000, 10, 5000).valid).toBe(false);
    expect(validatePhysicalScore(1000, 0, 86400000).valid).toBe(false);
  });
});

describe('leaderboard ordering', () => {
  it('orders height by altitude, then coins, then oldest timestamp', async () => {
    const { compareScoreRanking } = await import('../src/lootlocker');
    const rows = [
      { n: 'c', alt: 144000, coins: 100, ts: 3 },
      { n: 'a', alt: 144000, coins: 148, ts: 5 },
      { n: 'd', alt: 90000, coins: 999, ts: 1 },
      { n: 'b', alt: 144000, coins: 100, ts: 2 },
    ];
    expect(rows.sort(compareScoreRanking).map(r => r.n)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('orders time attack by centiseconds, ties by oldest timestamp', async () => {
    const { compareTARanking } = await import('../src/lootlocker');
    const rows = [
      { n: 'slow', time: 98250, ts: 1 },
      { n: 'tieLate', time: 78829, ts: 9 },
      { n: 'tieEarly', time: 78822, ts: 4 },
      { n: 'fast', time: 66080, ts: 7 },
    ];
    expect(rows.sort(compareTARanking).map(r => r.n)).toEqual(['fast', 'tieEarly', 'tieLate', 'slow']);
  });
});

describe('run coin award', () => {
  it('doubles coins on CLEAR and awards only once per run', async () => {
    const { game, awardRunCoins } = await import('../src/state');
    const identity = await import('../src/identity');
    game.totalCoins = 1000;
    game.coinsAwardedThisRun = false;
    game.demoMode = false;
    expect(awardRunCoins('CLEAR', 50)).toBe(100);
    expect(awardRunCoins('CLEAR', 50)).toBe(0);
    expect(game.totalCoins).toBe(1100);
    expect(identity.getStoredTotalCoinsSync()).toBe(1100);
  });

  it('does not double on game over and awards nothing in demo mode', async () => {
    const { game, awardRunCoins } = await import('../src/state');
    game.totalCoins = 0;
    game.coinsAwardedThisRun = false;
    game.demoMode = false;
    expect(awardRunCoins('DEATH_FALL', 7)).toBe(7);
    game.coinsAwardedThisRun = false;
    game.demoMode = true;
    expect(awardRunCoins('CLEAR', 7)).toBe(0);
  });
});
