/**
 * 条件適合96件 VIX×SPY63日 交差表監査 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVixSpyCrossAuditReport,
  ForwardVixSpyCrossCell,
  ForwardVixSpyCrossSpyBucketId,
  ForwardVixSpyCrossVixBucketId,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_DEFS: { id: ForwardVixSpyCrossVixBucketId; labelJa: string }[] = [
  { id: 'vix_under_20', labelJa: 'VIX<20' },
  { id: 'vix_20_25', labelJa: 'VIX20〜25' },
  { id: 'vix_25_plus', labelJa: 'VIX25+' },
];

const SPY_DEFS: { id: ForwardVixSpyCrossSpyBucketId; labelJa: string }[] = [
  { id: 'spy_ge_5', labelJa: '+5%以上' },
  { id: 'spy_0_5', labelJa: '0〜+5%' },
  { id: 'spy_m5_0', labelJa: '-5〜0%' },
  { id: 'spy_le_m5', labelJa: '-5%以下' },
];

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

function classifyVix(vix: number): ForwardVixSpyCrossVixBucketId {
  if (vix < 20) return 'vix_under_20';
  if (vix < 25) return 'vix_20_25';
  return 'vix_25_plus';
}

function classifySpy(spy: number): ForwardVixSpyCrossSpyBucketId {
  if (spy >= 5) return 'spy_ge_5';
  if (spy >= 0) return 'spy_0_5';
  if (spy >= -5) return 'spy_m5_0';
  return 'spy_le_m5';
}

function buildCell(
  vixId: ForwardVixSpyCrossVixBucketId,
  vixLabelJa: string,
  spyId: ForwardVixSpyCrossSpyBucketId,
  spyLabelJa: string,
  trades: EnrichedTrade[],
): ForwardVixSpyCrossCell {
  const wins = trades.filter((t) => t.returnPct > 0);
  const returns = trades.map((t) => t.returnPct);
  return {
    vixBucketId: vixId,
    vixLabelJa,
    spyBucketId: spyId,
    spyLabelJa,
    cellLabelJa: `${vixLabelJa} × ${spyLabelJa}`,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
  };
}

function formatCell(c: ForwardVixSpyCrossCell): string {
  if (c.tradeCount === 0) return `${c.cellLabelJa}: 0件`;
  return (
    `${c.cellLabelJa}: ${c.tradeCount}件 · 勝率${c.winRatePct}% · 均R${c.avgReturnPct ?? '—'}% · Sharpe${c.sharpe ?? '—'}`
  );
}

export function auditVixSpyCross(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVixSpyCrossAuditReport {
  const passed = auditPassedTrades(input);
  const enriched = enrichTrades(input.bundle, passed.trades);
  const classifiable = enriched.filter((t) => t.vix != null && t.spyRet63Pct != null);

  const cells: ForwardVixSpyCrossCell[] = [];
  for (const v of VIX_DEFS) {
    for (const s of SPY_DEFS) {
      const cellTrades = classifiable.filter(
        (t) => classifyVix(t.vix!) === v.id && classifySpy(t.spyRet63Pct!) === s.id,
      );
      cells.push(buildCell(v.id, v.labelJa, s.id, s.labelJa, cellTrades));
    }
  }

  const classifiedCount = cells.reduce((sum, c) => sum + c.tradeCount, 0);
  const unclassifiedCount = passed.tradeCount - classifiedCount;

  const humanLines = [
    `【VIX×SPY63日 交差表監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 交差分類 ${classifiedCount}件`,
    unclassifiedCount > 0 ? `VIX/SPY欠損 ${unclassifiedCount}件` : '',
    '（監査のみ・ルール変更なし）',
    '',
    '■ 交差セル（VIX行 × SPY列）',
    ...cells.map(formatCell),
    '',
    '■ マトリクス（件数）',
    `SPY → ${SPY_DEFS.map((s) => s.labelJa).join(' | ')}`,
    ...VIX_DEFS.map((v) => {
      const counts = SPY_DEFS.map((s) => {
        const c = cells.find((x) => x.vixBucketId === v.id && x.spyBucketId === s.id)!;
        return String(c.tradeCount).padStart(3);
      });
      return `${v.labelJa}: ${counts.join(' | ')}`;
    }),
    '',
    '※ Sharpe = セル内トレードリターンの mean/std（2件未満は—）',
  ].filter(Boolean);

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    classifiedCount,
    unclassifiedCount,
    vixBucketLabels: VIX_DEFS.map((v) => v.labelJa),
    spyBucketLabels: SPY_DEFS.map((s) => s.labelJa),
    cells,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVixSpyCrossCsv(report: ForwardVixSpyCrossAuditReport): string {
  const header =
    'vixBucket,spyBucket,cell,tradeCount,winRatePct,avgReturnPct,sharpe';
  const rows = report.cells.map((c) =>
    [
      c.vixLabelJa,
      c.spyLabelJa,
      c.cellLabelJa,
      c.tradeCount,
      c.winRatePct,
      c.avgReturnPct ?? '',
      c.sharpe ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
