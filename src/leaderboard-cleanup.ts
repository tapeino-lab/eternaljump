/**
 * Display-only cleanup of the public leaderboards. Records stay on LootLocker untouched;
 * remove an entry from these lists to show it again.
 *
 * Audited 2026-10-05 against the live hct2 / tatk boards.
 */

/** Leftover test entries (TestClearPlayer, TEST B2 x2). */
export const HIDDEN_MEMBER_IDS = new Set<string>([
  '63551639',
  '63582745',
  '63582746',
]);

/**
 * Accounts proven to belong to the same player: consecutive member IDs (two accounts created at
 * once by the old duplicate-PID bug) or byte-identical records (the same run sent by two accounts),
 * plus confirmed rescues. Matched by member ID, never by name, so other players who happen to
 * share a "LANG XX" name are not affected.
 */
export const SAME_PLAYER_GROUPS: string[][] = [
  ['63103831', '63103832'], // ENG EK
  ['63255448', '63255449'], // JPN KA
  ['63094426', '63094427'], // JPN XN
  ['63534284', '63590557'], // JPN YN (rescued 2026-10-04)
  ['63107322', '63107323'], // LTU 2Z
  ['63092207', '63092208'], // LTU 5D
  ['63190254', '63190255'], // LTU 6F
  ['63094330', '63094331'], // LTU DB
  ['63092137', '63092138'], // LTU KR
  ['63090777', '63090778'], // LTU TT
  ['63095017', '63095018'], // LTU VT
  ['63563696', '63567303'], // RUS 06
  ['63171213', '63171214'], // SPA AJ
  ['63552005', '63553365'], // USA 0D
  ['63570276', '63571619'], // USA 5P
  ['63416138', '63416139'], // USA 8S
  ['63552966', '63588577'], // USA BB
  ['63556439', '63556506'], // USA BK
  ['63104206', '63104207'], // USA GO
  ['63548993', '63551351'], // USA H6
  ['63553267', '63553334'], // USA IL
];

const groupOf = new Map<string, number>();
SAME_PLAYER_GROUPS.forEach((ids, g) => ids.forEach(id => groupOf.set(id, g)));

/**
 * Drops hidden entries and keeps one row per same-player group: the best record by `compare`.
 * When the records are equal (`sameRecord`), the newest account wins, since that is the one the
 * player is using now (so their row is still highlighted as "me").
 */
export function cleanupLeaderboard<T extends { id: any }>(
  items: T[],
  compare: (a: T, b: T) => number,
  sameRecord: (a: T, b: T) => boolean,
): T[] {
  const bestInGroup = new Map<number, T>();
  for (const item of items) {
    const id = String(item.id);
    if (HIDDEN_MEMBER_IDS.has(id)) continue;
    const g = groupOf.get(id);
    if (g === undefined) continue;
    const cur = bestInGroup.get(g);
    if (!cur) {
      bestInGroup.set(g, item);
    } else if (sameRecord(item, cur)) {
      if (Number(item.id) > Number(cur.id)) bestInGroup.set(g, item);
    } else if (compare(item, cur) < 0) {
      bestInGroup.set(g, item);
    }
  }
  return items.filter(item => {
    const id = String(item.id);
    if (HIDDEN_MEMBER_IDS.has(id)) return false;
    const g = groupOf.get(id);
    return g === undefined || bestInGroup.get(g) === item;
  });
}
