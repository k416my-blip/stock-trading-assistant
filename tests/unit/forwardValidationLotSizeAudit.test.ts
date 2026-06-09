/**
 * npx vitest run tests/unit/forwardValidationLotSizeAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildLotSizingSpecs,
  resolveEntryNotional,
  simulateLotSizingPath,
} from '../../src/services/forwardValidation/forwardValidationLotSizeAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(
  id: string,
  entryDate: string,
  exitDate: string,
  returnPct: number,
): ForwardPassedTradeRecord {
  return {
    id,
    symbol: 'HDV' as ForwardPassedTradeRecord['symbol'],
    signalDate: entryDate,
    entryDate,
    exitDate,
    entryPrice: 100,
    exitPrice: 100 + returnPct,
    returnPct,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'deep',
    spyRegime: 'down',
  };
}

describe('forwardValidationLotSizeAudit', () => {
  it('builds all sizing specs', () => {
    const specs = buildLotSizingSpecs();
    expect(specs.some((s) => s.kind === 'fixed_myr')).toBe(true);
    expect(specs.some((s) => s.kind === 'kelly')).toBe(true);
    expect(specs.length).toBe(15);
  });

  it('caps fixed MYR lot by deployable capital', () => {
    const notional = resolveEntryNotional({
      spec: {
        kind: 'fixed_myr',
        schemeId: 'x',
        labelJa: 'x',
        lotMYR: 1500,
      },
      equity: 3000,
      openNotional: 0,
      trade: trade('a', '2020-01-02', '2020-01-10', 4),
      allTrades: [],
      symbols: ['HDV', 'DGRO', 'QQQ', 'SCHD'],
      maxDeployFrac: 0.85,
    });
    expect(notional).toBeLessThanOrEqual(2550);
  });

  it('grows equity on winning fixed lot path', () => {
    const trades = [
      trade('a', '2020-01-02', '2020-01-10', 4),
      trade('b', '2020-02-02', '2020-02-10', 4),
    ];
    const path = simulateLotSizingPath({
      trades,
      symbols: ['HDV', 'DGRO', 'QQQ', 'SCHD'],
      spec: {
        kind: 'fixed_myr',
        schemeId: 'fixed_myr_500',
        labelJa: 'RM500',
        lotMYR: 500,
      },
      initialCapitalMYR: 3000,
    });
    expect(path.finalEquity).toBeGreaterThan(3000);
  });
});
