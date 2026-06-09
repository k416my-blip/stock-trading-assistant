/**
 * 最重要監査その32 — モンテカルロシミュレーション · 監査31最終ルール · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardMonteCarloAuditReport,
  ForwardMonteCarloDdBucket,
  ForwardMonteCarloOperationalGrade,
  ForwardMonteCarloRm3000Row,
  ForwardMonteCarloStabilityGrade,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { simulateOperationalWinRate } from './forwardValidationEtfUniverseAudit';
import { ROBUSTNESS_ETF_UNIVERSE } from './forwardValidationRobustnessAudit';
import { collectRecommendedRuleCandidates } from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import { fetchRobustnessAuditBundle } from './forwardValidationRobustnessAudit';

export const MONTE_CARLO_RUNS = 1000;
const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;
const RM3000_CAPITAL_MYR = 3000;
const MIN_SLOT_PCT = 12;
const MAX_SLOT_PCT = 50;
const BASE_SLOT_PCT = 100 / FORWARD_MAX_CONCURRENT;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15%';

export type MonteCarloPathMetrics = {
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  mar: number | null;
  bankrupt: boolean;
};

type ActiveLeg = {
  closeStep: number;
  notional: number;
  returnPct: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace<T>(items: T[], rand: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

export function winRateSlotPct(
  trade: ForwardPassedTradeRecord,
  history: ForwardPassedTradeRecord[],
  symbols: string[],
): number {
  const symRows = history.filter((t) => t.symbol === trade.symbol);
  const symWr =
    symRows.length === 0
      ? 0.5
      : symRows.filter((t) => t.returnPct > 0).length / symRows.length;
  const avgWr =
    mean(
      symbols.map((sym) => {
        const rows = history.filter((t) => t.symbol === sym);
        if (rows.length === 0) return 0.5;
        return rows.filter((t) => t.returnPct > 0).length / rows.length;
      }),
    ) ?? 0.5;
  const mult = avgWr > 0 ? symWr / avgWr : 1;
  return round3(Math.max(MIN_SLOT_PCT, Math.min(MAX_SLOT_PCT, BASE_SLOT_PCT * mult)));
}

function countOpenAtStep(openByClose: Map<number, ActiveLeg[]>, step: number): ActiveLeg[] {
  const open: ActiveLeg[] = [];
  for (const [closeStep, legs] of openByClose) {
    if (closeStep > step) open.push(...legs);
  }
  return open;
}

export function simulateMonteCarloPath(
  orderedTrades: ForwardPassedTradeRecord[],
  symbols: string[],
  years: number,
  initialCapital = INITIAL_CAPITAL,
): MonteCarloPathMetrics {
  if (orderedTrades.length === 0) {
    return {
      cumulativeReturnPct: 0,
      maxDrawdownPct: 0,
      sharpe: null,
      mar: null,
      bankrupt: false,
    };
  }

  const maxDeployFrac = (100 - CASH_RESERVE_PCT) / 100;
  const openByClose = new Map<number, ActiveLeg[]>();
  let equity = initialCapital;
  let peak = initialCapital;
  let maxDdPct = 0;
  const equityReturns: number[] = [];

  const addClose = (step: number, leg: ActiveLeg) => {
    const list = openByClose.get(step) ?? [];
    list.push(leg);
    openByClose.set(step, list);
  };

  for (let step = 0; step < orderedTrades.length; step++) {
    const closing = openByClose.get(step) ?? [];
    if (closing.length > 0) {
      openByClose.delete(step);
      for (const leg of closing) {
        const pnl = round3((leg.notional * leg.returnPct) / 100);
        const eqBefore = equity;
        equity = round3(equity + pnl);
        equityReturns.push(eqBefore > 0 ? round3((pnl / eqBefore) * 100) : 0);
      }
    }

    const openLegs = countOpenAtStep(openByClose, step);
    if (openLegs.length >= FORWARD_MAX_CONCURRENT) continue;

    const trade = orderedTrades[step]!;
    const history = orderedTrades.slice(0, step);
    const slotPct = winRateSlotPct(trade, history, symbols);
    const openNotional = openLegs.reduce((s, l) => s + l.notional, 0);
    const target = round3((equity * slotPct) / 100);
    const available = Math.max(0, equity * maxDeployFrac - openNotional);
    const notional = round3(Math.min(target, available));
    if (notional <= 0) continue;

    const closeStep = step + Math.max(1, trade.holdDays);
    addClose(closeStep, { closeStep, notional, returnPct: trade.returnPct });

    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
    if (dd < maxDdPct) maxDdPct = dd;
  }

  const tailSteps = [...openByClose.keys()].sort((a, b) => a - b);
  for (const step of tailSteps) {
    const closing = openByClose.get(step) ?? [];
    for (const leg of closing) {
      const pnl = round3((leg.notional * leg.returnPct) / 100);
      const eqBefore = equity;
      equity = round3(equity + pnl);
      equityReturns.push(eqBefore > 0 ? round3((pnl / eqBefore) * 100) : 0);
    }
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
    if (dd < maxDdPct) maxDdPct = dd;
  }

  const cumulativeReturnPct = round3(((equity - initialCapital) / initialCapital) * 100);
  const cagr =
    equity > 0 && initialCapital > 0
      ? round3((Math.pow(equity / initialCapital, 1 / years) - 1) * 100)
      : null;
  const mar =
    cagr != null && maxDdPct !== 0 ? round3(cagr / Math.abs(maxDdPct)) : null;
  const mu = mean(equityReturns);
  const sigma = std(equityReturns);
  const sharpe =
    mu != null && sigma > 1e-9 && equityReturns.length >= 2
      ? round3((mu / sigma) * Math.sqrt(Math.max(equityReturns.length / years, 1)))
      : null;

  return {
    cumulativeReturnPct,
    maxDrawdownPct: round3(maxDdPct),
    sharpe,
    mar,
    bankrupt: cumulativeReturnPct <= 0,
  };
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return round3(sorted[lo]!);
  const w = idx - lo;
  return round3(sorted[lo]! * (1 - w) + sorted[hi]! * w);
}

export function buildDdBuckets(maxDds: number[]): ForwardMonteCarloDdBucket[] {
  const defs = [
    { labelJa: '0%〜-5%', minPct: -5, maxPct: 0 },
    { labelJa: '-5%〜-10%', minPct: -10, maxPct: -5 },
    { labelJa: '-10%〜-20%', minPct: -20, maxPct: -10 },
    { labelJa: '-20%以下', minPct: -999, maxPct: -20 },
  ];
  return defs.map((d) => {
    const count = maxDds.filter((v) => v > d.minPct && v <= d.maxPct).length;
    return {
      labelJa: d.labelJa,
      minPct: d.minPct,
      maxPct: d.maxPct,
      count,
      sharePct: maxDds.length > 0 ? round3((count / maxDds.length) * 100) : 0,
    };
  });
}

export function gradeMonteCarloStability(input: {
  bankruptcyRatePct: number;
  ci95LowPct: number;
  worstCumulativeReturnPct: number;
  spreadPct: number;
}): { grade: ForwardMonteCarloStabilityGrade; gradeJa: string } {
  const { bankruptcyRatePct, ci95LowPct, worstCumulativeReturnPct, spreadPct } = input;
  if (bankruptcyRatePct === 0 && ci95LowPct > 20 && worstCumulativeReturnPct > 10 && spreadPct < 40) {
    return {
      grade: 'A',
      gradeJa: 'A（非常に安定）: 破産0% · 95%CI下限が高水準 · 最悪ケースもプラス。',
    };
  }
  if (bankruptcyRatePct <= 1 && ci95LowPct > 0 && worstCumulativeReturnPct > 0) {
    return {
      grade: 'B',
      gradeJa: 'B（安定）: 破産率1%以下 · 95%CI下限プラス · 最悪ケース累積プラス。',
    };
  }
  if (bankruptcyRatePct > 10 || ci95LowPct < -5 || worstCumulativeReturnPct < -10) {
    return {
      grade: 'D',
      gradeJa: 'D（危険）: 破産率またはCI下限が許容外 · 順序リスク大。',
    };
  }
  return {
    grade: 'C',
    gradeJa: 'C（要注意）: 最悪ケースまたはCI幅に注意 · ロット抑制推奨。',
  };
}

export function gradeMonteCarloOperational(input: {
  stabilityGrade: ForwardMonteCarloStabilityGrade;
  bankruptcyRatePct: number;
  medianCumulativeReturnPct: number;
  worstMaxDrawdownPct: number;
}): { grade: ForwardMonteCarloOperationalGrade; gradeJa: string } {
  const { stabilityGrade, bankruptcyRatePct, medianCumulativeReturnPct, worstMaxDrawdownPct } =
    input;
  if (
    (stabilityGrade === 'A' || stabilityGrade === 'B') &&
    bankruptcyRatePct <= 1 &&
    medianCumulativeReturnPct > 30
  ) {
    return {
      grade: 'A',
      gradeJa: 'A（強く推奨）: 安定性良好 · 中央値累積が高水準。',
    };
  }
  if (stabilityGrade === 'B' || (stabilityGrade === 'C' && bankruptcyRatePct <= 3)) {
    return {
      grade: 'B',
      gradeJa: 'B（推奨）: 標準ロットで実運用可 · DD管理を継続。',
    };
  }
  if (stabilityGrade === 'C' || bankruptcyRatePct <= 8) {
    return {
      grade: 'C',
      gradeJa: 'C（小ロットのみ）: 最悪DD' + worstMaxDrawdownPct + '%想定 · 小ロット開始。',
    };
  }
  return {
    grade: 'D',
    gradeJa: 'D（非推奨）: 破産率' + bankruptcyRatePct + '% · ルール見直し優先。',
  };
}

export function buildRm3000Row(input: {
  operationalGrade: ForwardMonteCarloOperationalGrade;
  p95MaxDrawdownPct: number;
  medianCumulativeReturnPct: number;
}): ForwardMonteCarloRm3000Row {
  const { operationalGrade, p95MaxDrawdownPct, medianCumulativeReturnPct } = input;
  const cashPct =
    operationalGrade === 'A' ? 15 : operationalGrade === 'B' ? 15 : operationalGrade === 'C' ? 20 : 25;
  const deployable = RM3000_CAPITAL_MYR * ((100 - cashPct) / 100);
  const lotFactor =
    operationalGrade === 'A' ? 1 : operationalGrade === 'B' ? 0.85 : operationalGrade === 'C' ? 0.6 : 0.4;
  const recommendedLotMYR = Math.round((deployable / FORWARD_MAX_CONCURRENT) * lotFactor);
  const ddStress = Math.min(Math.abs(p95MaxDrawdownPct), 35);
  const recommendedMaxLossMYR = Math.round(RM3000_CAPITAL_MYR * (ddStress / 100));
  return {
    recommendedLotMYR,
    recommendedMaxLossMYR,
    recommendedCashReservePct: cashPct,
    noteJa: `1枠${recommendedLotMYR}MYR · 最大許容損失${recommendedMaxLossMYR}MYR（MC95%DD${round2(p95MaxDrawdownPct)}%）· 中央値累積${medianCumulativeReturnPct}%`,
  };
}

export function collectFullHistoryExecutedTrades(
  bundle: SurvivorshipOhlcvBundle,
  fromDate: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) => bundle.fetchedSymbols.includes(s));
  const candidates = collectRecommendedRuleCandidates(bundle, symbols, fromDate, toDate);
  return simulateOperationalWinRate(candidates, symbols).executed;
}

export function runMonteCarloSimulations(input: {
  trades: ForwardPassedTradeRecord[];
  symbols: string[];
  years: number;
  runs?: number;
  seed?: number;
}): MonteCarloPathMetrics[] {
  const runs = input.runs ?? MONTE_CARLO_RUNS;
  const rand = mulberry32(input.seed ?? 32_001);
  const results: MonteCarloPathMetrics[] = [];

  for (let i = 0; i < runs; i++) {
    const shuffled = shuffleInPlace([...input.trades], rand);
    results.push(simulateMonteCarloPath(shuffled, input.symbols, input.years));
  }

  return results;
}

export function auditMonteCarlo(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  runs?: number;
  seed?: number;
}): ForwardMonteCarloAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  const trades = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const years = calendarYears(fromDate, toDate);
  const runs = input.runs ?? MONTE_CARLO_RUNS;

  const baseline = simulateMonteCarloPath(trades, symbols, years);
  const mcRuns = runMonteCarloSimulations({
    trades,
    symbols,
    years,
    runs,
    seed: input.seed,
  });

  const cumulatives = mcRuns.map((r) => r.cumulativeReturnPct).sort((a, b) => a - b);
  const maxDds = mcRuns.map((r) => r.maxDrawdownPct).sort((a, b) => a - b);
  const bankruptCount = mcRuns.filter((r) => r.bankrupt).length;
  const bankruptcyRatePct = round3((bankruptCount / mcRuns.length) * 100);

  const meanCumulativeReturnPct = mean(cumulatives)!;
  const medianCumulativeReturnPct = percentile(cumulatives, 50);
  const ci95LowPct = percentile(cumulatives, 2.5);
  const ci95HighPct = percentile(cumulatives, 97.5);
  const worstCumulativeReturnPct = cumulatives[0]!;
  const worstMaxDrawdownPct = maxDds[0]!;
  const spreadPct = round3(ci95HighPct - ci95LowPct);
  const ddBuckets = buildDdBuckets(mcRuns.map((r) => r.maxDrawdownPct));
  const p95MaxDrawdownPct = percentile(maxDds, 5);

  const { grade: stabilityGrade, gradeJa: stabilityGradeJa } = gradeMonteCarloStability({
    bankruptcyRatePct,
    ci95LowPct,
    worstCumulativeReturnPct,
    spreadPct,
  });

  const { grade: operationalGrade, gradeJa: operationalGradeJa } = gradeMonteCarloOperational({
    stabilityGrade,
    bankruptcyRatePct,
    medianCumulativeReturnPct,
    worstMaxDrawdownPct,
  });

  const rm3000 = buildRm3000Row({
    operationalGrade,
    p95MaxDrawdownPct,
    medianCumulativeReturnPct,
  });

  const answer1Ja = `平均累積利益: ${meanCumulativeReturnPct}%（${runs}回 · ${trades.length}取引）。`;
  const answer2Ja = `中央値累積利益: ${medianCumulativeReturnPct}%。`;
  const answer3Ja = `95%信頼区間: ${ci95LowPct}% 〜 ${ci95HighPct}%。`;
  const answer4Ja = `最悪ケース累積: ${worstCumulativeReturnPct}%。`;
  const answer5Ja = `最悪ケースDD: ${worstMaxDrawdownPct}%。`;
  const answer6Ja = ddBuckets.map((b) => `${b.labelJa}:${b.count}回(${b.sharePct}%)`).join(' · ');
  const answer7Ja = `破産率（累積≤0%）: ${bankruptcyRatePct}%（${bankruptCount}/${runs}回）。`;
  const answer8Ja = `${stabilityGrade}: ${stabilityGradeJa}`;
  const answer9Ja = `${operationalGrade}: ${operationalGradeJa}`;
  const answer10Ja =
    `RM3000: 推奨ロット${rm3000.recommendedLotMYR}MYR/枠 · 推奨最大損失${rm3000.recommendedMaxLossMYR}MYR · 現金${rm3000.recommendedCashReservePct}%。`;

  const humanSummaryJa = [
    '【最重要監査その32 · モンテカルロシミュレーション】',
    FIXED_CONDITIONS_JA,
    `${fromDate}〜${toDate} · 全取引${trades.length}件 · ${runs}回シャッフル`,
    '',
    `基準順序: 累積${baseline.cumulativeReturnPct}% · DD${baseline.maxDrawdownPct}%`,
    answer1Ja,
    answer2Ja,
    answer3Ja,
    answer4Ja,
    answer5Ja,
    '',
    answer7Ja,
    answer8Ja,
    answer9Ja,
    answer10Ja,
  ].join('\n');

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    etfUniverse: symbols,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    simulationCount: runs,
    tradeCount: trades.length,
    baselineCumulativeReturnPct: baseline.cumulativeReturnPct,
    baselineMaxDrawdownPct: baseline.maxDrawdownPct,
    meanCumulativeReturnPct,
    medianCumulativeReturnPct,
    ci95LowPct,
    ci95HighPct,
    worstCumulativeReturnPct,
    worstMaxDrawdownPct,
    meanSharpe: mean(mcRuns.map((r) => r.sharpe).filter((v): v is number => v != null)),
    meanMar: mean(mcRuns.map((r) => r.mar).filter((v): v is number => v != null)),
    ddBuckets,
    bankruptcyRatePct,
    stabilityGrade,
    stabilityGradeJa,
    operationalGrade,
    operationalGradeJa,
    rm3000,
    answer1Ja,
    answer2Ja,
    answer3Ja,
    answer4Ja,
    answer5Ja,
    answer6Ja,
    answer7Ja,
    answer8Ja,
    answer9Ja,
    answer10Ja,
    humanSummaryJa,
  };
}

export async function runMonteCarloAudit(): Promise<ForwardMonteCarloAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return auditMonteCarlo({ bundle });
}

export function formatMonteCarloCsv(report: ForwardMonteCarloAuditReport): string {
  const lines = [
    `# 最重要監査その32 MC ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# 安定性${report.stabilityGrade} 運用${report.operationalGrade}`,
    '',
    'metric,value',
    `simulationCount,${report.simulationCount}`,
    `tradeCount,${report.tradeCount}`,
    `meanCumulativePct,${report.meanCumulativeReturnPct}`,
    `medianCumulativePct,${report.medianCumulativeReturnPct}`,
    `ci95LowPct,${report.ci95LowPct}`,
    `ci95HighPct,${report.ci95HighPct}`,
    `worstCumulativePct,${report.worstCumulativeReturnPct}`,
    `worstMaxDrawdownPct,${report.worstMaxDrawdownPct}`,
    `bankruptcyRatePct,${report.bankruptcyRatePct}`,
    `baselineCumulativePct,${report.baselineCumulativeReturnPct}`,
    `baselineMaxDrawdownPct,${report.baselineMaxDrawdownPct ?? ''}`,
    '',
    'ddBucket,count,sharePct',
    ...report.ddBuckets.map((b) => `${b.labelJa},${b.count},${b.sharePct}`),
    '',
    'rm3000Field,value',
    `recommendedLotMYR,${report.rm3000.recommendedLotMYR}`,
    `recommendedMaxLossMYR,${report.rm3000.recommendedMaxLossMYR}`,
    `recommendedCashReservePct,${report.rm3000.recommendedCashReservePct}`,
    '',
    'answer,content',
  ];
  for (let i = 1; i <= 10; i++) {
    const key = `answer${i}Ja` as keyof ForwardMonteCarloAuditReport;
    lines.push(`${i},"${String(report[key]).replace(/"/g, '""')}"`);
  }
  lines.push(`stability,"${report.stabilityGrade}: ${report.stabilityGradeJa.replace(/"/g, '""')}"`);
  lines.push(
    `operational,"${report.operationalGrade}: ${report.operationalGradeJa.replace(/"/g, '""')}"`,
  );
  return lines.join('\n');
}
