import {
  COOLING_MINUTES,
  DISCIPLINE_TRADE_MIN,
  FOMO_SAME_SYMBOL_BUYS,
  FOMO_WINDOW_HOURS,
  FREQUENCY_ANOMALY_Z,
  LOSS_STREAK_COOLING_COUNT,
  MAX_TRADES_PER_DAY,
  MAX_TRADES_PER_WEEK,
  OPERATOR_STRESS_BLOCK,
  OVERSIZE_TOLERANCE_PCT,
  REVENGE_SIZE_MULT,
  REVENGE_WINDOW_HOURS,
  SESSION_FATIGUE_HOURS,
  SESSION_FATIGUE_TRADES,
} from '../constants/behavioralRisk';
import type { TradeRecord } from '../types';
import type {
  BehavioralAlert,
  BehavioralRiskInput,
  BehavioralRiskReport,
  BehavioralSeverity,
  OperatorBehaviorState,
} from '../types/behavioralRisk';
import { toMYR } from './fx';

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function tradesSince(trades: TradeRecord[], ms: number): TradeRecord[] {
  const since = Date.now() - ms;
  return trades.filter((t) => new Date(t.executedAt).getTime() >= since);
}

function tradeNotionalMYR(t: TradeRecord): number {
  return toMYR(t.shares * t.price, t.currency) + (t.brokerageFee ?? 0) * toMYR(1, t.currency);
}

function allocationPct(t: TradeRecord, portfolioValue: number): number {
  if (portfolioValue <= 0) return 0;
  return (tradeNotionalMYR(t) / portfolioValue) * 100;
}

function buildRevengeTrade(trades: TradeRecord[], portfolioValue: number): BehavioralRiskReport['revengeTrade'] {
  const sells = trades
    .filter((t) => t.side === 'sell' && (t.realizedPnLMYR ?? 0) < 0)
    .sort((a, b) => b.executedAt.localeCompare(a.executedAt));
  const lastLoss = sells[0];
  if (!lastLoss) {
    return {
      detected: false,
      hoursSinceLoss: 999,
      sizeVsAvgPct: 100,
      noteJa: '直近の損失売却なし',
    };
  }
  const lossAt = new Date(lastLoss.executedAt).getTime();
  const buysAfter = trades.filter(
    (t) => t.side === 'buy' && new Date(t.executedAt).getTime() > lossAt,
  );
  const recentBuy = buysAfter.find(
    (t) => new Date(t.executedAt).getTime() - lossAt < REVENGE_WINDOW_HOURS * MS_HOUR,
  );
  if (!recentBuy) {
    return {
      detected: false,
      hoursSinceLoss: (Date.now() - lossAt) / MS_HOUR,
      sizeVsAvgPct: 100,
      noteJa: '損失後の急な買いなし',
    };
  }
  const buySizes = trades.filter((t) => t.side === 'buy').map((t) => allocationPct(t, portfolioValue));
  const avg = buySizes.length ? buySizes.reduce((a, b) => a + b, 0) / buySizes.length : 1;
  const lastPct = allocationPct(recentBuy, portfolioValue);
  const sizeVsAvgPct = avg > 0 ? (lastPct / avg) * 100 : 100;
  const detected = sizeVsAvgPct >= REVENGE_SIZE_MULT * 100;
  return {
    detected,
    hoursSinceLoss: Math.round(((new Date(recentBuy.executedAt).getTime() - lossAt) / MS_HOUR) * 10) / 10,
    sizeVsAvgPct: Math.round(sizeVsAvgPct),
    noteJa: detected
      ? `リベンジ疑い — 損失後${Math.round(((new Date(recentBuy.executedAt).getTime() - lossAt) / MS_HOUR) * 10) / 10}h · サイズ ${sizeVsAvgPct}%`
      : 'リベンジパターンなし',
  };
}

function buildOvertrading(trades: TradeRecord[]): BehavioralRiskReport['overtrading'] {
  const last24 = tradesSince(trades, MS_DAY).length;
  const last7 = tradesSince(trades, 7 * MS_DAY).length;
  const alert = last24 > MAX_TRADES_PER_DAY || last7 > MAX_TRADES_PER_WEEK;
  return {
    tradesLast24h: last24,
    tradesLast7d: last7,
    dailyLimit: MAX_TRADES_PER_DAY,
    alert,
    noteJa: alert
      ? `過剰取引 — 24h ${last24} / 7d ${last7}`
      : `取引頻度正常 — 24h ${last24}`,
  };
}

