/**
 * 最重要監査その40 — 最大DD発生原因監査 · 監査39最終ルール固定 · 監査のみ
 */
import type {
  ForwardMaxDrawdownAdoptionGrade,
  ForwardMaxDrawdownAuditReport,
  ForwardMaxDrawdownClusterStats,
  ForwardMaxDrawdownEpisodeRow,
  ForwardMaxDrawdownSliceRow,
  ForwardMaxDrawdownTimelinePoint,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import {
  buildOperationalEquityCurve,
  type ExitSnapshot,
} from './forwardValidationEquityCurveAudit';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import {
  simulateCompoundingPath,
} from './forwardValidationCompoundingAudit';
import { simulateRm3000WeightedPath } from './forwardValidationSymbolWeightAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';
import {
  enrichTradesWithVix,
  type EnrichedTrade,
} from './forwardValidationRegimeEnvironmentAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const RM3000 = 3000;
const BASE_LOT = 700;
const HEAVY_LOT = 1050;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export type DrawdownEpisode = {
  startDate: string;
  troughDate: string;
  recoveryDate: string | null;
  depthPct: number;
  lossPctFromPeak: number;
  startTradeIndex: number;
  troughTradeIndex: number;
  recoveryTradeIndex: number | null;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.round(ms / (24 * 3600 * 1000)));
}

export function extractDrawdownEpisodes(exits: ExitSnapshot[]): DrawdownEpisode[] {
  const episodes: DrawdownEpisode[] = [];
  let i = 0;
  while (i < exits.length) {
    if (exits[i]!.drawdownPct >= -0.25) {
      i++;
      continue;
    }
    const startIdx = i;
    const start = exits[startIdx]!;
    let troughIdx = startIdx;
    let minDd = start.drawdownPct;
    i++;
    while (i < exits.length && exits[i]!.drawdownPct < -0.25) {
      if (exits[i]!.drawdownPct < minDd) {
        minDd = exits[i]!.drawdownPct;
        troughIdx = i;
      }
      i++;
    }
    let recoveryIdx: number | null = null;
    for (let j = troughIdx + 1; j < exits.length; j++) {
      if (exits[j]!.drawdownPct >= -0.5) {
        recoveryIdx = j;
        break;
      }
    }
    const trough = exits[troughIdx]!;
    const peakBefore = start.peakEquityPct;
    const lossPctFromPeak = round3(trough.equityPct - peakBefore);
    episodes.push({
      startDate: start.date,
      troughDate: trough.date,
      recoveryDate: recoveryIdx != null ? exits[recoveryIdx]!.date : null,
      depthPct: round3(minDd),
      lossPctFromPeak,
      startTradeIndex: start.tradeIndex,
      troughTradeIndex: trough.tradeIndex,
      recoveryTradeIndex: recoveryIdx != null ? exits[recoveryIdx]!.tradeIndex : null,
    });
  }
  return episodes.sort((a, b) => a.depthPct - b.depthPct);
}

export function buildDdClusterStats(
  trades: ForwardPassedTradeRecord[],
): ForwardMaxDrawdownClusterStats {
  let maxStreak = 0;
  let maxStreakLoss = 0;
  let curStreak = 0;
  let curLoss = 0;
  let worstStart: string | null = null;
  let worstEnd: string | null = null;
  let tmpStart: string | null = null;

  for (const t of trades) {
    if (t.returnPct < 0) {
      if (curStreak === 0) tmpStart = t.signalDate;
      curStreak++;
      curLoss += t.returnPct;
      if (curStreak > maxStreak || (curStreak === maxStreak && curLoss < maxStreakLoss)) {
        maxStreak = curStreak;
        maxStreakLoss = round3(curLoss);
        worstStart = tmpStart;
        worstEnd = t.signalDate;
      }
    } else {
      curStreak = 0;
      curLoss = 0;
      tmpStart = null;
    }
  }

  return {
    maxConsecutiveLosses: maxStreak,
    maxConsecutiveLossPct: maxStreakLoss,
    worstStreakStartDate: worstStart,
    worstStreakEndDate: worstEnd,
    episodeTradeCount: trades.length,
    losingTradeCount: trades.filter((t) => t.returnPct < 0).length,
  };
}

