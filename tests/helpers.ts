import { vi } from 'vitest';

export interface FakeLootLockerOptions {
  playerId?: number;
  /** Coin leaderboard member score; null = 404 (no entry); 'error' = 500 */
  remoteCoins?: number | null | 'error';
  /** Status returned for guest session creation */
  sessionStatus?: number;
  /** Status returned by every authenticated request (after session) unless overridden */
  authStatus?: number;
}

export interface FakeLootLockerCall {
  method: string;
  path: string;
  body: any;
  token: string | null;
}

/**
 * Minimal fake of the LootLocker Game API endpoints the client uses.
 * Records every call so tests can assert exactly what would be sent to production.
 */
export function installFakeLootLocker(opts: FakeLootLockerOptions = {}) {
  const calls: FakeLootLockerCall[] = [];
  const state = {
    playerId: opts.playerId ?? 12345,
    remoteCoins: opts.remoteCoins === undefined ? null : opts.remoteCoins,
    sessionStatus: opts.sessionStatus ?? 200,
    authStatus: opts.authStatus ?? 200,
    sessionsCreated: 0,
    validToken: '' as string,
  };

  const json = (status: number, body: any) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const fetchMock = vi.fn(async (input: any, init: any = {}) => {
    const url = String(input);
    const method = (init.method || 'GET').toUpperCase();
    const headers = init.headers || {};
    const token = headers['x-session-token'] || null;
    const body = init.body ? JSON.parse(init.body) : null;
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    calls.push({ method, path, body, token });

    // The old Express proxy probe: production (GitHub Pages) has no server.
    if (path.startsWith('/api/')) return new Response('Not Found', { status: 404 });

    if (path.includes('/game/v2/session/guest')) {
      if (state.sessionStatus !== 200) return json(state.sessionStatus, { error: 'session failed' });
      state.sessionsCreated++;
      state.validToken = `token_${state.sessionsCreated}`;
      return json(200, { session_token: state.validToken, player_id: state.playerId });
    }

    if (token !== state.validToken) return json(403, { message: 'invalid session token' });
    if (state.authStatus !== 200) return json(state.authStatus, { error: 'forced failure' });

    if (path.includes('/member/')) {
      if (path.includes('/cointtl/')) {
        if (state.remoteCoins === 'error') return json(500, { error: 'boom' });
        if (state.remoteCoins === null) return json(404, { message: 'not found' });
        return json(200, { score: state.remoteCoins, rank: 1 });
      }
      return json(404, { message: 'not found' });
    }
    if (path.endsWith('/submit')) {
      if (path.includes('/cointtl/')) state.remoteCoins = Math.max(Number(state.remoteCoins) || 0, body.score);
      return json(200, { score: body.score, rank: 1 });
    }
    if (path.includes('/game/player/name')) return json(200, {});
    if (path.includes('/list')) return json(200, { items: [], pagination: { total: 0 } });
    return json(404, {});
  });

  globalThis.fetch = fetchMock as any;
  return {
    calls,
    state,
    fetchMock,
    submits: (board?: string) =>
      calls.filter(c => c.path.endsWith('/submit') && (!board || c.path.includes(`/${board}/`))),
    /** Simulates the server expiring the current session token. */
    expireSession: () => { state.validToken = 'expired'; },
  };
}

/** Lets pending promise callbacks (and IndexedDB transactions) run. */
export async function flush(times = 10) {
  for (let i = 0; i < times; i++) await new Promise(r => setTimeout(r, 0));
}
