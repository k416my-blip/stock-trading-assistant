/**
 * 最重要監査その39 — Regime（相場環境）監査 · 監査38最終ルール固定 · 監査のみ
 */
import type {
  ForwardPassedTradeRecord,
  ForwardRegimeEnvironmentAdoptionGrade,
  ForwardRegimeEnvironmentAuditReport,
  ForwardRegimeEnvironmentCategoryId,
  ForwardRegimeEnvironmentId,
  ForwardRegimeEnvironmentMetrics,
} from '../../types/forwardValidation';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const CASH_RESERVE_PCT = 15;
const MIN_TRADES_FOR_RANK = 3;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export type EnrichedTrade = ForwardPassedTradeRecord & { vixAtSignal: number | null };

type EnvDef = {
  environmentId: ForwardRegimeEnvironmentId;
  categoryId: ForwardRegimeEnvironmentCategoryId;
  labelJa: string;
  match: (t: EnrichedTrade) => boolean;
};

export const REGIME_ENVIRONMENT_DEFS: EnvDef[] = [
  {
    environmentId: 'trend_up',
    categoryId: 'spy_trend',
    labelJa: '① 上昇相場',
    match: (t) => classifyRegimeGroup(t.bucket) === 'up',
  },
  {
    environmentId: 'trend_sideways',
    categoryId: 'spy_trend',
    labelJa: '② 横ばい相場',
    match: (t) => {
      const g = classifyRegimeGroup(t.bucket);
      return g === 'sideways' || g === 'sideways_shallow';
    },
  },
  {
    environmentId: 'trend_down',
    categoryId: 'spy_trend',
    labelJa: '③ 下落相場',
    match: (t) => classifyRegimeGroup(t.bucket) === 'down',
  },
  {
    environmentId: 'vol_high',
    categoryId: 'volatility',
    labelJa: '④ 高ボラ（VIX≥30）',
    match: (t) => t.vixAtSignal != null && t.vixAtSignal >= 30,
  },
  {
    environmentId: 'vol_low',
    categoryId: 'volatility',
    labelJa: '⑤ 低ボラ（24≤VIX<30）',
    match: (t) => t.vixAtSignal != null && t.vixAtSignal >= 24 && t.vixAtSignal < 30,
  },
  {
    environmentId: 'vix_lt15',
    categoryId: 'vix_band',
    labelJa: '⑥ VIX 15未満',
    match: (t) => t.vixAtSignal != null && t.vixAtSignal < 15,
  },
  {
    environmentId: 'vix_15_20',
    categoryId: 'vix_band',
    labelJa: '⑦ VIX 15〜20',
    match: (t) => t.vixAtSignal != null && t.vixAtSignal >= 15 && t.vixAtSignal < 20,
  },
  {
    environmentId: 'vix_20_24',
    categoryId: 'vix_band',
    labelJa: '⑧ VIX 20〜24',
    match: (t) => t.vixAtSignal != null && t.vixAtSignal >= 20 && t.vixAtSignal < 24,
  },
  {
    environmentId: 'vix_24_30',
    categoryId: 'vix_band',
    labelJa: '⑨ VIX 24〜30',
    match: (t) => t.vixAtSignal != null && t.vixAtSignal >= 24 && t.vixAtSignal < 30,
  },
  {
    environmentId: 'vix_gte30',
    categoryId: 'vix_band',
    labelJa: '⑩ VIX 30以上',
    match: (t) => t.vixAtSignal != null && t.vixAtSignal >= 30,
  },
  {
    environmentId: 'rate_hike',
    categoryId: 'macro_rate',
    labelJa: '⑪ 金利上昇期',
    match: (t) => t.signalDate >= '2022-01-01' && t.signalDate <= '2023-09-30',
  },
  {
    environmentId: 'rate_cut',
    categoryId: 'macro_rate',
    labelJa: '⑫ 金利低下期',
    match: (t) =>
      (t.signalDate >= '2020-03-01' && t.signalDate <= '2021-12-31') ||
      (t.signalDate >= '2024-09-01' && t.signalDate <= '2026-12-31'),
  },
  {
    environmentId: 'expansion',
    categoryId: 'macro_cycle',
    labelJa: '⑬ 景気拡大期',
    match: (t) =>
      (t.signalDate >= '2019-01-01' && t.signalDate <= '2020-01-31') ||
      (t.signalDate >= '2023-01-01' && t.signalDate <= '2024-12-31'),
  },
  {
    environmentId: 'recession',
    categoryId: 'macro_cycle',
    labelJa: '⑭ 景気後退期',
    match: (t) =>
      (t.signalDate >= '2020-02-01' && t.signalDate <= '2020-06-30') ||
      (t.signalDate >= '2022-01-01' && t.signalDate <= '2022-12-31'),
  },
  {
    environmentId: 'covid_crash',
    categoryId: 'special_period',
    labelJa: '⑮ コロナ暴落',
    match: (t) => t.signalDate >= '2020-02-01' && t.signalDate <= '2020-06-30',
  },
  {
    environmentId: 'bear2022',
    categoryId: 'special_period',
    labelJa: '⑯ 2022利上げ相場',
    match: (t) => t.signalDate >= '2022-01-01' && t.signalDate <= '2022-12-31',
  },
  {
    environmentId: 'recovery2023',
    categoryId: 'special_period',
    labelJa: '⑰ 2023回復相場',
    match: (t) => t.signalDate >= '2023-01-01' && t.signalDate <= '2023-12-31',
  },
  {
    environmentId: 'since2025',
    categoryId: 'special_period',
    labelJa: '⑱ 2025以降',
    match: (t) => t.signalDate >= '2025-01-01',
  },
];

