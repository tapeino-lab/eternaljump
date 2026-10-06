import { describe, it, expect } from 'vitest';
import { cleanupLeaderboard } from '../src/leaderboard-cleanup';
import { compareScoreRanking } from '../src/lootlocker';

const same = (a: any, b: any) => a.alt === b.alt && a.coins === b.coins;

describe('leaderboard cleanup (display only)', () => {
  it('hides leftover test entries', () => {
    const rows = [{ id: '63551639', alt: 144000, coins: 30 }, { id: '1', alt: 100000, coins: 1 }, { id: '63582745', alt: 100, coins: 100 }];
    expect(cleanupLeaderboard(rows, compareScoreRanking, same).map(r => r.id)).toEqual(['1']);
  });

  it('keeps only the best row of a same-player group', () => {
    const rows = [
      { id: '63090777', n: 'LTU TT', alt: 144000, coins: 101, ts: 0 },
      { id: '63090778', n: 'LTU TT', alt: 144000, coins: 83, ts: 0 },
      { id: '777', n: 'LTU TT', alt: 50000, coins: 1, ts: 0 }, // same name, not in the group: kept
    ];
    expect(cleanupLeaderboard(rows, compareScoreRanking, same).map(r => r.id)).toEqual(['63090777', '777']);
  });

  it('collapses the USA SN pair re-audited on 2026-10-06 (same run re-sent)', () => {
    const rows = [
      { id: '63579136', alt: 114316, coins: 61, ts: 1790664995911 },
      { id: '63579143', alt: 114316, coins: 61, ts: 1790665103327 },
    ];
    expect(cleanupLeaderboard(rows, compareScoreRanking, same).map(r => r.id)).toEqual(['63579143']);
  });

  it('prefers the newest account when records are identical (JPN YN after rescue)', () => {
    const rows = [
      { id: '63534284', alt: 144000, coins: 148, ts: 1790829007411 },
      { id: '63590557', alt: 144000, coins: 148, ts: 1791200000000 },
    ];
    expect(cleanupLeaderboard(rows, compareScoreRanking, same).map(r => r.id)).toEqual(['63590557']);
  });

  it('keeps the better old record until the rescue is applied', () => {
    const rows = [
      { id: '63534284', alt: 144000, coins: 148, ts: 1 },
      { id: '63590557', alt: 144000, coins: 119, ts: 2 },
    ];
    expect(cleanupLeaderboard(rows, compareScoreRanking, same).map(r => r.id)).toEqual(['63534284']);
  });
});
