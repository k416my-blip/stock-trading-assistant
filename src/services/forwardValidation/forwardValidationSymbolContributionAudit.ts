/**
 * 最重要監査その37 — 銘柄寄与度監査 · 監査36最終ルール固定 · 監査のみ
 */
import type {
  ForwardPassedTradeRecord,
  ForwardSymbolContributionAdoptionGrade,
  ForwardSymbolContributionAuditReport,
  ForwardSymbolContributionCompositionRow,
  ForwardSymbolContributionCorrelationRow,
  ForwardSymbolContributionDiversificationRow,
  ForwardSymbolContributionExclusionRow,
  ForwardSymbolContributionSymbolMetrics,
} from '../../types/forwardValidation';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import { pearsonCorrelation } from './forwardValidationReturnCorrelationAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { simulateOperationalWinRate } from './forwardValidationEtfUniverseAudit';
import {
  buildWalkForward31PhaseMetrics,
  collectRecommendedRuleCandidates,
} from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const SYMBOL_CONTRIBUTION_UNIVERSE = ['HDV', 'DGRO', 'SCHD', 'QQQ'] as const;

const CASH_RESERVE_PCT = 15;
const PERIOD_2022_FROM = '2022-01-01';
const PERIOD_2022_TO = '2022-12-31';
const PERIOD_2025_FROM = '2025-01-01';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000 · 利益50%再投資(運用推奨)';

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

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

function exitOrderedReturns(trades: ForwardPassedTradeRecord[]): number[] {
  return [...trades]
    .sort(
      (a, b) =>
        a.exitDate.localeCompare(b.exitDate) ||
        a.entryDate.localeCompare(b.entryDate) ||
        a.symbol.localeCompare(b.symbol),
    )
    .map((t) => t.returnPct);
}

function tradeSharpe(returns: number[], years: number): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3((mu / sigma) * Math.sqrt(Math.max(returns.length / years, 1)));
}

export function combinations<T>(arr: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const out: T[][] = [];
  const walk = (start: number, acc: T[]) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i <= arr.length - (k - acc.length); i++) {
      acc.push(arr[i]!);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return out;
}

export function buildSymbolMetricsFromTrades(
  trades: ForwardPassedTradeRecord[],
  symbols: readonly string[],
  fromDate: string,
  toDate: string,
): ForwardSymbolContributionSymbolMetrics[] {
  const deployableScale = (100 - CASH_RESERVE_PCT) / 100;
  const years = calendarYears(fromDate, toDate);
  const rawRows = symbols.map((symbol) => {
    const symTrades = trades.filter((t) => t.symbol === symbol);
    const returns = symTrades.map((t) => t.returnPct);
    const wins = symTrades.filter((t) => t.returnPct > 0);
    const grossWin = returns.filter((r) => r > 0).reduce((s, r) => s + r, 0);
    const grossLoss = Math.abs(returns.filter((r) => r < 0).reduce((s, r) => s + r, 0));
    const scaled = exitOrderedReturns(symTrades).map((r) => r * deployableScale);
    const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0) * deployableScale);
    return {
      symbol,
      tradeCount: symTrades.length,
      winRatePct: symTrades.length > 0 ? round3((wins.length / symTrades.length) * 100) : 0,
      avgReturnPct: mean(returns),
      profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
      sharpe: tradeSharpe(returns, years),
      maxDrawdownPct: portfolioMaxDrawdownPct(scaled),
      cumulativeReturnPct,
      contributionPct: 0,
    };
  });
  const profitPool = rawRows.reduce((s, r) => s + Math.max(0, r.cumulativeReturnPct), 0);
  return rawRows.map((r) => ({
    ...r,
    contributionPct:
      profitPool > 0
        ? round3((Math.max(0, r.cumulativeReturnPct) / profitPool) * 100)
        : 0,
  }));
}

function monthlyAvgReturns(
  trades: ForwardPassedTradeRecord[],
): Map<string, Map<string, number>> {
  const bySymbolMonth = new Map<string, Map<string, number[]>>();
  for (const t of trades) {
    const month = t.signalDate.slice(0, 7);
    const symMap = bySymbolMonth.get(t.symbol) ?? new Map();
    const list = symMap.get(month) ?? [];
    list.push(t.returnPct);
    symMap.set(month, list);
    bySymbolMonth.set(t.symbol, symMap);
  }
  const out = new Map<string, Map<string, number>>();
  for (const [sym, months] of bySymbolMonth) {
    const avgMap = new Map<string, number>();
    for (const [m, vals] of months) {
      avgMap.set(m, mean(vals) ?? 0);
    }
    out.set(sym, avgMap);
  }
  return out;
}

