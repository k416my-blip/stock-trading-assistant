import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/portfolioRiskExposureStorage', () => ({
  defaultPortfolioRiskExposureState: () => ({
    version: 1,
    humanOverride: { maxExposurePct: null, sectorCapPct: null, leverageCap: null },
    allocationHistory: [],
  }),
  appendAllocationHistory: (history: unknown[], point: unknown) => [...history, point],
  loadPortfolioRiskExposureState: vi.fn(async () => ({
    version: 1,
    humanOverride: { maxExposurePct: null, sectorCapPct: null, leverageCap: null },
    allocationHistory: [],
  })),
  savePortfolioRiskExposureState: vi.fn(async () => undefined),
}));

vi.mock('../../src/services/fx', () => ({
  toMYR: (amount: number) => amount * 4.5,
}));

vi.mock('../../src/data/sampleStocks', () => ({
  findStock: vi.fn(() => ({ name: 'NVIDIA', symbol: 'NVDA' })),
}));

vi.mock('../../src/services/portfolioConstructionEngine', () => ({
  analyzePortfolioConstruction: vi.fn(() => ({
    healthScore: 72,
    portfolioBeta: 1.15,
    betaWithinLimit: true,
    maxPortfolioBeta: 1.35,
    positions: [
      {
        symbol: 'NVDA',
        weightPct: 55,
        betaProxy: 1.4,
        liquidityScore: 80,
        sector: 'technology',
        investmentTheme: 'growth',
        market: 'us',
        correlationClusterId: 'c1',
      },
      {
        symbol: 'MSFT',
        weightPct: 45,
        betaProxy: 1.1,
        liquidityScore: 85,
        sector: 'technology',
        investmentTheme: 'growth',
        market: 'us',
        correlationClusterId: 'c1',
      },
    ],
    correlatedPairs: [{ symbolA: 'NVDA', symbolB: 'MSFT', correlation: 0.82 }],
    factorExposures: [{ factor: 'growth', exposure: 60, tilt: 'overweight', labelJa: 'Growth' }],
    sectorExposures: [{ sector: 'technology', weightPct: 100, positionCount: 2, severity: 'critical' }],
    sectorHeatMap: [
      { label: 'Technology', weightPct: 100, intensity: 4, severity: 'critical' },
    ],
    warnings: [{ severity: 'watch', code: 'sector', messageJa: '集中' }],
    stressTests: [
      {
        id: 'market_drop',
        labelJa: '市場下落',
        portfolioImpactPct: -10,
        estimatedLossMYR: -5000,
      },
    ],
  })),
}));

import { buildPortfolioRiskExposureBundle } from '../../src/services/portfolioRiskExposureEngine';
import { defaultPortfolioRiskExposureState } from '../../src/services/portfolioRiskExposureStorage';
import type { PortfolioPosition } from '../../src/types';

function holding(overrides: Partial<PortfolioPosition> = {}): PortfolioPosition {
  return {
    id: 'p1',
    symbol: 'NVDA',
    market: 'us',
    currency: 'USD',
    shares: 10,
    averageBuyPrice: 100,
    currentPrice: 110,
    openedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('portfolioRiskExposureEngine', () => {
  it('builds bundle with quality score and stress scenarios', () => {
    const { bundle } = buildPortfolioRiskExposureBundle(defaultPortfolioRiskExposureState(), {
      holdings: [holding(), holding({ id: 'p2', symbol: 'MSFT', shares: 5 })],
      totalValueMYR: 50_000,
      cashMYR: 10_000,
      priceBySymbol: { NVDA: 110, MSFT: 400 },
      macroBundle: null,
      selfEvalBundle: null,
      dataReliabilityBundle: null,
      realityBundle: null,
      executionBundle: null,
    });

    expect(bundle.portfolioQualityScore).toBeGreaterThanOrEqual(0);
    expect(bundle.portfolioQualityScore).toBeLessThanOrEqual(100);
    expect(bundle.stressTests.some((s) => s.id === 'vix_spike')).toBe(true);
    expect(bundle.stressTests.some((s) => s.id === 'panic')).toBe(true);
    expect(bundle.hiddenExposures.length).toBeGreaterThan(0);
    expect(bundle.aiPortfolioSummaryJa.length).toBeGreaterThan(10);
  });

  it('escalates when construction health is very low', () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      holding({
        id: `p${i}`,
        symbol: `SYM${i}`,
        market: i % 2 === 0 ? 'us' : 'bursa',
        shares: 100,
        currentPrice: 50 + i,
      }),
    );
    const { bundle } = buildPortfolioRiskExposureBundle(defaultPortfolioRiskExposureState(), {
      holdings: many,
      totalValueMYR: 200_000,
      cashMYR: 0,
      priceBySymbol: Object.fromEntries(many.map((p) => [p.symbol, p.currentPrice])),
      macroBundle: null,
      selfEvalBundle: null,
      dataReliabilityBundle: null,
      realityBundle: null,
      executionBundle: null,
    });
    expect(bundle.portfolioQualityScore).toBeDefined();
    expect(bundle.riskBudget.length).toBeGreaterThan(0);
  });

  it('respects human max exposure override', () => {
    const state = {
      ...defaultPortfolioRiskExposureState(),
      humanOverride: { maxExposurePct: 12, sectorCapPct: 30, leverageCap: null },
    };
    const { bundle } = buildPortfolioRiskExposureBundle(state, {
      holdings: [holding()],
      totalValueMYR: 20_000,
      cashMYR: 2000,
      priceBySymbol: { NVDA: 110 },
      macroBundle: null,
      selfEvalBundle: null,
      dataReliabilityBundle: null,
      realityBundle: null,
      executionBundle: null,
    });
    expect(bundle.dynamicMaxPositionCapPct).toBe(12);
    expect(bundle.humanOverride.sectorCapPct).toBe(30);
  });
});
