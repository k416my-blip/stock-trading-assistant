import { describe, expect, it } from 'vitest';
import {
  DYNAMIC_LOT_SCHEME_DEFS,
  gradeDynamicLotAdoption,
  isDynamicKellyTrigger,
  resolveDynamicLotSpec,
  RM700_SPEC,
  KELLY25_SPEC,
} from '../../src/services/forwardValidation/forwardValidationDynamicLotAudit';
import type { ForwardDynamicLotSchemeMetrics } from '../../types/forwardValidation';

function row(
  schemeId: ForwardDynamicLotSchemeMetrics['schemeId'],
  scopeId: ForwardDynamicLotSchemeMetrics['scopeId'],
  overrides: Partial<ForwardDynamicLotSchemeMetrics> = {},
): ForwardDynamicLotSchemeMetrics {
  const def = DYNAMIC_LOT_SCHEME_DEFS.find((d) => d.schemeId === schemeId)!;
  return {
    schemeId,
    scopeId,
    labelJa: def.labelJa,
    tradeCount: 100,
    kellyTriggerCount: schemeId === 'dynamic_switch' ? 12 : null,
    cumulativeReturnPct: 50,
    maxDrawdownPct: -15,
    sharpe: 1.2,
    profitFactor: 2.5,
    bankruptcyRatePct: 0,
    minEquityPct: 80,
    finalEquityMYR: 4500,
    avgSlotMYR: 650,
    ...overrides,
  };
}

describe('forwardValidationDynamicLotAudit', () => {
  it('isDynamicKellyTrigger fires on VIX>=30', () => {
    expect(isDynamicKellyTrigger({ vixAtSignal: 30 } as never)).toBe(true);
    expect(isDynamicKellyTrigger({ vixAtSignal: 25 } as never)).toBe(false);
  });

  it('isDynamicKellyTrigger fires on QQQ200MA or NASDAQ52w', () => {
    expect(isDynamicKellyTrigger({ qqqMa200DevPct: -11 } as never)).toBe(true);
    expect(isDynamicKellyTrigger({ ndxDist52Pct: -16 } as never)).toBe(true);
  });

  it('resolveDynamicLotSpec picks Kelly under stress', () => {
    expect(resolveDynamicLotSpec({ vixAtSignal: 35 } as never)).toEqual(KELLY25_SPEC);
    expect(resolveDynamicLotSpec({ vixAtSignal: 24 } as never)).toEqual(RM700_SPEC);
  });

  it('gradeDynamicLotAdoption returns A when DD improves materially', () => {
    const current = row('rm700_current', 'full_history', {
      maxDrawdownPct: -20,
      cumulativeReturnPct: 40,
      sharpe: 1.0,
    });
    const dynamic = row('dynamic_switch', 'full_history', {
      maxDrawdownPct: -14,
      cumulativeReturnPct: 42,
      sharpe: 1.1,
    });
    const kellyFixed = row('kelly25_fixed', 'full_history', { cumulativeReturnPct: 41 });
    const lehmanCurrent = row('rm700_current', 'lehman_scenario', { maxDrawdownPct: -13 });
    const lehmanDynamic = row('dynamic_switch', 'lehman_scenario', { maxDrawdownPct: -7 });
    const { grade } = gradeDynamicLotAdoption({
      current,
      dynamic,
      kellyFixed,
      lehmanCurrent,
      lehmanDynamic,
    });
    expect(grade).toBe('A');
  });

  it('DYNAMIC_LOT_SCHEME_DEFS has three schemes', () => {
    expect(DYNAMIC_LOT_SCHEME_DEFS).toHaveLength(3);
  });
});
