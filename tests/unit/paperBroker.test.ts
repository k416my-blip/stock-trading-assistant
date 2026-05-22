import { describe, expect, it } from 'vitest';
import { simulatePaperFill } from '../../src/services/paperBroker/paperExecutionEngine';
import { checkOrderRiskGuards, currentDrawdownPct } from '../../src/services/paperBroker/paperRiskLayer';
import { defaultPaperBrokerState } from '../../src/services/paperBroker/paperBrokerStorage';
import { resolveMarketSession, canSubmitPaperOrderInSession } from '../../src/services/paperBroker/marketHoursEngine';
import { assertBrokerMockOnly, getBrokerAdapter } from '../../src/services/paperBroker/brokerRegistry';
import { validateEntryConditions } from '../../src/services/paperBroker/entryValidation';
import { evaluateExitAlerts } from '../../src/services/paperBroker/exitEngine';

describe('paperExecutionEngine', () => {
  it('simulates fill with slippage and commission', () => {
    const fill = simulatePaperFill({
      side: 'buy',
      quantity: 100,
      referencePrice: 10,
      market: 'bursa',
    });
    expect(fill.fillQuantity).toBeGreaterThan(0);
    expect(fill.avgFillPrice).toBeGreaterThan(10);
    expect(fill.commissionMYR).toBeGreaterThanOrEqual(0);
    expect(fill.latencyMs).toBeGreaterThan(0);
  });
});

describe('paperRiskLayer', () => {
  it('blocks when kill switch on', () => {
    const state = defaultPaperBrokerState();
    state.config.killSwitch = true;
    const r = checkOrderRiskGuards(state, {
      symbol: '1155',
      market: 'bursa',
      side: 'buy',
      quantity: 10,
      referencePrice: 9,
    });
    expect(r.allowed).toBe(false);
  });

  it('computes drawdown after loss', () => {
    const state = defaultPaperBrokerState();
    state.equityTimeline = [
      { at: 't1', equityMYR: 100_000, drawdownPct: 0 },
      { at: 't2', equityMYR: 80_000, drawdownPct: 20 },
    ];
    const acc = state.accounts[0];
    acc.cashMYR = 80_000;
    expect(currentDrawdownPct(state)).toBeGreaterThan(15);
  });
});

describe('marketHoursEngine', () => {
  it('resolves session for bursa weekday', () => {
    const noonUtc = new Date('2026-05-20T03:00:00Z');
    const session = resolveMarketSession('bursa', noonUtc);
    expect(['open', 'premarket', 'closed', 'holiday']).toContain(session);
    expect(canSubmitPaperOrderInSession('open')).toBe(true);
  });
});

describe('brokerRegistry', () => {
  it('only exposes mock adapters', () => {
    const a = getBrokerAdapter('ibkr');
    assertBrokerMockOnly(a);
    expect(a.mockMode).toBe(true);
  });
});

describe('entryValidation', () => {
  it('warns on wide spread', () => {
    const v = validateEntryConditions({
      symbol: 'X',
      market: 'us',
      side: 'buy',
      quantity: 1,
      referencePrice: 100,
      spreadBpsEstimate: 40,
      volatilityPct: 50,
    });
    expect(v.ok).toBe(false);
  });
});

describe('exitEngine', () => {
  it('flags stop loss', () => {
    const alerts = evaluateExitAlerts(
      [{ symbol: 'ABC', market: 'bursa', shares: 100, avgPrice: 10, sectorId: null }],
      { ABC: 8 },
      { stopLossPct: 10 },
    );
    expect(alerts.some((a) => a.kind === 'stop_loss')).toBe(true);
  });
});
