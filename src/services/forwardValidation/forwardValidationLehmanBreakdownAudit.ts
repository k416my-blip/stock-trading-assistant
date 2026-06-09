/**
 * 最重要監査その57 — リーマン級破綻原因分析 · 監査56⑧固定 · ルール変更禁止 · 原因究明のみ
 */
import type {
  ForwardLehmanBreakdownAuditReport,
  ForwardLehmanCauseId,
  ForwardLehmanCauseRankRow,
  ForwardLehmanCommonFactorRow,
  ForwardLehmanCounterfactualMetrics,
  ForwardLehmanFixGrade,
  ForwardLehmanLossRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import {
  enrichVirtualMarketTrades,
  resolveVirtualMarketTrades,
} from './forwardValidationMarketChangeAudit';
import {
  classifyRatePhase,
  isVix24_26,
  phaseLabelJa,
} from './forwardValidationRateHikePhaseAudit';
import { matchesCoreDanger } from './forwardValidationReproducibilityAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import type { OhlcvBar } from './case4Indicators';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

const SCENARIO_LABEL = '⑧ リーマン級暴落（2022ベア×-40%ストレス）';

type LehmanTrade = ReturnType<typeof enrichVirtualMarketTrades>[number] &
  ForwardPassedTradeRecord;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function absLoss(t: { returnPct: number }): number {
  return t.returnPct < 0 ? Math.abs(t.returnPct) : 0;
}

export function buildLehmanLossRow(rank: number, t: LehmanTrade): ForwardLehmanLossRow {
  const phase = classifyRatePhase(t.signalDate);
  return {
    rank,
    signalDate: t.signalDate,
    symbol: t.symbol,
    returnPct: t.returnPct,
    vix: t.vixAtSignal,
    qqqMa200DevPct: t.qqqMa200DevPct,
    ratePhaseJa: phaseLabelJa(phase),
    ndxDist52Pct: t.ndxDist52Pct,
    cpiYoyPct: t.cpiYoyPct,
    matchesCoreDanger: matchesCoreDanger(t),
  };
}

export function buildLehmanCommonFactors(topLosses: LehmanTrade[]): ForwardLehmanCommonFactorRow[] {
  const n = topLosses.length;
  if (n === 0) return [];

  const defs: { factorJa: string; match: (t: LehmanTrade) => boolean }[] = [
    { factorJa: 'QQQ銘柄', match: (t) => t.symbol === 'QQQ' },
    { factorJa: '核心危険（利上げ0-3m×QQQ×VIX24-26）', match: (t) => matchesCoreDanger(t) },
    { factorJa: 'VIX24-26帯', match: (t) => isVix24_26(t.vixAtSignal) },
    { factorJa: '利上げ0-3か月', match: (t) => classifyRatePhase(t.signalDate) === 'hike_0_3m' },
    { factorJa: 'NASDAQ52w -15%以下', match: (t) => (t.ndxDist52Pct ?? 0) <= -15 },
    { factorJa: 'QQQ200MA -10%以下', match: (t) => (t.qqqMa200DevPct ?? 0) <= -10 },
    { factorJa: 'CPI8%以上', match: (t) => (t.cpiYoyPct ?? 0) >= 8 },
    { factorJa: '10年債4.5%以上', match: (t) => (t.us10yPct ?? 0) >= 4.5 },
  ];

  return defs
    .map((d) => {
      const hitCount = topLosses.filter(d.match).length;
      return {
        factorJa: d.factorJa,
        hitCount,
        hitRatePct: round3((hitCount / n) * 100),
      };
    })
    .sort((a, b) => b.hitCount - a.hitCount);
}

export function buildLehmanCauseRanking(
  losses: LehmanTrade[],
  allLehman: LehmanTrade[],
): ForwardLehmanCauseRankRow[] {
  const totalLoss = losses.reduce((s, t) => s + absLoss(t), 0) || 1;

  const buckets: {
    causeId: ForwardLehmanCauseId;
    labelJa: string;
    match: (t: LehmanTrade) => boolean;
    noteJa: string;
  }[] = [
    {
      causeId: 'vix',
      labelJa: 'A VIX',
      match: (t) => isVix24_26(t.vixAtSignal) || (t.vixAtSignal ?? 0) >= 30,
      noteJa: 'VIX24-26帯またはVIX30+の損失寄与',
    },
    {
      causeId: 'rate',
      labelJa: 'B 金利',
      match: (t) => {
        const p = classifyRatePhase(t.signalDate);
        return p.startsWith('hike_');
      },
      noteJa: '2022利上げフェーズ集中',
    },
    {
      causeId: 'ndx_dev',
      labelJa: 'C NASDAQ乖離',
      match: (t) =>
        (t.ndxDist52Pct ?? 0) <= -10 || (t.qqqMa200DevPct ?? 0) <= -8,
      noteJa: 'NASDAQ/QQQ200MA深い乖離',
    },
    {
      causeId: 'cpi',
      labelJa: 'D CPI',
      match: (t) => (t.cpiYoyPct ?? 0) >= 7.5,
      noteJa: '高インフレ期の損失',
    },
    {
      causeId: 'entry_freq',
      labelJa: 'E エントリー頻度',
      match: (t) => t.symbol === 'QQQ' && t.signalDate >= '2022-01-01' && t.signalDate <= '2022-06-30',
      noteJa: '2022上半期QQQ集中エントリー',
    },
    {
      causeId: 'position_size',
      labelJa: 'F ポジションサイズ',
      match: (t) => t.symbol === 'QQQ',
      noteJa: 'QQQ偏重（勝率重みでロット集中リスク）',
    },
  ];

  const rows = buckets.map((b) => {
    const hitLosses = losses.filter(b.match);
    const lossShare = hitLosses.reduce((s, t) => s + absLoss(t), 0);
    return {
      causeId: b.causeId,
      labelJa: b.labelJa,
      rank: 0,
      lossSharePct: round3((lossShare / totalLoss) * 100),
      hitCount: hitLosses.length,
      noteJa: `${b.noteJa} · 全${allLehman.length}件中${allLehman.filter(b.match).length}件`,
    };
  });

  rows.sort((a, b) => b.lossSharePct - a.lossSharePct || b.hitCount - a.hitCount);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function deriveLehmanAvoidancePredicate(
  causeRows: ForwardLehmanCauseRankRow[],
  commonFactors: ForwardLehmanCommonFactorRow[],
): { match: (t: LehmanTrade) => boolean; conditionJa: string } {
  const topCause = causeRows[0];
  const topFactor = commonFactors[0];

  if (topFactor?.factorJa.includes('核心危険') && (topFactor.hitRatePct ?? 0) >= 50) {
    return {
      match: (t) => matchesCoreDanger(t),
      conditionJa: '核心危険（利上げ0-3m×QQQ×VIX24-26）のみ回避',
    };
  }

  switch (topCause?.causeId) {
    case 'vix':
      return {
        match: (t) => isVix24_26(t.vixAtSignal),
        conditionJa: 'VIX24-26帯エントリーのみ回避',
      };
    case 'rate':
      return {
        match: (t) => classifyRatePhase(t.signalDate) === 'hike_0_3m' && t.symbol === 'QQQ',
        conditionJa: '利上げ0-3m×QQQのみ回避',
      };
    case 'ndx_dev':
      return {
        match: (t) => (t.ndxDist52Pct ?? 0) <= -15 && t.symbol === 'QQQ',
        conditionJa: 'QQQ×NASDAQ52w-15%以下のみ回避',
      };
    case 'entry_freq':
    case 'position_size':
      return {
        match: (t) => t.symbol === 'QQQ' && t.signalDate >= '2022-01-01' && t.signalDate <= '2022-06-30',
        conditionJa: '2022上半期QQQエントリーのみ回避',
      };
    default:
      return {
        match: (t) => matchesCoreDanger(t),
        conditionJa: '核心危険（利上げ0-3m×QQQ×VIX24-26）のみ回避',
      };
  }
}

function toCounterfactualMetrics(
  labelJa: string,
  avoidConditionJa: string,
  skippedCount: number,
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
): ForwardLehmanCounterfactualMetrics {
  const phase = buildWalkForward31PhaseMetrics(labelJa, fromDate, toDate, trades);
  return {
    labelJa,
    avoidConditionJa,
    skippedCount,
    tradeCount: phase.tradeCount,
    winRatePct: phase.winRatePct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: phase.cumulativeReturnPct,
  };
}

export function gradeLehmanFix(input: {
  baseline: ForwardLehmanCounterfactualMetrics;
  counterfactual: ForwardLehmanCounterfactualMetrics;
  primaryCause: ForwardLehmanCauseRankRow | null;
  coreDangerSkipped: number;
}): { grade: ForwardLehmanFixGrade; verdictJa: string } {
  const { baseline, counterfactual, primaryCause, coreDangerSkipped } = input;
  const cumDelta = counterfactual.cumulativeReturnPct - baseline.cumulativeReturnPct;
  const ddImproved =
    (counterfactual.maxDrawdownPct ?? 0) > (baseline.maxDrawdownPct ?? 0);

  if (
    cumDelta >= 15 &&
    counterfactual.cumulativeReturnPct >= 0 &&
    ddImproved &&
    coreDangerSkipped <= 3
  ) {
    return {
      grade: 'A',
      verdictJa: `A評価 · 修正価値大 — 回避後累積${counterfactual.cumulativeReturnPct}%（+${round3(cumDelta)}pt）· ただし監査51過学習要確認`,
    };
  }

  if (cumDelta >= 8 && counterfactual.cumulativeReturnPct > baseline.cumulativeReturnPct) {
    return {
      grade: 'B',
      verdictJa: `B評価 · 修正候補 — 主因${primaryCause?.labelJa ?? '—'} · 回避後累積${counterfactual.cumulativeReturnPct}%（+${round3(cumDelta)}pt）· 採用は次監査要`,
    };
  }

  return {
    grade: 'C',
    verdictJa: `C評価 · 修正不要 — リーマン級ストレス限定改善または効果不足 · 現行ルール維持（監査51/52/56整合）`,
  };
}

export function buildLehmanBreakdownAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  tnxBars: OhlcvBar[];
  fromDate?: string;
  auditedAt?: string;
  marketResilienceScore?: number;
}): ForwardLehmanBreakdownAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();

  const executed = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const virtual = enrichVirtualMarketTrades(executed, input.bundle, input.tnxBars);
  const { trades: lehmanTrades } = resolveVirtualMarketTrades('lehman_crash', virtual);
  const lehmanEnriched = virtual.filter(
    (t) => t.signalDate >= '2022-01-01' && t.signalDate <= '2022-12-31',
  );
  const stressedMap = new Map(lehmanTrades.map((t) => [`${t.signalDate}_${t.symbol}`, t]));
  const allLehman: LehmanTrade[] = lehmanEnriched.map((t) => {
    const key = `${t.signalDate}_${t.symbol}`;
    const stressed = stressedMap.get(key);
    return stressed ? { ...t, returnPct: stressed.returnPct } : t;
  });

  const losses = allLehman.filter((t) => t.returnPct < 0).sort((a, b) => a.returnPct - b.returnPct);
  const top20 = losses.slice(0, 20);
  const top10 = losses.slice(0, 10);

  const lossRows = top20.map((t, i) => buildLehmanLossRow(i + 1, t));
  const commonFactorRows = buildLehmanCommonFactors(top10);
  const causeRankRows = buildLehmanCauseRanking(losses, allLehman);

  const baselineMetrics = toCounterfactualMetrics(
    'リーマン級ベースライン',
    '—',
    0,
    lehmanTrades,
    '2022-01-01',
    '2022-12-31',
  );

  const { match: avoidMatch, conditionJa } = deriveLehmanAvoidancePredicate(
    causeRankRows,
    commonFactorRows,
  );
  const skipped = allLehman.filter(avoidMatch);
  const counterfactualTrades = lehmanTrades.filter((t) => {
    const enriched = allLehman.find(
      (e) => e.signalDate === t.signalDate && e.symbol === t.symbol,
    );
    return enriched ? !avoidMatch(enriched) : true;
  });

  const counterfactualMetrics = toCounterfactualMetrics(
    '条件回避カウンターファクチュアル',
    conditionJa,
    skipped.length,
    counterfactualTrades,
    '2022-01-01',
    '2022-12-31',
  );

  const primaryCause = causeRankRows[0] ?? null;
  const secondaryCause = causeRankRows[1] ?? null;
  const coreDangerSkipped = skipped.filter((t) => matchesCoreDanger(t)).length;

  const { grade, verdictJa } = gradeLehmanFix({
    baseline: baselineMetrics,
    counterfactual: counterfactualMetrics,
    primaryCause,
    coreDangerSkipped,
  });

  const answerAJa = primaryCause
    ? `A 破綻主因: ${primaryCause.labelJa}（損失寄与${primaryCause.lossSharePct}% · ${primaryCause.hitCount}件）— ${primaryCause.noteJa}`
    : 'A 破綻主因: データ不足 — 評価C';

  const answerBJa = secondaryCause
    ? `B 二次要因: ${secondaryCause.labelJa}（損失寄与${secondaryCause.lossSharePct}%）— 評価B`
    : 'B 二次要因: — — 評価C';

  const avoidPossible =
    counterfactualMetrics.cumulativeReturnPct > baselineMetrics.cumulativeReturnPct;
  const answerCJa = avoidPossible
    ? `C 回避可能か: 条件付き可 — ${conditionJa} · 累積${baselineMetrics.cumulativeReturnPct}%→${counterfactualMetrics.cumulativeReturnPct}% · 評価B`
    : `C 回避可能か: 限定的 — 単一条件回避では不十分 · 累積${baselineMetrics.cumulativeReturnPct}% — 評価C`;

  const answerDJa =
    coreDangerSkipped > 0 || conditionJa.includes('核心')
      ? `D 過学習リスク: 高 — 監査51で同一条件（核心2件・2022特化）不採用済 · Bootstrap非有意 · 評価C`
      : `D 過学習リスク: 中 — 要ウォークフォワード再検証 · 評価B`;

  const answerEJa =
    'E 次監査候補: ①核心条件ウォークフォワード再検証 ②リーマン級MC1000 ③VIX30+単独分析 ④ロット上限シミュ — 評価A';

  const resilienceNote =
    input.marketResilienceScore != null
      ? ` · 市場変化耐性${input.marketResilienceScore}点(56)`
      : '';
  const consistencyNoteJa = `監査39-56整合: ルール変更なし · 監査51損失停止不採用 · 監査56⑧破綻${baselineMetrics.cumulativeReturnPct}%${resilienceNote} · 本監査は原因分析のみ`;

  const humanSummaryJa = [
    '監査57 リーマン級破綻原因',
    FIXED_CONDITIONS_JA,
    SCENARIO_LABEL,
    `ベースライン累積${baselineMetrics.cumulativeReturnPct}% · MaxDD${baselineMetrics.maxDrawdownPct ?? '—'}%`,
    verdictJa,
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
    scenarioLabelJa: SCENARIO_LABEL,
    baselineCumulativePct: baselineMetrics.cumulativeReturnPct,
    baselineMaxDrawdownPct: baselineMetrics.maxDrawdownPct,
    lossRows,
    commonFactorRows,
    causeRankRows,
    baselineMetrics,
    counterfactualMetrics,
    fixGrade: grade,
    fixVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runLehmanBreakdownAudit(): Promise<ForwardLehmanBreakdownAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  const tnxFetch = await fetchForwardOhlcvDetailed('^TNX', 15_000, EXTENDED_AUDIT_START);
  const tnxBars = tnxFetch.result.ok ? tnxFetch.bars : [];

  let marketResilienceScore: number | undefined;
  try {
    const { buildMarketChangeAuditReport } = await import('./forwardValidationMarketChangeAudit');
    const mc = buildMarketChangeAuditReport({ bundle, tnxBars });
    marketResilienceScore = mc?.resilienceScore;
  } catch {
    marketResilienceScore = undefined;
  }

  return buildLehmanBreakdownAuditReport({ bundle, tnxBars, marketResilienceScore });
}

