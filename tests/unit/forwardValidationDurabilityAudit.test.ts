import { describe, expect, it } from 'vitest';
import {
  applyDurabilityStress,
  gradeDurabilityOperational,
  isRuinPath,
} from '../../src/services/forwardValidation/forwardValidationDurabilityAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(returnPct: number): ForwardPassedTradeRecord {
  return {
    signalDate: '2020-04-06',
    entryDate: '2020-04-07',
    exitDate: '2020-05-01',
    symbol: 'DGRO',
    returnPct,
    adx14: 30,
    macdHistPct: 0.5,
    dist52wPct: -10,
    holdDays: 20,
    exitReason: 'take_profit',
    bucket: 'down',
    spyRegime: 'down',
  } as ForwardPassedTradeRecord;
}

describe('forwardValidationDurabilityAudit', () => {
  it('applyDurabilityStress adjusts returns', () => {
    const base = [trade(4), trade(-5)];
    const slip = applyDurabilityStress(base, 'slip_10');
    expect(slip[0]!.returnPct).toBe(3);
    const ret20 = applyDurabilityStress(base, 'return_m20');
    expect(ret20[0]!.returnPct).toBe(3.2);
  });

  it('isRuinPath detects ruin threshold', () => {
    expect(isRuinPath({ minEquityPct: 45, finalEquity: 1500 } as never)).toBe(true);
    expect(isRuinPath({ minEquityPct: 80, finalEquity: 3500 } as never)).toBe(false);
  });

  it('gradeDurabilityOperational returns B for moderate stats', () => {
    const { grade } = gradeDurabilityOperational({
      monteCarlo: {
        runs: 10000,
        meanCumulativePct: 20,
        medianCumulativePct: 18,
        ci95LowPct: 5,
        ci95HighPct: 40,
        worstCumulativePct: -5,
        worstMaxDrawdownPct: -20,
        meanSharpe: 1.5,
        meanProfitFactor: 3,
        bankruptcyRatePct: 1,
      },
      worstStressCum: -8,
      baselinePath: { minEquityPct: 65 } as never,
    });
    expect(grade).toBe('B');
  });
});
