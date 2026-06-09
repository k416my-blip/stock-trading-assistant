/**
 * 最重要監査その8 — 実運用資金配分検証 · 実運用47件基準 · 監査のみ
 */
import type {
  ForwardOperationalAllocationAuditReport,
  ForwardOperationalAllocationCompareRow,
  ForwardOperationalAllocationMetrics,
  ForwardOperationalAllocationSchemeId,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import {
  collectOperationalExecutedTrades,
} from './forwardValidationOperationalRebacktestAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

type WeightedTrade = ForwardPassedTradeRecord & {
  vix: number;
  weight: number;
  weightedReturnPct: number;
  weightedMaePct: number | null;
};

type SchemeDef = {
  id: ForwardOperationalAllocationSchemeId;
  labelJa: string;
  weightForVix: (vix: number) => number;
};

const SCHEMES: SchemeDef[] = [
  {
    id: 'A',
    labelJa: 'A. 均等配分（現行）',
    weightForVix: () => 1,
  },
  {
    id: 'B',
    labelJa: 'B. VIX24〜28=1x · VIX28〜35=1.5x · VIX35+=2x',
    weightForVix: (vix) => (vix >= 35 ? 2 : vix >= 28 ? 1.5 : 1),
  },
  {
    id: 'C',
    labelJa: 'C. VIX24〜28=1x · VIX28〜35=2x · VIX35+=3x',
    weightForVix: (vix) => (vix >= 35 ? 3 : vix >= 28 ? 2 : 1),
  },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

function computeTradeMae(bars: OhlcvBar[], t: ForwardPassedTradeRecord): number | null {
  const entryIdx = barIndexByDate(bars, t.entryDate);
  const exitIdx = barIndexByDate(bars, t.exitDate);
  if (entryIdx < 0 || exitIdx < entryIdx || t.entryPrice <= 0) return null;
  let mae = 0;
  for (let i = entryIdx; i <= exitIdx; i++) {
    const lowRet = (bars[i]!.low / t.entryPrice - 1) * 100;
    if (lowRet < mae) mae = lowRet;
  }
  return round3(mae);
}

export function weightForScheme(schemeId: ForwardOperationalAllocationSchemeId, vix: number): number {
  const def = SCHEMES.find((s) => s.id === schemeId);
  if (!def) return 1;
  return def.weightForVix(vix);
}

export function enrichTradesWithWeights(
  trades: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
  schemeId: ForwardOperationalAllocationSchemeId,
): WeightedTrade[] {
  const vixBars = bundle.vixBars ?? [];
  const def = SCHEMES.find((s) => s.id === schemeId)!;
  return trades.map((t) => {
    const vix = vixAtDate(vixBars, t.signalDate) ?? 24;
    const weight = def.weightForVix(vix);
    const mae = computeTradeMae(bundle.etfBars[t.symbol], t);
    return {
      ...t,
      vix,
      weight,
      weightedReturnPct: round3(t.returnPct * weight),
      weightedMaePct: mae != null ? round3(mae * weight) : null,
    };
  });
}

export function portfolioMaxDrawdownPct(weightedReturns: number[]): number | null {
  if (weightedReturns.length === 0) return null;
  const sorted = [...weightedReturns];
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const r of sorted) {
    equity = round3(equity + r);
    if (equity > peak) peak = equity;
    const dd = round3(equity - peak);
    if (dd < maxDd) maxDd = dd;
  }
  return maxDd;
}

export function buildAllocationMetrics(
  scheme: SchemeDef,
  weightedTrades: WeightedTrade[],
): ForwardOperationalAllocationMetrics {
  const wins = weightedTrades.filter((t) => t.returnPct > 0);
  const weightedReturns = weightedTrades.map((t) => t.weightedReturnPct);
  const maes = weightedTrades
    .map((t) => t.weightedMaePct)
    .filter((v): v is number => v != null);
  const portfolioDd = portfolioMaxDrawdownPct(
    [...weightedTrades]
      .sort(
        (a, b) =>
          a.exitDate.localeCompare(b.exitDate) ||
          a.entryDate.localeCompare(b.entryDate) ||
          a.symbol.localeCompare(b.symbol),
      )
      .map((t) => t.weightedReturnPct),
  );
  const avgMae = mean(maes);
  const maxDd = portfolioDd ?? avgMae;

  return {
    schemeId: scheme.id,
    labelJa: scheme.labelJa,
    tradeCount: weightedTrades.length,
    winRatePct:
      weightedTrades.length > 0 ? round3((wins.length / weightedTrades.length) * 100) : 0,
    avgReturnPct: mean(weightedReturns),
    maxDrawdownPct: maxDd,
    cumulativeReturnPct: round3(weightedReturns.reduce((s, r) => s + r, 0)),
  };
}

function buildComparison(
  schemes: ForwardOperationalAllocationMetrics[],
): ForwardOperationalAllocationCompareRow[] {
  const a = schemes.find((s) => s.schemeId === 'A')!;
  const b = schemes.find((s) => s.schemeId === 'B')!;
  const c = schemes.find((s) => s.schemeId === 'C')!;
  const fmt = (v: number | null, suffix = '') => (v != null ? `${v}${suffix}` : '—');
  return [
    {
      metricJa: '件数',
      schemeA: String(a.tradeCount),
      schemeB: String(b.tradeCount),
      schemeC: String(c.tradeCount),
    },
    {
      metricJa: '勝率',
      schemeA: fmt(a.winRatePct, '%'),
      schemeB: fmt(b.winRatePct, '%'),
      schemeC: fmt(c.winRatePct, '%'),
    },
    {
      metricJa: '平均利益率',
      schemeA: fmt(a.avgReturnPct, '%'),
      schemeB: fmt(b.avgReturnPct, '%'),
      schemeC: fmt(c.avgReturnPct, '%'),
    },
    {
      metricJa: '最大DD',
      schemeA: fmt(a.maxDrawdownPct, '%'),
      schemeB: fmt(b.maxDrawdownPct, '%'),
      schemeC: fmt(c.maxDrawdownPct, '%'),
    },
    {
      metricJa: '累積利益率',
      schemeA: fmt(a.cumulativeReturnPct, '%'),
      schemeB: fmt(b.cumulativeReturnPct, '%'),
      schemeC: fmt(c.cumulativeReturnPct, '%'),
    },
  ];
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatSchemeLine(m: ForwardOperationalAllocationMetrics): string {
  return (
    `${m.labelJa}: ${m.tradeCount}件 · 勝率${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}% · ` +
    `DD${m.maxDrawdownPct ?? '—'}% · 累積${m.cumulativeReturnPct}%`
  );
}

export function auditOperationalAllocation(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardOperationalAllocationAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const executed = collectOperationalExecutedTrades({ bundle: input.bundle, fromDate });
  const wins = executed.filter((t) => t.returnPct > 0);
  const baselineWinRatePct =
    executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0;

  const schemes = SCHEMES.map((scheme) => {
    const weighted = enrichTradesWithWeights(executed, input.bundle, scheme.id);
    return buildAllocationMetrics(scheme, weighted);
  });

  const comparison = buildComparison(schemes);

  const humanLines = [
    `【最重要監査その8】実運用資金配分検証 ${fromDate} ～ ${toDate}`,
    `基準: 実運用版 ${executed.length}件 · 勝率${baselineWinRatePct}%（監査その7）`,
    '監査のみ · ルール変更なし · 最適化なし',
    '',
    '■ 配分スキーム別成績',
    ...schemes.map(formatSchemeLine),
    '',
    '■ 比較表',
    pad('指標', 12) +
      pad('A均等', 14) +
      pad('B 1/1.5/2', 14) +
      pad('C 1/2/3', 14),
    ...comparison.map(
      (r) =>
        pad(r.metricJa, 12) + pad(r.schemeA, 14) + pad(r.schemeB, 14) + pad(r.schemeC, 14),
    ),
    '',
    '※勝率は同一47件のためスキーム間同一。利益率・DD・累積は配倍率加重。',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    baselineTradeCount: executed.length,
    baselineWinRatePct,
    schemes,
    comparison,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runOperationalAllocationAudit(): Promise<ForwardOperationalAllocationAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditOperationalAllocation({ bundle });
}

export function formatOperationalAllocationCsv(
  report: ForwardOperationalAllocationAuditReport,
): string {
  const lines = [
    'schemeId,label,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct',
    ...report.schemes.map((s) =>
      [
        s.schemeId,
        `"${s.labelJa}"`,
        s.tradeCount,
        s.winRatePct,
        s.avgReturnPct ?? '',
        s.maxDrawdownPct ?? '',
        s.cumulativeReturnPct,
      ].join(','),
    ),
    '',
    'metric,schemeA,schemeB,schemeC',
    ...report.comparison.map((r) =>
      [r.metricJa, r.schemeA, r.schemeB, r.schemeC].join(','),
    ),
  ];
  return lines.join('\n');
}
