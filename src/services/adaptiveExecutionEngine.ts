import { REGIME_RISK_MULTIPLIER } from '../constants/marketRegime';
import { MARKET_REGIME_LABEL } from '../constants/marketRegime';
import {
  ADAPTIVE_LEARNING_DEFAULT,
  ALPHA_DECAY_HALF_LIFE_BASE_DAYS,
  DEFAULT_ADV_PARTICIPATION_PCT,
  KELLY_CAP_FRACTION,
  LEARNING_ALPHA,
  LEARNING_MIN_SAMPLES,
  MAX_SLICE_COUNT,
  MIN_SLICE_COUNT,
  REGIME_TRANSITION_PRIOR,
  SIGNAL_QUALITY_TRADE_MIN,
  SLICE_INTERVAL_MS,
  TIMING_DEFER_THRESHOLD,
  TIMING_IMMEDIATE_THRESHOLD,
  VOL_TARGET_PCT,
} from '../constants/adaptiveExecution';
import { SPREAD_BPS_BY_MARKET, SLIPPAGE_BPS_BASE } from '../constants/institutionalExecution';
import type { MarketRegimeId } from '../types/marketRegime';
import type {
  AdaptiveExecutionInput,
  AdaptiveExecutionReport,
  AdaptiveLearningState,
  AdaptiveOrderPlan,
  AlphaDecayMetrics,
  DynamicRiskBudget,
  ExecutionTimingGrade,
  ExecutionTimingPlan,
  LatencySlippagePlan,
  LiquiditySlicePlan,
  MacroOverlayAdjustment,
  OnlineLearningAdaptation,
  PositionSizingIntelligence,
  RegimePrediction,
  ReinforcementFeedback,
  SignalQualityScore,
  VolatilityTargeting,
} from '../types/adaptiveExecution';
import type { ShadowFill, ShadowPortfolioState } from '../types/shadowTrading';
import { buildCrossAssetPortfolioGuidance } from './crossAssetLiquidityFlowEngine';
import { intelligenceTimingAdjust } from './marketIntelligenceEngine';
import { toMYR } from './fx';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function ewma(prev: number, next: number, alpha: number): number {
  return prev * (1 - alpha) + next * alpha;
}

/** シャドー約定からオンライン学習状態を更新 */
export function updateLearningFromShadow(
  state: ShadowPortfolioState,
  learning: AdaptiveLearningState,
): AdaptiveLearningState {
  const recent = state.fills.slice(-20);
  if (recent.length === 0) return learning;

  let slippageBps = learning.ewmaSlippageBps;
  let fillRate = learning.ewmaFillRate;
  let shortfall = learning.ewmaImplementationShortfallBps;
  let hitRate = learning.ewmaSignalHitRate;
  let count = learning.fillSampleCount;

  for (const f of recent) {
    slippageBps = ewma(slippageBps, f.slippageBps, LEARNING_ALPHA);
    const filled = f.shares > 0 ? 1 : 0;
    fillRate = ewma(fillRate, filled, LEARNING_ALPHA);
    const isf = Math.abs((f.fillPrice - f.expectedPrice) / Math.max(f.expectedPrice, 1e-6)) * 10000;
    shortfall = ewma(shortfall, isf, LEARNING_ALPHA);
    const favorable =
      f.side === 'buy' ? f.fillPrice <= f.expectedPrice : f.fillPrice >= f.expectedPrice;
    hitRate = ewma(hitRate, favorable ? 1 : 0, LEARNING_ALPHA);
    count += 1;
  }

  const curve = state.equityCurve;
  let shadowReturnEwma = learning.shadowReturnEwmaPct;
  if (curve.length >= 2) {
    const a = curve[curve.length - 2].portfolioValueMYR;
    const b = curve[curve.length - 1].portfolioValueMYR;
    const ret = a > 0 ? ((b - a) / a) * 100 : 0;
    shadowReturnEwma = ewma(shadowReturnEwma, ret, LEARNING_ALPHA);
  }

  const matrix = { ...learning.regimeTransitionMatrix };
  return {
    ...learning,
    updatedAt: new Date().toISOString(),
    ewmaSlippageBps: Math.round(slippageBps * 10) / 10,
    ewmaFillRate: Math.round(fillRate * 1000) / 1000,
    ewmaImplementationShortfallBps: Math.round(shortfall * 10) / 10,
    ewmaSignalHitRate: Math.round(hitRate * 1000) / 1000,
    fillSampleCount: count,
    shadowReturnEwmaPct: Math.round(shadowReturnEwma * 100) / 100,
    regimeTransitionMatrix: matrix,
    reinforcementWeights: { ...learning.reinforcementWeights },
  };
}

