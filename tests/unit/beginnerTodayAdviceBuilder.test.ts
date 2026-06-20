import { describe, expect, it } from 'vitest';
import { buildBeginnerTodayAdvice } from '../../src/services/beginner/beginnerTodayAdviceBuilder';
import type { MaterialAnalysisReport } from '../../src/services/bursa/bursaMaterialAnalysisService';
import type { PortfolioPosition } from '../../src/types';

describe('buildBeginnerTodayAdvice', () => {
  it('builds held line and no new purchase summary', () => {
    const holdings: PortfolioPosition[] = [
      {
        id: '1',
        symbol: '1155',
        market: 'bursa',
        currency: 'MYR',
        shares: 100,
        averageBuyPrice: 8,
        currentPrice: 9,
        openedAt: '2026-01-01',
      },
    ];
    const report = {
      topMaterial: null,
      stocks: [
        {
          stockCode: '1155',
          companyNameJa: 'Maybank',
          scoreSign: 'positive',
        },
      ],
      monitoringNotifications: [],
      dataSourceLabel: 'test',
      reportDataQuality: null,
      apiConnections: [],
    } as unknown as MaterialAnalysisReport;

    const card = buildBeginnerTodayAdvice({
      holdings,
      materialReport: report,
      strategyBundle: null,
    });

    expect(card.lines.some((l) => l.lineJa.includes('Maybank'))).toBe(true);
    expect(card.hasNewPurchase).toBe(false);
    expect(card.newPurchaseSummaryJa).toBe('新規購入  なし');
    expect(card.footerJa).toBe('急いで売買する必要はありません');
  });

  it('reports loading state', () => {
    const card = buildBeginnerTodayAdvice({
      holdings: [],
      materialReport: null,
      strategyBundle: null,
      loading: true,
    });
    expect(card.loading).toBe(true);
  });
});
