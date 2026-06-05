import { describe, expect, it } from 'vitest';
import {
  applyYtlVerifyStressTrades,
  detectYtlDelistImplementationBug,
  diffLedgersAgainstBaseline,
  gradeYtlVerify,
  MALAYSIA_V3_YTL_VERIFY_SCENARIOS,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV3YtlVerifyAudit';

describe('forwardValidationMalaysiaV3YtlVerifyAudit', () => {
  it('has 7 verify scenarios', () => {
    expect(MALAYSIA_V3_YTL_VERIFY_SCENARIOS).toHaveLength(7);
  });

  it('applyYtlVerifyStressTrades removes YTL on trades_removed', () => {
    const trades = [
      { symbol: '6742', returnPct: 10 },
      { symbol: '1023', returnPct: 5 },
    ] as never[];
    const out = applyYtlVerifyStressTrades(trades, 'ytl_trades_removed');
    expect(out).toHaveLength(1);
    expect(out[0]!.symbol).toBe('1023');
  });

  it('applyYtlVerifyStressTrades delists YTL', () => {
    const out = applyYtlVerifyStressTrades([{ symbol: '6742', returnPct: 10 }] as never[], 'ytl_delist');
    expect(out[0]!.returnPct).toBe(-100);
  });

  it('diffLedgersAgainstBaseline finds disappeared ids', () => {
    const diff = diffLedgersAgainstBaseline({
      baseline: [
        { id: 'a', symbol: '6742' },
        { id: 'b', symbol: '1023' },
      ] as never[],
      scenario: [{ id: 'b', symbol: '1023' }] as never[],
    });
    expect(diff.disappearedTradeIds).toEqual(['a']);
    expect(diff.disappearedYtlTradeCount).toBe(1);
  });

  it('detectYtlDelistImplementationBug flags disappeared YTL', () => {
    expect(
      detectYtlDelistImplementationBug({
        baselineYtlCount: 5,
        delistYtlCount: 3,
        delistDisappearedYtlCount: 2,
        delistLedger: [],
      }),
    ).toBe(true);
  });

  it('detectYtlDelistImplementationBug passes when all YTL lose 100%', () => {
    expect(
      detectYtlDelistImplementationBug({
        baselineYtlCount: 2,
        delistYtlCount: 2,
        delistDisappearedYtlCount: 0,
        delistLedger: [
          {
            symbol: '6742',
            notionalMYR: 1000,
            returnPct: -100,
            pnlMYR: -1000,
          },
          {
            symbol: '6742',
            notionalMYR: 500,
            returnPct: -100,
            pnlMYR: -500,
          },
        ] as never[],
      }),
    ).toBe(false);
  });

  it('gradeYtlVerify returns A for real risk', () => {
    const { grade } = gradeYtlVerify({
      implementationBugDetected: false,
      delistBankruptcyPct: 74.32,
      delistDisappearedYtlCount: 0,
      baselineYtlCount: 37,
      delistYtlCount: 37,
    });
    expect(grade).toBe('A');
  });
});
