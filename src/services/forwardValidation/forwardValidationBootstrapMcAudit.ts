/**
 * 最重要監査その62 — ブートストラップMC監査 · RM700固定 · 重複抽出1000回 · 監査のみ
 */
import type {
  ForwardBootstrapMcAuditReport,
  ForwardBootstrapMcCapitalId,
  ForwardBootstrapMcCapitalRow,
  ForwardBootstrapMcOperationalGrade,
  ForwardBootstrapMcSummary,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { isRuinPath } from './forwardValidationDurabilityAudit';
import { RM700_SPEC } from './forwardValidationDynamicLotAudit';
import { simulateLotSizingPath } from './forwardValidationLotSizeAudit';
import {
  collectFullHistoryExecutedTrades,
  mulberry32,
  percentile,
} from './forwardValidationMonteCarloAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_MC_RUNS = 1000;
const RM700 = 700;
const MC_SEED = 62_001;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15%';

const STRATEGY_LABEL_JA = '現行採用戦略 · RM700固定/枠 · Bootstrap MC（重複あり抽出）';

export const BOOTSTRAP_CAPITAL_DEFS: {
  capitalId: ForwardBootstrapMcCapitalId;
  capitalMYR: number;
  labelJa: string;
}[] = [
  { capitalId: 'rm3000', capitalMYR: 3000, labelJa: 'RM3000' },
  { capitalId: 'rm2000', capitalMYR: 2000, labelJa: 'RM2000' },
  { capitalId: 'rm1500', capitalMYR: 1500, labelJa: 'RM1500' },
  { capitalId: 'rm1000', capitalMYR: 1000, labelJa: 'RM1000' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** 重複ありランダム抽出（Bootstrap sampling with replacement） */
export function bootstrapSampleTrades(
  pool: ForwardPassedTradeRecord[],
  rand: () => number,
  runId: number,
  sampleSize?: number,
): ForwardPassedTradeRecord[] {
  const n = sampleSize ?? pool.length;
  const sampled: ForwardPassedTradeRecord[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rand() * pool.length);
    const src = pool[idx]!;
    sampled.push({
      ...src,
      id: `${src.id}_bs${runId}_${i}`,
    });
  }
  return sampled.sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );
}

export function runBootstrapMonteCarlo(input: {
  pool: ForwardPassedTradeRecord[];
  symbols: string[];
  initialCapitalMYR: number;
  runs?: number;
  seed?: number;
}): ForwardBootstrapMcSummary {
  const runs = input.runs ?? BOOTSTRAP_MC_RUNS;
  const rand = mulberry32(input.seed ?? MC_SEED);
  const cumulatives: number[] = [];
  const maxDds: number[] = [];
  let bankrupt = 0;

  for (let r = 0; r < runs; r++) {
    const sample = bootstrapSampleTrades(input.pool, rand, r);
    const path = simulateLotSizingPath({
      trades: sample,
      symbols: input.symbols,
      spec: RM700_SPEC,
      initialCapitalMYR: input.initialCapitalMYR,
    });
    cumulatives.push(path.cumulativeReturnPct);
    maxDds.push(path.maxDrawdownPct);
    if (isRuinPath(path)) bankrupt++;
  }

  const sortedCum = [...cumulatives].sort((a, b) => a - b);
  const sortedDd = [...maxDds].sort((a, b) => a - b);

  return {
    runs,
    sampleSize: input.pool.length,
    meanCumulativePct: mean(cumulatives) ?? 0,
    medianCumulativePct: percentile(sortedCum, 50),
    worstCumulativePct: sortedCum[0] ?? 0,
    p5CumulativePct: percentile(sortedCum, 5),
    p1CumulativePct: percentile(sortedCum, 1),
    meanMaxDrawdownPct: mean(maxDds) ?? 0,
    worstMaxDrawdownPct: sortedDd[0] ?? 0,
    bankruptcyRatePct: round3((bankrupt / runs) * 100),
    bankruptCount: bankrupt,
  };
}

export function pickMinimumSafeCapital(rows: ForwardBootstrapMcCapitalRow[]): number {
  const sorted = [...rows].sort((a, b) => a.capitalMYR - b.capitalMYR);
  for (const row of sorted) {
    if (row.metrics.bankruptcyRatePct <= 1 && row.metrics.p5CumulativePct > 0) {
      return row.capitalMYR;
    }
  }
  return sorted[sorted.length - 1]?.capitalMYR ?? 3000;
}

export function gradeBootstrapMcOperational(input: {
  rm3000: ForwardBootstrapMcSummary;
  minimumSafeCapitalMYR: number;
}): { grade: ForwardBootstrapMcOperationalGrade; verdictJa: string } {
  const { rm3000, minimumSafeCapitalMYR } = input;

  if (
    rm3000.bankruptcyRatePct === 0 &&
    rm3000.p5CumulativePct > 5 &&
    rm3000.worstCumulativePct > -20 &&
    minimumSafeCapitalMYR <= 2000
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即運用 — RM3000破産0% · 5%分位${rm3000.p5CumulativePct}% · 最低安全資金RM${minimumSafeCapitalMYR}`,
    };
  }

  if (rm3000.bankruptcyRatePct <= 2 && rm3000.p5CumulativePct > 0) {
    return {
      grade: 'B',
      verdictJa: `B 運用可能 — RM3000破産${rm3000.bankruptcyRatePct}% · 最低安全資金RM${minimumSafeCapitalMYR}`,
    };
  }

  if (rm3000.bankruptcyRatePct <= 8) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — RM3000破産${rm3000.bankruptcyRatePct}% · 資金増額推奨RM${minimumSafeCapitalMYR}`,
    };
  }

  return {
    grade: 'D',
    verdictJa: `D 不採用 — RM3000破産${rm3000.bankruptcyRatePct}% · 最悪累積${rm3000.worstCumulativePct}%`,
  };
}

