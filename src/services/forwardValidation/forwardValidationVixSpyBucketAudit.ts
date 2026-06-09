/**
 * 条件適合96件 VIX / SPY63日 区分別監査 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVixSpyBucketAuditReport,
  ForwardVixSpyBucketRow,
  ForwardVixSpyBucketSection,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function std(vals: number[]): number {
  if (vals.length === 0) return 0;
  const m = mean(vals) ?? 0;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function tradeSharpe(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3(mu / sigma);
}

function computeSpyRet63(spyBars: OhlcvBar[], date: string): number | null {
  const idx = spyBars.findIndex((b) => b.date === date);
  const lookback = 63;
  if (idx < lookback) return null;
  const closes = spyBars.map((b) => b.close);
  return round3(((closes[idx]! / closes[idx - lookback]! - 1) * 100));
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

type EnrichedTrade = ForwardPassedTradeRecord & {
  vix: number | null;
  spyRet63Pct: number | null;
};

function enrichTrades(bundle: ForwardOhlcvBundle, trades: ForwardPassedTradeRecord[]): EnrichedTrade[] {
  const vixBars = bundle.vixBars ?? [];
  return trades.map((t) => ({
    ...t,
    vix: vixAtDate(vixBars, t.signalDate),
    spyRet63Pct: computeSpyRet63(bundle.spyBars, t.signalDate),
  }));
}

function buildBucketRow(labelJa: string, trades: EnrichedTrade[]): ForwardVixSpyBucketRow {
  const wins = trades.filter((t) => t.returnPct > 0);
  const returns = trades.map((t) => t.returnPct);
  return {
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
  };
}

function classifyVix(vix: number): string {
  if (vix < 20) return 'vix_under_20';
  if (vix < 25) return 'vix_20_25';
  return 'vix_25_plus';
}

function classifySpyRet(spy: number): string {
  if (spy >= 5) return 'spy_ge_5';
  if (spy >= 0) return 'spy_0_5';
  if (spy >= -5) return 'spy_m5_0';
  return 'spy_le_m5';
}

const VIX_BUCKETS: { id: string; labelJa: string }[] = [
  { id: 'vix_under_20', labelJa: 'VIX 20未満' },
  { id: 'vix_20_25', labelJa: 'VIX 20〜25' },
  { id: 'vix_25_plus', labelJa: 'VIX 25以上' },
];

const SPY_BUCKETS: { id: string; labelJa: string }[] = [
  { id: 'spy_ge_5', labelJa: 'SPY63日 +5%以上' },
  { id: 'spy_0_5', labelJa: 'SPY63日 0〜+5%' },
  { id: 'spy_m5_0', labelJa: 'SPY63日 -5〜0%' },
  { id: 'spy_le_m5', labelJa: 'SPY63日 -5%以下' },
];

function buildVixSection(trades: EnrichedTrade[]): ForwardVixSpyBucketSection {
  const withVix = trades.filter((t) => t.vix != null);
  const byId = new Map<string, EnrichedTrade[]>();
  for (const b of VIX_BUCKETS) byId.set(b.id, []);
  for (const t of withVix) {
    byId.get(classifyVix(t.vix!))!.push(t);
  }
  const rows = VIX_BUCKETS.map((b) => buildBucketRow(b.labelJa, byId.get(b.id) ?? []));
  return {
    factorLabelJa: 'VIX（シグナル日終値）',
    rows,
    classifiedCount: withVix.length,
    missingCount: trades.length - withVix.length,
  };
}

function buildSpySection(trades: EnrichedTrade[]): ForwardVixSpyBucketSection {
  const withSpy = trades.filter((t) => t.spyRet63Pct != null);
  const byId = new Map<string, EnrichedTrade[]>();
  for (const b of SPY_BUCKETS) byId.set(b.id, []);
  for (const t of withSpy) {
    byId.get(classifySpyRet(t.spyRet63Pct!))!.push(t);
  }
  const rows = SPY_BUCKETS.map((b) => buildBucketRow(b.labelJa, byId.get(b.id) ?? []));
  return {
    factorLabelJa: 'SPY63日リターン（シグナル日）',
    rows,
    classifiedCount: withSpy.length,
    missingCount: trades.length - withSpy.length,
  };
}

function formatRow(r: ForwardVixSpyBucketRow): string {
  return (
    `${r.labelJa}: ${r.tradeCount}件 · 勝率${r.winRatePct}% · 均R${r.avgReturnPct ?? '—'}% · Sharpe${r.sharpe ?? '—'}`
  );
}

function formatSection(s: ForwardVixSpyBucketSection): string[] {
  return [
    `■ ${s.factorLabelJa}（分類${s.classifiedCount}件${s.missingCount > 0 ? ` · 欠損${s.missingCount}` : ''}）`,
    ...s.rows.map(formatRow),
  ];
}

export function auditVixSpyBuckets(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVixSpyBucketAuditReport {
  const passed = auditPassedTrades(input);
  const trades = enrichTrades(input.bundle, passed.trades);
  const vixSection = buildVixSection(trades);
  const spySection = buildSpySection(trades);
  const vixAvailable = (input.bundle.vixBars ?? []).length > 0;

  const humanLines = [
    `【VIX / SPY63日 区分別監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 現行出口+3%/25日`,
    `VIXデータ: ${vixAvailable ? 'あり' : 'なし'}`,
    '（監査のみ・ルール変更なし）',
    '',
    ...formatSection(vixSection),
    '',
    ...formatSection(spySection),
    '',
    '※ Sharpe = 区分内トレードリターンの mean/std（2件未満は—）',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    vixDataAvailable: vixAvailable,
    vixSection,
    spySection,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVixSpyBucketCsv(report: ForwardVixSpyBucketAuditReport): string {
  const header = 'factor,label,tradeCount,winRatePct,avgReturnPct,sharpe';
  const lines = [header];
  for (const s of [report.vixSection, report.spySection]) {
    for (const r of s.rows) {
      lines.push(
        [s.factorLabelJa, r.labelJa, r.tradeCount, r.winRatePct, r.avgReturnPct ?? '', r.sharpe ?? ''].join(
          ',',
        ),
      );
    }
  }
  return lines.join('\n');
}