export function buildPairwiseSymbolCorrelations(
  trades: ForwardPassedTradeRecord[],
  symbols: readonly string[],
): ForwardSymbolContributionCorrelationRow[] {
  const monthly = monthlyAvgReturns(trades);
  const rows: ForwardSymbolContributionCorrelationRow[] = [];
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const a = symbols[i]!;
      const b = symbols[j]!;
      const mapA = monthly.get(a);
      const mapB = monthly.get(b);
      if (!mapA || !mapB) continue;
      const overlap = [...mapA.keys()].filter((m) => mapB.has(m)).sort();
      const xs: number[] = [];
      const ys: number[] = [];
      for (const m of overlap) {
        xs.push(mapA.get(m)!);
        ys.push(mapB.get(m)!);
      }
      rows.push({
        symbolA: a,
        symbolB: b,
        overlapMonths: overlap.length,
        correlation: pearsonCorrelation(xs, ys),
      });
    }
  }
  return rows;
}

function runPortfolioForUniverse(
  bundle: SurvivorshipOhlcvBundle,
  symbols: string[],
  fromDate: string,
  toDate: string,
) {
  const candidates = collectRecommendedRuleCandidates(bundle, symbols, fromDate, toDate);
  const executed = simulateOperationalWinRate(candidates, symbols).executed;
  return {
    executed,
    metrics: buildWalkForward31PhaseMetrics(
      symbols.join('+'),
      fromDate,
      toDate,
      executed,
    ),
  };
}

function pickDeleteCandidate(
  exclusionRows: ForwardSymbolContributionExclusionRow[],
): string | null {
  let best: { symbol: string; cumDelta: number } | null = null;
  for (const sym of SYMBOL_CONTRIBUTION_UNIVERSE) {
    const row = exclusionRows.find((r) => r.excludedSymbol === sym);
    const delta = row?.cumulativeDeltaVsFullPt;
    if (delta == null || delta <= 0) continue;
    if (!best || delta > best.cumDelta) best = { symbol: sym, cumDelta: delta };
  }
  return best?.symbol ?? null;
}

function pickMustKeep(
  symbolRows: ForwardSymbolContributionSymbolMetrics[],
  exclusionRows: ForwardSymbolContributionExclusionRow[],
): string[] {
  const full = exclusionRows.find((r) => r.excludedSymbol === null);
  const ranked = [...symbolRows].sort(
    (a, b) => b.contributionPct - a.contributionPct || b.cumulativeReturnPct - a.cumulativeReturnPct,
  );
  const keep: string[] = [];
  for (const row of ranked) {
    const ex = exclusionRows.find((r) => r.excludedSymbol === row.symbol);
    if (!ex || !full) {
      keep.push(row.symbol);
      continue;
    }
    const hurts =
      ex.cumulativeReturnPct < full.cumulativeReturnPct - 0.5 ||
      (ex.maxDrawdownPct != null &&
        full.maxDrawdownPct != null &&
        ex.maxDrawdownPct < full.maxDrawdownPct - 0.3);
    if (hurts || row.contributionPct >= 15) keep.push(row.symbol);
    if (keep.length >= 2) break;
  }
  return keep.length > 0 ? keep : [ranked[0]!.symbol];
}

function gradeForComposition(
  symbols: string[],
  fullSymbols: readonly string[],
): ForwardSymbolContributionAdoptionGrade {
  if (symbols.length === fullSymbols.length) return 'B';
  if (symbols.length >= 3) return 'B';
  return 'C';
}

