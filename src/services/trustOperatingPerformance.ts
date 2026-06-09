/**
 * AI信託 — 長期運用実績（表示・履歴用。recommendationEngine 等は参照のみ）
 */
import { SAMPLE_STOCKS, getSamplePriceHistory } from '../data/sampleStocks';
import type { PerformancePoint } from '../types';
import {
  computePortfolioMonthlyReturnPct,
  computeSampleMarketMonthlyReturnPct,
  formatTrustReturnPct,
  parseLocalDateMs,
} from './trustMonthlyPerformanceReport';
import type { TrustMonthlyReportRecord } from './trustMonthlyReportStorage';

export type TrustStarRating = 1 | 2 | 3 | 4 | 5;

export type TrustOperatingPerformanceRecord = {
  operationStartedAt: string;
  cumulativeReturnPct: number;
  marketAverageReturnPct: number;
  marketDiffPct: number;
  monthlyWinRatePct: number;
  maxDrawdownPct: number;
  starRating: TrustStarRating;
  summaryJa: string;
  savedAt: string;
};

export type TrustOperatingPerformanceDisplay = {
  operationStartedLabel: string;
  cumulativeReturnLabel: string;
  marketAverageLabel: string;
  marketDiffLabel: string;
  monthlyWinRateLabel: string;
  maxDrawdownLabel: string;
  starRatingLabel: string;
  summaryJa: string;
  ready: boolean;
};

