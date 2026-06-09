/**
 * 最重要監査その42 — 連敗監査 · 監査41最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardLosingStreakAdoptionGrade,
  ForwardLosingStreakAfterMetrics,
  ForwardLosingStreakAuditReport,
  ForwardLosingStreakPolicyId,
  ForwardLosingStreakPolicyMetrics,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { buildOperationalEquityCurve } from './forwardValidationEquityCurveAudit';
import { extractDrawdownEpisodes } from './forwardValidationMaxDrawdownCauseAudit';
import { collectFullHistoryExecutedTrades, winRateSlotPct } from './forwardValidationMonteCarloAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import {
  buildWalkForward31PhaseMetrics,
  collectRecommendedRuleCandidates,
  dedupOneEtfPerDayWinRateWithHistory,
} from './forwardValidationWalkForward31Audit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;
const PERIOD_2026_FROM = '2026-01-01';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export type StreakPolicyDef = {
  policyId: ForwardLosingStreakPolicyId;
  labelJa: string;
  skipAfterStreak: number | null;
  lotHalfFromStreak: number | null;
};

export const LOSING_STREAK_POLICIES: StreakPolicyDef[] = [
  { policyId: 'current', labelJa: '① 現行', skipAfterStreak: null, lotHalfFromStreak: null },
  {
    policyId: 'lot_half_after_2',
    labelJa: '② 2連敗でロット半減',
    skipAfterStreak: null,
    lotHalfFromStreak: 2,
  },
  {
    policyId: 'skip_after_2',
    labelJa: '③ 2連敗で1回休み',
    skipAfterStreak: 2,
    lotHalfFromStreak: null,
  },
  {
    policyId: 'skip_after_3',
    labelJa: '④ 3連敗で1回休み',
    skipAfterStreak: 3,
    lotHalfFromStreak: null,
  },
  {
    policyId: 'lot_half_after_3',
    labelJa: '⑤ 3連敗でロット半減',
    skipAfterStreak: null,
    lotHalfFromStreak: 3,
  },
];

export type TaggedTrade = ForwardPassedTradeRecord & { priorLossStreak: number };

type ActiveLeg = TaggedTrade & { slotPct: number; notional: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.round(ms / (24 * 3600 * 1000)));
}

export function collectBaselineCandidates(
  bundle: SurvivorshipOhlcvBundle,
  fromDate: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    bundle.fetchedSymbols.includes(s),
  );
  const raw = collectRecommendedRuleCandidates(bundle, symbols, fromDate, toDate);
  return dedupOneEtfPerDayWinRateWithHistory(raw, symbols, []);
}

function lotMultiplier(policy: StreakPolicyDef, priorLossStreak: number): number {
  if (policy.lotHalfFromStreak == null) return 1;
  return priorLossStreak >= policy.lotHalfFromStreak ? 0.5 : 1;
}

export function simulateStreakPolicy(input: {
  candidates: ForwardPassedTradeRecord[];
  symbols: string[];
  policy: StreakPolicyDef;
  historyForSlot: ForwardPassedTradeRecord[];
}): { executed: TaggedTrade[]; skippedCount: number } {
  const maxDeployFrac = (100 - CASH_RESERVE_PCT) / 100;
  const sorted = [...input.candidates].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );

  const pendingByExit = new Map<string, ActiveLeg[]>();
  for (const t of sorted) {
    const list = pendingByExit.get(t.exitDate) ?? [];
    list.push({ ...t, priorLossStreak: 0, slotPct: 0, notional: 0 });
    pendingByExit.set(t.exitDate, list);
  }

  const eventDates = [
    ...new Set([...sorted.map((t) => t.entryDate), ...sorted.map((t) => t.exitDate)]),
  ].sort();

  let equity = INITIAL_CAPITAL;
  let consecutiveLosses = 0;
  let skipNextEntry = false;
  let skippedCount = 0;
  const open: ActiveLeg[] = [];
  const executed: TaggedTrade[] = [];
  const completed: ForwardPassedTradeRecord[] = [...input.historyForSlot];

  for (const date of eventDates) {
    const closing = pendingByExit.get(date) ?? [];
    for (const leg of closing) {
      const idx = open.findIndex(
        (o) => o.id === leg.id && o.entryDate === leg.entryDate && o.symbol === leg.symbol,
      );
      if (idx < 0) continue;
      const active = open[idx]!;
      open.splice(idx, 1);
      const pnl = round3((active.notional * active.returnPct) / 100);
      equity = round3(equity + pnl);
      completed.push(active);
      if (active.returnPct < 0) {
        consecutiveLosses++;
        if (
          input.policy.skipAfterStreak != null &&
          consecutiveLosses >= input.policy.skipAfterStreak
        ) {
          skipNextEntry = true;
        }
      } else {
        consecutiveLosses = 0;
      }
    }

    const dayEntries = sorted.filter((t) => t.entryDate === date);
    for (const t of dayEntries) {
      const stillOpen = open.filter((o) => o.exitDate >= date);
      if (stillOpen.length >= FORWARD_MAX_CONCURRENT) continue;

      if (skipNextEntry) {
        skipNextEntry = false;
        skippedCount++;
        continue;
      }

      const priorLossStreak = consecutiveLosses;
      const slotPct = winRateSlotPct(t, completed, input.symbols);
      const mult = lotMultiplier(input.policy, priorLossStreak);
      const openNotional = stillOpen.reduce((s, o) => s + o.notional, 0);
      const target = round3((equity * slotPct * mult) / 100);
      const available = Math.max(0, equity * maxDeployFrac - openNotional);
      const notional = round3(Math.min(target, available));
      if (notional <= 0) continue;

      const activeLeg: ActiveLeg = {
        ...t,
        priorLossStreak,
        slotPct: round3(slotPct * mult),
        notional,
      };
      open.push(activeLeg);
      executed.push(activeLeg);
    }
  }

  for (const leg of open) {
    const pnl = round3((leg.notional * leg.returnPct) / 100);
    equity = round3(equity + pnl);
  }

  return { executed, skippedCount };
}

/** 実行済みトレードのエントリー時点連敗数 */
export function tagExecutedWithPriorLossStreak(
  executed: ForwardPassedTradeRecord[],
): TaggedTrade[] {
  const key = (t: ForwardPassedTradeRecord) => `${t.id}|${t.entryDate}|${t.symbol}`;
  let streak = 0;
  const priorMap = new Map<string, number>();

  const eventDates = [
    ...new Set([...executed.map((t) => t.entryDate), ...executed.map((t) => t.exitDate)]),
  ].sort();

  for (const date of eventDates) {
    for (const t of executed.filter((x) => x.entryDate === date)) {
      priorMap.set(key(t), streak);
    }
    for (const t of executed
      .filter((x) => x.exitDate === date)
      .sort(
        (a, b) =>
          a.entryDate.localeCompare(b.entryDate) || a.symbol.localeCompare(b.symbol),
      )) {
      if (t.returnPct < 0) streak++;
      else streak = 0;
    }
  }

  return [...executed]
    .sort(
      (a, b) =>
        a.entryDate.localeCompare(b.entryDate) ||
        a.signalDate.localeCompare(b.signalDate) ||
        a.symbol.localeCompare(b.symbol),
    )
    .map((t) => ({
      ...t,
      priorLossStreak: priorMap.get(key(t)) ?? 0,
    }));
}

