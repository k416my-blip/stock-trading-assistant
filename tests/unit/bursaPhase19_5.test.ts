import { describe, expect, it } from 'vitest';
import {
  applySectorRotationToStock,
  buildGlobalSectorRotationAnalysis,
  buildSectorRotationRankings,
  buildScoreDistribution,
  sectorRotationMaterialScoreAdjustment,
} from '../../src/services/bursa/bursaSectorRotationEngine';
import { buildMacroDashboard, computeMacroScore } from '../../src/services/bursa/bursaMacroIntelligenceService';
import { enrichStockWithSectorRotationIntelligence } from '../../src/services/bursa/bursaPhase19_5Analysis';
import type { MacroIndicatorRow } from '../../src/types/bursaMacroIntelligence';
import type { BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';

function sampleIndicators(): MacroIndicatorRow[] {
  return [
    { id: 'fed_rate', labelJa: 'Fed', value: 5.25, changePct: null, unitJa: '%', sentiment: 'Bearish', fromLive: false, rationaleJa: '' },
    { id: 'us10y', labelJa: 'US10Y', value: 4.2, changePct: -0.5, unitJa: '%', sentiment: 'Bullish', fromLive: true, rationaleJa: '' },
    { id: 'usd_myr', labelJa: 'USD/MYR', value: 4.5, changePct: 0.3, unitJa: 'MYR', sentiment: 'Neutral', fromLive: true, rationaleJa: '' },
    { id: 'dxy', labelJa: 'DXY', value: 104, changePct: -0.2, unitJa: 'pt', sentiment: 'Neutral', fromLive: true, rationaleJa: '' },
    { id: 'brent_oil', labelJa: 'Oil', value: 80, changePct: 1.2, unitJa: 'USD', sentiment: 'Bearish', fromLive: true, rationaleJa: '' },
    { id: 'gold', labelJa: 'Gold', value: 2300, changePct: -0.5, unitJa: 'USD', sentiment: 'Bullish', fromLive: true, rationaleJa: '' },
    { id: 'klci', labelJa: 'KLCI', value: 1500, changePct: 0.3, unitJa: 'pt', sentiment: 'Neutral', fromLive: true, rationaleJa: '' },
    { id: 'sp500', labelJa: 'S&P', value: 5200, changePct: 0.8, unitJa: 'pt', sentiment: 'Bullish', fromLive: true, rationaleJa: '' },
    { id: 'nasdaq', labelJa: 'NASDAQ', value: 16000, changePct: 1.0, unitJa: 'pt', sentiment: 'Bullish', fromLive: true, rationaleJa: '' },
    { id: 'my_opr', labelJa: 'OPR', value: 3, changePct: null, unitJa: '%', sentiment: 'Neutral', fromLive: false, rationaleJa: '' },
    { id: 'us_cpi', labelJa: 'US CPI', value: 3.2, changePct: null, unitJa: '%', sentiment: 'Neutral', fromLive: false, rationaleJa: '' },
    { id: 'my_cpi', labelJa: 'MY CPI', value: 1.8, changePct: null, unitJa: '%', sentiment: 'Bullish', fromLive: false, rationaleJa: '' },
  ];
}

function baseStock(code = '1155'): BursaStockMaterialAnalysis {
  const indicators = sampleIndicators();
  const dashboard = buildMacroDashboard(indicators);
  const macroScore = computeMacroScore(indicators);
  return {
    stockCode: code,
    companyName: 'Test',
    materialScore: 10,
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
    macroIntelligence: {
      availability: 'available',
      availabilityLabelJa: '取得済',
      dashboard,
      macroScore,
      macroSentiment: 'Neutral',
      sectorId: 'banking',
      sectorLabelJa: '銀行',
      sectorImpactScore: 2,
      sectorImpactSentiment: 'Neutral',
      sectorImpacts: [],
      materialScoreAdjustment: 2,
      fieldAcquisitionRate: 75,
      unavailableReason: null,
      displayJa: {
        macroScore: '+0',
        macroSentiment: 'Neutral',
        bullishCount: '3',
        bearishCount: '2',
        neutralCount: '4',
        liveIndicators: '8/12',
        sectorImpact: '+2',
        sectorSentiment: 'Neutral',
        topBullish: 'S&P',
        topBearish: 'Oil',
        dashboardSummary: 'test',
      },
      evaluationJa: 'Macro test',
      hasExtractableData: true,
      fetchedAt: new Date().toISOString(),
    },
  };
}

describe('bursaSectorRotation Phase19.5', () => {
  it('builds 9-sector rankings with strength -20 to +20', () => {
    const dashboard = buildMacroDashboard(sampleIndicators());
    const rankings = buildSectorRotationRankings(dashboard);
    expect(rankings).toHaveLength(9);
    for (const row of rankings) {
      expect(row.strength).toBeGreaterThanOrEqual(-20);
      expect(row.strength).toBeLessThanOrEqual(20);
      expect(row.rank).toBeGreaterThanOrEqual(1);
    }
    expect(rankings[0].rank).toBe(1);
    expect(rankings[8].rank).toBe(9);
  });

  it('computes macro intelligence score as macro + rotation', () => {
    const dashboard = buildMacroDashboard(sampleIndicators());
    const macroScore = computeMacroScore(sampleIndicators());
    const global = buildGlobalSectorRotationAnalysis({
      dashboard,
      macroScore,
      hasExtractableData: true,
    });
    const stock = applySectorRotationToStock({
      global,
      macroScore,
      stockCode: '6033',
      sector: 'Energy',
    });
    expect(stock.macroIntelligenceScore).toBe(macroScore + stock.sectorRotationScore);
    expect(stock.materialScoreAdjustment).toBe(
      Math.max(-20, Math.min(20, stock.macroIntelligenceScore)),
    );
  });

  it('identifies top3 and bottom3 sectors', () => {
    const dashboard = buildMacroDashboard(sampleIndicators());
    const rankings = buildSectorRotationRankings(dashboard);
    const global = buildGlobalSectorRotationAnalysis({
      dashboard,
      macroScore: 0,
      hasExtractableData: true,
    });
    expect(global.top3Sectors).toHaveLength(3);
    expect(global.bottom3Sectors).toHaveLength(3);
    const dist = buildScoreDistribution(rankings);
    expect(dist.bullish + dist.neutral + dist.bearish).toBe(9);
  });

  it('enriches stock with sector rotation', async () => {
    const enriched = await enrichStockWithSectorRotationIntelligence({
      stock: baseStock('1155'),
      sector: 'Banking',
      fetchLiveExternal: false,
    });
    expect(enriched.sectorRotation?.availability).toBe('available');
    expect(enriched.fetchedFields).toContain('phase19_5.sector_rotation');
    expect(enriched.macroIntelligence?.macroIntelligenceScore).toBeDefined();
    const adj = sectorRotationMaterialScoreAdjustment(enriched.sectorRotation ?? null);
    expect(adj).toBeGreaterThanOrEqual(-20);
    expect(adj).toBeLessThanOrEqual(20);
  });
});
