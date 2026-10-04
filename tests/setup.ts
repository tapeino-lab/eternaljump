import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, vi } from 'vitest';

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0].trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

beforeEach(() => {
  // Every test starts from a brand-new device: empty storage layers and fresh module state.
  localStorage.clear();
  sessionStorage.clear();
  clearCookies();
  (globalThis as any).indexedDB = new IDBFactory();
  vi.resetModules();
  vi.restoreAllMocks();
  // No real network in tests; individual tests install their own fetch mock.
  globalThis.fetch = vi.fn(async () => {
    throw new Error('Unexpected network call in test');
  }) as any;
});