function buildConfidenceDrift(trades: TradeRecord[], portfolioValue: number): BehavioralRiskReport['confidenceDrift'] {
  const buys = trades.filter((t) => t.side === 'buy').slice(0, 12);
  if (buys.length < 3) {
    return {
      driftScore: 0,
      sizingTrend: 'stable',
      postWinSizeBoostPct: 0,
      noteJa: 'サンプル不足',
    };
  }
  const sizes = buys.map((t) => allocationPct(t, portfolioValue));
  const firstHalf = sizes.slice(Math.floor(sizes.length / 2));
  const secondHalf = sizes.slice(0, Math.floor(sizes.length / 2));
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / Math.max(firstHalf.length, 1);
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / Math.max(secondHalf.length, 1);
  const trend = avgSecond > avgFirst * 1.15 ? 'increasing' : avgSecond < avgFirst * 0.85 ? 'decreasing' : 'stable';
  const driftScore = Math.round(Math.abs(avgSecond - avgFirst) * 8);
  return {
    driftScore,
    sizingTrend: trend,
    postWinSizeBoostPct: Math.round(((avgSecond - avgFirst) / Math.max(avgFirst, 0.1)) * 100),
    noteJa:
      trend === 'increasing'
        ? '自信ドリフト — サイズ拡大傾向'
        : trend === 'decreasing'
          ? 'サイズ縮小傾向'
          : 'サイズ安定',
  };
}

function buildPositionDiscipline(
  input: BehavioralRiskInput,
): BehavioralRiskReport['positionDiscipline'] {
  const suggested = input.suggestedAllocationPct ?? input.riskPerTradePct * 3;
  const lastBuy = input.trades.find((t) => t.side === 'buy');
  if (!lastBuy) {
    return {
      compliant: true,
      lastOversizePct: 0,
      suggestedMaxPct: suggested,
      noteJa: '直近買いなし',
    };
  }
  const lastPct = allocationPct(lastBuy, input.portfolioValueMYR);
  const oversize = lastPct - suggested;
  const compliant = oversize <= OVERSIZE_TOLERANCE_PCT;
  return {
    compliant,
    lastOversizePct: Math.round(Math.max(0, oversize) * 10) / 10,
    suggestedMaxPct: Math.round(suggested * 10) / 10,
    noteJa: compliant
      ? `サイズ規律OK — ${lastPct.toFixed(1)}% / 上限 ${suggested.toFixed(1)}%`
      : `サイズ超過 +${oversize.toFixed(1)}%`,
  };
}

function buildLossStreakCooling(state?: OperatorBehaviorState): BehavioralRiskReport['lossStreakCooling'] {
  const losses = state?.consecutiveLosses ?? 0;
  const coolingUntil = state?.coolingUntil;
  const now = Date.now();
  let active = false;
  let minutesRemaining = 0;
  if (coolingUntil) {
    const until = new Date(coolingUntil).getTime();
    if (until > now) {
      active = true;
      minutesRemaining = Math.ceil((until - now) / 60000);
    }
  } else if (losses >= LOSS_STREAK_COOLING_COUNT) {
    active = true;
    minutesRemaining = COOLING_MINUTES;
  }
  return {
    status: active ? 'active' : 'inactive',
    consecutiveLosses: losses,
    coolingUntil,
    minutesRemaining,
    noteJa: active
      ? `クーリング — 連敗 ${losses} · 残り ${minutesRemaining}分`
      : `連敗 ${losses} — クーリングなし`,
  };
}