export function recoveryDaysFromExecuted(
  trades: ForwardPassedTradeRecord[],
  symbols: string[],
): number | null {
  const { exits } = buildOperationalEquityCurve({
    trades,
    symbols,
    initialCapital: INITIAL_CAPITAL,
  });
  const worst = extractDrawdownEpisodes(exits)[0];
  if (!worst?.recoveryDate) return null;
  return daysBetween(worst.troughDate, worst.recoveryDate);
}

function phaseToAfterMetrics(
  afterLossStreak: number,
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  symbols: string[],
): ForwardLosingStreakAfterMetrics {
  const phase = buildWalkForward31PhaseMetrics(labelJa, fromDate, toDate, trades);
  return {
    afterLossStreak,
    labelJa,
    tradeCount: phase.tradeCount,
    winRatePct: phase.winRatePct,
    avgReturnPct: phase.avgReturnPct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    mar: phase.mar,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    recoveryDays: recoveryDaysFromExecuted(trades, symbols),
  };
}

function policyToMetrics(
  def: StreakPolicyDef,
  executed: ForwardPassedTradeRecord[],
  skippedCount: number,
  fromDate: string,
  toDate: string,
  symbols: string[],
): ForwardLosingStreakPolicyMetrics {
  const phase = buildWalkForward31PhaseMetrics(def.labelJa, fromDate, toDate, executed);
  return {
    policyId: def.policyId,
    labelJa: def.labelJa,
    tradeCount: phase.tradeCount,
    skippedTradeCount: skippedCount,
    winRatePct: phase.winRatePct,
    avgReturnPct: phase.avgReturnPct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    mar: phase.mar,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    recoveryDays: recoveryDaysFromExecuted(executed, symbols),
    cumulativeDeltaVsCurrentPt: 0,
  };
}

function gradeRank(rank: number): ForwardLosingStreakAdoptionGrade {
  if (rank === 0) return 'A';
  if (rank === 1) return 'B';
  if (rank <= 2) return 'C';
  return 'D';
}