export function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return vixBars[idx]!.close;
}

export function enrichTradesWithVix(
  trades: ForwardPassedTradeRecord[],
  vixBars: OhlcvBar[],
): EnrichedTrade[] {
  return trades.map((t) => ({
    ...t,
    vixAtSignal: vixAtDate(vixBars, t.signalDate),
  }));
}

export function buildRegimeEnvironmentMetrics(
  def: EnvDef,
  trades: EnrichedTrade[],
  fromDate: string,
  toDate: string,
  totalPositiveCum: number,
): ForwardRegimeEnvironmentMetrics {
  const subset = trades.filter(def.match);
  const phase = buildWalkForward31PhaseMetrics(def.labelJa, fromDate, toDate, subset);
  const profitSharePct =
    totalPositiveCum > 0 && phase.cumulativeReturnPct > 0
      ? Math.round((phase.cumulativeReturnPct / totalPositiveCum) * 1000) / 10
      : 0;

  return {
    environmentId: def.environmentId,
    categoryId: def.categoryId,
    labelJa: def.labelJa,
    tradeCount: phase.tradeCount,
    winRatePct: phase.winRatePct,
    avgReturnPct: phase.avgReturnPct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    mar: phase.mar,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    profitSharePct,
  };
}

function scoreStrength(row: ForwardRegimeEnvironmentMetrics): number {
  if (row.tradeCount < MIN_TRADES_FOR_RANK) return -Infinity;
  return (
    row.cumulativeReturnPct * 2 +
    (row.sharpe ?? 0) * 5 +
    row.winRatePct * 0.2 +
    (row.mar ?? 0) * 10
  );
}

function shouldStopTrading(row: ForwardRegimeEnvironmentMetrics): boolean {
  if (row.tradeCount < MIN_TRADES_FOR_RANK) return false;
  return (
    row.cumulativeReturnPct < 0 ||
    row.winRatePct < 70 ||
    (row.maxDrawdownPct != null && row.maxDrawdownPct < -12)
  );
}

export function buildRegimeEnvironmentReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardRegimeEnvironmentAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const vixBars = input.bundle.vixBars ?? [];
  const vixDataAvailable = vixBars.length > 0;

  const executed = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const trades = enrichTradesWithVix(executed, vixBars);

  const fullPhase = buildWalkForward31PhaseMetrics('全件', fromDate, toDate, executed);
  const totalPositiveCum = Math.max(0, fullPhase.cumulativeReturnPct);

  const environmentRows = REGIME_ENVIRONMENT_DEFS.map((def) =>
    buildRegimeEnvironmentMetrics(def, trades, fromDate, toDate, totalPositiveCum),
  );

  const ranked = [...environmentRows]
    .filter((r) => r.tradeCount >= MIN_TRADES_FOR_RANK)
    .sort((a, b) => scoreStrength(b) - scoreStrength(a));

  const strongest = ranked[0] ?? environmentRows.find((r) => r.tradeCount > 0)!;
  const weakest = [...ranked].sort(
    (a, b) =>
      a.cumulativeReturnPct - b.cumulativeReturnPct ||
      a.winRatePct - b.winRatePct,
  )[0] ?? strongest;

  const stopCandidates = environmentRows.filter(shouldStopTrading);
  const profitLeader = [...environmentRows]
    .filter((r) => r.tradeCount > 0 && r.cumulativeReturnPct > 0)
    .sort((a, b) => b.profitSharePct - a.profitSharePct)[0];

  const vix24_30 = environmentRows.find((r) => r.environmentId === 'vix_24_30');
  const vixGte30 = environmentRows.find((r) => r.environmentId === 'vix_gte30');
  const since2025 = environmentRows.find((r) => r.environmentId === 'since2025');

  const answerAJa = `A 最も強い相場: ${strongest.labelJa}（累積${strongest.cumulativeReturnPct}% · WR${strongest.winRatePct}% · ${strongest.tradeCount}件）— 評価A`;
  const answerBJa = `B 最も弱い相場: ${weakest.labelJa}（累積${weakest.cumulativeReturnPct}% · WR${weakest.winRatePct}% · DD${weakest.maxDrawdownPct ?? '—'}%）— 評価${weakest.cumulativeReturnPct < 0 ? 'D' : 'C'}`;
  const answerCJa =
    stopCandidates.length > 0
      ? `C 取引停止検討: ${stopCandidates.map((r) => r.labelJa).join(' · ')} — 評価C（参考・ルール変更なし）`
      : 'C 取引停止: 48件ベースで明確な停止推奨環境なし（VIX<24は既に除外済）— 評価D';
  const answerDJa = profitLeader
    ? `D 利益の大半: ${profitLeader.labelJa}（累積${profitLeader.cumulativeReturnPct}% · 利益シェア${profitLeader.profitSharePct}%）— 評価A`
    : 'D 利益の大半: 特定環境に集中せず — 評価B';
  const answerEJa = [
    'E 2026以降の監視:',
    `VIX24-30=${vix24_30?.tradeCount ?? 0}件 / VIX30+=${vixGte30?.tradeCount ?? 0}件`,
    `2025以降=${since2025?.tradeCount ?? 0}件 WR${since2025?.winRatePct ?? '—'}%`,
    'SPYレジーム・VIX帯・同時3枠使用率を月次確認',
    '— 評価B',
  ].join(' ');

  const operationalGrade: ForwardRegimeEnvironmentAdoptionGrade =
    strongest.cumulativeReturnPct > 0 && stopCandidates.length <= 2 ? 'B' : 'C';

  const operationalNoteJa =
    'VIX≥24・52週高値ルール下では高ボラ帯に集中。弱い環境はロット縮小で対応（新ルール追加なし）。';

  const humanSummaryJa = [
    `監査39 Regime環境 ${fromDate}〜${toDate} · ${executed.length}件（累積${fullPhase.cumulativeReturnPct}%）`,
    FIXED_CONDITIONS_JA,
    `VIXデータ: ${vixDataAvailable ? 'あり' : 'なし'}`,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    executedTradeCount: executed.length,
    vixDataAvailable,
    environmentRows,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalGrade,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runRegimeEnvironmentAudit(): Promise<ForwardRegimeEnvironmentAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildRegimeEnvironmentReport({ bundle });
}

export function formatRegimeEnvironmentCsv(
  report: ForwardRegimeEnvironmentAuditReport,
): string {
  const lines = [
    `# 最重要監査その39 Regime環境 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# 全${report.executedTradeCount}件 VIX=${report.vixDataAvailable ? 'OK' : 'NG'}`,
    '',
    'environmentId,category,label,tradeCount,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,profitSharePct',
    ...report.environmentRows.map((r) =>
      [
        r.environmentId,
        r.categoryId,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.profitSharePct,
      ].join(','),
    ),
    '',
    'answer,content',
    ['A', report.answerAJa],
    ['B', report.answerBJa],
    ['C', report.answerCJa],
    ['D', report.answerDJa],
    ['E', report.answerEJa],
    ['operational', report.operationalNoteJa],
  ];
  return lines.join('\n');
}