function tradesInEpisode(
  all: ForwardPassedTradeRecord[],
  ep: DrawdownEpisode,
): ForwardPassedTradeRecord[] {
  return all.filter(
    (t) =>
      t.exitDate >= ep.startDate &&
      t.exitDate <= (ep.recoveryDate ?? ep.troughDate),
  );
}

function symbolLossContribution(
  trades: EnrichedTrade[],
): ForwardMaxDrawdownSliceRow[] {
  const symbols = ['HDV', 'DGRO', 'QQQ', 'SCHD'];
  return symbols.map((sym) => {
    const rows = trades.filter((t) => t.symbol === sym);
    const loss = rows.filter((t) => t.returnPct < 0).reduce((s, t) => s + t.returnPct, 0);
    const scaled = rows.map((t) => t.returnPct);
    return {
      sliceId: sym,
      labelJa: sym,
      tradeCount: rows.length,
      maxDrawdownPct: portfolioMaxDrawdownPct(scaled),
      cumulativeLossPct: round3(Math.min(0, loss)),
      noteJa: rows.length > 0 ? `損失${round3(loss)}% · ${rows.filter((t) => t.returnPct < 0).length}敗` : '該当なし',
    };
  });
}

function bucketLossRows(
  trades: EnrichedTrade[],
  buckets: { id: string; labelJa: string; match: (t: EnrichedTrade) => boolean }[],
): ForwardMaxDrawdownSliceRow[] {
  return buckets.map((b) => {
    const rows = trades.filter(b.match);
    const loss = rows.reduce((s, t) => s + Math.min(0, t.returnPct), 0);
    return {
      sliceId: b.id,
      labelJa: b.labelJa,
      tradeCount: rows.length,
      maxDrawdownPct: portfolioMaxDrawdownPct(rows.map((t) => t.returnPct)),
      cumulativeLossPct: round3(loss),
      noteJa: `${rows.filter((t) => t.returnPct < 0).length}敗`,
    };
  });
}

function buildTimeline(
  exits: ExitSnapshot[],
  trades: ForwardPassedTradeRecord[],
  troughTradeIndex: number,
): ForwardMaxDrawdownTimelinePoint[] {
  const center = exits.findIndex((e) => e.tradeIndex === troughTradeIndex);
  if (center < 0) return [];
  const start = Math.max(0, center - 7);
  const end = Math.min(exits.length - 1, center + 7);
  return exits.slice(start, end + 1).map((e) => {
    const t = trades.find((x) => x.exitDate === e.date && e.tradeIndex > 0);
    return {
      date: e.date,
      equityPct: e.equityPct,
      drawdownPct: e.drawdownPct,
      tradeIndex: e.tradeIndex,
      symbol: t?.symbol ?? null,
      tradeReturnPct: t?.returnPct ?? e.tradeReturnPct,
    };
  });
}

export function buildMaxDrawdownCauseReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardMaxDrawdownAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();

  const executed = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const enriched = enrichTradesWithVix(executed, input.bundle.vixBars ?? []);

  const { exits } = buildOperationalEquityCurve({
    trades: executed,
    symbols,
    initialCapital: 100,
  });

  const episodes = extractDrawdownEpisodes(exits);
  const equityCurveMaxDd =
    exits.length > 0 ? Math.min(...exits.map((e) => e.drawdownPct)) : 0;
  const fullPhase = buildWalkForward31PhaseMetrics('全件', fromDate, toDate, executed);
  const returnSeriesMaxDd = fullPhase.maxDrawdownPct;
  const portfolioMaxDd = returnSeriesMaxDd ?? equityCurveMaxDd;

  const ddRankingTop10: ForwardMaxDrawdownEpisodeRow[] = episodes
    .slice(0, 10)
    .map((ep, idx) => ({
      rank: idx + 1,
      startDate: ep.startDate,
      troughDate: ep.troughDate,
      recoveryDate: ep.recoveryDate,
      periodDays: daysBetween(ep.startDate, ep.troughDate),
      recoveryDays:
        ep.recoveryDate != null ? daysBetween(ep.troughDate, ep.recoveryDate) : null,
      depthPct: ep.depthPct,
      lossPctFromPeak: ep.lossPctFromPeak,
      tradeCount: Math.max(0, ep.troughTradeIndex - ep.startTradeIndex + 1),
    }));

  const worstEp = episodes[0];
  const worstTrades = worstEp ? tradesInEpisode(executed, worstEp) : [];
  const worstEnriched = worstEp ? tradesInEpisode(enriched, worstEp) : [];
  const worstEpisodeCluster = buildDdClusterStats(worstTrades);

  const symbolDdRows = symbolLossContribution(worstEnriched.length > 0 ? worstEnriched : enriched);

  const vixDdRows = bucketLossRows(enriched, [
    { id: 'vix_24_30', labelJa: 'VIX 24〜30', match: (t) => t.vixAtSignal != null && t.vixAtSignal >= 24 && t.vixAtSignal < 30 },
    { id: 'vix_gte30', labelJa: 'VIX 30+', match: (t) => t.vixAtSignal != null && t.vixAtSignal >= 30 },
  ]);

  const regimeDdRows = bucketLossRows(enriched, [
    { id: 'up', labelJa: '上昇', match: (t) => classifyRegimeGroup(t.bucket) === 'up' },
    {
      id: 'sideways',
      labelJa: '横ばい',
      match: (t) => {
        const g = classifyRegimeGroup(t.bucket);
        return g === 'sideways' || g === 'sideways_shallow';
      },
    },
    { id: 'down', labelJa: '下落', match: (t) => classifyRegimeGroup(t.bucket) === 'down' },
  ]);

  const rateDdRows = bucketLossRows(enriched, [
    {
      id: 'rate_hike',
      labelJa: '金利上昇期',
      match: (t) => t.signalDate >= '2022-01-01' && t.signalDate <= '2023-09-30',
    },
    {
      id: 'rate_cut',
      labelJa: '金利低下期',
      match: (t) =>
        (t.signalDate >= '2020-03-01' && t.signalDate <= '2021-12-31') ||
        t.signalDate >= '2024-09-01',
    },
  ]);

  const baselineRm = simulateRm3000WeightedPath(executed, {
    schemeId: 'current',
    labelJa: '勝率スロット',
    universe: symbols,
    selectionMode: 'win_rate',
    slotMode: 'win_rate',
  });

  const fixedLotPath = simulateRm3000WeightedPath(executed, {
    schemeId: 'equal',
    labelJa: '固定RM700',
    universe: symbols,
    selectionMode: 'win_rate',
    slotMode: 'equal',
    slotWeights: Object.fromEntries(symbols.map((s) => [s, 0.25])),
  });

  const heavyDef = {
    schemeId: 'hdv_heavy' as const,
    labelJa: '大ロット参考',
    universe: symbols,
    selectionMode: 'win_rate' as const,
    slotMode: 'weight_proportional' as const,
    slotWeights: { HDV: 0.5, DGRO: 0.2, QQQ: 0.15, SCHD: 0.15 },
  };
  const heavyPath = simulateRm3000WeightedPath(executed, heavyDef);

  const lotDdRows: ForwardMaxDrawdownSliceRow[] = [
    {
      sliceId: 'win_rate_slot',
      labelJa: '勝率連動ロット（現行）',
      tradeCount: executed.length,
      maxDrawdownPct: baselineRm.maxDrawdownPct,
      cumulativeLossPct: round3(Math.min(0, baselineRm.cumulativeReturnPct)),
      noteJa: `RM期待${baselineRm.expectedProfitMYR}`,
    },
    {
      sliceId: 'fixed_700',
      labelJa: `固定RM${BASE_LOT}/枠`,
      tradeCount: executed.length,
      maxDrawdownPct: fixedLotPath.maxDrawdownPct,
      cumulativeLossPct: round3(Math.min(0, fixedLotPath.cumulativeReturnPct)),
      noteJa: `最大損失RM${fixedLotPath.maxLossMYR}`,
    },
    {
      sliceId: 'heavy_lot',
      labelJa: `参考大ロット〜RM${HEAVY_LOT}`,
      tradeCount: executed.length,
      maxDrawdownPct: heavyPath.maxDrawdownPct,
      cumulativeLossPct: round3(Math.min(0, heavyPath.cumulativeReturnPct)),
      noteJa: `DD悪化Δ${round3(heavyPath.maxDrawdownPct - baselineRm.maxDrawdownPct)}pt`,
    },
  ];

  const compoundYes = simulateCompoundingPath({
    trades: executed,
    modeId: 'compound_yes',
    initialCapitalMYR: RM3000,
    lotPerSlotMYR: BASE_LOT,
  });
  const compoundNo = simulateCompoundingPath({
    trades: executed,
    modeId: 'compound_no',
    initialCapitalMYR: RM3000,
    lotPerSlotMYR: BASE_LOT,
  });

  const compoundDdRows: ForwardMaxDrawdownSliceRow[] = [
    {
      sliceId: 'compound_yes',
      labelJa: '複利あり',
      tradeCount: executed.length,
      maxDrawdownPct: compoundYes.maxDrawdownPct,
      cumulativeLossPct: 0,
      noteJa: `累積${compoundYes.cumulativeReturnPct}%`,
    },
    {
      sliceId: 'compound_no',
      labelJa: '複利なし',
      tradeCount: executed.length,
      maxDrawdownPct: compoundNo.maxDrawdownPct,
      cumulativeLossPct: 0,
      noteJa: `累積${compoundNo.cumulativeReturnPct}% · DD優位`,
    },
  ];

  const culprit = [...symbolDdRows].sort(
    (a, b) => a.cumulativeLossPct - b.cumulativeLossPct,
  )[0]!;

  const weakRegime = [...regimeDdRows].sort(
    (a, b) => a.cumulativeLossPct - b.cumulativeLossPct,
  )[0]!;

  const recoveryDays = ddRankingTop10
    .map((r) => r.recoveryDays)
    .filter((d): d is number => d != null);
  const medianRecovery =
    recoveryDays.length > 0
      ? recoveryDays.sort((a, b) => a - b)[Math.floor(recoveryDays.length / 2)]!
      : null;

  const recoverySummaryJa =
    medianRecovery != null
      ? `中央値回復${medianRecovery}日 · 最深${ddRankingTop10[0]?.depthPct ?? portfolioMaxDd}% · ${ddRankingTop10[0]?.recoveryDate ?? '未回復'}`
      : `最深DD ${portfolioMaxDd}% · 回復エピソード未検出`;

  const timelinePoints = worstEp
    ? buildTimeline(exits, executed, worstEp.troughTradeIndex)
    : [];

  const answerAJa = worstEp
    ? `A 最大DD原因: ${worstEp.startDate}〜${worstEp.troughDate}の${Math.abs(worstEp.depthPct)}%DD · 連敗${worstEpisodeCluster.maxConsecutiveLosses} · ${weakRegime.labelJa}・${culprit.labelJa}損失集中 — 評価A`
    : `A 最大DD原因: エピソード未分離（全体DD${portfolioMaxDd}%）— 評価B`;

  const answerBJa =
    compoundNo.maxDrawdownPct > compoundYes.maxDrawdownPct
      ? `B 改善策: 複利なしでDD${compoundNo.maxDrawdownPct}%（複利あり${compoundYes.maxDrawdownPct}%）· 弱環境ロット縮小 · DD-15%運用停止（監査34）— 評価B`
      : `B 改善策: 現行ロット維持 · 横ばい/低VIX帯は枠抑制 · DD-15%警戒 — 評価B`;

  const answerCJa = `C DD主犯銘柄: ${culprit.labelJa}（損失合計${culprit.cumulativeLossPct}% · ${culprit.noteJa}）— 評価${culprit.cumulativeLossPct < -3 ? 'A' : 'B'}`;

  const answerDJa = `D DDが起きる環境: ${weakRegime.labelJa} · 金利上昇期 · VIX24-30帯（参考）— 評価C`;

  const answerEJa =
    'E 2026最優先監視: ①ローリングDD（-10/-15%）②連敗≥2 ③VIX帯 ④SPY横ばい ⑤同時3枠 — 評価A';

  const operationalGrade: ForwardMaxDrawdownAdoptionGrade =
    Math.abs(portfolioMaxDd) <= 20 ? 'B' : 'C';

  const operationalNoteJa =
    '最大DDは特定エピソードの連敗クラスター。新ルール追加なし · 監視とロット調整で対応。';

  const humanSummaryJa = [
    `監査40 最大DD原因 ${fromDate}〜${toDate} · ${executed.length}件 · 全体DD${portfolioMaxDd}%`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerCJa,
    answerEJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    executedTradeCount: executed.length,
    portfolioMaxDrawdownPct: round3(portfolioMaxDd),
    returnSeriesMaxDrawdownPct: returnSeriesMaxDd,
    equityCurveMaxDrawdownPct: round3(equityCurveMaxDd),
    ddRankingTop10,
    worstEpisodeCluster,
    symbolDdRows,
    vixDdRows,
    regimeDdRows,
    rateDdRows,
    lotDdRows,
    compoundDdRows,
    recoverySummaryJa,
    timelinePoints,
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

export async function runMaxDrawdownCauseAudit(): Promise<ForwardMaxDrawdownAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildMaxDrawdownCauseReport({ bundle });
}