export function buildSymbolContributionReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardSymbolContributionAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();

  const { executed: fullExecuted, metrics: fullMetrics } = runPortfolioForUniverse(
    input.bundle,
    symbols,
    fromDate,
    toDate,
  );

  const symbolRows = buildSymbolMetricsFromTrades(
    fullExecuted,
    SYMBOL_CONTRIBUTION_UNIVERSE,
    fromDate,
    toDate,
  );

  const period2022Rows = buildSymbolMetricsFromTrades(
    tradesInSignalRange(fullExecuted, PERIOD_2022_FROM, PERIOD_2022_TO),
    SYMBOL_CONTRIBUTION_UNIVERSE,
    PERIOD_2022_FROM,
    PERIOD_2022_TO,
  );

  const periodSince2025Rows = buildSymbolMetricsFromTrades(
    tradesInSignalRange(fullExecuted, PERIOD_2025_FROM, toDate),
    SYMBOL_CONTRIBUTION_UNIVERSE,
    PERIOD_2025_FROM,
    toDate,
  );

  const exclusionRows: ForwardSymbolContributionExclusionRow[] = [
    {
      excludedSymbol: null,
      labelJa: '① 現行4銘柄（基準）',
      symbols,
      tradeCount: fullMetrics.tradeCount,
      winRatePct: fullMetrics.winRatePct,
      profitFactor: fullMetrics.profitFactor,
      sharpe: fullMetrics.sharpe,
      maxDrawdownPct: fullMetrics.maxDrawdownPct,
      cumulativeReturnPct: fullMetrics.cumulativeReturnPct,
      cumulativeDeltaVsFullPt: null,
    },
    ...SYMBOL_CONTRIBUTION_UNIVERSE.map((excluded) => {
      const subset = symbols.filter((s) => s !== excluded);
      const { metrics } = runPortfolioForUniverse(input.bundle, subset, fromDate, toDate);
      return {
        excludedSymbol: excluded,
        labelJa: `② ${excluded}除外`,
        symbols: subset,
        tradeCount: metrics.tradeCount,
        winRatePct: metrics.winRatePct,
        profitFactor: metrics.profitFactor,
        sharpe: metrics.sharpe,
        maxDrawdownPct: metrics.maxDrawdownPct,
        cumulativeReturnPct: metrics.cumulativeReturnPct,
        cumulativeDeltaVsFullPt: round3(
          metrics.cumulativeReturnPct - fullMetrics.cumulativeReturnPct,
        ),
      };
    }),
  ];

  const compositionRows: ForwardSymbolContributionCompositionRow[] = [];
  for (const k of [2, 3, 4] as const) {
    for (const combo of combinations(SYMBOL_CONTRIBUTION_UNIVERSE, k)) {
      const avail = combo.filter((s) => symbols.includes(s));
      if (avail.length !== combo.length) continue;
      const { metrics } = runPortfolioForUniverse(input.bundle, avail, fromDate, toDate);
      compositionRows.push({
        compositionId: `${k}_${combo.join('_')}`,
        symbols: avail,
        symbolCount: k,
        tradeCount: metrics.tradeCount,
        winRatePct: metrics.winRatePct,
        profitFactor: metrics.profitFactor,
        sharpe: metrics.sharpe,
        maxDrawdownPct: metrics.maxDrawdownPct,
        cumulativeReturnPct: metrics.cumulativeReturnPct,
      });
    }
  }
  compositionRows.sort(
    (a, b) =>
      b.cumulativeReturnPct - a.cumulativeReturnPct ||
      (b.sharpe ?? -999) - (a.sharpe ?? -999),
  );

  const since2025Compositions: ForwardSymbolContributionCompositionRow[] = [];
  for (const k of [2, 3, 4] as const) {
    for (const combo of combinations(SYMBOL_CONTRIBUTION_UNIVERSE, k)) {
      const avail = combo.filter((s) => symbols.includes(s));
      if (avail.length !== combo.length) continue;
      const { executed, metrics } = runPortfolioForUniverse(
        input.bundle,
        avail,
        PERIOD_2025_FROM,
        toDate,
      );
      const sliced = tradesInSignalRange(executed, PERIOD_2025_FROM, toDate);
      const m = buildWalkForward31PhaseMetrics(
        combo.join('+'),
        PERIOD_2025_FROM,
        toDate,
        sliced.length > 0 ? sliced : executed,
      );
      since2025Compositions.push({
        compositionId: `2025_${k}_${combo.join('_')}`,
        symbols: avail,
        symbolCount: k,
        tradeCount: m.tradeCount,
        winRatePct: m.winRatePct,
        profitFactor: m.profitFactor,
        sharpe: m.sharpe,
        maxDrawdownPct: m.maxDrawdownPct,
        cumulativeReturnPct: metrics.cumulativeReturnPct,
      });
    }
  }
  since2025Compositions.sort(
    (a, b) =>
      (b.sharpe ?? -999) - (a.sharpe ?? -999) ||
      b.cumulativeReturnPct - a.cumulativeReturnPct,
  );

  const correlationRows = buildPairwiseSymbolCorrelations(
    fullExecuted,
    SYMBOL_CONTRIBUTION_UNIVERSE,
  );

  const singlePortfolios = SYMBOL_CONTRIBUTION_UNIVERSE.map((sym) => {
    if (!symbols.includes(sym)) return null;
    const { metrics } = runPortfolioForUniverse(input.bundle, [sym], fromDate, toDate);
    return metrics;
  }).filter((x): x is NonNullable<typeof x> => x != null);

  const maxSingleCum = Math.max(...singlePortfolios.map((m) => m.cumulativeReturnPct), 0);
  const avgSingleCum = mean(singlePortfolios.map((m) => m.cumulativeReturnPct)) ?? 0;
  const sumSingleCum = round3(
    singlePortfolios.reduce((s, m) => s + m.cumulativeReturnPct, 0),
  );

  const diversificationRows: ForwardSymbolContributionDiversificationRow[] = [
    {
      labelJa: '① 現行4銘柄ポートフォリオ',
      cumulativeReturnPct: fullMetrics.cumulativeReturnPct,
      maxDrawdownPct: fullMetrics.maxDrawdownPct,
      sharpe: fullMetrics.sharpe,
    },
    {
      labelJa: '② 単独運用の平均累積',
      cumulativeReturnPct: round3(avgSingleCum),
      maxDrawdownPct: mean(
        singlePortfolios
          .map((m) => m.maxDrawdownPct)
          .filter((v): v is number => v != null),
      ),
      sharpe: mean(singlePortfolios.map((m) => m.sharpe).filter((v): v is number => v != null)),
    },
    {
      labelJa: '③ 単独運用の合算（参考・枠無視）',
      cumulativeReturnPct: sumSingleCum,
      maxDrawdownPct: null,
      sharpe: null,
    },
    {
      labelJa: '④ 分散効果（④−② 最大単独）',
      cumulativeReturnPct: round3(
        fullMetrics.cumulativeReturnPct - Math.max(avgSingleCum, maxSingleCum),
      ),
      maxDrawdownPct:
        fullMetrics.maxDrawdownPct != null
          ? round3(
              fullMetrics.maxDrawdownPct -
                Math.min(
                  ...singlePortfolios
                    .map((m) => m.maxDrawdownPct)
                    .filter((v): v is number => v != null),
                ),
            )
          : null,
      sharpe:
        fullMetrics.sharpe != null
          ? round3(
              fullMetrics.sharpe -
                Math.max(
                  ...singlePortfolios
                    .map((m) => m.sharpe)
                    .filter((v): v is number => v != null),
                  -999,
                ),
            )
          : null,
    },
  ];

  const topProfit = [...symbolRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;
  const bottomProfit = [...symbolRows].sort(
    (a, b) => a.cumulativeReturnPct - b.cumulativeReturnPct,
  )[0]!;
  const mostStable = [...symbolRows]
    .filter((r) => r.tradeCount >= 2)
    .sort(
      (a, b) =>
        (b.sharpe ?? -999) - (a.sharpe ?? -999) ||
        (a.maxDrawdownPct ?? 0) - (b.maxDrawdownPct ?? 0),
    )[0] ?? topProfit;

  const deleteCandidate = pickDeleteCandidate(exclusionRows);
  const mustKeep = pickMustKeep(symbolRows, exclusionRows);
  const recommended =
    since2025Compositions[0]?.symbols ??
    compositionRows[0]?.symbols ??
    symbols;
  const recGrade = gradeForComposition(recommended, symbols);

  const ddDragSymbols = SYMBOL_CONTRIBUTION_UNIVERSE.map((sym) => {
    const ex = exclusionRows.find((r) => r.excludedSymbol === sym);
    const ddDelta =
      fullMetrics.maxDrawdownPct != null && ex?.maxDrawdownPct != null
        ? ex.maxDrawdownPct - fullMetrics.maxDrawdownPct
        : 0;
    return { sym, ddDelta };
  })
    .filter((x) => x.ddDelta > 0.1)
    .sort((a, b) => b.ddDelta - a.ddDelta);

  const answerAJa = `A 最も利益: ${topProfit.symbol}（累積${topProfit.cumulativeReturnPct}% · 寄与${topProfit.contributionPct}% · ${topProfit.tradeCount}件）— 評価A`;
  const answerBJa = `B 最も安定: ${mostStable.symbol}（Sharpe${mostStable.sharpe ?? '—'} · DD${mostStable.maxDrawdownPct ?? '—'}% · WR${mostStable.winRatePct}%）— 評価B`;
  const answerCJa = deleteCandidate
    ? `C 削除候補: ${deleteCandidate}（除外で累積/DD改善）— 評価C（参考・ルール変更なし）`
    : 'C 削除候補: 明確な単独除外優位なし — 評価D（不採用）';
  const answerDJa = `D 必須残置: ${mustKeep.join('・')} — 評価A`;
  const answerEJa = `E 2026以降推奨構成: ${recommended.join('+')}（2025以降Sharpe/累積優先）— 評価${recGrade}`;

  const operationalGrade: ForwardSymbolContributionAdoptionGrade =
    fullMetrics.cumulativeReturnPct >= maxSingleCum && mustKeep.length >= 2 ? 'B' : 'C';

  const operationalNoteJa =
    operationalGrade === 'B'
      ? '4銘柄分散は単独最大を上回る。2025以降は推奨構成で3〜4銘柄を維持（ルール変更なし）。'
      : '寄与は銘柄間で偏るが現行4銘柄維持が安全。除外は参考のみ。';

  const humanSummaryJa = [
    `監査37 銘柄寄与度 ${fromDate}〜${toDate} · ${fullExecuted.length}件`,
    FIXED_CONDITIONS_JA,
    `利益上位: ${topProfit.symbol} ${topProfit.cumulativeReturnPct}% / 下位: ${bottomProfit.symbol} ${bottomProfit.cumulativeReturnPct}%`,
    `DD悪化要因（除外でDD改善）: ${ddDragSymbols.map((d) => d.sym).join('・') || '—'}`,
    `分散効果Δ累積: ${diversificationRows[3]!.cumulativeReturnPct}pt`,
    answerAJa,
    answerEJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    etfUniverse: symbols,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    executedTradeCount: fullExecuted.length,
    symbolRows,
    period2022Rows,
    periodSince2025Rows,
    exclusionRows,
    compositionRows,
    correlationRows,
    diversificationRows,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    recommendedComposition: recommended,
    operationalGrade,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runSymbolContributionAudit(): Promise<ForwardSymbolContributionAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildSymbolContributionReport({ bundle });
}

export function formatSymbolContributionCsv(
  report: ForwardSymbolContributionAuditReport,
): string {
  const lines = [
    `# 最重要監査その37 銘柄寄与度 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'section,symbol,tradeCount,winRatePct,avgReturnPct,profitFactor,sharpe,maxDD,cumulative,contributionPct',
    ...report.symbolRows.map((r) =>
      [
        'all',
        r.symbol,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.contributionPct,
      ].join(','),
    ),
    ...report.period2022Rows.map((r) =>
      [
        '2022',
        r.symbol,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.contributionPct,
      ].join(','),
    ),
    ...report.periodSince2025Rows.map((r) =>
      [
        'since2025',
        r.symbol,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.contributionPct,
      ].join(','),
    ),
    '',
    'excluded,label,symbols,tradeCount,winRatePct,profitFactor,sharpe,maxDD,cumulative,deltaVsFull',
    ...report.exclusionRows.map((r) =>
      [
        r.excludedSymbol ?? 'none',
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.symbols.join('+'),
        r.tradeCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.cumulativeDeltaVsFullPt ?? '',
      ].join(','),
    ),
    '',
    'compositionId,symbolCount,symbols,tradeCount,winRatePct,profitFactor,sharpe,maxDD,cumulative',
    ...report.compositionRows.map((r) =>
      [
        r.compositionId,
        r.symbolCount,
        r.symbols.join('+'),
        r.tradeCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
      ].join(','),
    ),
    '',
    'symbolA,symbolB,overlapMonths,correlation',
    ...report.correlationRows.map((r) =>
      [r.symbolA, r.symbolB, r.overlapMonths, r.correlation ?? ''].join(','),
    ),
    '',
    'diversificationLabel,cumulative,maxDD,sharpe',
    ...report.diversificationRows.map((r) =>
      [
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.cumulativeReturnPct,
        r.maxDrawdownPct ?? '',
        r.sharpe ?? '',
      ].join(','),
    ),
    '',
    'answer,content,grade',
    ['A', report.answerAJa, 'A'],
    ['B', report.answerBJa, 'B'],
    ['C', report.answerCJa, report.answerCJa.includes('評価C') ? 'C' : 'D'],
    ['D', report.answerDJa, 'A'],
    ['E', report.answerEJa, report.recommendedComposition.length >= 3 ? 'B' : 'C'],
    ['operational', report.operationalNoteJa, report.operationalGrade],
  ].map((row) => (Array.isArray(row) ? row.join(',') : row));

  return lines.join('\n');
}
