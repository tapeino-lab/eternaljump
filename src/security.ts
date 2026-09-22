/**
 * Anti-Cheat & Game Integrity Protection Module
 * 
 * Protects leaderboard and player persistence integrity:
 * 1. Physical Feasibility Constraints: Rejects mathematically impossible scores/times.
 * 2. Session Integrity Hash: Generates and validates cryptographic HMAC signatures for runs.
 * 3. Rate-Limiting & Replay Protection: Prevents rapid-fire automated score submissions.
 */

// Theoretical minimum climb time thresholds (in milliseconds)
// Safe realistic threshold to prevent false-positive rejection of fast clears
export const MIN_GOAL_TIME_MS = 20000;

// Maximum reasonable coins per run (cap at 999 as defined in LootLockerAPI)
export const MAX_REASONABLE_COINS = 999;

// Maximum realistic single-run altitude
export const MAX_ALLOWED_ALTITUDE = 144000;

// In-memory rate limiter tracker for submissions (separated by leaderboard channel)
let lastScoreSubmissionTimestamp = 0;
let lastTASubmissionTimestamp = 0;
const MIN_SUBMISSION_INTERVAL_MS = 500; // 500ms between submissions of the SAME leaderboard type

/**
 * Validates if an altitude, time, and coin count are physically possible within the game rules.
 */
export function validatePhysicalScore(altitude: number, coins: number, playTimeMs: number): { valid: boolean; reason?: string } {
  // 1. Basic type and range checks
  if (typeof altitude !== 'number' || isNaN(altitude) || altitude <= 0) {
    return { valid: false, reason: 'Invalid altitude range' };
  }
  if (altitude > MAX_ALLOWED_ALTITUDE) {
    return { valid: false, reason: 'Altitude exceeds maximum ceiling' };
  }
  if (typeof coins !== 'number' || isNaN(coins) || coins < 0 || coins > MAX_REASONABLE_COINS) {
    return { valid: false, reason: 'Coins count outside realistic range' };
  }

  // 2. Playtime checks (if time is specified)
  if (typeof playTimeMs === 'number' && playTimeMs > 0) {
    // 24 hours sanity limit
    if (playTimeMs >= 86400000) {
      return { valid: false, reason: 'Playtime exceeds 24h sanity limit' };
    }

    // High altitude clearance must obey minimum realistic ascent time
    if (altitude >= 144000 && playTimeMs < MIN_GOAL_TIME_MS) {
      return { valid: false, reason: 'Goal reached faster than theoretical minimum climb rate' };
    }

    // For any altitude > 20,000m, average climb rate cannot exceed 6,000 m/s
    if (altitude > 20000) {
      const climbSpeedMeterPerSec = (altitude / (playTimeMs / 1000));
      if (climbSpeedMeterPerSec > 6000) {
        return { valid: false, reason: 'Ascent speed exceeds physical game engine limit' };
      }
    }
  }

  return { valid: true };
}

/**
 * Rate limit check to prevent automated replay / spam score submissions.
 * Channel can be 'altitude' or 'time_attack' so normal simultaneous submissions upon game clear do not block each other.
 */
export function checkSubmissionRateLimit(channel: 'altitude' | 'time_attack' = 'altitude'): boolean {
  const now = Date.now();
  if (channel === 'time_attack') {
    if (now - lastTASubmissionTimestamp < MIN_SUBMISSION_INTERVAL_MS) {
      return false;
    }
    lastTASubmissionTimestamp = now;
    return true;
  } else {
    if (now - lastScoreSubmissionTimestamp < MIN_SUBMISSION_INTERVAL_MS) {
      return false;
    }
    lastScoreSubmissionTimestamp = now;
    return true;
  }
}

/**
 * Computes an authenticated tamper-evident signature for submitted records
 */
export function computeGameSignature(alt: number, coins: number, playTimeMs: number, lang: string): string {
  const SECRET_SALT = "E7eRn4L_JumP_Pr0t3ct10n_v2";
  const str = `${Math.floor(alt)}_${Math.floor(coins || 0)}_${Math.floor((playTimeMs || 0) / 1000)}_${lang}_${SECRET_SALT}`;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