function buildFomo(trades: TradeRecord[]): BehavioralRiskReport['fomoSpike'] {
  const recent = tradesSince(trades, FOMO_WINDOW_HOURS * MS_HOUR).filter((t) => t.side === 'buy');
  const bySym = new Map<string, number>();
  for (const t of recent) {
    bySym.set(t.symbol, (bySym.get(t.symbol) ?? 0) + 1);
  }
  const max = Math.max(0, ...bySym.values());
  const detected = max >= FOMO_SAME_SYMBOL_BUYS;
  return {
    detected,
    rapidBuysSameSymbol: max,
    windowHours: FOMO_WINDOW_HOURS,
    noteJa: detected
      ? `FOMO疑い — 同一銘柄 ${max}回/${FOMO_WINDOW_HOURS}h`
      : 'FOMOパターンなし',
  };
}

function buildTradeFrequency(trades: TradeRecord[]): BehavioralRiskReport['tradeFrequency'] {
  const byDay = new Map<string, number>();
  for (const t of trades) {
    const d = t.executedAt.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const counts = [...byDay.values()];
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = byDay.get(today) ?? 0;
  const baseline =
    counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 1;
  const variance =
    counts.length > 1
      ? counts.reduce((s, c) => s + (c - baseline) ** 2, 0) / counts.length
      : 1;
  const std = Math.sqrt(variance) || 1;
  const zScore = (todayCount - baseline) / std;
  return {
    todayCount,
    baselineDaily: Math.round(baseline * 10) / 10,
    zScore: Math.round(zScore * 100) / 100,
    anomaly: zScore >= FREQUENCY_ANOMALY_Z,
    noteJa:
      zScore >= FREQUENCY_ANOMALY_Z
        ? `頻度異常 Z=${zScore.toFixed(2)}`
        : `本日 ${todayCount}件（平常）`,
  };
}

function buildRiskTolerance(input: BehavioralRiskInput): BehavioralRiskReport['riskTolerance'] {
  const buys = input.trades.filter((t) => t.side === 'buy').slice(0, 10);
  if (buys.length === 0) {
    return {
      configuredRiskPct: input.riskPerTradePct,
      realizedRiskPct: 0,
      deviationPct: 0,
      noteJa: '—',
    };
  }
  const pcts = buys.map((t) => allocationPct(t, input.portfolioValueMYR));
  const realized = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const configured = input.riskPerTradePct * 3;
  const deviation = realized - configured;
  return {
    configuredRiskPct: input.riskPerTradePct,
    realizedRiskPct: Math.round(realized * 10) / 10,
    deviationPct: Math.round(deviation * 10) / 10,
    noteJa:
      Math.abs(deviation) > 2
        ? `許容リスク乖離 ${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%`
        : 'リスク許容内',
  };
}

function buildEmotionalVolatility(
  trades: TradeRecord[],
): BehavioralRiskReport['emotionalVolatility'] {
  if (trades.length < 4) {
    return { score: 20, pnlSwingPct: 0, intervalStdHours: 0, noteJa: 'データ不足' };
  }
  const intervals: number[] = [];
  const sorted = [...trades].sort((a, b) => a.executedAt.localeCompare(b.executedAt));
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(
      (new Date(sorted[i].executedAt).getTime() - new Date(sorted[i - 1].executedAt).getTime()) /
        MS_HOUR,
    );
  }
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const intervalStd = Math.sqrt(
    intervals.reduce((s, x) => s + (x - mean) ** 2, 0) / intervals.length,
  );
  const pnls = trades
    .filter((t) => t.realizedPnLMYR != null)
    .map((t) => t.realizedPnLMYR!);
  const pnlSwing =
    pnls.length >= 2
      ? Math.max(...pnls) - Math.min(...pnls)
      : 0;
  const score = Math.round(clamp(intervalStd * 5 + Math.abs(pnlSwing) / 50, 0, 100));
  return {
    score,
    pnlSwingPct: Math.round(pnlSwing),
    intervalStdHours: Math.round(intervalStd * 10) / 10,
    noteJa: score > 55 ? '感情ボラ高 — 間隔・損益が不安定' : '感情ボラ平常',
  };
}

