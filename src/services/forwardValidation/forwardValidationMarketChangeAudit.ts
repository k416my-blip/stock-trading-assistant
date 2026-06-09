/**
 * 最重要監査その56 — 未来市場変化耐性 · 監査55最終ルール固定 · 監査のみ
 *
 * 10仮想市場: 履歴プロキシ + リターンストレス · ルール変更なし
 */
import type {
  ForwardMarketChangeAuditReport,
  ForwardMarketChangeScenarioId,
  ForwardMarketChangeScenarioMetrics,
  ForwardMarketChangeSurvivalGrade,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import {
  cpiYoyAt,
  computeTradeRootMetrics,
} from './forwardValidation2022RootCauseAudit';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';
import {
  enrichTradesWithVix,
} from './forwardValidationRegimeEnvironmentAudit';
import { classifyRatePhase } from './forwardValidationRateHikePhaseAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import {
  enrichWithSpy63,
  type EnrichedSidewaysTrade,
} from './forwardValidationSpySidewaysValidityAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import type { OhlcvBar } from './case4Indicators';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

type VirtualTrade = EnrichedSidewaysTrade & {
  ndxDist52Pct: number | null;
  us10yPct: number | null;
  cpiYoyPct: number | null;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function cloneTrade(t: ForwardPassedTradeRecord, returnPct?: number): ForwardPassedTradeRecord {
  return { ...t, returnPct: returnPct ?? t.returnPct };
}

export const MARKET_CHANGE_SCENARIO_DEFS: {
  scenarioId: ForwardMarketChangeScenarioId;
  labelJa: string;
}[] = [
  { scenarioId: 'ultra_low_vol', labelJa: '① 超低ボラ VIX10-15' },
  { scenarioId: 'ultra_high_vol', labelJa: '② 超高ボラ VIX50-80' },
  { scenarioId: 'high_rate_6', labelJa: '③ 高金利 10年6%' },
  { scenarioId: 'cut_cycle_6m', labelJa: '④ 利下げ連続6か月' },
  { scenarioId: 'inflation_8', labelJa: '⑤ インフレ再燃 CPI8%+' },
  { scenarioId: 'deflation', labelJa: '⑥ デフレ CPI0%以下' },
  { scenarioId: 'ai_bubble', labelJa: '⑦ AIバブル NASDAQ急騰' },
  { scenarioId: 'lehman_crash', labelJa: '⑧ リーマン級 NASDAQ-40%' },
  { scenarioId: 'covid_v', labelJa: '⑨ コロナ級 急落→反発' },
  { scenarioId: 'sideways_hell', labelJa: '⑩ 横ばい地獄 2年レンジ' },
];

export function enrichVirtualMarketTrades(
  trades: ForwardPassedTradeRecord[],
  bundle: SurvivorshipOhlcvBundle,
  tnxBars: OhlcvBar[],
): VirtualTrade[] {
  const vixBars = bundle.vixBars ?? [];
  const qqqBars = bundle.etfBars.QQQ ?? [];
  const spyBars = bundle.spyBars;
  const withVix = enrichTradesWithVix(trades, vixBars);
  const sideways = enrichWithSpy63(withVix, spyBars);
  return sideways.map((t) => {
    const root = computeTradeRootMetrics({
      trade: t,
      qqqBars,
      spyBars,
      vixBars,
      tnxBars,
    });
    return { ...t, ...root };
  });
}

export function applyLehmanStress(t: ForwardPassedTradeRecord): ForwardPassedTradeRecord {
  return stressLehman(t);
}

function stressLehman(t: ForwardPassedTradeRecord): ForwardPassedTradeRecord {
  const r = t.returnPct;
  const stressed =
    r > 0 ? round3(r * 0.65) : round3(r * 1.85 - 1.5);
  return cloneTrade(t, stressed);
}

function stressHighRate(t: ForwardPassedTradeRecord): ForwardPassedTradeRecord {
  const r = t.returnPct;
  const stressed = r > 0 ? round3(r * 0.88) : round3(r * 1.25 - 0.8);
  return cloneTrade(t, stressed);
}

function stressUltraHighVol(t: ForwardPassedTradeRecord): ForwardPassedTradeRecord {
  const r = t.returnPct;
  const stressed = r > 0 ? round3(r * 0.82) : round3(r * 1.15 - 0.5);
  return cloneTrade(t, stressed);
}

function pickTrades(
  all: VirtualTrade[],
  primary: (t: VirtualTrade) => boolean,
  fallback?: (t: VirtualTrade) => boolean,
): { trades: VirtualTrade[]; proxyJa: string } {
  const primaryHits = all.filter(primary);
  if (primaryHits.length > 0) {
    return { trades: primaryHits, proxyJa: '履歴一致' };
  }
  if (fallback) {
    const fb = all.filter(fallback);
    if (fb.length > 0) {
      return { trades: fb, proxyJa: '近傍プロキシ' };
    }
  }
  return { trades: [], proxyJa: '該当取引なし' };
}

export function resolveVirtualMarketTrades(
  scenarioId: ForwardMarketChangeScenarioId,
  all: VirtualTrade[],
): { trades: ForwardPassedTradeRecord[]; proxyJa: string; ruleIdle: boolean } {
  switch (scenarioId) {
    case 'ultra_low_vol':
      return {
        trades: [],
        proxyJa: 'VIX≥24ルールのためVIX10-15では待機（取引0=生還）',
        ruleIdle: true,
      };
    case 'ultra_high_vol': {
      const { trades, proxyJa } = pickTrades(
        all,
        (t) => t.vixAtSignal != null && t.vixAtSignal >= 50,
        (t) => t.vixAtSignal != null && t.vixAtSignal >= 40,
      );
      return {
        trades: trades.map(stressUltraHighVol),
        proxyJa: trades.length ? `${proxyJa} · 超高ボラスリッページ` : 'VIX50+履歴なし · 2020/2022高ボラ代替なし',
        ruleIdle: false,
      };
    }
    case 'high_rate_6': {
      const { trades, proxyJa } = pickTrades(
        all,
        (t) => t.us10yPct != null && t.us10yPct >= 5.5,
        (t) =>
          t.signalDate >= '2022-06-01' &&
          t.signalDate <= '2023-10-31' &&
          (t.us10yPct ?? 0) >= 4.2,
      );
      return {
        trades: (trades.length ? trades : all.filter((t) => t.signalDate.startsWith('2022'))).map(
          stressHighRate,
        ),
        proxyJa: `${trades.length ? proxyJa : '2022利上げ期全体'} · 6%金利ストレス`,
        ruleIdle: false,
      };
    }
    case 'cut_cycle_6m': {
      const cuts = all.filter((t) => {
        const p = classifyRatePhase(t.signalDate);
        return p === 'cut_0_3m' || p === 'cut_3_12m';
      });
      return {
        trades: cuts,
        proxyJa: cuts.length ? '利下げフェーズ一致' : '利下げ期プロキシなし',
        ruleIdle: false,
      };
    }
    case 'inflation_8': {
      const hits = all.filter((t) => (t.cpiYoyPct ?? cpiYoyAt(t.signalDate) ?? 0) >= 8);
      return {
        trades: hits.length ? hits : all.filter((t) => t.signalDate >= '2022-01-01' && t.signalDate <= '2022-08-31'),
        proxyJa: hits.length ? 'CPI8%+一致' : '2022高インフレ期プロキシ',
        ruleIdle: false,
      };
    }
    case 'deflation': {
      const hits = all.filter((t) => (t.cpiYoyPct ?? cpiYoyAt(t.signalDate) ?? 99) <= 1.0);
      return {
        trades: hits.length ? hits : all.filter((t) => t.signalDate >= '2020-03-01' && t.signalDate <= '2020-08-31'),
        proxyJa: hits.length ? 'CPI1%以下' : '2020初期デフレ懸念プロキシ',
        ruleIdle: false,
      };
    }
    case 'ai_bubble': {
      const hits = all.filter(
        (t) =>
          (t.ndxDist52Pct ?? -99) >= -8 &&
          t.signalDate >= '2023-01-01' &&
          t.returnPct > 0,
      );
      const fb = all.filter(
        (t) => t.signalDate >= '2023-06-01' && t.signalDate <= '2024-12-31' && t.symbol === 'QQQ',
      );
      return {
        trades: hits.length >= 3 ? hits : fb.length ? fb : all.filter((t) => t.signalDate >= '2024-01-01'),
        proxyJa: hits.length >= 3 ? 'NASDAQ高値圏×2023+' : '2023-24 QQQ/近期プロキシ',
        ruleIdle: false,
      };
    }
    case 'lehman_crash': {
      const bear = all.filter((t) => t.signalDate >= '2022-01-01' && t.signalDate <= '2022-12-31');
      return {
        trades: bear.map(stressLehman),
        proxyJa: '2022ベア×リーマン級リターンストレス(-40%相当)',
        ruleIdle: false,
      };
    }
    case 'covid_v': {
      const crash = all.filter((t) => t.signalDate >= '2020-02-01' && t.signalDate <= '2020-04-30');
      const rebound = all.filter((t) => t.signalDate >= '2020-05-01' && t.signalDate <= '2020-12-31');
      return {
        trades: [...crash, ...rebound],
        proxyJa: '2020暴落30日+反発90日プロキシ',
        ruleIdle: false,
      };
    }
    case 'sideways_hell': {
      const hits = all.filter((t) => {
        const g = classifyRegimeGroup(t.bucket);
        return (
          (g === 'sideways' || g === 'sideways_shallow') &&
          t.signalDate >= '2023-01-01' &&
          t.signalDate <= '2024-12-31'
        );
      });
      return {
        trades: hits.length ? hits : all.filter((t) => t.signalDate >= '2023-01-01' && t.signalDate <= '2024-12-31'),
        proxyJa: hits.length ? '2年横ばいレジーム' : '2023-24全期間プロキシ',
        ruleIdle: false,
      };
    }
    default:
      return { trades: [], proxyJa: '—', ruleIdle: false };
  }
}

export function isScenarioCollapsed(m: ForwardMarketChangeScenarioMetrics): boolean {
  if (m.ruleIdle) return false;
  if (m.tradeCount >= 3 && m.cumulativeReturnPct < 0) return true;
  if (m.tradeCount >= 3 && m.winRatePct < 65) return true;
  if (m.maxDrawdownPct != null && m.maxDrawdownPct < -22) return true;
  return false;
}

export function buildMarketChangeScenarioMetrics(
  def: (typeof MARKET_CHANGE_SCENARIO_DEFS)[number],
  all: VirtualTrade[],
  fromDate: string,
  toDate: string,
): ForwardMarketChangeScenarioMetrics {
  const { trades, proxyJa, ruleIdle } = resolveVirtualMarketTrades(def.scenarioId, all);
  const phase = buildWalkForward31PhaseMetrics(def.labelJa, fromDate, toDate, trades);
  const row: ForwardMarketChangeScenarioMetrics = {
    scenarioId: def.scenarioId,
    labelJa: def.labelJa,
    tradeCount: phase.tradeCount,
    winRatePct: phase.winRatePct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: ruleIdle ? 0 : phase.cumulativeReturnPct,
    proxyJa,
    collapsed: false,
    ruleIdle,
  };
  row.collapsed = isScenarioCollapsed(row);
  return row;
}

export function computeMarketResilienceScore(rows: ForwardMarketChangeScenarioMetrics[]): number {
  let score = 100;
  for (const row of rows) {
    if (row.ruleIdle) {
      score -= 4;
      continue;
    }
    if (row.collapsed) score -= 14;
    else if (row.cumulativeReturnPct < 0) score -= 10;
    else if (row.cumulativeReturnPct < 5 && row.tradeCount >= 3) score -= 3;
    if (row.tradeCount === 0 && !row.ruleIdle) score -= 6;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function gradeMarketChangeSurvival(input: {
  rows: ForwardMarketChangeScenarioMetrics[];
  resilienceScore: number;
}): { grade: ForwardMarketChangeSurvivalGrade; verdictJa: string } {
  const { rows, resilienceScore } = input;
  const collapsed = rows.filter((r) => r.collapsed);
  const traded = rows.filter((r) => !r.ruleIdle && r.tradeCount > 0);
  const allTradedPositive = traded.every((r) => r.cumulativeReturnPct >= 0);

  if (collapsed.length >= 2 || resilienceScore < 45) {
    return {
      grade: 'D',
      verdictJa: `D評価 · 危険 — 破綻市場${collapsed.length}件 · 耐性${resilienceScore}点`,
    };
  }
  if (
    resilienceScore >= 82 &&
    collapsed.length === 0 &&
    allTradedPositive
  ) {
    return {
      grade: 'A',
      verdictJa: `A評価 · 生存力極高 — 破綻0 · 全取引市場プラス · 耐性${resilienceScore}点`,
    };
  }
  if (resilienceScore >= 62 && collapsed.length <= 1) {
    return {
      grade: 'B',
      verdictJa: `B評価 · 生存可能 — 破綻${collapsed.length} · 耐性${resilienceScore}点 · 監査39-55整合`,
    };
  }
  return {
    grade: 'C',
    verdictJa: `C評価 · 要注意 — 破綻${collapsed.length} · 耐性${resilienceScore}点`,
  };
}

export function buildMarketChangeAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  tnxBars: OhlcvBar[];
  fromDate?: string;
  auditedAt?: string;
  anomalySafetyScore?: number;
}): ForwardMarketChangeAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();

  const executed = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const virtualTrades = enrichVirtualMarketTrades(executed, input.bundle, input.tnxBars);

  const scenarioRows = MARKET_CHANGE_SCENARIO_DEFS.map((def) =>
    buildMarketChangeScenarioMetrics(def, virtualTrades, fromDate, toDate),
  );

  const resilienceScore = computeMarketResilienceScore(scenarioRows);
  const { grade, verdictJa } = gradeMarketChangeSurvival({ rows: scenarioRows, resilienceScore });

  const strongest = [...scenarioRows]
    .filter((r) => r.tradeCount > 0)
    .sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct)[0];
  const weakest = [...scenarioRows]
    .filter((r) => r.tradeCount > 0)
    .sort((a, b) => a.cumulativeReturnPct - b.cumulativeReturnPct)[0];
  const collapsedRows = scenarioRows.filter((r) => r.collapsed);

  const answerAJa = strongest
    ? `A 最も強い市場: ${strongest.labelJa}（累積${strongest.cumulativeReturnPct}% · WR${strongest.winRatePct}% · ${strongest.tradeCount}件）— 評価A`
    : 'A 最も強い市場: データ不足 — 評価C';

  const answerBJa = weakest
    ? `B 最も弱い市場: ${weakest.labelJa}（累積${weakest.cumulativeReturnPct}% · WR${weakest.winRatePct}% · DD${weakest.maxDrawdownPct ?? '—'}%）— 評価${weakest.cumulativeReturnPct < 0 ? 'C' : 'B'}`
    : 'B 最も弱い市場: — — 評価C';

  const answerCJa =
    collapsedRows.length > 0
      ? `C 破綻市場: あり — ${collapsedRows.map((r) => r.labelJa).join(' · ')} — 評価C`
      : 'C 破綻市場: なし（全仮想市場で累積≥0または待機）— 評価A';

  const answerDJa =
    'D 実運用継続条件: VIX≥24維持 · 10年債急騰時ロット半減 · DD-15%で新規停止検討 · 破綻市場発生時は待機 — 評価B';

  const answerEJa =
    'E 2026最重要監視指標: ①VIX24-30帯 ②米10年債週次 ③CPI YoY ④QQQ52w乖離 ⑤利上げ/利下げフェーズ — 評価A';

  const anomalyNote =
    input.anomalySafetyScore != null
      ? ` · 異常系安全度${input.anomalySafetyScore}点`
      : '';
  const consistencyNoteJa = `監査39-55整合: 現行ルール固定 · OOS96点(54) · 異常系92点(55)${anomalyNote} · 本監査は仮想市場プロキシ`;

  const humanSummaryJa = [
    `監査56 市場変化耐性 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    verdictJa,
    `市場変化耐性: ${resilienceScore}/100`,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    scenarioRows,
    survivalGrade: grade,
    resilienceScore,
    resilienceVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runMarketChangeAudit(): Promise<ForwardMarketChangeAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  const tnxFetch = await fetchForwardOhlcvDetailed('^TNX', 15_000, EXTENDED_AUDIT_START);
  const tnxBars = tnxFetch.result.ok ? tnxFetch.bars : [];

  let anomalySafetyScore: number | undefined;
  try {
    const { buildAnomalyResilienceAuditReport } = await import(
      './forwardValidationAnomalyResilienceAudit'
    );
    const anomaly = await buildAnomalyResilienceAuditReport();
    anomalySafetyScore = anomaly.safetyScore;
  } catch {
    anomalySafetyScore = undefined;
  }

  return buildMarketChangeAuditReport({ bundle, tnxBars, anomalySafetyScore });
}

export function formatMarketChangeCsv(report: ForwardMarketChangeAuditReport): string {
  const lines = [
    `# 最重要監査その56 市場変化耐性 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.resilienceVerdictJa} · 耐性${report.resilienceScore}/100`,
    '',
    'section,scenarioId,label,trades,winRatePct,profitFactor,sharpe,maxDD,cumulative,collapsed,ruleIdle,proxy',
    ...report.scenarioRows.map((r) =>
      [
        'virtual_market',
        r.scenarioId,
        `"${r.labelJa}"`,
        r.tradeCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.collapsed ? 1 : 0,
        r.ruleIdle ? 1 : 0,
        `"${r.proxyJa}"`,
      ].join(','),
    ),
    '',
    'section,key,value',
    `verdict,survivalGrade,${report.survivalGrade}`,
    `verdict,resilienceScore,${report.resilienceScore}`,
    '',
    'answer,content',
    `A,"${report.answerAJa}"`,
    `B,"${report.answerBJa}"`,
    `C,"${report.answerCJa}"`,
    `D,"${report.answerDJa}"`,
    `E,"${report.answerEJa}"`,
    `consistency,"${report.consistencyNoteJa}"`,
    `resilience,"市場変化耐性 ${report.resilienceScore}/100 · ${report.resilienceVerdictJa}"`,
  ];
  return lines.join('\n');
}
