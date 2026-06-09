/**
 * 最重要監査その58 — リーマン級ロット管理監査 · 監査57⑧固定 · ルール変更なし · ロットのみ
 */
import type {
  ForwardLehmanLotAdoptionGrade,
  ForwardLehmanLotAuditReport,
  ForwardLehmanLotSchemeId,
  ForwardLehmanLotSchemeMetrics,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import {
  enrichVirtualMarketTrades,
  resolveVirtualMarketTrades,
} from './forwardValidationMarketChangeAudit';
import {
  estimateBankruptcyRatePct,
  simulateLotSizingPath,
  type LotPathResult,
  type LotSizingSpec,
} from './forwardValidationLotSizeAudit';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import type { OhlcvBar } from './case4Indicators';

const RM3000 = 3000;
const LEHMAN_MC_RUNS = 1000;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

const SCENARIO_LABEL = '⑧ リーマン級暴落（2022ベア×-40%ストレス）';

export const LEHMAN_LOT_SCHEME_DEFS: {
  schemeId: ForwardLehmanLotSchemeId;
  labelJa: string;
  spec: LotSizingSpec;
}[] = [
  {
    schemeId: 'rm700_current',
    labelJa: '① 現行 RM700固定',
    spec: { kind: 'fixed_myr', schemeId: 'rm700', labelJa: 'RM700固定', lotMYR: 700 },
  },
  {
    schemeId: 'rm500',
    labelJa: '② RM500固定',
    spec: { kind: 'fixed_myr', schemeId: 'rm500', labelJa: 'RM500固定', lotMYR: 500 },
  },
  {
    schemeId: 'rm400',
    labelJa: '③ RM400固定',
    spec: { kind: 'fixed_myr', schemeId: 'rm400', labelJa: 'RM400固定', lotMYR: 400 },
  },
  {
    schemeId: 'pct20',
    labelJa: '④ 資産20%固定',
    spec: { kind: 'fixed_pct', schemeId: 'pct20', labelJa: '資産20%', deployPct: 20 },
  },
  {
    schemeId: 'pct15',
    labelJa: '⑤ 資産15%固定',
    spec: { kind: 'fixed_pct', schemeId: 'pct15', labelJa: '資産15%', deployPct: 15 },
  },
  {
    schemeId: 'kelly25',
    labelJa: '⑥ Kelly25%',
    spec: { kind: 'kelly', schemeId: 'kelly25', labelJa: 'Kelly25%', kellyFraction: 0.25 },
  },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveLehmanScenarioTrades(input: {
  bundle: SurvivorshipOhlcvBundle;
  tnxBars: OhlcvBar[];
  fromDate?: string;
}): ForwardPassedTradeRecord[] {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const executed = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const virtual = enrichVirtualMarketTrades(executed, input.bundle, input.tnxBars);
  return resolveVirtualMarketTrades('lehman_crash', virtual).trades;
}

function pathToSchemeMetrics(
  def: (typeof LEHMAN_LOT_SCHEME_DEFS)[number],
  path: LotPathResult,
  bankruptcyRatePct: number,
): ForwardLehmanLotSchemeMetrics {
  const { spec } = def;
  return {
    schemeId: def.schemeId,
    labelJa: def.labelJa,
    lotMYR: spec.kind === 'fixed_myr' ? spec.lotMYR : null,
    deployPct: spec.kind === 'fixed_pct' ? spec.deployPct : null,
    kellyFraction: spec.kind === 'kelly' ? spec.kellyFraction : null,
    tradeCount: path.tradeCount,
    cumulativeReturnPct: path.cumulativeReturnPct,
    maxDrawdownPct: path.maxDrawdownPct,
    sharpe: path.sharpe,
    profitFactor: path.profitFactor,
    bankruptcyRatePct,
    minEquityPct: path.minEquityPct,
    finalEquityMYR: path.finalEquity,
    avgSlotMYR: path.avgSlotMYR,
  };
}

export function simulateLehmanLotScheme(input: {
  trades: ForwardPassedTradeRecord[];
  symbols: string[];
  spec: LotSizingSpec;
  mcRuns?: number;
}): { path: LotPathResult; bankruptcyRatePct: number } {
  const path = simulateLotSizingPath({
    trades: input.trades,
    symbols: input.symbols,
    spec: input.spec,
    initialCapitalMYR: RM3000,
  });
  const bankruptcyRatePct = estimateBankruptcyRatePct({
    trades: input.trades,
    symbols: input.symbols,
    spec: input.spec,
    initialCapitalMYR: RM3000,
    runs: input.mcRuns ?? LEHMAN_MC_RUNS,
  });
  return { path, bankruptcyRatePct };
}

export function pickSafest(rows: ForwardLehmanLotSchemeMetrics[]): ForwardLehmanLotSchemeMetrics {
  return [...rows].sort(
    (a, b) =>
      a.bankruptcyRatePct - b.bankruptcyRatePct ||
      Math.abs(a.maxDrawdownPct) - Math.abs(b.maxDrawdownPct) ||
      b.minEquityPct - a.minEquityPct,
  )[0]!;
}

function pickBestSharpe(rows: ForwardLehmanLotSchemeMetrics[]): ForwardLehmanLotSchemeMetrics {
  return [...rows].sort(
    (a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999) || b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;
}

function pickMaxProfit(rows: ForwardLehmanLotSchemeMetrics[]): ForwardLehmanLotSchemeMetrics {
  return [...rows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct || (b.sharpe ?? -999) - (a.sharpe ?? -999),
  )[0]!;
}

export function pickOperationalLot(rows: ForwardLehmanLotSchemeMetrics[]): ForwardLehmanLotSchemeMetrics {
  const current = rows.find((r) => r.schemeId === 'rm700_current')!;
  const scored = rows.map((r) => {
    const ddGain = Math.abs(current.maxDrawdownPct) - Math.abs(r.maxDrawdownPct);
    const bkGain = current.bankruptcyRatePct - r.bankruptcyRatePct;
    const cumLoss = current.cumulativeReturnPct - r.cumulativeReturnPct;
    const score =
      bkGain * 40 +
      ddGain * 2 +
      (r.cumulativeReturnPct - current.cumulativeReturnPct) * 0.5 -
      cumLoss * 0.3 +
      ((r.sharpe ?? 0) - (current.sharpe ?? 0)) * 5;
    return { row: r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]!.row;
  if (
    best.schemeId !== 'rm700_current' &&
    best.bankruptcyRatePct <= current.bankruptcyRatePct &&
    Math.abs(best.maxDrawdownPct) < Math.abs(current.maxDrawdownPct) - 3
  ) {
    return best;
  }
  return current;
}

export function gradeLehmanLotAdoption(input: {
  current: ForwardLehmanLotSchemeMetrics;
  operational: ForwardLehmanLotSchemeMetrics;
  safest: ForwardLehmanLotSchemeMetrics;
}): { grade: ForwardLehmanLotAdoptionGrade; verdictJa: string } {
  const { current, operational, safest } = input;
  const ddImproved = Math.abs(safest.maxDrawdownPct) < Math.abs(current.maxDrawdownPct) - 5;
  const bkImproved = safest.bankruptcyRatePct < current.bankruptcyRatePct - 5;
  const cumOk = safest.cumulativeReturnPct >= current.cumulativeReturnPct - 5;

  if (
    operational.schemeId !== 'rm700_current' &&
    ddImproved &&
    bkImproved &&
    cumOk &&
    operational.bankruptcyRatePct <= 5
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — ${operational.labelJa} · 累積${operational.cumulativeReturnPct}% · MaxDD${operational.maxDrawdownPct}% · 破産${operational.bankruptcyRatePct}%`,
    };
  }

  if (
    safest.schemeId !== 'rm700_current' &&
    (ddImproved || bkImproved) &&
    safest.minEquityPct > current.minEquityPct + 5
  ) {
    return {
      grade: 'B',
      verdictJa: `B 参考 — 最安全${safest.labelJa} · MaxDD${safest.maxDrawdownPct}% · 破産${safest.bankruptcyRatePct}% · 現行RM700維持も可`,
    };
  }

  return {
    grade: 'C',
    verdictJa: `C 不採用 — ロット変更の実益不足またはリーマン級限定改善 · 現行RM700/枠維持（監査53/57整合）`,
  };
}

export function buildLehmanLotAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  tnxBars: OhlcvBar[];
  fromDate?: string;
  auditedAt?: string;
  mcRuns?: number;
}): ForwardLehmanLotAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const mcRuns = input.mcRuns ?? LEHMAN_MC_RUNS;

  const lehmanTrades = resolveLehmanScenarioTrades({
    bundle: input.bundle,
    tnxBars: input.tnxBars,
    fromDate,
  });

  const audit57Phase = buildWalkForward31PhaseMetrics(
    SCENARIO_LABEL,
    '2022-01-01',
    '2022-12-31',
    lehmanTrades,
  );

  const schemeRows = LEHMAN_LOT_SCHEME_DEFS.map((def) => {
    const { path, bankruptcyRatePct } = simulateLehmanLotScheme({
      trades: lehmanTrades,
      symbols,
      spec: def.spec,
      mcRuns,
    });
    return pathToSchemeMetrics(def, path, bankruptcyRatePct);
  });

  const current = schemeRows.find((r) => r.schemeId === 'rm700_current')!;
  const safest = pickSafest(schemeRows);
  const bestSharpe = pickBestSharpe(schemeRows);
  const maxProfit = pickMaxProfit(schemeRows);
  const operational = pickOperationalLot(schemeRows);

  const { grade, verdictJa } = gradeLehmanLotAdoption({ current, operational, safest });

  const answerAJa = `A 最安全ロット: ${safest.labelJa} · 累積${safest.cumulativeReturnPct}% · MaxDD${safest.maxDrawdownPct}% · 破産${safest.bankruptcyRatePct}% · 最低資産${safest.minEquityPct}%`;

  const answerBJa = `B 最良Sharpe: ${bestSharpe.labelJa} · Sharpe${bestSharpe.sharpe ?? '—'} · 累積${bestSharpe.cumulativeReturnPct}% · MaxDD${bestSharpe.maxDrawdownPct}%`;

  const answerCJa = `C 最大利益: ${maxProfit.labelJa} · 累積${maxProfit.cumulativeReturnPct}% · PF${maxProfit.profitFactor ?? '—'} · MaxDD${maxProfit.maxDrawdownPct}%`;

  const answerDJa = `D 実運用推奨: ${operational.labelJa} · 累積${operational.cumulativeReturnPct}% · MaxDD${operational.maxDrawdownPct}% · 破産${operational.bankruptcyRatePct}% · 評価${grade}`;

  const rmSetting =
    operational.schemeId === 'rm700_current'
      ? 'RM700/枠（現行）'
      : operational.lotMYR != null
        ? `RM${operational.lotMYR}/枠`
        : operational.deployPct != null
          ? `資産${operational.deployPct}%/枠`
          : 'Kelly25%';

  const answerEJa = `E RM3000推奨設定: ${rmSetting} · 初期RM3000 · 3枠 · 現金15% · ${operational.labelJa} · 最終RM${operational.finalEquityMYR}`;

  const consistencyNoteJa =
    '監査39-57整合: ルール変更なし · 監査57⑧取引PF累積' +
    `${audit57Phase.cumulativeReturnPct}%/MaxDD${audit57Phase.maxDrawdownPct ?? '—'}% · ` +
    '監査53 RM700推奨 · 本監査はロット管理のみ · MC' +
    `${mcRuns}回`;

  const humanSummaryJa = [
    '監査58 リーマン級ロット管理',
    FIXED_CONDITIONS_JA,
    SCENARIO_LABEL,
    `監査57ベースライン累積${audit57Phase.cumulativeReturnPct}% · MaxDD${audit57Phase.maxDrawdownPct ?? '—'}%`,
    `現行RM700累積${current.cumulativeReturnPct}% · MaxDD${current.maxDrawdownPct}% · 破産${current.bankruptcyRatePct}%`,
    verdictJa,
    answerAJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    scenarioLabelJa: SCENARIO_LABEL,
    referenceCapitalMYR: RM3000,
    lehmanTradeCount: lehmanTrades.length,
    audit57BaselineCumulativePct: audit57Phase.cumulativeReturnPct,
    audit57BaselineMaxDrawdownPct: audit57Phase.maxDrawdownPct,
    schemeRows,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runLehmanLotAudit(): Promise<ForwardLehmanLotAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  const tnxFetch = await fetchForwardOhlcvDetailed('^TNX', 15_000, EXTENDED_AUDIT_START);
  const tnxBars = tnxFetch.result.ok ? tnxFetch.bars : [];
  return buildLehmanLotAuditReport({ bundle, tnxBars });
}

export function formatLehmanLotCsv(report: ForwardLehmanLotAuditReport): string {
  const lines = [
    `# 最重要監査その58 リーマン級ロット管理 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.scenarioLabelJa}`,
    `# 監査57ベースライン累積${report.audit57BaselineCumulativePct}% MaxDD${report.audit57BaselineMaxDrawdownPct ?? '—'}%`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,schemeId,label,lotMYR,deployPct,kellyFrac,trades,cumulative,maxDD,sharpe,pf,bankruptcyPct,minEquityPct,finalMYR,avgSlotMYR',
    ...report.schemeRows.map((r) =>
      [
        'scheme',
        r.schemeId,
        `"${r.labelJa}"`,
        r.lotMYR ?? '',
        r.deployPct ?? '',
        r.kellyFraction ?? '',
        r.tradeCount,
        r.cumulativeReturnPct,
        r.maxDrawdownPct,
        r.sharpe ?? '',
        r.profitFactor ?? '',
        r.bankruptcyRatePct,
        r.minEquityPct,
        r.finalEquityMYR,
        r.avgSlotMYR,
      ].join(','),
    ),
    '',
    'section,key,value',
    ['verdict', 'adoptionGrade', report.adoptionGrade].join(','),
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
