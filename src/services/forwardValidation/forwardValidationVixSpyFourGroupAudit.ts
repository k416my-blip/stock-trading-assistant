/**
 * 条件適合96件 VIX×SPY 4群監査 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVixSpyFourGroupAuditReport,
  ForwardVixSpyFourGroupId,
  ForwardVixSpyFourGroupSnapshot,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const GROUP_DEFS: { id: ForwardVixSpyFourGroupId; labelJa: string }[] = [
  { id: 'A', labelJa: 'A: VIX≥25 かつ SPY63≤-5%' },
  { id: 'B', labelJa: 'B: VIX20〜25 かつ SPY63≤-5%' },
  { id: 'C', labelJa: 'C: VIX<20 かつ SPY63≤-5%' },
  { id: 'D', labelJa: 'D: それ以外' },
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
  groupId: ForwardVixSpyFourGroupId;
};

function classifyGroup(vix: number | null, spyRet63Pct: number | null): ForwardVixSpyFourGroupId {
  if (vix == null || spyRet63Pct == null || spyRet63Pct > -5) return 'D';
  if (vix >= 25) return 'A';
  if (vix >= 20) return 'B';
  return 'C';
}

function enrichAndClassify(
  bundle: ForwardOhlcvBundle,
  trades: ForwardPassedTradeRecord[],
): EnrichedTrade[] {
  const vixBars = bundle.vixBars ?? [];
  return trades.map((t) => {
    const vix = vixAtDate(vixBars, t.signalDate);
    const spyRet63Pct = computeSpyRet63(bundle.spyBars, t.signalDate);
    return {
      ...t,
      vix,
      spyRet63Pct,
      groupId: classifyGroup(vix, spyRet63Pct),
    };
  });
}

function buildSnapshot(
  id: ForwardVixSpyFourGroupId,
  labelJa: string,
  trades: EnrichedTrade[],
): ForwardVixSpyFourGroupSnapshot {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  return {
    groupId: id,
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
    avgMacd: mean(trades.map((t) => t.macdHistPct)),
    avgDist52: mean(trades.map((t) => t.dist52wPct)),
    avgAdx: mean(trades.map((t) => t.adx14)),
  };
}

function formatSnap(s: ForwardVixSpyFourGroupSnapshot): string {
  return [
    `${s.labelJa}: ${s.tradeCount}件`,
    `勝率${s.winRatePct}%`,
    `均R${s.avgReturnPct ?? '—'}%`,
    `Sharpe${s.sharpe ?? '—'}`,
    `25日満了${s.maxHoldRatePct}%`,
    `MACD均${s.avgMacd ?? '—'}`,
    `52w均${s.avgDist52 ?? '—'}%`,
    `ADX均${s.avgAdx ?? '—'}`,
  ].join(' · ');
}

export function auditVixSpyFourGroups(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVixSpyFourGroupAuditReport {
  const passed = auditPassedTrades(input);
  const enriched = enrichAndClassify(input.bundle, passed.trades);

  const groups = GROUP_DEFS.map((g) =>
    buildSnapshot(
      g.id,
      g.labelJa,
      enriched.filter((t) => t.groupId === g.id),
    ),
  );

  const classifiedCount = groups.reduce((s, g) => s + g.tradeCount, 0);

  const humanLines = [
    `【VIX×SPY 4群監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 分類 ${classifiedCount}件 · 現行出口+3%/25日`,
    '（監査のみ・ルール変更なし）',
    '',
    '■ 4群（シグナル日 VIX終値 · SPY63営業日リターン）',
    ...groups.map(formatSnap),
    '',
    '■ 件数内訳',
    ...groups.map((g) => `${g.groupId}: ${g.tradeCount}件 (${g.tradeCount > 0 ? round3((g.tradeCount / passed.tradeCount) * 100) : 0}%)`),
    '',
    '※ MACD/52w/ADX = エントリー時点のシグナル指標平均',
    '※ Sharpe = 群内トレードリターンの mean/std（2件未満は—）',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    groups,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVixSpyFourGroupCsv(report: ForwardVixSpyFourGroupAuditReport): string {
  const header =
    'group,label,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct,avgMacd,avgDist52,avgAdx';
  const rows = report.groups.map((g) =>
    [
      g.groupId,
      g.labelJa,
      g.tradeCount,
      g.winRatePct,
      g.avgReturnPct ?? '',
      g.sharpe ?? '',
      g.maxHoldRatePct,
      g.avgMacd ?? '',
      g.avgDist52 ?? '',
      g.avgAdx ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