function realizedVolFromEquity(curve: { portfolioValueMYR: number }[]): number {
  if (curve.length < 5) return 18;
  const rets: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1].portfolioValueMYR;
    const b = curve[i].portfolioValueMYR;
    if (a > 0) rets.push(((b - a) / a) * 100);
  }
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * Math.sqrt(252);
}

function buildVolTargeting(input: AdaptiveExecutionInput): VolatilityTargeting {
  const realized =
    input.shadowState?.equityCurve?.length
      ? realizedVolFromEquity(input.shadowState.equityCurve)
      : input.regime.indicators.volatilityProxyPct;
  const target = VOL_TARGET_PCT;
  const rawScale = target / Math.max(realized, 4);
  const rw = input.learningState.reinforcementWeights.volTarget;
  const scalingFactor = clamp(rawScale * rw, 0.35, 1.35);
  const grossExposureCapPct = clamp(95 * scalingFactor, 25, 100);
  return {
    targetVolPct: target,
    realizedVolPct: Math.round(realized * 10) / 10,
    scalingFactor: Math.round(scalingFactor * 100) / 100,
    grossExposureCapPct: Math.round(grossExposureCapPct),
    noteJa: `ボラ・ターゲティング: 実現${realized.toFixed(1)}% → スケール ${scalingFactor.toFixed(2)}`,
  };
}

function buildMacroOverlay(
  input: AdaptiveExecutionInput,
  vol: VolatilityTargeting,
): MacroOverlayAdjustment {
  const guidance = buildCrossAssetPortfolioGuidance(
    input.portfolioDrawdownPct ?? 0,
    input.regime.indicators,
  );
  const exposureMultiplier = clamp(
    (1 - guidance.totalExposureReductionPct / 100) * vol.scalingFactor,
    0.3,
    1.1,
  );
  return {
    guidance,
    exposureMultiplier: Math.round(exposureMultiplier * 100) / 100,
    betaTarget: guidance.defense.dynamicBetaTarget.maxPortfolioBeta,
    liquidityRegimeJa: guidance.flow.liquidityLabelJa,
    noteJa: guidance.flow.summaryJa,
  };
}

function buildRegimePrediction(input: AdaptiveExecutionInput): RegimePrediction {
  const current = input.regime.regimeId;
  const scores = input.regime.regimeScores ?? {};
  const prior = REGIME_TRANSITION_PRIOR[current] ?? {};
  const learned = input.learningState.regimeTransitionMatrix[current] ?? {};
  const blended: Record<string, number> = {};
  const ids = new Set([...Object.keys(prior), ...Object.keys(scores), ...Object.keys(learned)]);
  for (const id of ids) {
    blended[id] = (prior[id as MarketRegimeId] ?? 0) * 0.55 + (learned[id as MarketRegimeId] ?? 0) * 0.25 + ((scores[id as MarketRegimeId] ?? 0) / 100) * 0.2;
  }
  const total = Object.values(blended).reduce((a, b) => a + b, 0) || 1;
  const regimeScores = Object.entries(blended)
    .map(([regimeId, v]) => ({
      regimeId: regimeId as MarketRegimeId,
      probabilityPct: Math.round((v / total) * 1000) / 10,
    }))
    .sort((a, b) => b.probabilityPct - a.probabilityPct)
    .slice(0, 5);

  const predicted = regimeScores[0]?.regimeId ?? current;
  const transitionProbabilityPct = regimeScores.find((r) => r.regimeId !== current)?.probabilityPct ?? 15;

  return {
    currentRegimeId: current,
    predictedNextRegimeId: predicted,
    transitionProbabilityPct: Math.round(transitionProbabilityPct),
    horizonDays: 5,
    regimeScores,
    noteJa: `予測: ${MARKET_REGIME_LABEL[predicted] ?? predicted}（${transitionProbabilityPct.toFixed(0)}%遷移）`,
  };
}

