import { describe, expect, it } from 'vitest';
import {
  buildOperatingSummaryJa,
  buildTrustOperatingPerformanceRecord,
  computeCumulativePortfolioReturnPct,
  computeMaxDrawdownPct,
  computeMonthlyWinRatePct,
  computeTrustStarRating,
  formatOperationStartDateJa,
  formatStarRatingJa,
  toTrustOperatingPerformanceDisplay,
} from '../../src/services/trustOperatingPerformance';
import type { TrustMonthlyReportRecord } from '../../src/services/trustMonthlyReportStorage';

describe('trustOperatingPerformance', () => {
  it('formats operation start date', () => {
    expect(formatOperationStartDateJa('2026-06-01')).toBe('2026/06/01');
  });

  it('formats star rating', () => {
    expect(formatStarRatingJa(5)).toBe('★★★★★');
    expect(formatStarRatingJa(3)).toBe('★★★☆☆');
    expect(formatStarRatingJa(1)).toBe('★☆☆☆☆');
  });

  it('computes cumulative portfolio return', () => {
    const history = [
      { date: '2026-06-01', portfolioValueMYR: 10_000 },
      { date: '2026-06-15', portfolioValueMYR: 10_500 },
      { date: '2026-06-28', portfolioValueMYR: 11_280 },
    ];
    const ret = computeCumulativePortfolioReturnPct(history, '2026-06-01');
    expect(ret).not.toBeNull();
    expect(ret!).toBeCloseTo(12.8, 0);
  });

  it('computes max drawdown', () => {
    const history = [
      { date: '2026-06-01', portfolioValueMYR: 10_000 },
      { date: '2026-06-10', portfolioValueMYR: 11_000 },
      { date: '2026-06-20', portfolioValueMYR: 9_500 },
      { date: '2026-06-28', portfolioValueMYR: 10_500 },
    ];
    const dd = computeMaxDrawdownPct(history, '2026-06-01');
    expect(dd).not.toBeNull();
    expect(dd!).toBeCloseTo(13.6, 0);
  });

  it('computes monthly win rate from stored reports', () => {
    const reports: TrustMonthlyReportRecord[] = [
      {
        yearMonth: '2026-04',
        portfolioReturnPct: 2,
        marketAverageReturnPct: 1,
        outcome: 'beat',
        reasonJa: '',
        savedAt: '',
      },
      {
        yearMonth: '2026-05',
        portfolioReturnPct: 1,
        marketAverageReturnPct: 2,
        outcome: 'lag',
        reasonJa: '',
        savedAt: '',
      },
      {
        yearMonth: '2026-06',
        portfolioReturnPct: 3,
        marketAverageReturnPct: 1,
        outcome: 'beat',
        reasonJa: '',
        savedAt: '',
      },
    ];
    expect(computeMonthlyWinRatePct(reports, '2026-04-01')).toBe(67);
  });

  it('assigns higher stars for strong outperformance', () => {
    expect(
      computeTrustStarRating({
        marketDiffPct: 5,
        monthlyWinRatePct: 75,
        maxDrawdownPct: 4,
      }),
    ).toBeGreaterThanOrEqual(4);
  });

  it('builds beginner summary without jargon', () => {
    const text = buildOperatingSummaryJa({
      starRating: 5,
      marketDiffPct: 4.5,
      monthlyWinRatePct: 71,
    });
    expect(text).toContain('市場平均');
    expect(text).not.toMatch(/RSI|PER|委員会|decisionHash|Red Team/i);
  });

  it('builds operating record from history', () => {
    const history = [
      { date: '2026-06-01', portfolioValueMYR: 10_000 },
      { date: '2026-06-28', portfolioValueMYR: 11_280 },
    ];
    const record = buildTrustOperatingPerformanceRecord({
      operationStartedAt: '2026-06-01',
      performanceHistory: history,
      monthlyReports: [],
    });
    expect(record).not.toBeNull();
    expect(record!.cumulativeReturnPct).toBeCloseTo(12.8, 0);
    expect(record!.marketDiffPct).toBeTypeOf('number');
    expect(record!.starRating).toBeGreaterThanOrEqual(1);
    expect(record!.starRating).toBeLessThanOrEqual(5);
  });

  it('shows pending display when no record', () => {
    const display = toTrustOperatingPerformanceDisplay(null, null);
    expect(display.ready).toBe(false);
    expect(display.summaryJa).toContain('長期の実績');
  });
});
