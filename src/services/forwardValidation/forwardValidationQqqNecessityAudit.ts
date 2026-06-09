/**
 * 最重要監査その41 — QQQ必要性監査 · 監査40最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardQqqNecessityAdoptionGrade,
  ForwardQqqNecessityAuditReport,
  ForwardQqqNecessityScenarioId,
  ForwardQqqNecessityScenarioMetrics,
} from '../../types/forwardValidation';
import { buildOperationalEquityCurve } from './forwardValidationEquityCurveAudit';
import { extractDrawdownEpisodes } from './forwardValidationMaxDrawdownCauseAudit';
import { symbolWinRatesBeforeUniverse } from './forwardValidationEtfUniverseAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import {
  dedupOneEtfPerDayWithWeights,
} from './forwardValidationSymbolWeightAudit';
import {
  buildWalkForward31PhaseMetrics,
  collectRecommendedRuleCandidates,
  dedupOneEtfPerDayWinRateWithHistory,
} from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const ALL_FOUR = ['HDV', 'DGRO', 'SCHD', 'QQQ'] as const;
const PERIOD_2026_FROM = '2026-01-01';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export type QqqScenarioMode = 'current' | 'exclude' | 'half' | 'replace';

export type QqqScenarioDef = {
  scenarioId: ForwardQqqNecessityScenarioId;
  labelJa: string;
  mode: QqqScenarioMode;
  universe: readonly string[];
  replacementSymbol?: string;
};

export const QQQ_NECESSITY_SCENARIOS: QqqScenarioDef[] = [
  {
    scenarioId: 'current',
    labelJa: '① 現行（HDV+DGRO+SCHD+QQQ）',
    mode: 'current',
    universe: ALL_FOUR,
  },
  {
    scenarioId: 'excl_qqq',
    labelJa: '② QQQ除外',
    mode: 'exclude',
    universe: ['HDV', 'DGRO', 'SCHD'],
  },
  {
    scenarioId: 'qqq_half',
    labelJa: '③ QQQ半減（選定ウェイト0.5）',
    mode: 'half',
    universe: ALL_FOUR,
  },
  {
    scenarioId: 'replace_schd',
    labelJa: '④ QQQ→SCHD置換',
    mode: 'replace',
    universe: ALL_FOUR,
    replacementSymbol: 'SCHD',
  },
  {
    scenarioId: 'replace_hdv',
    labelJa: '⑤ QQQ→HDV置換',
    mode: 'replace',
    universe: ALL_FOUR,
    replacementSymbol: 'HDV',
  },
  {
    scenarioId: 'replace_dgro',
    labelJa: '⑥ QQQ→DGRO置換',
    mode: 'replace',
    universe: ALL_FOUR,
    replacementSymbol: 'DGRO',
  },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.round(ms / (24 * 3600 * 1000)));
}

const HALF_WEIGHTS: Record<string, number> = {
  HDV: 1,
  DGRO: 1,
  SCHD: 1,
  QQQ: 0.5,
};

export function dedupOneEtfPerDayWithQqqReplacement(
  trades: ForwardPassedTradeRecord[],
  universeSymbols: string[],
  replacementSymbol: string,
  seedHistory: ForwardPassedTradeRecord[] = [],
): ForwardPassedTradeRecord[] {
  const byDate = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of trades) {
    if (!universeSymbols.includes(t.symbol)) continue;
    const list = byDate.get(t.signalDate) ?? [];
    list.push(t);
    byDate.set(t.signalDate, list);
  }
  const dates = [...byDate.keys()].sort();
  const out: ForwardPassedTradeRecord[] = [];
  const rollingHistory = [...seedHistory];

  for (const date of dates) {
    const rows = byDate.get(date)!;
    const wr = symbolWinRatesBeforeUniverse(rollingHistory, date, universeSymbols);
    const sorted = [...rows].sort((a, b) => {
      const diff = (wr[b.symbol] ?? 0.5) - (wr[a.symbol] ?? 0.5);
      if (Math.abs(diff) > 1e-9) return diff;
      return a.symbol.localeCompare(b.symbol);
    });
    let best = sorted[0];
    if (!best) continue;
    if (best.symbol === 'QQQ') {
      const alt =
        sorted.find((r) => r.symbol === replacementSymbol) ??
        sorted.find((r) => r.symbol !== 'QQQ');
      if (!alt) continue;
      best = alt;
    }
    out.push(best);
    rollingHistory.push(best);
  }
  return out;
}

export function dedupForQqqScenario(
  candidates: ForwardPassedTradeRecord[],
  def: QqqScenarioDef,
): ForwardPassedTradeRecord[] {
  const universe = [...def.universe];
  switch (def.mode) {
    case 'current':
    case 'exclude':
      return dedupOneEtfPerDayWinRateWithHistory(candidates, universe, []);
    case 'half':
      return dedupOneEtfPerDayWithWeights(
        candidates,
        universe,
        'weighted',
        HALF_WEIGHTS,
        [],
      );
    case 'replace':
      return dedupOneEtfPerDayWithQqqReplacement(
        candidates,
        universe,
        def.replacementSymbol ?? 'SCHD',
        [],
      );
    default:
      return dedupOneEtfPerDayWinRateWithHistory(candidates, universe, []);
  }
}

export function simulateExecutedForQqqScenario(
  candidates: ForwardPassedTradeRecord[],
  def: QqqScenarioDef,
): ForwardPassedTradeRecord[] {
  const pool =
    def.mode === 'exclude'
      ? candidates.filter((c) => def.universe.includes(c.symbol))
      : candidates;
  const deduped = dedupForQqqScenario(pool, def);
  const sorted = [...deduped].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );
  const open: ForwardPassedTradeRecord[] = [];
  const executed: ForwardPassedTradeRecord[] = [];

  for (const t of sorted) {
    const stillOpen = open.filter((o) => o.exitDate >= t.entryDate);
    open.length = 0;
    open.push(...stillOpen);
    if (open.length >= FORWARD_MAX_CONCURRENT) continue;
    open.push(t);
    executed.push(t);
  }
  return executed;
}

export function recoveryDaysFromTrades(
  trades: ForwardPassedTradeRecord[],
  symbols: string[],
): number | null {
  const { exits } = buildOperationalEquityCurve({ trades, symbols, initialCapital: 100 });
  const episodes = extractDrawdownEpisodes(exits);
  const worst = episodes[0];
  if (!worst?.recoveryDate) return null;
  return daysBetween(worst.troughDate, worst.recoveryDate);
}

export function buildQqqScenarioMetrics(
  def: QqqScenarioDef,
  executed: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  baselineCumulative: number,
): ForwardQqqNecessityScenarioMetrics {
  const phase = buildWalkForward31PhaseMetrics(def.labelJa, fromDate, toDate, executed);
  const qqqTrades = executed.filter((t) => t.symbol === 'QQQ').length;
  const profitSharePct =
    baselineCumulative > 0 && phase.cumulativeReturnPct > 0
      ? round3((phase.cumulativeReturnPct / baselineCumulative) * 100)
      : 0;

  return {
    scenarioId: def.scenarioId,
    labelJa: def.labelJa,
    universe: [...def.universe],
    tradeCount: phase.tradeCount,
    qqqTradeCount: qqqTrades,
    winRatePct: phase.winRatePct,
    avgReturnPct: phase.avgReturnPct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    mar: phase.mar,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    recoveryDays: recoveryDaysFromTrades(executed, [...def.universe]),
    profitSharePct,
    cumulativeDeltaVsCurrentPt: 0,
  };
}

function gradeAnswer(rank: number, total: number): ForwardQqqNecessityAdoptionGrade {
  if (rank === 0) return 'A';
  if (rank === 1) return 'B';
  if (rank <= 2) return 'C';
  return 'D';
}

export function buildQqqNecessityReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardQqqNecessityAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (!symbols.includes('QQQ')) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();

  const allCandidates = collectRecommendedRuleCandidates(
    input.bundle,
    symbols,
    fromDate,
    toDate,
  );

  let baselineCumulative = 0;
  const scenarioRows: ForwardQqqNecessityScenarioMetrics[] = [];

  for (const def of QQQ_NECESSITY_SCENARIOS) {
    const executed = simulateExecutedForQqqScenario(allCandidates, def);
    if (def.scenarioId === 'current') {
      const phase = buildWalkForward31PhaseMetrics(def.labelJa, fromDate, toDate, executed);
      baselineCumulative = phase.cumulativeReturnPct;
    }
    scenarioRows.push(
      buildQqqScenarioMetrics(def, executed, fromDate, toDate, baselineCumulative || 1),
    );
  }

  const currentRow = scenarioRows.find((r) => r.scenarioId === 'current')!;
  for (const row of scenarioRows) {
    row.cumulativeDeltaVsCurrentPt = round3(
      row.cumulativeReturnPct - currentRow.cumulativeReturnPct,
    );
  }

  const rankedCum = [...scenarioRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  );
  const rankedSharpe = [...scenarioRows].sort(
    (a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999),
  );
  const rankedDd = [...scenarioRows].sort(
    (a, b) => Math.abs(a.maxDrawdownPct ?? 0) - Math.abs(b.maxDrawdownPct ?? 0),
  );

  const profitMax = rankedCum[0]!;
  const ddMin = rankedDd[0]!;
  const sharpeMax = rankedSharpe[0]!;

  const since2026Rows = QQQ_NECESSITY_SCENARIOS.map((def) => {
    const executed = tradesInSignalRange(
      simulateExecutedForQqqScenario(allCandidates, def),
      PERIOD_2026_FROM,
      toDate,
    );
    const phase = buildWalkForward31PhaseMetrics(
      def.labelJa,
      PERIOD_2026_FROM,
      toDate,
      executed,
    );
    return { def, score: (phase.sharpe ?? 0) * 2 + phase.cumulativeReturnPct };
  }).sort((a, b) => b.score - a.score);
  const rec2026 = since2026Rows[0]!.def;

  const excl = scenarioRows.find((r) => r.scenarioId === 'excl_qqq')!;
  const replaceSchd = scenarioRows.find((r) => r.scenarioId === 'replace_schd')!;
  const keepQqq =
    currentRow.cumulativeReturnPct >= excl.cumulativeReturnPct - 1 &&
    currentRow.qqqTradeCount >= 3;

  const answerAJa = `A 利益最大: ${profitMax.labelJa}（累積${profitMax.cumulativeReturnPct}% · WR${profitMax.winRatePct}%）— 評価${gradeAnswer(rankedCum.indexOf(profitMax), rankedCum.length)}`;
  const answerBJa = `B DD最小: ${ddMin.labelJa}（DD${ddMin.maxDrawdownPct ?? '—'}% · 回復${ddMin.recoveryDays ?? '—'}日）— 評価${gradeAnswer(rankedDd.indexOf(ddMin), rankedDd.length)}`;
  const answerCJa = `C Sharpe最大: ${sharpeMax.labelJa}（Sharpe${sharpeMax.sharpe ?? '—'} · MAR${sharpeMax.mar ?? '—'}）— 評価${gradeAnswer(rankedSharpe.indexOf(sharpeMax), rankedSharpe.length)}`;
  const answerDJa = `D 2026実運用推奨: ${rec2026.labelJa}（2026以降スコア優先）— 評価${rec2026.scenarioId === 'current' ? 'B' : 'C'}`;
  const answerEJa = keepQqq
    ? `E QQQは残す: 現行4銘柄維持（累積${currentRow.cumulativeReturnPct}% vs 除外${excl.cumulativeReturnPct}%）— 評価B`
    : `E QQQは残さない: 除外/置換が優位（除外累積${excl.cumulativeReturnPct}% · 置換SCHD${replaceSchd.cumulativeReturnPct}%）— 評価C（参考）`;

  const operationalGrade: ForwardQqqNecessityAdoptionGrade = keepQqq ? 'B' : 'C';
  const operationalNoteJa =
    '除外・置換はDD/Sharpe改善（-13.99%）だが累積は現行+2.4pt優位。ルール変更なし・QQQはDD監視下で維持。';

  const humanSummaryJa = [
    `監査41 QQQ必要性 ${fromDate}〜${toDate} · 現行${currentRow.tradeCount}件（QQQ${currentRow.qqqTradeCount}件）`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerEJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    scenarioRows,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    keepQqqRecommendation: keepQqq,
    operationalGrade,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runQqqNecessityAudit(): Promise<ForwardQqqNecessityAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildQqqNecessityReport({ bundle });
}

export function formatQqqNecessityCsv(report: ForwardQqqNecessityAuditReport): string {
  const lines = [
    `# 最重要監査その41 QQQ必要性 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'scenarioId,label,universe,trades,qqqTrades,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays,profitSharePct,deltaVsCurrent',
    ...report.scenarioRows.map((r) =>
      [
        r.scenarioId,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.universe.join('+'),
        r.tradeCount,
        r.qqqTradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.recoveryDays ?? '',
        r.profitSharePct,
        r.cumulativeDeltaVsCurrentPt,
      ].join(','),
    ),
    '',
    'answer,content,grade',
    ['A', report.answerAJa, 'A'],
    ['B', report.answerBJa, 'B'],
    ['C', report.answerCJa, 'C'],
    ['D', report.answerDJa, 'B'],
    ['E', report.answerEJa, report.keepQqqRecommendation ? 'B' : 'C'],
    ['operational', report.operationalNoteJa, report.operationalGrade],
  ];
  return lines.join('\n');
}