function buildSignalQuality(input: AdaptiveExecutionInput, alpha: AlphaDecayMetrics): SignalQualityScore {
  const metaConf = input.governance?.meta.confidenceBlend.effectiveConfidence ?? 55;
  const disagreement = input.governance?.meta.disagreement.score ?? 25;
  const fillRel = input.learningState.ewmaFillRate * 100;
  const signal = input.signalScore ?? metaConf;
  const components = [
    { id: 'signal', labelJa: 'シグナル', weight: 0.35, value: signal },
    { id: 'meta', labelJa: 'メタ信頼', weight: 0.25, value: metaConf },
    { id: 'fill', labelJa: '約定品質', weight: 0.2, value: fillRel },
    { id: 'alpha', labelJa: 'アルファ残存', weight: 0.2, value: Math.max(0, 100 - alpha.decayPct) },
  ];
  const intelBoost = input.marketIntelligence
    ? input.marketIntelligence.newsSentiment.aggregateScore * 0.08
    : 0;
  const score = Math.round(
    components.reduce((s, c) => s + c.value * c.weight, 0) - disagreement * 0.15 + intelBoost,
  );
  const tradeAllowed =
    score >= SIGNAL_QUALITY_TRADE_MIN &&
    !alpha.stale &&
    !(input.marketIntelligence?.panicEuphoria.state === 'panic');
  return {
    score: clamp(score, 0, 100),
    components,
    tradeAllowed,
    noteJa: tradeAllowed
      ? `シグナル品質 ${score} — 執行許可`
      : `シグナル品質 ${score} — 品質不足または減衰`,
  };
}

function buildAlphaDecay(input: AdaptiveExecutionInput): AlphaDecayMetrics {
  const disagreement = input.governance?.meta.disagreement.score ?? 20;
  const agePenalty = input.portfolioDrawdownPct ? input.portfolioDrawdownPct * 0.1 : 0;
  const halfLifeDays = Math.max(5, ALPHA_DECAY_HALF_LIFE_BASE_DAYS - disagreement * 0.08 - agePenalty);
  const decayPct = clamp(100 * (1 - Math.exp(-3 / halfLifeDays)), 5, 85);
  const edgeBps = clamp(
    (input.signalScore ?? 55) * 0.4 - input.learningState.ewmaImplementationShortfallBps * 0.5,
    -20,
    40,
  );
  const stale = decayPct > 65 || edgeBps < 0;
  return {
    halfLifeDays: Math.round(halfLifeDays),
    decayPct: Math.round(decayPct),
    currentEdgeBps: Math.round(edgeBps),
    stale,
    noteJa: stale
      ? `アルファ減衰 — 半減期 ${halfLifeDays.toFixed(0)}日 · エッジ ${edgeBps}bps`
      : `アルファ有効 — 半減期 ${halfLifeDays.toFixed(0)}日`,
  };
}

function buildPositionSizing(
  input: AdaptiveExecutionInput,
  vol: VolatilityTargeting,
  macro: MacroOverlayAdjustment,
  signal: SignalQualityScore,
): PositionSizingIntelligence {
  const basePct = input.baseSizing?.suggestedAllocationPct ?? 3;
  const regimeMult = REGIME_RISK_MULTIPLIER[input.regime.regimeId] ?? 1;
  const volScale = vol.scalingFactor;
  const signalMult = clamp(signal.score / 70, 0.4, 1.2);
  const macroMult = macro.exposureMultiplier;
  const kelly = clamp((signal.score / 100) * KELLY_CAP_FRACTION * 100, 0.5, KELLY_CAP_FRACTION * 100);
  const maxSinglePct = 12;
  const suggestedAllocationPct = clamp(
    basePct * regimeMult * volScale * signalMult * macroMult,
    0.5,
    maxSinglePct,
  );
  const priceMYR = input.priceMYR ?? 1;
  const suggestedShares =
    input.totalPortfolioValueMYR > 0 && priceMYR > 0
      ? Math.floor((input.totalPortfolioValueMYR * (suggestedAllocationPct / 100)) / priceMYR)
      : input.baseSizing?.suggestedShares ?? 0;

  return {
    baseAllocationPct: basePct,
    regimeMultiplier: regimeMult,
    volTargetScale: volScale,
    signalQualityMultiplier: Math.round(signalMult * 100) / 100,
    macroOverlayMultiplier: macroMult,
    riskBudgetCapPct: maxSinglePct,
    suggestedAllocationPct: Math.round(suggestedAllocationPct * 10) / 10,
    suggestedShares,
    kellyFractionCapped: Math.round(kelly * 10) / 10,
    noteJa: `適応サイズ ${suggestedAllocationPct.toFixed(1)}% · Kelly上限 ${kelly.toFixed(1)}%`,
  };
}