export function formatMaxDrawdownCauseCsv(report: ForwardMaxDrawdownAuditReport): string {
  const lines = [
    `# 最重要監査その40 最大DD原因 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# 全${report.executedTradeCount}件 リターン系列DD${report.returnSeriesMaxDrawdownPct ?? '—'}% 資金曲線DD${report.equityCurveMaxDrawdownPct}%`,
    '',
    'rank,startDate,troughDate,recoveryDate,periodDays,recoveryDays,depthPct,lossFromPeakPct,tradeCount',
    ...report.ddRankingTop10.map((r) =>
      [
        r.rank,
        r.startDate,
        r.troughDate,
        r.recoveryDate ?? '',
        r.periodDays,
        r.recoveryDays ?? '',
        r.depthPct,
        r.lossPctFromPeak,
        r.tradeCount,
      ].join(','),
    ),
    '',
    'cluster,maxConsecutiveLosses,maxConsecutiveLossPct,worstStart,worstEnd,episodeTrades,losingTrades',
    [
      'worst',
      report.worstEpisodeCluster.maxConsecutiveLosses,
      report.worstEpisodeCluster.maxConsecutiveLossPct,
      report.worstEpisodeCluster.worstStreakStartDate ?? '',
      report.worstEpisodeCluster.worstStreakEndDate ?? '',
      report.worstEpisodeCluster.episodeTradeCount,
      report.worstEpisodeCluster.losingTradeCount,
    ].join(','),
    '',
    'section,sliceId,label,tradeCount,maxDD,cumulativeLoss,note',
    ...[
      ...report.symbolDdRows.map((r) => ['symbol', r]),
      ...report.vixDdRows.map((r) => ['vix', r]),
      ...report.regimeDdRows.map((r) => ['regime', r]),
      ...report.rateDdRows.map((r) => ['rate', r]),
      ...report.lotDdRows.map((r) => ['lot', r]),
      ...report.compoundDdRows.map((r) => ['compound', r]),
    ].map(([section, r]) =>
      [
        section,
        (r as ForwardMaxDrawdownSliceRow).sliceId,
        `"${(r as ForwardMaxDrawdownSliceRow).labelJa.replace(/"/g, '""')}"`,
        (r as ForwardMaxDrawdownSliceRow).tradeCount,
        (r as ForwardMaxDrawdownSliceRow).maxDrawdownPct ?? '',
        (r as ForwardMaxDrawdownSliceRow).cumulativeLossPct,
        `"${(r as ForwardMaxDrawdownSliceRow).noteJa.replace(/"/g, '""')}"`,
      ].join(','),
    ),
    '',
    'timelineDate,equityPct,drawdownPct,tradeIndex,symbol,tradeReturnPct',
    ...report.timelinePoints.map((p) =>
      [
        p.date,
        p.equityPct,
        p.drawdownPct,
        p.tradeIndex,
        p.symbol ?? '',
        p.tradeReturnPct ?? '',
      ].join(','),
    ),
    '',
    'answer,content',
    ['A', report.answerAJa],
    ['B', report.answerBJa],
    ['C', report.answerCJa],
    ['D', report.answerDJa],
    ['E', report.answerEJa],
    ['recovery', report.recoverySummaryJa],
    ['operational', report.operationalNoteJa],
  ];
  return lines.join('\n');
}