export function formatLehmanBreakdownCsv(report: ForwardLehmanBreakdownAuditReport): string {
  const lines = [
    `# 最重要監査その57 リーマン級破綻原因 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.scenarioLabelJa} · 累積${report.baselineCumulativePct}% · MaxDD${report.baselineMaxDrawdownPct ?? '—'}%`,
    `# ${report.fixVerdictJa}`,
    '',
    'section,rank,signalDate,symbol,returnPct,vix,qqqMa200Dev,ratePhase,ndxDist52,cpiYoy,coreDanger',
    ...report.lossRows.map((r) =>
      [
        'top_loss',
        r.rank,
        r.signalDate,
        r.symbol,
        r.returnPct,
        r.vix ?? '',
        r.qqqMa200DevPct ?? '',
        `"${r.ratePhaseJa}"`,
        r.ndxDist52Pct ?? '',
        r.cpiYoyPct ?? '',
        r.matchesCoreDanger ? 1 : 0,
      ].join(','),
    ),
    '',
    'section,factorJa,hitCount,hitRatePct',
    ...report.commonFactorRows.map((r) =>
      ['common_factor', `"${r.factorJa}"`, r.hitCount, r.hitRatePct].join(','),
    ),
    '',
    'section,causeRank,causeId,label,lossSharePct,hitCount,note',
    ...report.causeRankRows.map((r) =>
      [
        'cause_rank',
        r.rank,
        r.causeId,
        `"${r.labelJa}"`,
        r.lossSharePct,
        r.hitCount,
        `"${r.noteJa}"`,
      ].join(','),
    ),
    '',
    'section,variant,label,avoidCondition,skipped,trades,winRatePct,profitFactor,sharpe,maxDD,cumulative',
    [report.baselineMetrics, report.counterfactualMetrics].map((m) =>
      [
        'counterfactual',
        m.labelJa === report.baselineMetrics.labelJa ? 'baseline' : 'avoid',
        `"${m.labelJa}"`,
        `"${m.avoidConditionJa}"`,
        m.skippedCount,
        m.tradeCount,
        m.winRatePct,
        m.profitFactor ?? '',
        m.sharpe ?? '',
        m.maxDrawdownPct ?? '',
        m.cumulativeReturnPct,
      ].join(','),
    ),
    '',
    'section,key,value',
    `verdict,fixGrade,${report.fixGrade}`,
    '',
    'answer,content',
    `A,"${report.answerAJa}"`,
    `B,"${report.answerBJa}"`,
    `C,"${report.answerCJa}"`,
    `D,"${report.answerDJa}"`,
    `E,"${report.answerEJa}"`,
    `consistency,"${report.consistencyNoteJa}"`,
  ];
  return lines.join('\n');
}
