import { describe, expect, it } from 'vitest';
import { parseJournalEnvelope } from '../../src/services/tamperDetection';
import { buildCorruptJournalBlob, buildValidJournalBlob } from '../helpers/fixtures/persistence';

describe('persistence: journal corruption', () => {
  it('rejects tampered integrity hash', () => {
    const raw = buildCorruptJournalBlob([]);
    const { integrityOk } = parseJournalEnvelope(raw);
    expect(integrityOk).toBe(false);
  });

  it('accepts valid envelope', () => {
    const raw = buildValidJournalBlob([]);
    const { integrityOk, store } = parseJournalEnvelope(raw);
    expect(integrityOk).toBe(true);
    expect(store.entries).toEqual([]);
  });
});
