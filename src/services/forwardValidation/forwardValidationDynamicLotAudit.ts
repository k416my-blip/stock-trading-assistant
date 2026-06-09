/**
 * 最重要監査その59 — 動的ロット切替監査 · 監査58固定 · ルール変更なし · ロットのみ
 */
import type {
  ForwardDynamicLotAdoptionGrade,
  ForwardDynamicLotAuditReport,
  ForwardDynamicLotSchemeId,
  ForwardDynamicLotSchemeMetrics,
  ForwardDynamicLotScopeId,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { enrichVirtualMarketTrades } from './forwardValidationMarketChangeAudit';
import { resolveLehmanScenarioTrades } from './forwardValidationLehmanLotAudit';
import {
  estimateBankruptcyRatePct,
  simulateLotSizingPath,
  type LotPathResult,
  type LotSizingSpec,
} from './forwardValidationLotSizeAudit';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import type { OhlcvBar } from './case4Indicators';

const RM3000 = 3000;
const MC_RUNS = 1000;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export const SWITCH_CONDITION_JA =
  'VIX≥30 または QQQ200MA乖離<-10% または NASDAQ52w<-15% → Kelly25% · それ以外 RM700固定';

export const RM700_SPEC: LotSizingSpec = {
  kind: 'fixed_myr',
  schemeId: 'rm700',
  labelJa: 'RM700固定',
  lotMYR: 700,
};

export const KELLY25_SPEC: LotSizingSpec = {
  kind: 'kelly',
  schemeId: 'kelly25',
  labelJa: 'Kelly25%',
  kellyFraction: 0.25,
};

export const DYNAMIC_LOT_SCHEME_DEFS: {
  schemeId: ForwardDynamicLotSchemeId;
  labelJa: string;
  spec: LotSizingSpec;
  dynamic?: boolean;
}[] = [
  { schemeId: 'rm700_current', labelJa: '① 現行 RM700固定', spec: RM700_SPEC },
  { schemeId: 'kelly25_fixed', labelJa: '② Kelly25%固定', spec: KELLY25_SPEC },
  {
    schemeId: 'dynamic_switch',
    labelJa: '③ 動的切替',
    spec: RM700_SPEC,
    dynamic: true,
  },
];

export type DynamicLotEnrichedTrade = ForwardPassedTradeRecord & {
  vixAtSignal?: number | null;
  qqqMa200DevPct?: number | null;
  ndxDist52Pct?: number | null;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function isDynamicKellyTrigger(trade: DynamicLotEnrichedTrade): boolean {
  if ((trade.vixAtSignal ?? 0) >= 30) return true;
  if ((trade.qqqMa200DevPct ?? 0) < -10) return true;
  if ((trade.ndxDist52Pct ?? 0) < -15) return true;
  return false;
}

export function resolveDynamicLotSpec(trade: DynamicLotEnrichedTrade): LotSizingSpec {
  return isDynamicKellyTrigger(trade) ? KELLY25_SPEC : RM700_SPEC;
}

function countKellyTriggers(trades: DynamicLotEnrichedTrade[]): number {
  return trades.filter(isDynamicKellyTrigger).length;
}

function pathToMetrics(input: {
  schemeId: ForwardDynamicLotSchemeId;
  scopeId: ForwardDynamicLotScopeId;
  labelJa: string;
  path: LotPathResult;
  bankruptcyRatePct: number;
  kellyTriggerCount: number | null;
}): ForwardDynamicLotSchemeMetrics {
  return {
    schemeId: input.schemeId,
    scopeId: input.scopeId,
    labelJa: input.labelJa,
    tradeCount: input.path.tradeCount,
    kellyTriggerCount: input.kellyTriggerCount,
    cumulativeReturnPct: input.path.cumulativeReturnPct,
    maxDrawdownPct: input.path.maxDrawdownPct,
    sharpe: input.path.sharpe,
    profitFactor: input.path.profitFactor,
    bankruptcyRatePct: input.bankruptcyRatePct,
    minEquityPct: input.path.minEquityPct,
    finalEquityMYR: input.path.finalEquity,
    avgSlotMYR: input.path.avgSlotMYR,
  };
}

export function simulateDynamicLotScheme(input: {
  trades: DynamicLotEnrichedTrade[];
  symbols: string[];
  schemeId: ForwardDynamicLotSchemeId;
  spec: LotSizingSpec;
  dynamic?: boolean;
  mcRuns?: number;
}): ForwardDynamicLotSchemeMetrics {
  const scopeId: ForwardDynamicLotScopeId = 'full_history';
  const resolveSpec = input.dynamic ? resolveDynamicLotSpec : undefined;
  const path = simulateLotSizingPath({
    trades: input.trades,
    symbols: input.symbols,
    spec: input.spec,
    initialCapitalMYR: RM3000,
    resolveSpec,
  });
  const bankruptcyRatePct = estimateBankruptcyRatePct({
    trades: input.trades,
    symbols: input.symbols,
    spec: input.spec,
    initialCapitalMYR: RM3000,
    runs: input.mcRuns ?? MC_RUNS,
    resolveSpec,
  });
  const def = DYNAMIC_LOT_SCHEME_DEFS.find((d) => d.schemeId === input.schemeId)!;
  return pathToMetrics({
    schemeId: input.schemeId,
    scopeId,
    labelJa: def.labelJa,
    path,
    bankruptcyRatePct,
    kellyTriggerCount: input.dynamic ? countKellyTriggers(input.trades) : null,
  });
}

function simulateScopeRows(input: {
  trades: DynamicLotEnrichedTrade[];
  symbols: string[];
  scopeId: ForwardDynamicLotScopeId;
  mcRuns?: number;
}): ForwardDynamicLotSchemeMetrics[] {
  return DYNAMIC_LOT_SCHEME_DEFS.map((def) => {
    const resolveSpec = def.dynamic ? resolveDynamicLotSpec : undefined;
    const path = simulateLotSizingPath({
      trades: input.trades,
      symbols: input.symbols,
      spec: def.spec,
      initialCapitalMYR: RM3000,
      resolveSpec,
    });
    const bankruptcyRatePct = estimateBankruptcyRatePct({
      trades: input.trades,
      symbols: input.symbols,
      spec: def.spec,
      initialCapitalMYR: RM3000,
      runs: input.mcRuns ?? MC_RUNS,
      resolveSpec,
    });
    return pathToMetrics({
      schemeId: def.schemeId,
      scopeId: input.scopeId,
      labelJa: def.labelJa,
      path,
      bankruptcyRatePct,
      kellyTriggerCount: def.dynamic ? countKellyTriggers(input.trades) : null,
    });
  });
}

export function gradeDynamicLotAdoption(input: {
  current: ForwardDynamicLotSchemeMetrics;
  dynamic: ForwardDynamicLotSchemeMetrics;
  kellyFixed: ForwardDynamicLotSchemeMetrics;
  lehmanDynamic: ForwardDynamicLotSchemeMetrics;
  lehmanCurrent: ForwardDynamicLotSchemeMetrics;
}): { grade: ForwardDynamicLotAdoptionGrade; verdictJa: string } {
  const { current, dynamic, kellyFixed, lehmanDynamic, lehmanCurrent } = input;
  const ddGain = Math.abs(current.maxDrawdownPct) - Math.abs(dynamic.maxDrawdownPct);
  const sharpeGain = (dynamic.sharpe ?? 0) - (current.sharpe ?? 0);
  const cumDelta = dynamic.cumulativeReturnPct - current.cumulativeReturnPct;
  const lehmanDdGain =
    Math.abs(lehmanCurrent.maxDrawdownPct) - Math.abs(lehmanDynamic.maxDrawdownPct);

  if (
    ddGain >= 2 &&
    lehmanDdGain >= 3 &&
    dynamic.bankruptcyRatePct <= current.bankruptcyRatePct &&
    cumDelta >= -3 &&
    dynamic.cumulativeReturnPct >= kellyFixed.cumulativeReturnPct - 2
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — 動的切替 · 全期MaxDD${dynamic.maxDrawdownPct}%（${round3(ddGain)}pt改善）· リーマン級MaxDD${lehmanDynamic.maxDrawdownPct}% · 破産${dynamic.bankruptcyRatePct}%`,
    };
  }

  if (ddGain >= 1 || lehmanDdGain >= 2) {
    return {
      grade: 'B',
      verdictJa: `B 参考 — 動的切替 · MaxDD改善${round3(ddGain)}pt · Sharpe${round3(sharpeGain)} · 累積差${round3(cumDelta)}pt · 現行RM700維持も可`,
    };
  }

  return {
    grade: 'C',
    verdictJa: `C 不採用 — 動的切替の改善不足 · 累積差${round3(cumDelta)}pt · MaxDD改善${round3(ddGain)}pt · 現行RM700維持（監査53/58整合）`,
  };
}

export function buildDynamicLotAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  tnxBars: OhlcvBar[];
  fromDate?: string;
  auditedAt?: string;
  mcRuns?: number;
}): ForwardDynamicLotAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const mcRuns = input.mcRuns ?? MC_RUNS;

  const executed = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const enriched = enrichVirtualMarketTrades(executed, input.bundle, input.tnxBars);
  const lehmanTrades = resolveLehmanScenarioTrades({
    bundle: input.bundle,
    tnxBars: input.tnxBars,
    fromDate,
  });

  const fullRows = simulateScopeRows({
    trades: enriched,
    symbols,
    scopeId: 'full_history',
    mcRuns,
  });
  const lehmanRows = simulateScopeRows({
    trades: lehmanTrades as DynamicLotEnrichedTrade[],
    symbols,
    scopeId: 'lehman_scenario',
    mcRuns,
  });
  const schemeRows = [...fullRows, ...lehmanRows];

  const current = fullRows.find((r) => r.schemeId === 'rm700_current')!;
  const dynamic = fullRows.find((r) => r.schemeId === 'dynamic_switch')!;
  const kellyFixed = fullRows.find((r) => r.schemeId === 'kelly25_fixed')!;
  const lehmanCurrent = lehmanRows.find((r) => r.schemeId === 'rm700_current')!;
  const lehmanDynamic = lehmanRows.find((r) => r.schemeId === 'dynamic_switch')!;

  const ddGain = round3(Math.abs(current.maxDrawdownPct) - Math.abs(dynamic.maxDrawdownPct));
  const sharpeGain = round3((dynamic.sharpe ?? 0) - (current.sharpe ?? 0));
  const cumDelta = round3(dynamic.cumulativeReturnPct - current.cumulativeReturnPct);
  const pfDelta = round3((dynamic.profitFactor ?? 0) - (current.profitFactor ?? 0));
  const bkDelta = round3(dynamic.bankruptcyRatePct - current.bankruptcyRatePct);

  const { grade, verdictJa } = gradeDynamicLotAdoption({
    current,
    dynamic,
    kellyFixed,
    lehmanDynamic,
    lehmanCurrent,
  });

  const answerAJa =
    `A 現行との差: 累積${cumDelta >= 0 ? '+' : ''}${cumDelta}pt · MaxDD${ddGain >= 0 ? '+' : ''}${ddGain}pt · ` +
    `Sharpe${sharpeGain >= 0 ? '+' : ''}${sharpeGain} · PF${pfDelta >= 0 ? '+' : ''}${pfDelta} · 破産${bkDelta >= 0 ? '+' : ''}${bkDelta}pt`;

  const answerBJa = `B MaxDD改善量: 全期${ddGain}pt（${current.maxDrawdownPct}%→${dynamic.maxDrawdownPct}%）· リーマン級${round3(Math.abs(lehmanCurrent.maxDrawdownPct) - Math.abs(lehmanDynamic.maxDrawdownPct))}pt`;

  const answerCJa = `C Sharpe改善量: ${sharpeGain >= 0 ? '+' : ''}${sharpeGain}（${current.sharpe ?? '—'}→${dynamic.sharpe ?? '—'}）· Kelly25%固定${kellyFixed.sharpe ?? '—'}`;

  const answerDJa =
    `D 実運用価値: 動的切替Kelly発火${dynamic.kellyTriggerCount ?? 0}/${enriched.length}件 · ` +
    `リーマン級MaxDD${lehmanDynamic.maxDrawdownPct}% · 評価${grade}`;

  const answerEJa = `E 採用判定: ${grade} — ${verdictJa.replace(/^./, '')}`;

  const consistencyNoteJa =
    '監査39-58整合: ルール変更なし · 監査58 Kelly25%参考 · 監査53 RM700推奨 · ' +
    `切替条件=${SWITCH_CONDITION_JA} · MC${mcRuns}回`;

  const humanSummaryJa = [
    '監査59 動的ロット切替',
    FIXED_CONDITIONS_JA,
    SWITCH_CONDITION_JA,
    `全期間${enriched.length}取引 · リーマン級${lehmanTrades.length}取引`,
    `現行累積${current.cumulativeReturnPct}% · 動的${dynamic.cumulativeReturnPct}% · Kelly固定${kellyFixed.cumulativeReturnPct}%`,
    verdictJa,
    answerAJa,
    answerBJa,
    answerEJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    switchConditionJa: SWITCH_CONDITION_JA,
    referenceCapitalMYR: RM3000,
    fullHistoryTradeCount: enriched.length,
    lehmanTradeCount: lehmanTrades.length,
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

export async function runDynamicLotAudit(): Promise<ForwardDynamicLotAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  const tnxFetch = await fetchForwardOhlcvDetailed('^TNX', 15_000, EXTENDED_AUDIT_START);
  const tnxBars = tnxFetch.result.ok ? tnxFetch.bars : [];
  return buildDynamicLotAuditReport({ bundle, tnxBars });
}

export function formatDynamicLotCsv(report: ForwardDynamicLotAuditReport): string {
  const lines = [
    `# 最重要監査その59 動的ロット切替 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.switchConditionJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,scopeId,schemeId,label,kellyTriggers,trades,cumulative,maxDD,sharpe,pf,bankruptcyPct,minEquityPct,finalMYR,avgSlotMYR',
    ...report.schemeRows.map((r) =>
      [
        'scheme',
        r.scopeId,
        r.schemeId,
        `"${r.labelJa}"`,
        r.kellyTriggerCount ?? '',
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