function buildRiskBudget(input: AdaptiveExecutionInput, sizing: PositionSizingIntelligence): DynamicRiskBudget {
  const riskPct = input.baseSizing?.riskPerTradePct ?? 1;
  const totalRiskBudgetMYR = (input.totalPortfolioValueMYR * riskPct * 5) / 100;
  const perSymbol: Record<string, number> = {};
  let deployed = 0;
  for (const p of input.portfolio) {
    if (p.shares <= 0) continue;
    const notional = toMYR(p.shares * (p.currentPrice || p.averageBuyPrice), p.currency);
    const risk = notional * 0.06;
    perSymbol[p.symbol] = Math.round(risk);
    deployed += risk;
  }
  const available = Math.max(0, totalRiskBudgetMYR - deployed);
  if (input.symbol) {
    perSymbol[input.symbol] = Math.round(
      (perSymbol[input.symbol] ?? 0) +
        (input.totalPortfolioValueMYR * sizing.suggestedAllocationPct) / 100 * 0.06,
    );
  }
  return {
    totalRiskBudgetMYR: Math.round(totalRiskBudgetMYR),
    deployedRiskMYR: Math.round(deployed),
    availableRiskMYR: Math.round(available),
    perSymbolBudgetMYR: perSymbol,
    utilizationPct:
      totalRiskBudgetMYR > 0 ? Math.round((deployed / totalRiskBudgetMYR) * 100) : 0,
    noteJa: `リスク予算 ${Math.round(totalRiskBudgetMYR)} MYR · 利用率 ${Math.round((deployed / Math.max(totalRiskBudgetMYR, 1)) * 100)}%`,
  };
}

function buildTiming(input: AdaptiveExecutionInput, signal: SignalQualityScore): ExecutionTimingPlan {
  const vol = input.volatilityProxyPct ?? input.regime.indicators.volatilityProxyPct;
  const latencyPenalty = clamp((input.apiLatencyMs ?? 200) / 50, 0, 25);
  const rw = input.learningState.reinforcementWeights.timing;
  const intelAdj = input.marketIntelligence
    ? intelligenceTimingAdjust(input.marketIntelligence)
    : 0;
  const timingScore = clamp(
    (signal.score - vol * 0.4 - latencyPenalty + 15 + intelAdj) * rw,
    0,
    100,
  );
  let grade: ExecutionTimingGrade = 'patient';
  if (timingScore >= TIMING_IMMEDIATE_THRESHOLD) grade = 'immediate';
  else if (timingScore < TIMING_DEFER_THRESHOLD) grade = 'defer';

  const optimalDelayMs =
    grade === 'immediate' ? 0 : grade === 'patient' ? 30_000 : 120_000;

  return {
    grade,
    timingScore: Math.round(timingScore),
    optimalDelayMs,
    spreadWindowJa: vol > 28 ? '高ボラ — スプレッド拡大注意' : '通常スプレッド帯',
    rationaleJa:
      grade === 'immediate'
        ? '即時執行 — シグナル・流動性が良好'
        : grade === 'defer'
          ? '執行延期 — ボラ/遅延が不利'
          : '忍耐執行 — VWAP/TWAP風に分割推奨',
  };
}

function buildSlicePlan(
  totalShares: number,
  dailyVolume: number,
  price: number,
  learning: AdaptiveLearningState,
): LiquiditySlicePlan {
  const aggression = learning.reinforcementWeights.sliceAggression;
  const notional = totalShares * price;
  const adv = Math.max(dailyVolume * price, notional * 10);
  const participation = (notional / adv) * 100;
  let sliceCount = MIN_SLICE_COUNT;
  if (participation > DEFAULT_ADV_PARTICIPATION_PCT * 2) sliceCount = 3;
  if (participation > DEFAULT_ADV_PARTICIPATION_PCT * 5) sliceCount = 5;
  sliceCount = Math.min(MAX_SLICE_COUNT, Math.max(MIN_SLICE_COUNT, Math.round(sliceCount * aggression)));

  const base = Math.floor(totalShares / sliceCount);
  const sharesPerSlice: number[] = [];
  let rem = totalShares;
  for (let i = 0; i < sliceCount; i++) {
    const sh = i === sliceCount - 1 ? rem : base;
    sharesPerSlice.push(sh);
    rem -= sh;
  }

  return {
    totalShares,
    sliceCount,
    sharesPerSlice,
    participationPctOfAdv: Math.round(participation * 100) / 100,
    intervalMs: SLICE_INTERVAL_MS,
    noteJa: `${sliceCount}分割 · ADV比 ${participation.toFixed(2)}%`,
  };
}