function buildSessionFatigue(
  trades: TradeRecord[],
  state?: OperatorBehaviorState,
): BehavioralRiskReport['sessionFatigue'] {
  const start = state?.sessionStartedAt
    ? new Date(state.sessionStartedAt).getTime()
    : Date.now() - MS_HOUR;
  const sessionHours = (Date.now() - start) / MS_HOUR;
  const sessionTrades = trades.filter((t) => new Date(t.executedAt).getTime() >= start).length;
  const fatigueScore = Math.round(
    clamp(sessionHours * 12 + sessionTrades * 6, 0, 100),
  );
  const elevated = sessionHours >= SESSION_FATIGUE_HOURS || sessionTrades >= SESSION_FATIGUE_TRADES;
  return {
    sessionHours: Math.round(sessionHours * 10) / 10,
    tradesThisSession: sessionTrades,
    fatigueScore,
    elevated,
    noteJa: elevated
      ? `疲労 — ${sessionHours.toFixed(1)}h · ${sessionTrades}取引`
      : 'セッション疲労低',
  };
}

function buildDecisionQuality(
  input: BehavioralRiskInput,
  disciplinePct: number,
): BehavioralRiskReport['decisionQuality'] {
  const wins = input.winCount ?? 0;
  const losses = input.lossCount ?? 0;
  const total = wins + losses;
  const winRate = total > 0 ? (wins / total) * 100 : 50;
  const score = Math.round(clamp(winRate * 0.4 + disciplinePct * 0.6, 0, 100));
  return {
    score,
    winRateRecentPct: Math.round(winRate),
    disciplinePct: Math.round(disciplinePct),
    noteJa: `意思決定品質 ${score} — 勝率 ${winRate.toFixed(0)}%`,
  };
}

function buildModelDivergence(input: BehavioralRiskInput): BehavioralRiskReport['modelDivergence'] {
  const modelPct = input.modelWeightPct ?? input.suggestedAllocationPct ?? 3;
  const intent = input.lastTradeIntent;
  if (!intent || input.portfolioValueMYR <= 0) {
    return {
      divergenceScore: 0,
      humanAggressionPct: 0,
      modelSuggestedPct: modelPct,
      noteJa: 'モデル比較データなし',
    };
  }
  const humanPct = (intent.priceMYR * intent.shares) / input.portfolioValueMYR * 100;
  const divergence = humanPct - modelPct;
  return {
    divergenceScore: Math.round(Math.abs(divergence) * 10),
    humanAggressionPct: Math.round(humanPct * 10) / 10,
    modelSuggestedPct: Math.round(modelPct * 10) / 10,
    noteJa:
      Math.abs(divergence) > 3
        ? `モデル乖離 ${divergence > 0 ? '+' : ''}${divergence.toFixed(1)}%`
        : 'モデルと整合',
  };
}

function collectAlerts(parts: Partial<BehavioralRiskReport>): BehavioralAlert[] {
  const alerts: BehavioralAlert[] = [];
  const add = (id: string, severity: BehavioralSeverity, titleJa: string, detailJa: string) => {
    alerts.push({ id, severity, titleJa, detailJa });
  };
  if (parts.revengeTrade?.detected) {
    add('revenge', 'high', 'リベンジ取引疑い', parts.revengeTrade.noteJa);
  }
  if (parts.overtrading?.alert) {
    add('overtrade', 'high', '過剰取引', parts.overtrading.noteJa);
  }
  if (parts.lossStreakCooling?.status === 'active') {
    add('cooling', 'critical', '連敗クーリング', parts.lossStreakCooling.noteJa);
  }
  if (parts.fomoSpike?.detected) {
    add('fomo', 'watch', 'FOMO疑い', parts.fomoSpike.noteJa);
  }
  if (parts.positionDiscipline && !parts.positionDiscipline.compliant) {
    add('size', 'watch', 'サイズ規律違反', parts.positionDiscipline.noteJa);
  }
  if (parts.tradeFrequency?.anomaly) {
    add('freq', 'watch', '頻度異常', parts.tradeFrequency.noteJa);
  }
  if (parts.sessionFatigue?.elevated) {
    add('fatigue', 'watch', 'セッション疲労', parts.sessionFatigue.noteJa);
  }
  return alerts;
}

