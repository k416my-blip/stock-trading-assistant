import { describe, expect, it } from 'vitest';
import {
  resetRecoveryAttemptCount,
  setRecoveryAttemptCountForTest,
  shouldEnterSafeBootMode,
  SAFE_BOOT_MAX_ATTEMPTS,
} from '../../src/services/safeBoot';

describe('recovery: safe boot', () => {
  it('enters safe mode after max recovery attempts', async () => {
    await resetRecoveryAttemptCount();
    await setRecoveryAttemptCountForTest(SAFE_BOOT_MAX_ATTEMPTS);
    expect(await shouldEnterSafeBootMode()).toBe(true);
    await resetRecoveryAttemptCount();
    expect(await shouldEnterSafeBootMode()).toBe(false);
  });
});
