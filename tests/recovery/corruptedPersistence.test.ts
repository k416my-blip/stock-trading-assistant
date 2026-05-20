import { describe, expect, it } from 'vitest';
import { loadAppStateTrusted } from '../../src/services/storage';
import { seedMockStorage } from '../helpers/asyncStorageMock';
import { createTestAppState } from '../helpers/fixtures/appState';
import {
  buildCorruptAppStateBlob,
  buildValidAppStateBlob,
  STORAGE_KEY_APP_STATE,
} from '../helpers/fixtures/persistence';

describe('recovery: corrupted persistence', () => {
  it('refuses checksum-mismatched app state', async () => {
    const state = createTestAppState();
    seedMockStorage({ [STORAGE_KEY_APP_STATE]: buildCorruptAppStateBlob(state) });
    const result = await loadAppStateTrusted();
    expect(result.trusted).toBe(false);
    expect(result.warnings).toContain('checksum_mismatch');
    expect(result.state.portfolio.length).toBe(0);
  });

  it('loads valid envelope', async () => {
    const state = createTestAppState();
    seedMockStorage({ [STORAGE_KEY_APP_STATE]: buildValidAppStateBlob(state) });
    const result = await loadAppStateTrusted();
    expect(result.trusted).toBe(true);
    expect(result.state.portfolio.length).toBe(1);
  });
});