/** 行動・オペレーターリスク統合レポート */
export function buildBehavioralRiskReport(input: BehavioralRiskInput): BehavioralRiskReport {
  const state = input.operatorState;
  const revengeTrade = buildRevengeTrade(input.trades, input.portfolioValueMYR);
  const overtrading = buildOvertrading(input.trades);
  const confidenceDrift = buildConfidenceDrift(input.trades, input.portfolioValueMYR);
  const positionDiscipline = buildPositionDiscipline(input);
  const lossStreakCooling = buildLossStreakCooling(state);
  const fomoSpike = buildFomo(input.trades);
  const manualOverrides = state?.manualOverrides ?? [];
  const tradeFrequency = buildTradeFrequency(input.trades);
  const riskTolerance = buildRiskTolerance(input);
  const emotionalVolatility = buildEmotionalVolatility(input.trades);
  const sessionFatigue = buildSessionFatigue(input.trades, state);
  const disciplinePct = clamp(
    100 -
      (positionDiscipline.compliant ? 0 : 25) -
      (overtrading.alert ? 20 : 0) -
      (revengeTrade.detected ? 25 : 0),
    0,
    100,
  );
  const decisionQuality = buildDecisionQuality(input, disciplinePct);
  const modelDivergence = buildModelDivergence(input);

  const operatorStress: BehavioralRiskReport['operatorStress'] = {
    score: 0,
    components: [],
    noteJa: '',
  };
  const stressComponents = [
    { labelJa: '感情ボラ', value: emotionalVolatility.score },
    { labelJa: '疲労', value: sessionFatigue.fatigueScore },
    { labelJa: '過剰取引', value: overtrading.alert ? 80 : 20 },
    { labelJa: '連敗', value: lossStreakCooling.consecutiveLosses * 20 },
  ];
  operatorStress.components = stressComponents;
  operatorStress.score = Math.round(
    stressComponents.reduce((s, c) => s + c.value, 0) / stressComponents.length,
  );
  operatorStress.noteJa = `オペレーターストレス ${operatorStress.score}/100`;

  const ruleBreaks = [
    ...(revengeTrade.detected ? [{ ruleId: 'revenge', labelJa: 'リベンジ', count: 1 }] : []),
    ...(overtrading.alert ? [{ ruleId: 'overtrade', labelJa: '過剰取引', count: 1 }] : []),
    ...(!positionDiscipline.compliant
      ? [{ ruleId: 'size', labelJa: 'サイズ超過', count: 1 }]
      : []),
  ];

  const partial = {
    revengeTrade,
    overtrading,
    lossStreakCooling,
    fomoSpike,
    positionDiscipline,
    tradeFrequency,
    sessionFatigue,
  };
  const alerts = collectAlerts(partial);

  const tradingAllowed =
    lossStreakCooling.status !== 'active' &&
    operatorStress.score < OPERATOR_STRESS_BLOCK &&
    !revengeTrade.detected &&
    disciplinePct >= DISCIPLINE_TRADE_MIN;

  let healthStatus: 'green' | 'yellow' | 'red' = 'green';
  if (!tradingAllowed || operatorStress.score >= OPERATOR_STRESS_BLOCK) healthStatus = 'red';
  else if (alerts.some((a) => a.severity === 'high')) healthStatus = 'yellow';

  const verdictJa = tradingAllowed
    ? `規律OK — スコア ${disciplinePct} · ストレス ${operatorStress.score}`
    : healthStatus === 'red'
      ? alerts.find((a) => a.severity === 'critical')?.titleJa ?? '取引抑制推奨'
      : '監視 — 行動リスクあり';

  return {
    generatedAt: new Date().toISOString(),
    revengeTrade,
    overtrading,
    confidenceDrift,
    positionDiscipline,
    lossStreakCooling,
    fomoSpike,
    manualOverrides,
    operatorStress,
    tradeFrequency,
    riskTolerance,
    ruleBreaks,
    emotionalVolatility,
    sessionFatigue,
    decisionQuality,
    modelDivergence,
    alerts,
    disciplineScore: disciplinePct,
    tradingAllowed,
    healthStatus,
    verdictJa,
  };
}

export function behavioralTradingBlocked(report: BehavioralRiskReport): boolean {
  return !report.tradingAllowed && report.healthStatus === 'red';
}

export function shouldActivateCooling(state: OperatorBehaviorState): string | null {
  if (state.consecutiveLosses >= LOSS_STREAK_COOLING_COUNT && !state.coolingUntil) {
    return new Date(Date.now() + COOLING_MINUTES * 60000).toISOString();
  }
  return null;
}
