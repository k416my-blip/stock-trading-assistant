/**
 * 最重要監査その34 — 資金曲線（Equity Curve）監査 · 監査33最終ルール · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardEquityCurveAuditReport,
  ForwardEquityCurveBrokenEpisode,
  ForwardEquityCurveImplementationGrade,
  ForwardEquityCurvePoint,
  ForwardEquityCurveRollingPoint,
  ForwardEquityCurveRm3000Stop,
  ForwardEquityCurveStopCandidate,
  ForwardEquityCurveStopKind,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import {
  collectFullHistoryExecutedTrades,
  winRateSlotPct,
} from './forwardValidationMonteCarloAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;
const RM3000_CAPITAL_MYR = 3000;
const ROLLING_WINDOW = 10;
const ROLLING_MIN = 5;
const FALSE_STOP_RECOVERY_TRADES = 8;
const FALSE_STOP_RECOVERY_PCT = 5;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15%';

export const DD_STOP_THRESHOLDS = [-10, -15, -20] as const;
export const WR_STOP_THRESHOLDS = [80, 75, 70] as const;
export const PF_STOP_THRESHOLDS = [1.5, 1.2, 1.0] as const;

export type ExitSnapshot = {
  date: string;
  tradeIndex: number;
  equity: number;
  equityPct: number;
  peakEquityPct: number;
  drawdownPct: number;
  equityReturnPct: number;
  tradeReturnPct: number;
};

type ActiveLeg = ForwardPassedTradeRecord & {
  slotPct: number;
  notional: number;
};

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

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.round(ms / (24 * 3600 * 1000)));
}

function rollingMetrics(returns: number[]): {
  winRatePct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
} {
  if (returns.length < ROLLING_MIN) {
    return { winRatePct: null, profitFactor: null, sharpe: null };
  }
  const wins = returns.filter((r) => r > 0);
  const grossWin = returns.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(returns.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const mu = mean(returns);
  const sigma = std(returns);
  return {
    winRatePct: round3((wins.length / returns.length) * 100),
    profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
    sharpe:
      mu != null && sigma > 1e-9 && returns.length >= 2
        ? round3((mu / sigma) * Math.sqrt(returns.length))
        : null,
  };
}

export function buildOperationalEquityCurve(input: {
  trades: ForwardPassedTradeRecord[];
  symbols: string[];
  initialCapital?: number;
}): { curve: ForwardEquityCurvePoint[]; exits: ExitSnapshot[] } {
  const initialCapital = input.initialCapital ?? INITIAL_CAPITAL;
  const maxDeployFrac = (100 - CASH_RESERVE_PCT) / 100;

  const entries = [...input.trades].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );

  const pendingByExit = new Map<string, ActiveLeg[]>();
  for (const t of entries) {
    const history = input.trades.filter((x) => x.signalDate < t.signalDate);
    const slotPct = winRateSlotPct(t, history, input.symbols);
    const list = pendingByExit.get(t.exitDate) ?? [];
    list.push({ ...t, slotPct, notional: 0 });
    pendingByExit.set(t.exitDate, list);
  }

  const eventDates = [
    ...new Set([...entries.map((t) => t.entryDate), ...entries.map((t) => t.exitDate)]),
  ].sort();

  let equity = initialCapital;
  let peak = initialCapital;
  const open: ActiveLeg[] = [];
  const curve: ForwardEquityCurvePoint[] = [
    {
      date: eventDates[0] ?? '2018-01-01',
      equity: initialCapital,
      equityPct: 100,
      peakEquityPct: 100,
      drawdownPct: 0,
      tradeIndex: 0,
    },
  ];
  const exits: ExitSnapshot[] = [];
  let tradeIndex = 0;

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
      const eqBefore = equity;
      equity = round3(equity + pnl);
      if (equity > peak) peak = equity;
      const equityPct = round3((equity / initialCapital) * 100);
      const peakEquityPct = round3((peak / initialCapital) * 100);
      const drawdownPct = round3(
        peak > 0 ? ((equity - peak) / peak) * 100 : 0,
      );
      tradeIndex++;
      const equityReturnPct = eqBefore > 0 ? round3((pnl / eqBefore) * 100) : 0;
      exits.push({
        date,
        tradeIndex,
        equity,
        equityPct,
        peakEquityPct,
        drawdownPct,
        equityReturnPct,
        tradeReturnPct: active.returnPct,
      });
      curve.push({
        date,
        equity,
        equityPct,
        peakEquityPct,
        drawdownPct,
        tradeIndex,
      });
    }

    for (const t of entries.filter((e) => e.entryDate === date)) {
      if (open.length >= FORWARD_MAX_CONCURRENT) continue;
      const history = input.trades.filter((x) => x.signalDate < t.signalDate);
      const slotPct = winRateSlotPct(t, history, input.symbols);
      const openNotional = open.reduce((s, o) => s + o.notional, 0);
      const target = round3((equity * slotPct) / 100);
      const available = Math.max(0, equity * maxDeployFrac - openNotional);
      const notional = round3(Math.min(target, available));
      if (notional <= 0) continue;
      open.push({ ...t, slotPct, notional });
    }
  }

  return { curve, exits };
}

export function buildRollingSeries(exits: ExitSnapshot[]): ForwardEquityCurveRollingPoint[] {
  const tradeReturns = exits.map((e) => e.tradeReturnPct);
  return exits.map((e, i) => {
    const start = Math.max(0, i - ROLLING_WINDOW + 1);
    const window = tradeReturns.slice(start, i + 1);
    const m = rollingMetrics(window);
    return {
      date: e.date,
      tradeIndex: e.tradeIndex,
      windowTrades: window.length,
      rollingWinRatePct: m.winRatePct,
      rollingProfitFactor: m.profitFactor,
      rollingSharpe: m.sharpe,
      rollingDrawdownPct: e.drawdownPct,
    };
  });
}

export function detectBrokenEpisodes(exits: ExitSnapshot[]): ForwardEquityCurveBrokenEpisode[] {
  const episodes: ForwardEquityCurveBrokenEpisode[] = [];
  let episodeId = 0;
  let active: ForwardEquityCurveBrokenEpisode | null = null;

  for (let i = 0; i < exits.length; i++) {
    const e = exits[i]!;
    const start = Math.max(0, i - ROLLING_WINDOW + 1);
    const window = exits.slice(start, i + 1);
    const returns = window.map((w) => w.tradeReturnPct);
    const wr =
      returns.length > 0
        ? (returns.filter((r) => r > 0).length / returns.length) * 100
        : 100;
    const broken = e.drawdownPct <= -5 && wr < 75;

    if (broken) {
      if (!active) {
        episodeId++;
        active = {
          episodeId,
          startDate: e.date,
          endDate: e.date,
          startTradeIndex: e.tradeIndex,
          endTradeIndex: e.tradeIndex,
          minDrawdownPct: e.drawdownPct,
          windowWinRatePct: round3(wr),
        };
        episodes.push(active);
      } else {
        active.endDate = e.date;
        active.endTradeIndex = e.tradeIndex;
        active.minDrawdownPct = Math.min(active.minDrawdownPct, e.drawdownPct);
        active.windowWinRatePct = round3(wr);
      }
      continue;
    }

    if (active && e.drawdownPct > -3) {
      active = null;
    }
  }

  return episodes;
}

function isStopTriggered(
  kind: ForwardEquityCurveStopKind,
  threshold: number,
  exit: ExitSnapshot,
  rolling: ForwardEquityCurveRollingPoint,
): boolean {
  if (kind === 'dd') return exit.drawdownPct <= threshold;
  if (kind === 'wr') {
    return rolling.rollingWinRatePct != null && rolling.rollingWinRatePct < threshold;
  }
  return rolling.rollingProfitFactor != null && rolling.rollingProfitFactor < threshold;
}

export function evaluateStopCandidate(input: {
  kind: ForwardEquityCurveStopKind;
  threshold: number;
  labelJa: string;
  exits: ExitSnapshot[];
  rollingSeries: ForwardEquityCurveRollingPoint[];
  brokenEpisodes: ForwardEquityCurveBrokenEpisode[];
}): ForwardEquityCurveStopCandidate {
  const stopIndices: number[] = [];
  for (let i = 0; i < input.exits.length; i++) {
    const exit = input.exits[i]!;
    const rolling = input.rollingSeries[i]!;
    if (isStopTriggered(input.kind, input.threshold, exit, rolling)) {
      stopIndices.push(i);
    }
  }

  let falseStopCount = 0;
  for (const idx of stopIndices) {
    const atStop = input.exits[idx]!;
    const future = input.exits[idx + FALSE_STOP_RECOVERY_TRADES];
    if (future && future.equityPct >= atStop.equityPct + FALSE_STOP_RECOVERY_PCT) {
      falseStopCount++;
    }
  }

  const detectionDays: number[] = [];
  let detectedEpisodeCount = 0;
  for (const ep of input.brokenEpisodes) {
    const stopInEp = stopIndices.find((idx) => {
      const e = input.exits[idx]!;
      return (
        e.tradeIndex >= ep.startTradeIndex &&
        e.tradeIndex <= ep.endTradeIndex + 3
      );
    });
    if (stopInEp != null) {
      detectedEpisodeCount++;
      const stopExit = input.exits[stopInEp]!;
      detectionDays.push(daysBetween(ep.startDate, stopExit.date));
    }
  }

  const stopSignalCount = stopIndices.length;
  const falseStopRatePct =
    stopSignalCount > 0 ? round3((falseStopCount / stopSignalCount) * 100) : 0;
  const medianDetectionDays =
    detectionDays.length > 0
      ? round3(
          [...detectionDays].sort((a, b) => a - b)[
            Math.floor(detectionDays.length / 2)
          ]!,
        )
      : null;

  const recommendationGrade = gradeStopCandidate({
    kind: input.kind,
    threshold: input.threshold,
    falseStopRatePct,
    medianDetectionDays,
    detectedEpisodeCount,
    brokenEpisodeCount: input.brokenEpisodes.length,
    stopSignalCount,
  });

  return {
    kind: input.kind,
    threshold: input.threshold,
    labelJa: input.labelJa,
    stopSignalCount,
    falseStopCount,
    falseStopRatePct,
    brokenEpisodeCount: input.brokenEpisodes.length,
    detectedEpisodeCount,
    medianDetectionDays,
    recommendationGrade,
  };
}

export function gradeStopCandidate(input: {
  kind: ForwardEquityCurveStopKind;
  threshold: number;
  falseStopRatePct: number;
  medianDetectionDays: number | null;
  detectedEpisodeCount: number;
  brokenEpisodeCount: number;
  stopSignalCount: number;
}): ForwardEquityCurveImplementationGrade {
  const detectRate =
    input.brokenEpisodeCount > 0
      ? input.detectedEpisodeCount / input.brokenEpisodeCount
      : 1;

  if (
    input.kind === 'dd' &&
    input.threshold === -15 &&
    input.falseStopRatePct <= 35 &&
    detectRate >= 0.8
  ) {
    return 'A';
  }
  if (
    input.kind === 'wr' &&
    input.threshold === 75 &&
    input.falseStopRatePct <= 40 &&
    detectRate >= 0.75
  ) {
    return 'B';
  }
  if (input.falseStopRatePct > 55 || input.stopSignalCount > 25) {
    return 'D';
  }
  if (detectRate >= 0.7 && input.falseStopRatePct <= 45) {
    return 'B';
  }
  return 'C';
}

export function pickRecommendedStops(
  candidates: ForwardEquityCurveStopCandidate[],
  maxDrawdownPct: number,
): {
  dd: ForwardEquityCurveStopCandidate;
  wr: ForwardEquityCurveStopCandidate;
  pf: ForwardEquityCurveStopCandidate;
} {
  const byKind = (k: ForwardEquityCurveStopKind) =>
    candidates.filter((c) => c.kind === k);

  const score = (c: ForwardEquityCurveStopCandidate) =>
    (c.detectedEpisodeCount / Math.max(c.brokenEpisodeCount, 1)) * 100 -
    c.falseStopRatePct * 0.6 -
    (c.medianDetectionDays ?? 40) * 0.08 +
    (c.stopSignalCount > 0 && c.stopSignalCount <= 12 ? 8 : 0);

  const best = (list: ForwardEquityCurveStopCandidate[]) =>
    [...list].sort((a, b) => score(b) - score(a))[0]!;

  const ddList = byKind('dd');
  const ddWithSignals = ddList.filter((c) => c.stopSignalCount > 0);
  let dd: ForwardEquityCurveStopCandidate;
  if (ddWithSignals.length > 0) {
    dd = best(ddWithSignals);
  } else {
    const absDd = Math.abs(maxDrawdownPct);
    const proactive = absDd <= 12 ? -15 : -20;
    const base =
      ddList.find((c) => c.threshold === proactive) ??
      ddList.find((c) => c.threshold === -15) ??
      ddList[0]!;
    dd = {
      ...base,
      threshold: proactive,
      labelJa: `DD≤${proactive}%（先行バッファ · 歴史最大${round3(maxDrawdownPct)}%）`,
      recommendationGrade: proactive === -15 ? 'A' : 'B',
    };
  }

  const wrList = byKind('wr');
  const wr =
    [...wrList].sort((a, b) => {
      if (a.falseStopRatePct !== b.falseStopRatePct) {
        return a.falseStopRatePct - b.falseStopRatePct;
      }
      return a.stopSignalCount - b.stopSignalCount;
    })[0]!;

  const pfList = byKind('pf');
  const pf =
    [...pfList].sort((a, b) => {
      if (a.falseStopRatePct !== b.falseStopRatePct) {
        return a.falseStopRatePct - b.falseStopRatePct;
      }
      return a.stopSignalCount - b.stopSignalCount;
    })[0]!;

  return { dd, wr, pf };
}

export function buildRm3000StopRow(stopDrawdownPct: number): ForwardEquityCurveRm3000Stop {
  const dd = Math.abs(stopDrawdownPct);
  const stopLossAmountMYR = Math.round(RM3000_CAPITAL_MYR * (dd / 100));
  return {
    capitalMYR: RM3000_CAPITAL_MYR,
    stopDrawdownPct: round3(dd),
    stopLossAmountMYR,
    noteJa: `RM3000 · ピーク比-${dd}%で新規停止 · 許容ドローダウン${stopLossAmountMYR}MYR`,
  };
}

export function auditEquityCurve(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
}): ForwardEquityCurveAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  const trades = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const { curve, exits } = buildOperationalEquityCurve({ trades, symbols });
  const rollingSeries = buildRollingSeries(exits);
  const brokenEpisodes = detectBrokenEpisodes(exits);

  const stopCandidates: ForwardEquityCurveStopCandidate[] = [
    ...DD_STOP_THRESHOLDS.map((t) =>
      evaluateStopCandidate({
        kind: 'dd',
        threshold: t,
        labelJa: `DD≤${t}%`,
        exits,
        rollingSeries,
        brokenEpisodes,
      }),
    ),
    ...WR_STOP_THRESHOLDS.map((t) =>
      evaluateStopCandidate({
        kind: 'wr',
        threshold: t,
        labelJa: `直近${ROLLING_WINDOW}件WR<${t}%`,
        exits,
        rollingSeries,
        brokenEpisodes,
      }),
    ),
    ...PF_STOP_THRESHOLDS.map((t) =>
      evaluateStopCandidate({
        kind: 'pf',
        threshold: t,
        labelJa: `直近${ROLLING_WINDOW}件PF<${t}`,
        exits,
        rollingSeries,
        brokenEpisodes,
      }),
    ),
  ];

  const finalEquityPct = curve[curve.length - 1]?.equityPct ?? 100;
  const maxDrawdownPct =
    exits.length > 0 ? Math.min(...exits.map((e) => e.drawdownPct), 0) : 0;

  const rec = pickRecommendedStops(stopCandidates, round3(maxDrawdownPct));
  const rm3000Stop = buildRm3000StopRow(rec.dd.threshold);

  const operationalStopProposalJa =
    `【複合停止 · 推奨】新規のみ停止: (1) 資産DD≤${rec.dd.threshold}%（主） OR (2) 直近${ROLLING_WINDOW}件でWR<${rec.wr.threshold}%かつPF<${rec.pf.threshold}かつDD≤-5%（副）。` +
    `歴史最大DD${round3(maxDrawdownPct)}% · WR単独は誤停止率高のため副条件必須。` +
    `【再開】DDが-5%以内に回復 かつ 直近5件WR≥80% かつ 30営業日経過。`;

  const operationalStopGrade: ForwardEquityCurveImplementationGrade =
    rec.dd.recommendationGrade === 'A' ? 'A' : rec.dd.stopSignalCount === 0 ? 'B' : 'C';

  const answerAJa = `停止すべきDD: ${rec.dd.threshold}%（${rec.dd.labelJa} · シグナル${rec.dd.stopSignalCount}回 · 誤停止${rec.dd.falseStopRatePct}% · 検知中央${rec.dd.medianDetectionDays ?? '—'}日 · 評価${rec.dd.recommendationGrade}）`;
  const answerBJa = `停止すべきWR: ${rec.wr.threshold}%（直近${ROLLING_WINDOW}件 · 誤停止${rec.wr.falseStopRatePct}% · 評価${rec.wr.recommendationGrade}）`;
  const answerCJa = `停止すべきPF: ${rec.pf.threshold}（直近${ROLLING_WINDOW}件 · 誤停止${rec.pf.falseStopRatePct}% · 評価${rec.pf.recommendationGrade}）`;
  const answerDJa = `RM3000停止金額: ${rm3000Stop.stopLossAmountMYR}MYR（資本${rm3000Stop.capitalMYR}MYR × |DD${rec.dd.threshold}%|）`;
  const answerEJa =
    '運用再開: ①ピーク比DDが-5%以内 ②直近5件勝率≥80% ③停止から30営業日以上 — 3条件すべて満たすまで新規のみ停止（保有は+4%/25日ルール維持）。';

  const answer7Ja = stopCandidates
    .map((c) => `${c.labelJa}:${c.stopSignalCount}回`)
    .join(' · ');

  const bestFalse = [...stopCandidates].sort(
    (a, b) => a.falseStopRatePct - b.falseStopRatePct,
  )[0]!;
  const answer8Ja =
    `誤停止率: 最低${bestFalse.labelJa}=${bestFalse.falseStopRatePct}% · 推奨DD${rec.dd.threshold}%=${rec.dd.falseStopRatePct}%（${rec.dd.falseStopCount}/${rec.dd.stopSignalCount}回）`;

  const wr70 = stopCandidates.find((c) => c.kind === 'wr' && c.threshold === 70);
  const answer9Ja =
    brokenEpisodes.length === 0
      ? '構造的崩壊エピソード未検出（DD≤-5%かつWR<75%基準）。'
      : brokenEpisodes
          .map(
            (ep) =>
              `#${ep.episodeId} ${ep.startDate}〜${ep.endDate} WR${ep.windowWinRatePct}% DD${ep.minDrawdownPct}%`,
          )
          .join(' · ') +
        ` · DD停止は歴史未発火（最大${round3(maxDrawdownPct)}%） · 副条件WR<70%の検知中央${wr70?.medianDetectionDays ?? '—'}日`;

  const answer10Ja = `${operationalStopGrade}: ${operationalStopProposalJa}`;

  const humanSummaryJa = [
    '【最重要監査その34 · 資金曲線監査】',
    FIXED_CONDITIONS_JA,
    `${fromDate}〜${toDate} · ${trades.length}件 · 終値${finalEquityPct}% · 最大DD${maxDrawdownPct}%`,
    '',
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    '',
    answer7Ja,
    answer8Ja,
    answer9Ja,
    '',
    answer10Ja,
  ].join('\n');

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    etfUniverse: symbols,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    tradeCount: trades.length,
    equityCurve: curve,
    rollingSeries,
    stopCandidates,
    brokenEpisodes,
    finalEquityPct,
    maxDrawdownPct: round3(maxDrawdownPct),
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answer7Ja,
    answer8Ja,
    answer9Ja,
    answer10Ja,
    operationalStopProposalJa,
    operationalStopGrade,
    rm3000Stop,
    humanSummaryJa,
  };
}

export async function runEquityCurveAudit(): Promise<ForwardEquityCurveAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return auditEquityCurve({ bundle });
}

export function formatEquityCurveCsv(report: ForwardEquityCurveAuditReport): string {
  const lines = [
    `# 最重要監査その34 資金曲線 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# 終値${report.finalEquityPct}% DD${report.maxDrawdownPct}%`,
    '',
    'date,equity,equityPct,peakEquityPct,drawdownPct,tradeIndex',
    ...report.equityCurve.map((p) =>
      [p.date, p.equity, p.equityPct, p.peakEquityPct, p.drawdownPct, p.tradeIndex].join(','),
    ),
    '',
    'date,windowTrades,rollingWR,rollingPF,rollingSharpe,rollingDD',
    ...report.rollingSeries.map((r) =>
      [
        r.date,
        r.windowTrades,
        r.rollingWinRatePct ?? '',
        r.rollingProfitFactor ?? '',
        r.rollingSharpe ?? '',
        r.rollingDrawdownPct,
      ].join(','),
    ),
    '',
    'kind,threshold,label,stopCount,falseStop,falseStopPct,detectedEpisodes,medianDetectDays,grade',
    ...report.stopCandidates.map((c) =>
      [
        c.kind,
        c.threshold,
        c.labelJa,
        c.stopSignalCount,
        c.falseStopCount,
        c.falseStopRatePct,
        `${c.detectedEpisodeCount}/${c.brokenEpisodeCount}`,
        c.medianDetectionDays ?? '',
        c.recommendationGrade,
      ].join(','),
    ),
    '',
    'episodeId,startDate,endDate,startIdx,endIdx,minDD,windowWR',
    ...report.brokenEpisodes.map((e) =>
      [
        e.episodeId,
        e.startDate,
        e.endDate,
        e.startTradeIndex,
        e.endTradeIndex,
        e.minDrawdownPct,
        e.windowWinRatePct,
      ].join(','),
    ),
    '',
    'answer,content',
  ];
  const answers: [string, string][] = [
    ['A', report.answerAJa],
    ['B', report.answerBJa],
    ['C', report.answerCJa],
    ['D', report.answerDJa],
    ['E', report.answerEJa],
    ['7', report.answer7Ja],
    ['8', report.answer8Ja],
    ['9', report.answer9Ja],
    ['10', report.answer10Ja],
    [
      'rm3000',
      `stopMYR=${report.rm3000Stop.stopLossAmountMYR},ddPct=${report.rm3000Stop.stopDrawdownPct}`,
    ],
  ];
  for (const [k, v] of answers) {
    lines.push(`${k},"${v.replace(/"/g, '""')}"`);
  }
  return lines.join('\n');
}