function buildLatencyPlan(
  input: AdaptiveExecutionInput,
  timing: ExecutionTimingPlan,
  slices: LiquiditySlicePlan,
): LatencySlippagePlan {
  const market = input.market ?? 'us';
  const spreadBps = SPREAD_BPS_BY_MARKET[market] ?? 12;
  const vol = input.volatilityProxyPct ?? 20;
  const learned = input.learningState.ewmaSlippageBps;
  const expectedSlippageBps = Math.round(
    (SLIPPAGE_BPS_BASE + vol * 0.12 + learned * 0.35) / slices.sliceCount,
  );
  const expectedDelayMs = timing.optimalDelayMs + SLICE_INTERVAL_MS * Math.max(0, slices.sliceCount - 1);
  return {
    expectedSlippageBps,
    expectedDelayMs,
    spreadBps,
    minimizeAggression: timing.grade !== 'immediate',
    noteJa: `期待スリッページ ${expectedSlippageBps}bps · 遅延 ~${Math.round(expectedDelayMs / 1000)}s`,
  };
}

function buildOnlineLearning(
  prior: AdaptiveLearningState,
  updated: AdaptiveLearningState,
): OnlineLearningAdaptation {
  return {
    priorSlippageBps: prior.ewmaSlippageBps,
    updatedSlippageBps: updated.ewmaSlippageBps,
    priorFillRate: prior.ewmaFillRate,
    updatedFillRate: updated.ewmaFillRate,
    learningRate: LEARNING_ALPHA,
    samplesUsed: updated.fillSampleCount,
    adaptationNoteJa:
      updated.fillSampleCount >= LEARNING_MIN_SAMPLES
        ? `シャドー ${updated.fillSampleCount}件から EWMA 更新`
        : 'サンプル不足 — 事前分布を維持',
  };
}

function buildReinforcement(
  input: AdaptiveExecutionInput,
  updated: AdaptiveLearningState,
): ReinforcementFeedback {
  const ret = updated.shadowReturnEwmaPct;
  const shortfall = updated.ewmaImplementationShortfallBps;
  const reward = clamp(ret * 10 - shortfall * 0.3 + updated.ewmaSignalHitRate * 20, -30, 30);
  const delta = reward > 5 ? 0.03 : reward < -5 ? -0.03 : 0;
  return {
    rewardScore: Math.round(reward),
    timingWeightDelta: delta,
    sliceWeightDelta: reward > 0 ? -0.02 : 0.02,
    volTargetWeightDelta: ret < -1 ? -0.02 : 0.01,
    noteJa:
      reward > 5
        ? '正のフィードバック — 執行パラメータを微強化'
        : reward < -5
          ? '負のフィードバック — スライス/タイミングを保守化'
          : '中立 — 現行パラメータ維持',
  };
}

function applyReinforcement(
  learning: AdaptiveLearningState,
  fb: ReinforcementFeedback,
): AdaptiveLearningState {
  const w = { ...learning.reinforcementWeights };
  w.timing = clamp(w.timing + fb.timingWeightDelta, 0.7, 1.3);
  w.sliceAggression = clamp(w.sliceAggression + fb.sliceWeightDelta, 0.6, 1.4);
  w.volTarget = clamp(w.volTarget + fb.volTargetWeightDelta, 0.7, 1.3);
  return { ...learning, reinforcementWeights: w };
}

function buildOrderPlans(
  input: AdaptiveExecutionInput,
  sizing: PositionSizingIntelligence,
  timing: ExecutionTimingPlan,
  signal: SignalQualityScore,
  learning: AdaptiveLearningState,
): AdaptiveOrderPlan[] {
  if (!input.symbol || !input.market || !input.currency) return [];
  const shares = input.intendedShares ?? sizing.suggestedShares;
  if (shares <= 0) return [];
  const price = input.priceMYR ?? 1;
  const slices = buildSlicePlan(
    shares,
    input.dailyVolume ?? 1_000_000,
    price,
    learning,
  );
  const latency = buildLatencyPlan(input, timing, slices);
  return [
    {
      symbol: input.symbol,
      market: input.market,
      currency: input.currency,
      side: 'buy',
      totalShares: shares,
      sizing,
      timing,
      slices,
      latency,
      signalQuality: signal,
    },
  ];
}

