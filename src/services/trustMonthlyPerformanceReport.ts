/**
 * AI信託 — 月次実績レポート（表示・履歴用。recommendationEngine 等は参照のみ）
 */
import { SAMPLE_STOCKS, getSamplePriceHistory } from '../data/sampleStocks';
import type { AllocationPlan, PerformancePoint } from '../types';
import { collectCharterApprovalReasonsFromPlan } from './trustMonthlyOneLiner';
import type { TrustMonthlyReportRecord } from './trustMonthlyReportStorage';

export type TrustMonthlyPerformanceOutcome = 'beat' | 'lag' | 'match';

export type TrustMonthlyPerformanceDisplay = {
  yearMonth: string;
  monthLabelJa: string;
  portfolioReturnLabel: string;
  marketAverageLabel: string;
  outcomeLabelJa: string;
  reasonJa: string;
  ready: boolean;
};

export function formatTrustReturnPct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

export function getPreviousYearMonth(ref = new Date()): string {
  const d = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function yearMonthToLabelJa(yearMonth: string): string {
  const [, month] = yearMonth.split('-');
  const m = Number(month);
  return Number.isFinite(m) ? `${m}月` : yearMonth;
}

export function parseLocalDateMs(dateStr: string): number | null {
  const iso = dateStr.trim().slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

function monthBounds(yearMonth: string): { startMs: number; endMs: number } {
  const [y, m] = yearMonth.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function findValueOnOrBefore(
  history: PerformancePoint[],
  targetMs: number,
): PerformancePoint | null {
  const sorted = [...history].sort(
    (a, b) => (parseLocalDateMs(a.date) ?? 0) - (parseLocalDateMs(b.date) ?? 0),
  );
  let last: PerformancePoint | null = null;
  for (const point of sorted) {
    const ms = parseLocalDateMs(point.date);
    if (ms == null) continue;
    if (ms <= targetMs) last = point;
    else break;
  }
  return last;
}

export function computePortfolioMonthlyReturnPct(
  history: PerformancePoint[],
  yearMonth: string,
): number | null {
  if (history.length === 0) return null;
  const { startMs, endMs } = monthBounds(yearMonth);
  const startPoint = findValueOnOrBefore(history, startMs);
  const endPoint = findValueOnOrBefore(history, endMs);
  if (!startPoint || !endPoint) return null;
  if (startPoint.portfolioValueMYR <= 0) return null;
  const startMsActual = parseLocalDateMs(startPoint.date);
  const endMsActual = parseLocalDateMs(endPoint.date);
  if (startMsActual == null || endMsActual == null) return null;
  if (endMsActual <= startMsActual) return null;
  return (
    ((endPoint.portfolioValueMYR - startPoint.portfolioValueMYR) /
      startPoint.portfolioValueMYR) *
    100
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

export function computeSampleMarketMonthlyReturnPct(yearMonth: string): number | null {
  const { startMs, endMs } = monthBounds(yearMonth);
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

export function resolveMonthlyOutcome(
  portfolioReturnPct: number,
  marketAverageReturnPct: number,
): TrustMonthlyPerformanceOutcome {
  const diff = portfolioReturnPct - marketAverageReturnPct;
  if (diff >= 0.25) return 'beat';
  if (diff <= -0.25) return 'lag';
  return 'match';
}

export function buildMonthlyOutcomeLabelJa(outcome: TrustMonthlyPerformanceOutcome): string {
  if (outcome === 'beat') return '市場平均を上回りました';
  if (outcome === 'lag') return '市場平均を下回りました';
  return '市場平均とほぼ同じでした';
}

function dominantCategory(plan: AllocationPlan): string | null {
  const totals = new Map<string, number>();
  for (const c of plan.candidates) {
    if (c.allocationPct <= 0) continue;
    totals.set(c.category, (totals.get(c.category) ?? 0) + c.allocationPct);
  }
  let best: string | null = null;
  let bestPct = 0;
  for (const [cat, pct] of totals) {
    if (pct > bestPct) {
      best = cat;
      bestPct = pct;
    }
  }
  return best;
}

export function buildTrustMonthlyReportReasonJa(
  plan: AllocationPlan | null,
  outcome: TrustMonthlyPerformanceOutcome,
): string {
  if (!plan) {
    return outcome === 'beat'
      ? '提案した銘柄が市場よりよく動いたためです'
      : '来月から、ここにわかりやすい理由が表示されます';
  }

  const reasons = collectCharterApprovalReasonsFromPlan(plan);
  const combined = [
    ...reasons,
    ...plan.candidates.map((c) => `${c.name} ${c.categoryLabel} ${c.selectionReason}`),
  ].join(' ');

  if (/半導体|semi|テック|technology|chip/i.test(combined)) {
    return outcome === 'lag'
      ? '半導体銘柄の動きが市場平均に届きませんでした'
      : '半導体銘柄の比率が高かったためです';
  }
  if (/配当|dividend|高配当|インカム/i.test(combined) || dominantCategory(plan) === 'dividend') {
    return outcome === 'lag'
      ? '配当銘柄中心の配分が市場の伸びに届きませんでした'
      : '配当銘柄を多めに持っていたためです';
  }
  if (dominantCategory(plan) === 'growth' || /成長|growth|伸び/i.test(combined)) {
    return outcome === 'lag'
      ? '成長銘柄の伸びが市場平均に届きませんでした'
      : '成長が期待できる銘柄の比率が高かったためです';
  }
  if (dominantCategory(plan) === 'stable' || /安定|守り|堅実/i.test(combined)) {
    return outcome === 'lag'
      ? '守りの銘柄中心で、市場の伸びに届きませんでした'
      : '守りの銘柄を中心にしていたためです';
  }
  if (dominantCategory(plan) === 'etf') {
    return outcome === 'lag'
      ? '分散投資の型で、市場の伸びに届きませんでした'
      : '分散型の投資の型を使っていたためです';
  }

  if (outcome === 'beat') return '提案した銘柄の組み合わせが市場よりよく動いたためです';
  if (outcome === 'lag') return '提案した銘柄の組み合わせが市場平均に届きませんでした';
  return '提案した銘柄の組み合わせが市場と同程度でした';
}

export function buildTrustMonthlyPerformanceRecord(input: {
  yearMonth: string;
  performanceHistory: PerformancePoint[];
  plan?: AllocationPlan | null;
}): TrustMonthlyReportRecord | null {
  const portfolioReturnPct = computePortfolioMonthlyReturnPct(
    input.performanceHistory,
    input.yearMonth,
  );
  const marketAverageReturnPct = computeSampleMarketMonthlyReturnPct(input.yearMonth);
  if (portfolioReturnPct == null || marketAverageReturnPct == null) return null;

  const outcome = resolveMonthlyOutcome(portfolioReturnPct, marketAverageReturnPct);
  return {
    yearMonth: input.yearMonth,
    portfolioReturnPct: Math.round(portfolioReturnPct * 10) / 10,
    marketAverageReturnPct,
    outcome,
    reasonJa: buildTrustMonthlyReportReasonJa(input.plan ?? null, outcome),
    savedAt: new Date().toISOString(),
  };
}

export function toTrustMonthlyPerformanceDisplay(
  record: TrustMonthlyReportRecord | null,
  yearMonth: string,
): TrustMonthlyPerformanceDisplay {
  if (!record) {
    return {
      yearMonth,
      monthLabelJa: yearMonthToLabelJa(yearMonth),
      portfolioReturnLabel: '集計中',
      marketAverageLabel: '—',
      outcomeLabelJa: 'まだ結果がありません',
      reasonJa: '配分を始めると、毎月ここに結果が表示されます',
      ready: false,
    };
  }

  return {
    yearMonth: record.yearMonth,
    monthLabelJa: yearMonthToLabelJa(record.yearMonth),
    portfolioReturnLabel: formatTrustReturnPct(record.portfolioReturnPct),
    marketAverageLabel: formatTrustReturnPct(record.marketAverageReturnPct),
    outcomeLabelJa: buildMonthlyOutcomeLabelJa(record.outcome),
    reasonJa: record.reasonJa,
    ready: true,
  };
}