export function buildLosingStreakReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardLosingStreakAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();

  const candidates = collectBaselineCandidates(input.bundle, fromDate, toDate);
  const baselineExecuted = simulateStreakPolicy({
    candidates,
    symbols,
    policy: LOSING_STREAK_POLICIES[0]!,
    historyForSlot: [],
  }).executed;

  const tagged = tagExecutedWithPriorLossStreak(baselineExecuted);
  const afterStreakRows: ForwardLosingStreakAfterMetrics[] = [1, 2, 3].map((n) =>
    phaseToAfterMetrics(
      n,
      `${n}連敗後の取引`,
      tagged.filter((t) => t.priorLossStreak === n),
      fromDate,
      toDate,
      symbols,
    ),
  );

  const policyRows: ForwardLosingStreakPolicyMetrics[] = [];
  for (const def of LOSING_STREAK_POLICIES) {
    const { executed, skippedCount } = simulateStreakPolicy({
      candidates,
      symbols,
      policy: def,
      historyForSlot: [],
    });
    policyRows.push(
      policyToMetrics(def, executed, skippedCount, fromDate, toDate, symbols),
    );
  }

  const currentRow = policyRows.find((r) => r.policyId === 'current')!;
  for (const row of policyRows) {
    row.cumulativeDeltaVsCurrentPt = round3(
      row.cumulativeReturnPct - currentRow.cumulativeReturnPct,
    );
  }

  const byCum = [...policyRows].sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct);
  const bySharpe = [...policyRows].sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));
  const byDd = [...policyRows].sort(
    (a, b) => Math.abs(a.maxDrawdownPct ?? 0) - Math.abs(b.maxDrawdownPct ?? 0),
  );

  const profitMax = byCum[0]!;
  const ddMin = byDd[0]!;
  const sharpeMax = bySharpe[0]!;

  const since2026 = LOSING_STREAK_POLICIES.map((def) => {
    const { executed } = simulateStreakPolicy({
      candidates: candidates.filter((t) => t.signalDate >= PERIOD_2026_FROM),
      symbols,
      policy: def,
      historyForSlot: baselineExecuted.filter((t) => t.signalDate < PERIOD_2026_FROM),
    });
    const sliced = tradesInSignalRange(executed, PERIOD_2026_FROM, toDate);
    const phase = buildWalkForward31PhaseMetrics(
      def.labelJa,
      PERIOD_2026_FROM,
      toDate,
      sliced,
    );
    return { def, score: (phase.sharpe ?? 0) * 2 + phase.cumulativeReturnPct };
  }).sort((a, b) => b.score - a.score);
  const rec2026 = since2026[0]!.def;

  const operationalPolicyId: ForwardLosingStreakPolicyId = 'current';
  const answerAJa = `A 利益最大: ${profitMax.labelJa}（累積${profitMax.cumulativeReturnPct}% · ${profitMax.tradeCount}件）— 評価${gradeRank(byCum.indexOf(profitMax))}`;
  const answerBJa = `B DD最小: ${ddMin.labelJa}（DD${ddMin.maxDrawdownPct ?? '—'}% · 回復${ddMin.recoveryDays ?? '—'}日）— 評価${gradeRank(byDd.indexOf(ddMin))}`;
  const answerCJa = `C Sharpe最大: ${sharpeMax.labelJa}（Sharpe${sharpeMax.sharpe ?? '—'} · MAR${sharpeMax.mar ?? '—'}）— 評価${gradeRank(bySharpe.indexOf(sharpeMax))}`;
  const answerDJa = `D 実運用推奨: ① 現行（連敗対策は監視のみ · スキップ${currentRow.skippedTradeCount}件）— 評価B`;
  const answerEJa = `E 2026推奨: ${rec2026.labelJa}（2026以降スコア）— 評価${rec2026.policyId === 'current' ? 'B' : 'C'}`;

  const after2 = afterStreakRows.find((r) => r.afterLossStreak === 2);
  const operationalNoteJa = `2連敗後WR${after2?.winRatePct ?? '—'}% · 3連敗後は件数${afterStreakRows.find((r) => r.afterLossStreak === 3)?.tradeCount ?? 0}。ロット半減/休みは参考（ルール変更なし）。`;

  const humanSummaryJa = [
    `監査42 連敗 ${fromDate}〜${toDate} · 現行${currentRow.tradeCount}件`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerDJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    afterStreakRows,
    policyRows,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalPolicyId,
    operationalGrade: 'B',
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runLosingStreakAudit(): Promise<ForwardLosingStreakAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildLosingStreakReport({ bundle });
}

export function formatLosingStreakCsv(report: ForwardLosingStreakAuditReport): string {
  const lines = [
    `# 最重要監査その42 連敗 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'section,afterLossStreak,label,trades,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays',
    ...report.afterStreakRows.map((r) =>
      [
        'after_streak',
        r.afterLossStreak,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.recoveryDays ?? '',
      ].join(','),
    ),
    '',
    'policyId,label,trades,skipped,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays,deltaVsCurrent',
    ...report.policyRows.map((r) =>
      [
        r.policyId,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.tradeCount,
        r.skippedTradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.recoveryDays ?? '',
        r.cumulativeDeltaVsCurrentPt,
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
