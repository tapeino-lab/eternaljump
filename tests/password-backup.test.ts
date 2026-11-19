import { describe, it, expect } from 'vitest';
import { installFakeLootLocker } from './helpers';

async function load() {
  const identity = await import('../src/identity');
  const pb = await import('../src/password-backup');
  const { safeStorage } = await import('../src/safeStorage');
  return { identity, pb, safeStorage };
}

function setUrl(search: string) {
  window.history.replaceState(null, '', '/' + search);
}

describe('password backup', () => {
  it('is off by default', async () => {
    setUrl('');
    const { pb } = await load();
    expect(pb.isPasswordBackupEnabled()).toBe(false);
  });

  it('turns on from the URL, is remembered, and turns off with pwsave=0', async () => {
    const { pb, safeStorage } = await load();
    setUrl('?pwsave=1');
    expect(pb.isPasswordBackupEnabled()).toBe(true);
    setUrl('');
    expect(pb.isPasswordBackupEnabled()).toBe(true);
    expect(safeStorage.getItem('EJ_PWSAVE_TEST')).toBe('1');
    setUrl('?pwsave=0');
    expect(pb.isPasswordBackupEnabled()).toBe(false);
    setUrl('');
    expect(pb.isPasswordBackupEnabled()).toBe(false);
  });

  it('parses only our prefixed logins with a valid key', async () => {
    const { pb } = await load();
    expect(pb.parseRestoredLogin(pb.PASSWORD_USERNAME_PREFIX + 'JPN YN', 'abc_DEF-123')).toBe('abc_DEF-123');
    expect(pb.parseRestoredLogin('Other Game · X', 'abc_DEF-123')).toBeNull();
    expect(pb.parseRestoredLogin(pb.PASSWORD_USERNAME_PREFIX + 'X', 'short')).toBeNull();
    expect(pb.parseRestoredLogin(pb.PASSWORD_USERNAME_PREFIX + 'X', 'bad key with spaces')).toBeNull();
  });

  it('cannot save without a service worker controller', async () => {
    setUrl('?pwsave=1');
    const { pb } = await load();
    expect(pb.canSaveToPasswordManager()).toBe(false);
  });

  it('confirms a save on redirect only when pending matches the current key, and strips the param', async () => {
    installFakeLootLocker();
    const { identity, pb, safeStorage } = await load();
    const pid = await identity.resolvePlayerIdentifier();

    setUrl('?a=1&pwsaved=1');
    expect(pb.consumeSaveRedirect()).toBe(false); // nothing pending
    expect(location.search).toBe('?a=1');
    expect(pb.isPasswordSaved()).toBe(false);

    safeStorage.setItem('EJ_PW_PENDING', 'some-other-key');
    setUrl('?pwsaved=1');
    expect(pb.consumeSaveRedirect()).toBe(false);
    expect(pb.isPasswordSaved()).toBe(false);

    pb.markSaveSubmitted();
    setUrl('?pwsaved=1');
    expect(pb.consumeSaveRedirect()).toBe(true);
    expect(location.search).toBe('');
    // The player may still decline Safari's sheet: offered, not saved
    expect(pb.isPasswordSaved()).toBe(false);
    expect(pb.isPasswordOffered()).toBe(true);
    expect(safeStorage.getItem('EJ_PW_PENDING')).toBeNull();
  });

  it('decides when the result screen offers the backup', async () => {
    const { pb } = await load();
    const base = { passwordFlag: false, totalCoins: 0, clear: false, promptsShown: 0, maxPrompts: 2,
      passkeySaved: false, passwordSaved: false, passwordOffered: false };
    // Flag off: unchanged passkey rules
    expect(pb.shouldOfferSave(base)).toBe(false);
    expect(pb.shouldOfferSave({ ...base, totalCoins: 1000 })).toBe(true);
    expect(pb.shouldOfferSave({ ...base, clear: true })).toBe(true);
    expect(pb.shouldOfferSave({ ...base, totalCoins: 1000, promptsShown: 2 })).toBe(false);
    expect(pb.shouldOfferSave({ ...base, totalCoins: 1000, passkeySaved: true })).toBe(false);
    expect(pb.shouldOfferSave({ ...base, totalCoins: 1000, passwordOffered: true })).toBe(true);
    // Flag on: after any game, until offered once or saved
    const on = { ...base, passwordFlag: true };
    expect(pb.shouldOfferSave(on)).toBe(true);
    expect(pb.shouldOfferSave({ ...on, promptsShown: 5 })).toBe(true);
    expect(pb.shouldOfferSave({ ...on, passwordOffered: true })).toBe(false);
    expect(pb.shouldOfferSave({ ...on, passwordSaved: true })).toBe(false);
  });

  it('with the flag off nothing counts as saved and the form path stays closed', async () => {
    setUrl('');
    const { pb } = await load();
    expect(pb.isPasswordBackupEnabled()).toBe(false);
    expect(pb.isPasswordSaved()).toBe(false);
    expect(pb.canSaveToPasswordManager()).toBe(false);
  });
});
