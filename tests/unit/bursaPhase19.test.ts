import { describe, expect, it } from 'vitest';
import {
  applyMacroIntelligenceToStock,
  buildMacroDashboard,
  computeMacroScore,
  macroIntelligenceMaterialScoreAdjustment,
} from '../../src/services/bursa/bursaMacroIntelligenceService';
import { enrichStockWithMacroIntelligence } from '../../src/services/bursa/bursaPhase19Analysis';
import {
  AUDIT_STOCK_MACRO_SECTOR,
  buildAllSectorImpacts,
  resolveStockMacroSector,
  scoreToMacroSentiment,
} from '../../src/services/bursa/bursaMacroSectorAdjustment';
import type { MacroIndicatorRow } from '../../src/types/bursaMacroIntelligence';
import type { BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';

function sampleIndicators(): MacroIndicatorRow[] {
  return [
    {
      id: 'sp500',
      labelJa: 'S&P500',
      value: 5200,
      changePct: 1.2,
      unitJa: 'pt',
      sentiment: 'Bullish',
      fromLive: true,
      rationaleJa: 'test',
    },
    {
      id: 'nasdaq',
      labelJa: 'NASDAQ',
      value: 16000,
      changePct: 0.8,
      unitJa: 'pt',
      sentiment: 'Bullish',
      fromLive: true,
      rationaleJa: 'test',
    },
    {
      id: 'klci',
      labelJa: 'KLCI',
      value: 1500,
      changePct: -0.6,
      unitJa: 'pt',
      sentiment: 'Bearish',
      fromLive: true,
      rationaleJa: 'test',
    },
    {
      id: 'us10y',
      labelJa: 'US 10Y',
      value: 4.2,
      changePct: 0.3,
      unitJa: '%',
      sentiment: 'Bearish',
      fromLive: true,
      rationaleJa: 'test',
    },
    {
      id: 'fed_rate',
      labelJa: 'Fed',
      value: 5.25,
      changePct: null,
      unitJa: '%',
      sentiment: 'Bearish',
      fromLive: false,
      rationaleJa: 'ref',
    },
    {
      id: 'my_opr',
      labelJa: 'OPR',
      value: 3.0,
      changePct: null,
      unitJa: '%',
      sentiment: 'Neutral',
      fromLive: false,
      rationaleJa: 'ref',
    },
    {
      id: 'us_cpi',
      labelJa: 'US CPI',
      value: 3.2,
      changePct: null,
      unitJa: '%',
      sentiment: 'Neutral',
      fromLive: false,
      rationaleJa: 'ref',
    },
    {
      id: 'my_cpi',
      labelJa: 'MY CPI',
      value: 1.8,
      changePct: null,
      unitJa: '%',
      sentiment: 'Bullish',
      fromLive: false,
      rationaleJa: 'ref',
    },
    {
      id: 'usd_myr',
      labelJa: 'USD/MYR',
      value: 4.5,
      changePct: 0.2,
      unitJa: 'MYR',
      sentiment: 'Neutral',
      fromLive: true,
      rationaleJa: 'test',
    },
    {
      id: 'dxy',
      labelJa: 'DXY',
      value: 104,
      changePct: -0.4,
      unitJa: 'pt',
      sentiment: 'Bullish',
      fromLive: true,
      rationaleJa: 'test',
    },
    {
      id: 'brent_oil',
      labelJa: 'Brent',
      value: 80,
      changePct: 1.5,
      unitJa: 'USD',
      sentiment: 'Bearish',
      fromLive: true,
      rationaleJa: 'test',
    },
    {
      id: 'gold',
      labelJa: 'Gold',
      value: 2300,
      changePct: -0.3,
      unitJa: 'USD',
      sentiment: 'Bullish',
      fromLive: true,
      rationaleJa: 'test',
    },
  ];
}

function baseStock(code = '1155'): BursaStockMaterialAnalysis {
  return {
    stockCode: code,
    companyName: 'Test Bank',
    materialScore: 5,
    scoreBreakdown: [],
    positiveMaterials: [],
    negativeMaterials: [],
    neutralMaterials: [],
    summaryLines: ['a', 'b', 'c'],
    buyReasonsToday: [],
    sellReasonsToday: [],
    sourceStatus: {
      news_api: 'skipped',
      rss: 'skipped',
      bursa_announcement: 'skipped',
      x: 'skipped',
      reddit: 'skipped',
    },
    fetchedFields: [],
    missingFields: [],
  };
}

describe('bursaMacroIntelligence Phase19', () => {
  it('computes macro score within -20 to +20', () => {
    const indicators = sampleIndicators();
    const score = computeMacroScore(indicators);
    expect(score).toBeGreaterThanOrEqual(-20);
    expect(score).toBeLessThanOrEqual(20);
    expect(scoreToMacroSentiment(score)).toMatch(/Bullish|Neutral|Bearish/);
  });

  it('builds sector impacts for all five sectors', () => {
    const dashboard = buildMacroDashboard(sampleIndicators());
    const impacts = buildAllSectorImpacts(dashboard);
    expect(impacts).toHaveLength(5);
    for (const row of impacts) {
      expect(row.impactScore).toBeGreaterThanOrEqual(-20);
      expect(row.impactScore).toBeLessThanOrEqual(20);
    }
  });

  it('maps audit stocks to macro sectors', () => {
    expect(resolveStockMacroSector('1155', null)).toBe('banking');
    expect(resolveStockMacroSector('5347', null)).toBe('utilities');
    expect(resolveStockMacroSector('4707', null)).toBe('consumer');
    expect(resolveStockMacroSector('6033', null)).toBe('energy');
    expect(AUDIT_STOCK_MACRO_SECTOR['1023']).toBe('banking');
  });

  it('applies sector-specific material adjustment', () => {
    const indicators = sampleIndicators();
    const dashboard = buildMacroDashboard(indicators);
    const global = {
      availability: 'available' as const,
      availabilityLabelJa: '取得済',
      dashboard,
      macroScore: computeMacroScore(indicators),
      macroSentiment: scoreToMacroSentiment(computeMacroScore(indicators)),
      sectorId: null,
      sectorLabelJa: '—',
      sectorImpactScore: 0,
      sectorImpactSentiment: 'Neutral' as const,
      sectorImpacts: buildAllSectorImpacts(dashboard),
      materialScoreAdjustment: 0,
      fieldAcquisitionRate: dashboard.fieldAcquisitionRate,
      unavailableReason: null,
      displayJa: {
        macroScore: '+0',
        macroSentiment: 'Neutral',
        bullishCount: '0',
        bearishCount: '0',
        neutralCount: '0',
        liveIndicators: '0/12',
        sectorImpact: '+0',
        sectorSentiment: 'Neutral',
        topBullish: '—',
        topBearish: '—',
        dashboardSummary: 'test',
      },
      evaluationJa: 'test',
      hasExtractableData: true,
      fetchedAt: new Date().toISOString(),
    };

    const bank = applyMacroIntelligenceToStock({ global, stockCode: '1155', sector: 'Banking' });
    const energy = applyMacroIntelligenceToStock({ global, stockCode: '6033', sector: 'Energy' });
    expect(Math.abs(bank.materialScoreAdjustment)).toBeLessThanOrEqual(20);
    expect(Math.abs(energy.materialScoreAdjustment)).toBeLessThanOrEqual(20);
    expect(bank.sectorLabelJa).toBe('銀行');
    expect(energy.sectorLabelJa).toBe('エネルギー');
  });

  it('enriches stock with macro intelligence material row', async () => {
    const indicators = sampleIndicators();
    const dashboard = buildMacroDashboard(indicators);
    const globalMacro = applyMacroIntelligenceToStock({
      global: {
        availability: 'available',
        availabilityLabelJa: '取得済',
        dashboard,
        macroScore: computeMacroScore(indicators),
        macroSentiment: scoreToMacroSentiment(computeMacroScore(indicators)),
        sectorId: null,
        sectorLabelJa: '—',
        sectorImpactScore: 0,
        sectorImpactSentiment: 'Neutral',
        sectorImpacts: buildAllSectorImpacts(dashboard),
        materialScoreAdjustment: 0,
        fieldAcquisitionRate: dashboard.fieldAcquisitionRate,
        unavailableReason: null,
        displayJa: {
          macroScore: '+1',
          macroSentiment: 'Neutral',
          bullishCount: '4',
          bearishCount: '3',
          neutralCount: '5',
          liveIndicators: '8/12',
          sectorImpact: '+2',
          sectorSentiment: 'Neutral',
          topBullish: 'S&P500',
          topBearish: 'KLCI',
          dashboardSummary: 'test',
        },
        evaluationJa: 'Macro Intelligence test',
        hasExtractableData: true,
        fetchedAt: new Date().toISOString(),
      },
      stockCode: '1155',
      sector: 'Banking',
    });

    const enriched = await enrichStockWithMacroIntelligence({
      stock: baseStock(),
      sector: 'Banking',
      globalMacro,
      fetchLiveExternal: false,
    });

    expect(enriched.macroIntelligence?.availability).toBe('available');
    expect(enriched.fetchedFields).toContain('phase19.macro_intelligence');
    expect(macroIntelligenceMaterialScoreAdjustment(enriched.macroIntelligence ?? null)).toBeLessThanOrEqual(20);
    expect(macroIntelligenceMaterialScoreAdjustment(enriched.macroIntelligence ?? null)).toBeGreaterThanOrEqual(-20);
  });
});
