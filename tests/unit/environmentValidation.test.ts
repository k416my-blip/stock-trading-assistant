import { describe, expect, it } from 'vitest';
import {
  getRecoveryRecommendations,
  validateEnvironmentForBoot,
} from '../../src/services/environmentValidation';

describe('environmentValidation', () => {
  it('flags safe boot mode', () => {
    const result = validateEnvironmentForBoot({ bootMode: 'safe', recoveryAttempts: 3 });
    expect(result.issues.some((i) => i.code === 'safe_boot_active')).toBe(true);
  });

  it('provides recovery recommendations', () => {
    const result = validateEnvironmentForBoot({ bootMode: 'safe' });
    const recs = getRecoveryRecommendations(result.issues, ['チェックサム']);
    expect(recs.length).toBeGreaterThan(0);
  });
});
