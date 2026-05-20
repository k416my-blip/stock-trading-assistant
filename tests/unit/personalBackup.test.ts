import { describe, expect, it } from 'vitest';
import { createEmptyTestAppState } from '../helpers/fixtures/appState';
import {
  buildPersonalBackupEnvelope,
  exportPersonalBackupJson,
  validatePersonalBackupJson,
} from '../../src/services/personalBackupService';

describe('personalBackup', () => {
  it('exports and validates roundtrip', () => {
    const state = createEmptyTestAppState();
    const json = exportPersonalBackupJson(state, []);
    const result = validatePersonalBackupJson(json);
    expect(result.corrupt).toBe(false);
    expect(result.valid).toBe(true);
    expect(result.envelope?.appVersion).toBeTruthy();
    expect(result.envelope?.exportedAt).toBeTruthy();
  });

  it('rejects tampered backup', () => {
    const state = createEmptyTestAppState();
    const envelope = buildPersonalBackupEnvelope(state, []);
    const tampered = { ...envelope, integrityHash: 'badhash00' };
    const result = validatePersonalBackupJson(JSON.stringify(tampered));
    expect(result.corrupt).toBe(true);
    expect(result.valid).toBe(false);
  });
});
