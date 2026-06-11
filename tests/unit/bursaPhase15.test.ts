import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  filterTransactionsWithinDays,
  parseShareholdingChangesFromStockHtml,
  parseShareholdingsPageForStock,
} from '../../src/services/bursa/bursaInsiderTradingParser';
import { buildInsiderTradingAnalysis, insiderMaterialScoreAdjustment } from '../../src/services/bursa/bursaInsiderTradingService';
import { INSIDER_TRADING_UNAVAILABLE_JA } from '../../src/types/bursaInsiderTrading';

const stockFixture = readFileSync(join(process.cwd(), 'scripts/klse-sample-1155.html'), 'utf8');
const shareholdingsFixture = readFileSync(
  join(process.cwd(), 'scripts/klse-shareholdings-1155.html'),
  'utf8',
);

describe('bursaInsiderTradingParser Phase15', () => {
  it('parses shareholding changes from stock HTML', () => {
    const rows = parseShareholdingChangesFromStockHtml(stockFixture);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.some((r) => r.type === 'buy')).toBe(true);
    expect(rows.some((r) => r.type === 'sell')).toBe(true);
    expect(rows[0]?.shares).toBeGreaterThan(0);
  });

  it('parses shareholdings page rows for stock code', () => {
    const rows = parseShareholdingsPageForStock(shareholdingsFixture, '1155');
    expect(rows.length).toBeGreaterThan(3);
    expect(rows[0]?.name).toContain('KWAP');
  });

  it('filters transactions within 90 days', () => {
    const rows = parseShareholdingChangesFromStockHtml(stockFixture);
    const recent = filterTransactionsWithinDays(rows, 90, new Date('2026-06-10T00:00:00Z'));
    expect(recent.length).toBeGreaterThan(0);
  });
});

describe('bursaInsiderTradingService Phase15', () => {
  it('builds analysis from fixture without live fetch', async () => {
    const result = await buildInsiderTradingAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      fetchLiveExternal: true,
    });
    expect(result.hasExtractableData).toBe(true);
    expect(result.insiderBuyCount).toBeGreaterThan(0);
    expect(result.evaluationJa).toContain('Insider Trading');
    expect(result.displayJa.netActivity).not.toBe('データ不足');
  });

  it('returns unavailable when fetchLiveExternal is false', async () => {
    const result = await buildInsiderTradingAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      fetchLiveExternal: false,
    });
    expect(result.availability).toBe('unavailable');
    expect(result.evaluationJa).toBe(INSIDER_TRADING_UNAVAILABLE_JA);
  });

  it('does not apply harsh sell score on insider sells alone', () => {
    const adj = insiderMaterialScoreAdjustment({
      availability: 'available',
      availabilityLabelJa: '取得済',
      insiderBuyCount: 1,
      insiderSellCount: 5,
      netInsiderActivity: '売り優勢',
      latestTransactionDate: '2026-06-01',
      latestTransactionType: 'sell',
      transactionValue: '100 株',
      insiderName: 'Test',
      insiderRole: 'Director',
      confidenceScore: 70,
      source: 'klse_shareholding_changes',
      unavailableReason: null,
      displayJa: {
        latestTransactionDate: '2026-06-01',
        transactionType: '売り',
        insiderName: 'Test',
        insiderRole: 'Director',
        transactionValue: '100 株',
        buyCount90d: '1',
        sellCount90d: '5',
        netActivity: '売り優勢',
        confidence: '70',
      },
      evaluationJa: 'test',
      hasExtractableData: true,
      fetchedAt: null,
    });
    expect(adj).toBeGreaterThan(-10);
    expect(adj).toBeLessThan(0);
  });
});
