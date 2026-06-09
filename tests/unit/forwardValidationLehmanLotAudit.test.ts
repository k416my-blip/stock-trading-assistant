import { describe, expect, it } from 'vitest';
import {
  gradeLehmanLotAdoption,
  pickOperationalLot,
  pickSafest,
  LEHMAN_LOT_SCHEME_DEFS,
} from '../../src/services/forwardValidation/forwardValidationLehmanLotAudit';
import type { ForwardLehmanLotSchemeMetrics } from '../../src/types/forwardValidation';

function row(
  schemeId: ForwardLehmanLotSchemeMetrics['schemeId'],
  overrides: Partial<ForwardLehmanLotSchemeMetrics> = {},
): ForwardLehmanLotSchemeMetrics {
  const def = LEHMAN_LOT_SCHEME_DEFS.find((d) => d.schemeId === schemeId)!;
  return {
    schemeId,
    labelJa: def.labelJa,
    lotMYR: schemeId.startsWith('rm') ? (schemeId === 'rm700_current' ? 700 : schemeId === 'rm500' ? 500 : 400) : null,
    deployPct: schemeId.startsWith('pct') ? (schemeId === 'pct20' ? 20 : 15) : null,
    kellyFraction: schemeId === 'kelly25' ? 0.25 : null,
    tradeCount: 20,
    cumulativeReturnPct: -10,
    maxDrawdownPct: -30,
    sharpe: -0.2,
    profitFactor: 0.8,
    bankruptcyRatePct: 10,
    minEquityPct: 60,
    finalEquityMYR: 2700,
    avgSlotMYR: 500,
    ...overrides,
  };
}

describe('forwardValidationLehmanLotAudit', () => {
  it('pickSafest prefers lower bankruptcy and maxDD', () => {
    const rows = [
      row('rm700_current', { bankruptcyRatePct: 15, maxDrawdownPct: -40, minEquityPct: 55 }),
      row('rm400', { bankruptcyRatePct: 5, maxDrawdownPct: -25, minEquityPct: 70 }),
    ];
    expect(pickSafest(rows).schemeId).toBe('rm400');
  });

  it('pickOperationalLot keeps RM700 when alternatives lack clear gain', () => {
    const rows = [
      row('rm700_current', { cumulativeReturnPct: -12, maxDrawdownPct: -35, bankruptcyRatePct: 8 }),
      row('rm500', { cumulativeReturnPct: -13, maxDrawdownPct: -34, bankruptcyRatePct: 9 }),
    ];
    expect(pickOperationalLot(rows).schemeId).toBe('rm700_current');
  });

  it('gradeLehmanLotAdoption returns B when safer lot improves DD materially', () => {
    const current = row('rm700_current', { maxDrawdownPct: -45, bankruptcyRatePct: 12, minEquityPct: 52 });
    const safest = row('rm400', { maxDrawdownPct: -30, bankruptcyRatePct: 6, minEquityPct: 68 });
    const { grade } = gradeLehmanLotAdoption({
      current,
      operational: current,
      safest,
    });
    expect(grade).toBe('B');
  });

  it('LEHMAN_LOT_SCHEME_DEFS has six schemes', () => {
    expect(LEHMAN_LOT_SCHEME_DEFS).toHaveLength(6);
  });
});
