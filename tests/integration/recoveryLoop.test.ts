import { describe, expect, it } from 'vitest';
import {
  incrementRecoveryAttemptCount,
  readRecoveryAttemptCount,
  resetRecoveryAttemptCount,
  shouldEnterSafeBootMode,
} from '../../src/services/safeBoot';

describe('integration: recovery loops', () => {
  it('accumulates attempts until safe boot threshold', async () => {
    await resetRecoveryAttemptCount();
    expect(await shouldEnterSafeBootMode()).toBe(false);
    await incrementRecoveryAttemptCount();
    await incrementRecoveryAttemptCount();
    expect(await shouldEnterSafeBootMode()).toBe(false);
    await incrementRecoveryAttemptCount();
    expect(await shouldEnterSafeBootMode()).toBe(true);
    expect(await readRecoveryAttemptCount()).toBeGreaterThanOrEqual(3);
    await resetRecoveryAttemptCount();
  });
});
