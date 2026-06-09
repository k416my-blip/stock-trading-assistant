import { describe, expect, it } from 'vitest';
import {
  isInvestmentBeginnerMode,
  resolveBeginnerTodayJudgment,
} from '../../src/services/investmentBeginnerUi';
import { DEFAULT_AI_PREFERENCES } from '../../src/services/aiPreferencesStorage';

describe('investmentBeginnerUi', () => {
  it('maps verdicts to 買う/保留/見送る', () => {
    expect(resolveBeginnerTodayJudgment({ adoptionVerdict: 'adopt', buyAllowed: true }).labelJa).toBe(
      '買う',
    );
    expect(resolveBeginnerTodayJudgment({ adoptionVerdict: 'hold', buyAllowed: true }).labelJa).toBe(
      '保留',
    );
    expect(resolveBeginnerTodayJudgment({ adoptionVerdict: 'adopt', buyAllowed: false }).labelJa).toBe(
      '見送る',
    );
  });

  it('defaults trust display mode on when unset', () => {
    expect(isInvestmentBeginnerMode(null)).toBe(false);
    expect(isInvestmentBeginnerMode({})).toBe(false);
    expect(isInvestmentBeginnerMode({ investmentDisplayMode: 'beginner' })).toBe(true);
    expect(isInvestmentBeginnerMode({ investmentDisplayMode: 'pro' })).toBe(false);
  });

  it('DEFAULT_AI_PREFERENCES starts in trust display mode', () => {
    expect(DEFAULT_AI_PREFERENCES.investmentDisplayMode).toBe('trust');
    expect(DEFAULT_AI_PREFERENCES.investmentBeginnerMode).toBe(true);
  });
});