/** 適応執行・アルファ統合レポート */
export function buildAdaptiveExecutionReport(
  input: AdaptiveExecutionInput,
): { report: AdaptiveExecutionReport; learningState: AdaptiveLearningState } {
  let learning = input.learningState;
  if (input.shadowState) {
    const updated = updateLearningFromShadow(input.shadowState, learning);
    learning = updated;
  }

  const vol = buildVolTargeting({ ...input, learningState: learning });
  const macro = buildMacroOverlay({ ...input, learningState: learning }, vol);
  const regimePrediction = buildRegimePrediction({ ...input, learningState: learning });
  const alphaDecay = buildAlphaDecay({ ...input, learningState: learning });
  const signalQuality = buildSignalQuality({ ...input, learningState: learning }, alphaDecay);
  const positionSizing = buildPositionSizing(
    { ...input, learningState: learning },
    vol,
    macro,
    signalQuality,
  );
  const riskBudget = buildRiskBudget({ ...input, learningState: learning }, positionSizing);
  const timing = buildTiming({ ...input, learningState: learning }, signalQuality);
  const defaultShares = input.intendedShares ?? positionSizing.suggestedShares;
  const defaultSlices = buildSlicePlan(
    Math.max(1, defaultShares),
    input.dailyVolume ?? 1_000_000,
    input.priceMYR ?? 1,
    learning,
  );
  const latencyPlan = buildLatencyPlan(
    { ...input, learningState: learning },
    timing,
    defaultSlices,
  );
  const onlineLearning = buildOnlineLearning(input.learningState, learning);
  const reinforcement = buildReinforcement({ ...input, learningState: learning }, learning);
  learning = applyReinforcement(learning, reinforcement);

  const orderPlans = buildOrderPlans(
    { ...input, learningState: learning },
    positionSizing,
    timing,
    signalQuality,
    learning,
  );

  let healthStatus: 'green' | 'yellow' | 'red' = 'green';
  if (!signalQuality.tradeAllowed || input.governance?.doNotTrade.active) healthStatus = 'red';
  else if (timing.grade === 'defer' || alphaDecay.stale) healthStatus = 'yellow';

  const verdictJa =
    healthStatus === 'green'
      ? `適応執行OK — 品質${signalQuality.score} · ${timing.rationaleJa}`
      : healthStatus === 'yellow'
        ? `慎重執行 — ${alphaDecay.noteJa}`
        : `執行制限 — ${signalQuality.noteJa}`;

  const report: AdaptiveExecutionReport = {
    generatedAt: new Date().toISOString(),
    positionSizing,
    riskBudget,
    volTargeting: vol,
    macroOverlay: macro,
    regimePrediction,
    onlineLearning,
    timing,
    defaultSlicePlan: defaultSlices,
    latencyPlan,
    reinforcement,
    alphaDecay,
    signalQuality,
    orderPlans,
    healthStatus,
    verdictJa,
  };

  learning = { ...learning, lastRegimeId: input.regime.regimeId };

  return { report, learningState: learning };
}

export function createDefaultLearningState(): AdaptiveLearningState {
  return {
    ...ADAPTIVE_LEARNING_DEFAULT,
    updatedAt: new Date().toISOString(),
  };
}

/** 注文用ヒント（OMS/シャドー連携） */
export function buildAdaptiveExecutionHints(
  report: AdaptiveExecutionReport,
  sliceIndex = 0,
): import('../types/adaptiveExecution').AdaptiveExecutionHints {
  const plan = report.orderPlans[0];
  const slices = plan?.slices ?? report.defaultSlicePlan;
  const timing = plan?.timing ?? report.timing;
  const liq = clamp(100 - report.latencyPlan.expectedSlippageBps, 20, 95);
  return {
    sliceCount: slices.sliceCount,
    sliceIndex,
    timingScore: timing.timingScore,
    liquidityScore: liq,
    targetParticipationPct: slices.participationPctOfAdv,
    optimalDelayMs: timing.optimalDelayMs,
  };
}

/** 約定後に遷移行列を1ステップ更新 */
export function recordRegimeTransition(
  learning: AdaptiveLearningState,
  from: MarketRegimeId,
  to: MarketRegimeId,
): AdaptiveLearningState {
  const row = { ...(learning.regimeTransitionMatrix[from] ?? {}) };
  const prev = row[to] ?? 0;
  row[to] = prev * (1 - LEARNING_ALPHA) + LEARNING_ALPHA;
  return {
    ...learning,
    regimeTransitionMatrix: { ...learning.regimeTransitionMatrix, [from]: row },
  };
}