export function formatOperationStartDateJa(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${y}/${m}/${d}`;
}

export function formatStarRatingJa(rating: TrustStarRating): string {
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
}

export function formatWinRatePct(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatMaxDrawdownPct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

function sortedHistorySince(
  history: PerformancePoint[],
  startDate: string,
): PerformancePoint[] {
  const startMs = parseLocalDateMs(startDate);
  if (startMs == null) return [];
  return [...history]
    .filter((p) => {
      const ms = parseLocalDateMs(p.date);
      return ms != null && ms >= startMs;
    })
    .sort((a, b) => (parseLocalDateMs(a.date) ?? 0) - (parseLocalDateMs(b.date) ?? 0));
}

export function computeCumulativePortfolioReturnPct(
  history: PerformancePoint[],
  startDate: string,
): number | null {
  const points = sortedHistorySince(history, startDate);
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  if (first.portfolioValueMYR <= 0) return null;
  return (
    ((last.portfolioValueMYR - first.portfolioValueMYR) / first.portfolioValueMYR) * 100
  );
}

function findBarCloseOnOrBefore(
  bars: { date: string; close: number }[],
  targetMs: number,
): number | null {
  let last: number | null = null;
  for (const bar of bars) {
    const ms = parseLocalDateMs(bar.date);
    if (ms == null) continue;
    if (ms <= targetMs) last = bar.close;
    else break;
  }
  return last;
}

export function computeCumulativeMarketReturnPct(
  startDate: string,
  endDate: string,
): number | null {
  const startMs = parseLocalDateMs(startDate);
  const endMs = parseLocalDateMs(endDate);
  if (startMs == null || endMs == null || endMs <= startMs) return null;

  const returns: number[] = [];
  for (const stock of SAMPLE_STOCKS) {
    const bars = getSamplePriceHistory(stock.symbol);
    const startClose = findBarCloseOnOrBefore(bars, startMs);
    const endClose = findBarCloseOnOrBefore(bars, endMs);
    if (startClose == null || endClose == null || startClose <= 0) continue;
    returns.push(((endClose - startClose) / startClose) * 100);
  }

  if (returns.length === 0) return null;
  const avg = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  return Math.round(avg * 10) / 10;
}

export function computeMaxDrawdownPct(
  history: PerformancePoint[],
  startDate: string,
): number | null {
  const points = sortedHistorySince(history, startDate);
  if (points.length < 2) return null;

  let peak = points[0].portfolioValueMYR;
  let maxDd = 0;
  for (const point of points) {
    peak = Math.max(peak, point.portfolioValueMYR);
    if (peak > 0) {
      const dd = ((peak - point.portfolioValueMYR) / peak) * 100;
      maxDd = Math.max(maxDd, dd);
    }
  }
  return Math.round(maxDd * 10) / 10;
}

function yearMonthFromDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function computeMonthlyWinRatePct(
  reports: TrustMonthlyReportRecord[],
  operationStartedAt: string,
): number | null {
  const since = yearMonthFromDate(operationStartedAt);
  const eligible = reports.filter((r) => r.yearMonth >= since);
  if (eligible.length === 0) return null;
  const wins = eligible.filter((r) => r.outcome === 'beat').length;
  return Math.round((wins / eligible.length) * 100);
}

export function computeTrustStarRating(input: {
  marketDiffPct: number;
  monthlyWinRatePct: number | null;
  maxDrawdownPct: number | null;
}): TrustStarRating {
  let score = 58;
  score += Math.min(22, Math.max(-22, input.marketDiffPct * 2.5));
  if (input.monthlyWinRatePct != null) {
    score += (input.monthlyWinRatePct - 50) * 0.35;
  }
  if (input.maxDrawdownPct != null) {
    score -= Math.max(0, input.maxDrawdownPct - 8) * 1.2;
  }

  if (score >= 82) return 5;
  if (score >= 68) return 4;
  if (score >= 52) return 3;
  if (score >= 38) return 2;
  return 1;
}

export function buildOperatingSummaryJa(input: {
  starRating: TrustStarRating;
  marketDiffPct: number;
  monthlyWinRatePct: number | null;
}): string {
  if (input.starRating >= 4 && input.marketDiffPct >= 1) {
    return '運用の提案は市場平均を継続して上回っています';
  }
  if (input.marketDiffPct >= 0.5) {
    return '運用の提案はおおむね市場平均を上回っています';
  }
  if (input.marketDiffPct >= -0.5) {
    return '運用の提案は市場平均と同程度の結果です';
  }
  if (input.monthlyWinRatePct != null && input.monthlyWinRatePct >= 50) {
    return '上回った月もあります。長く続けることが大切です';
  }
  return '市場の動きが大きい時期です。焦らず続けましょう';
}

export function buildTrustOperatingPerformanceRecord(input: {
  operationStartedAt: string;
  performanceHistory: PerformancePoint[];
  monthlyReports: TrustMonthlyReportRecord[];
}): TrustOperatingPerformanceRecord | null {
  const points = sortedHistorySince(input.performanceHistory, input.operationStartedAt);
  if (points.length < 2) return null;

  const cumulativeReturnPct = computeCumulativePortfolioReturnPct(
    input.performanceHistory,
    input.operationStartedAt,
  );
  const endDate = points[points.length - 1].date.slice(0, 10);
  const marketAverageReturnPct = computeCumulativeMarketReturnPct(
    input.operationStartedAt,
    endDate,
  );
  if (cumulativeReturnPct == null || marketAverageReturnPct == null) return null;

  const roundedCumulative = Math.round(cumulativeReturnPct * 10) / 10;
  const marketDiffPct = Math.round((roundedCumulative - marketAverageReturnPct) * 10) / 10;
  const monthlyWinRatePct =
    computeMonthlyWinRatePct(input.monthlyReports, input.operationStartedAt) ??
    estimateMonthlyWinRateFromHistory(input.performanceHistory, input.operationStartedAt) ??
    0;
  const maxDrawdownPct =
    computeMaxDrawdownPct(input.performanceHistory, input.operationStartedAt) ?? 0;
  const starRating = computeTrustStarRating({
    marketDiffPct,
    monthlyWinRatePct: monthlyWinRatePct > 0 ? monthlyWinRatePct : null,
    maxDrawdownPct: maxDrawdownPct > 0 ? maxDrawdownPct : null,
  });

  return {
    operationStartedAt: input.operationStartedAt,
    cumulativeReturnPct: roundedCumulative,
    marketAverageReturnPct,
    marketDiffPct,
    monthlyWinRatePct,
    maxDrawdownPct,
    starRating,
    summaryJa: buildOperatingSummaryJa({
      starRating,
      marketDiffPct,
      monthlyWinRatePct: monthlyWinRatePct > 0 ? monthlyWinRatePct : null,
    }),
    savedAt: new Date().toISOString(),
  };
}

export function toTrustOperatingPerformanceDisplay(
  record: TrustOperatingPerformanceRecord | null,
  operationStartedAt: string | null,
): TrustOperatingPerformanceDisplay {
  if (!record || !operationStartedAt) {
    return {
      operationStartedLabel: '—',
      cumulativeReturnLabel: '集計中',
      marketAverageLabel: '—',
      marketDiffLabel: '—',
      monthlyWinRateLabel: '—',
      maxDrawdownLabel: '—',
      starRatingLabel: '☆☆☆☆☆',
      summaryJa: '運用を始めると、ここに長期の実績が表示されます',
      ready: false,
    };
  }

  return {
    operationStartedLabel: formatOperationStartDateJa(record.operationStartedAt),
    cumulativeReturnLabel: formatTrustReturnPct(record.cumulativeReturnPct),
    marketAverageLabel: formatTrustReturnPct(record.marketAverageReturnPct),
    marketDiffLabel: formatTrustReturnPct(record.marketDiffPct),
    monthlyWinRateLabel: formatWinRatePct(record.monthlyWinRatePct),
    maxDrawdownLabel: formatMaxDrawdownPct(record.maxDrawdownPct),
    starRatingLabel: formatStarRatingJa(record.starRating),
    summaryJa: record.summaryJa,
    ready: true,
  };
}

/** 月次レポートが無い場合の勝率推定（完了月のみ） */
export function estimateMonthlyWinRateFromHistory(
  history: PerformancePoint[],
  operationStartedAt: string,
): number | null {
  const startMs = parseLocalDateMs(operationStartedAt);
  if (startMs == null) return null;

  const now = new Date();
  const months: string[] = [];
  let cursor = new Date(startMs);
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cursor <= end) {
    months.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
    );
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const outcomes: boolean[] = [];
  for (const yearMonth of months) {
    const portfolio = computePortfolioMonthlyReturnFromHistory(history, yearMonth);
    const market = computeSampleMarketMonthlyReturnPct(yearMonth);
    if (portfolio == null || market == null) continue;
    outcomes.push(portfolio - market >= 0.25);
  }
  if (outcomes.length === 0) return null;
  return Math.round((outcomes.filter(Boolean).length / outcomes.length) * 100);
}

function computePortfolioMonthlyReturnFromHistory(
  history: PerformancePoint[],
  yearMonth: string,
): number | null {
  return computePortfolioMonthlyReturnPct(history, yearMonth);
}
