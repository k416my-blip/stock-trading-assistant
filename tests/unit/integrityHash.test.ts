import { describe, expect, it } from 'vitest';
import { computeIntegrityHash, verifyIntegrityHash } from '../../src/services/integrityHash';

describe('integrityHash', () => {
  it('is deterministic for same payload', () => {
    const payload = { a: 1, b: [2, 3] };
    expect(computeIntegrityHash(payload)).toBe(computeIntegrityHash(payload));
  });

  it('verifies matching hash', () => {
    const payload = { entries: [{ id: 'x' }] };
    const hash = computeIntegrityHash(payload);
    expect(verifyIntegrityHash(payload, hash)).toBe(true);
  });

  it('rejects tampered payload', () => {
    const payload = { entries: [{ id: 'x' }] };
    const hash = computeIntegrityHash(payload);
    expect(verifyIntegrityHash({ entries: [{ id: 'y' }] }, hash)).toBe(false);
  });
});
