import { describe, expect, it } from 'vitest';
import { resolveLatestInvestableDepositMYR } from '../../src/services/resolveLatestInvestableDepositMYR';
import { buildAllocationPlan } from '../../src/services/allocationPlan';
import { createDefaultAppState } from '../../src/services/storage';

describe('resolveLatestInvestableDepositMYR', () => {
  it('returns latest completed deposit amount', () => {
    const state = createDefaultAppState();
    state.deposits = [
      {
        id: 'd1',
        amountMYR: 1000,
        plannedDate: '2026-06-01',
        completed: true,
      },
      {
        id: 'd2',
        amountMYR: 5000,
        plannedDate: '2026-07-02',
        completed: true,
      },
    ];

    expect(resolveLatestInvestableDepositMYR(state, false)).toBe(5000);
  });

  it('falls back to buying power when no deposits', () => {
    const state = createDefaultAppState();
    state.settings.totalCapitalMYR = 3000;
    expect(resolveLatestInvestableDepositMYR(state, false)).toBe(3000);
  });

  it('uses practice cash in practice mode', () => {
    const state = createDefaultAppState();
    state.practice.cashBalanceMYR = 2500;
    expect(resolveLatestInvestableDepositMYR(state, true)).toBe(2500);
  });
});

describe('buildAllocationPlan without user symbols', () => {
  it('creates plan from market universe when user universe is empty', () => {
    const result = buildAllocationPlan({
      depositMYR: 5000,
      market: 'bursa',
      riskLevel: 'standard',
      investmentStyle: 'balanced',
      fractionalSharesEnabled: false,
      userUniverse: [],
    });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.depositMYR).toBe(5000);
  });
});