export function buildBootstrapMcAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  auditedAt?: string;
  runs?: number;
}): ForwardBootstrapMcAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const runs = input.runs ?? BOOTSTRAP_MC_RUNS;

  const pool = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);

  const capitalRows: ForwardBootstrapMcCapitalRow[] = BOOTSTRAP_CAPITAL_DEFS.map((def, i) => ({
    capitalId: def.capitalId,
    capitalMYR: def.capitalMYR,
    labelJa: def.labelJa,
    metrics: runBootstrapMonteCarlo({
      pool,
      symbols,
      initialCapitalMYR: def.capitalMYR,
      runs,
      seed: MC_SEED + i * 1000,
    }),
  }));

  const minimumSafeCapitalMYR = pickMinimumSafeCapital(capitalRows);
  const rm3000 = capitalRows.find((r) => r.capitalId === 'rm3000')!.metrics;
  const { grade, verdictJa } = gradeBootstrapMcOperational({ rm3000, minimumSafeCapitalMYR });

  const row = (id: ForwardBootstrapMcCapitalId) =>
    capitalRows.find((r) => r.capitalId === id)!;

  const answerAJa = `A RM3000破産率: ${row('rm3000').metrics.bankruptcyRatePct}%（${row('rm3000').metrics.bankruptCount}/${runs}）· 5%分位${row('rm3000').metrics.p5CumulativePct}%`;
  const answerBJa = `B RM2000破産率: ${row('rm2000').metrics.bankruptcyRatePct}%（${row('rm2000').metrics.bankruptCount}/${runs}）· 5%分位${row('rm2000').metrics.p5CumulativePct}%`;
  const answerCJa = `C RM1500破産率: ${row('rm1500').metrics.bankruptcyRatePct}%（${row('rm1500').metrics.bankruptCount}/${runs}）· 5%分位${row('rm1500').metrics.p5CumulativePct}%`;
  const answerDJa = `D RM1000破産率: ${row('rm1000').metrics.bankruptcyRatePct}%（${row('rm1000').metrics.bankruptCount}/${runs}）· 5%分位${row('rm1000').metrics.p5CumulativePct}%`;
  const answerEJa = `E 最低安全資金: RM${minimumSafeCapitalMYR}（破産≤1%・5%分位プラス）· 評価${grade}`;

  const consistencyNoteJa =
    '監査39-61整合: Bootstrap MC（重複抽出）· 監査61順序シャッフル不変 → 本監査で分布評価 · RM700固定 · MC' +
    runs +
    '回 · ルール変更なし';

  const capitalSummary = capitalRows
    .map(
      (r) =>
        `${r.labelJa}破産${r.metrics.bankruptcyRatePct}%·5%分位${r.metrics.p5CumulativePct}%·最悪${r.metrics.worstCumulativePct}%`,
    )
    .join(' · ');

  const humanSummaryJa = [
    '監査62 Bootstrap MC',
    FIXED_CONDITIONS_JA,
    STRATEGY_LABEL_JA,
    `母集団${pool.length}件 · 抽出${pool.length}件/回 · ${runs}回`,
    capitalSummary,
    verdictJa,
    answerAJa,
    answerEJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    strategyLabelJa: STRATEGY_LABEL_JA,
    lotPerSlotMYR: RM700,
    poolTradeCount: pool.length,
    bootstrapRuns: runs,
    capitalRows,
    minimumSafeCapitalMYR,
    operationalGrade: grade,
    operationalVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runBootstrapMcAudit(): Promise<ForwardBootstrapMcAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildBootstrapMcAuditReport({ bundle });
}

export function formatBootstrapMcCsv(report: ForwardBootstrapMcAuditReport): string {
  const lines = [
    `# 最重要監査その62 Bootstrap MC ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.strategyLabelJa} · 母集団${report.poolTradeCount}件 · ${report.bootstrapRuns}回`,
    `# ${report.operationalVerdictJa}`,
    '',
    'section,capitalId,capitalMYR,runs,sampleSize,meanCum,medianCum,worstCum,p5Cum,p1Cum,meanMaxDD,worstMaxDD,bankruptcyPct,bankruptCount',
    ...report.capitalRows.map((r) => {
      const m = r.metrics;
      return [
        'capital',
        r.capitalId,
        r.capitalMYR,
        m.runs,
        m.sampleSize,
        m.meanCumulativePct,
        m.medianCumulativePct,
        m.worstCumulativePct,
        m.p5CumulativePct,
        m.p1CumulativePct,
        m.meanMaxDrawdownPct,
        m.worstMaxDrawdownPct,
        m.bankruptcyRatePct,
        m.bankruptCount,
      ].join(',');
    }),
    '',
    'section,key,value',
    ['verdict', 'operationalGrade', report.operationalGrade].join(','),
    ['verdict', 'minimumSafeCapitalMYR', report.minimumSafeCapitalMYR].join(','),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
