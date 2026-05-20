import {
  CP_DRAWDOWN_THRESHOLD_PCT,
  CP_DISAGREEMENT_THRESHOLD,
  CP_EXECUTION_QUALITY_MIN,
  CP_LIQUIDITY_RISK_MAX,
  CP_REGIME_TRANSITION_PCT,
  API_LATENCY_WARN_MS,
  QUOTE_JUMP_THRESHOLD_PCT,
  STALE_OHLCV_HOURS,
} from '../constants/shadowTrading';
import type { PerformancePoint } from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import type {
  BehavioralSurvivabilityMetrics,
  CapitalPreservationStatus,
  ExecutionHealthDashboard,
  MarketMicrostructureSnapshot,
  MarketReliabilityReport,
  PortfolioPathAnalysis,
  ShadowFill,
  ShadowModelDivergence,
  ShadowPortfolioSnapshot,
  ShadowPortfolioState,
  SystemHealthStatus,
} from '../types/shadowTrading';
import { toMYR } from './fx';
import { safePrice, safeShares } from '../utils/safeNumeric';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computeShadowSnapshot(state: ShadowPortfolioState): ShadowPortfolioSnapshot {
  const holdingsValueMYR = state.positions.reduce((s, p) => {
    const sh = safeShares(p.shares, 0);
    const pr = safePrice(p.currentPrice, p.averageBuyPrice, 0);
    return s + toMYR(sh * pr, p.currency);
  }, 0);
  const portfolioValueMYR = state.cashBalanceMYR + holdingsValueMYR;
  const unrealizedPnLMYR = state.positions.reduce((s, p) => {
    const sh = safeShares(p.shares, 0);
    const cur = safePrice(p.currentPrice, p.averageBuyPrice, 0);
    const avg = safePrice(p.averageBuyPrice, 0, 0);
    return s + toMYR((cur - avg) * sh, p.currency);
  }, 0);
  const realizedPnLMYR = state.fills
    .filter((f) => f.side === 'sell')
    .reduce((s, f) => {
      const slip = (f.slippageBps / 10000) * f.expectedPrice * f.shares;
      return s - toMYR(slip, f.currency);
    }, 0);
  const peak = Math.max(
    ...state.equityCurve.map((e) => e.portfolioValueMYR),
    portfolioValueMYR,
    state.initialCapitalMYR,
  );
  const drawdownPct = peak > 0 ? ((peak - portfolioValueMYR) / peak) * 100 : 0;
  const totalReturnPct =
    state.initialCapitalMYR > 0
      ? ((portfolioValueMYR - state.initialCapitalMYR) / state.initialCapitalMYR) * 100
      : 0;

  return {
    portfolioValueMYR: Math.round(portfolioValueMYR),
    cashBalanceMYR: Math.round(state.cashBalanceMYR),
    holdingsValueMYR: Math.round(holdingsValueMYR),
    unrealizedPnLMYR: Math.round(unrealizedPnLMYR),
    realizedPnLMYR: Math.round(realizedPnLMYR),
    totalReturnPct: Math.round(totalReturnPct * 10) / 10,
    drawdownPct: Math.round(drawdownPct * 10) / 10,
  };
}

export function analyzeMarketMicrostructure(params: {
  volatilityProxyPct: number;
  volumeShock?: boolean;
  spreadBps?: number;
}): MarketMicrostructureSnapshot {
  const vol = params.volatilityProxyPct;
  const abnormalSpreadDetected = (params.spreadBps ?? 10) > 25;
  const volumeShockDetected = params.volumeShock ?? vol > 30;

  return {
    openingAuctionVolProxy: Math.round(clamp(vol * 1.15, 0, 100)),
    intradayLiquidityDecay: Math.round(clamp(40 + vol * 0.8, 0, 100)),
    closingImbalanceProxy: Math.round(clamp(vol * 0.7 + (volumeShockDetected ? 20 : 0), 0, 100)),
    volatilityClusterScore: Math.round(clamp(vol * 1.2, 0, 100)),
    abnormalSpreadDetected,
    volumeShockDetected,
    noteJa: volumeShockDetected
      ? '出来高ショック検出 — 約定品質低下の可能性'
      : abnormalSpreadDetected
        ? 'スプレッド異常 — 流動性注意'
        : 'マイクロストラクチャは平常範囲',
  };
}

export function analyzeBehavioralSurvivability(params: {
  snapshot: ShadowPortfolioSnapshot;
  pathAnalysis: PortfolioPathAnalysis;
  allocationShockPct?: number;
}): BehavioralSurvivabilityMetrics {
  const { snapshot, pathAnalysis, allocationShockPct = 0 } = params;
  const dd = snapshot.drawdownPct;
  const drawdownPainIndex = Math.round(clamp(dd * 4 + pathAnalysis.rollingDrawdownDays * 0.5, 0, 100));
  const recoveryFatigueScore = Math.round(
    clamp(pathAnalysis.avgRecoveryDays * 3 + pathAnalysis.maxUnderwaterDays * 0.4, 0, 100),
  );
  const panicLiquidationProbability = Math.round(
    clamp(dd * 2.5 + (allocationShockPct > 15 ? 25 : 0), 0, 95),
  );
  const volatilityDiscomfortScore = Math.round(clamp(Math.abs(snapshot.unrealizedPnLMYR) / 500, 0, 100));
  const allocationShockScore = Math.round(clamp(allocationShockPct * 2, 0, 100));
  const userAbandonmentRisk = Math.round(
    clamp(drawdownPainIndex * 0.35 + recoveryFatigueScore * 0.25 + panicLiquidationProbability * 0.2, 0, 100),
  );

  return {
    drawdownPainIndex,
    recoveryFatigueScore,
    panicLiquidationProbability,
    volatilityDiscomfortScore,
    allocationShockScore,
    userAbandonmentRisk,
    noteJa:
      userAbandonmentRisk >= 60
        ? '行動的生存性: 離脱リスク高 — ポジション縮小を検討'
        : '行動的生存性: 許容範囲',
  };
}

export function analyzePortfolioPath(state: ShadowPortfolioState): PortfolioPathAnalysis {
  const curve = state.equityCurve;
  if (curve.length < 2) {
    return {
      rollingDrawdownDays: 0,
      maxUnderwaterDays: 0,
      avgRecoveryDays: 0,
      worstPathReturnPct: 0,
      pathDependencyScore: 50,
      underwaterPoints: [],
      noteJa: '履歴不足',
    };
  }

  let peak = curve[0].portfolioValueMYR;
  let underwaterDays = 0;
  let maxUnderwater = 0;
  let currentUnderwater = 0;
  const underwaterPoints: { date: string; drawdownPct: number }[] = [];
  const recoveries: number[] = [];

  for (let i = 0; i < curve.length; i++) {
    const v = curve[i].portfolioValueMYR;
    if (v > peak) {
      if (currentUnderwater > 0) recoveries.push(currentUnderwater);
      peak = v;
      currentUnderwater = 0;
    } else {
      currentUnderwater++;
      underwaterDays++;
      maxUnderwater = Math.max(maxUnderwater, currentUnderwater);
      const dd = peak > 0 ? ((peak - v) / peak) * 100 : 0;
      underwaterPoints.push({ date: curve[i].date, drawdownPct: Math.round(dd * 10) / 10 });
    }
  }

  const worstPathReturnPct =
    curve.length >= 2
      ? Math.min(
          ...curve.slice(1).map((c, i) => ((c.portfolioValueMYR - curve[i].portfolioValueMYR) / curve[i].portfolioValueMYR) * 100),
        )
      : 0;
  const avgRecoveryDays =
    recoveries.length > 0 ? recoveries.reduce((a, b) => a + b, 0) / recoveries.length : 0;
  const pathDependencyScore = Math.round(
    clamp(50 + maxUnderwater * 2 + Math.abs(worstPathReturnPct), 0, 100),
  );

  return {
    rollingDrawdownDays: currentUnderwater,
    maxUnderwaterDays: maxUnderwater,
    avgRecoveryDays: Math.round(avgRecoveryDays * 10) / 10,
    worstPathReturnPct: Math.round(worstPathReturnPct * 10) / 10,
    pathDependencyScore,
    underwaterPoints: underwaterPoints.slice(-12),
    noteJa: `最大水下 ${maxUnderwater}日 · 平均回復 ${avgRecoveryDays.toFixed(1)}日`,
  };
}

export function analyzeShadowModelDivergence(params: {
  fills: ShadowFill[];
  expectedSlippageBps?: number;
  regime: MarketRegimeResult;
  predictedRegime?: string;
}): ShadowModelDivergence {
  const { fills, expectedSlippageBps = 8, regime, predictedRegime } = params;
  if (fills.length === 0) {
    return {
      expectedSlippageBps,
      realizedSlippageBps: 0,
      slippageDriftBps: 0,
      expectedFillPrice: 0,
      avgRealizedFillPrice: 0,
      modelDriftScore: 0,
      regimeMisclassificationPct: 0,
      noteJa: '約定履歴なし',
    };
  }
  const realizedSlippageBps =
    fills.reduce((s, f) => s + f.slippageBps, 0) / fills.length;
  const slippageDriftBps = realizedSlippageBps - expectedSlippageBps;
  const expectedFillPrice =
    fills.reduce((s, f) => s + f.expectedPrice, 0) / fills.length;
  const avgRealizedFillPrice =
    fills.reduce((s, f) => s + f.fillPrice, 0) / fills.length;
  const priceDriftPct =
    expectedFillPrice > 0
      ? Math.abs((avgRealizedFillPrice - expectedFillPrice) / expectedFillPrice) * 100
      : 0;
  const modelDriftScore = Math.round(clamp(priceDriftPct * 20 + Math.abs(slippageDriftBps), 0, 100));
  const regimeMisclassificationPct =
    predictedRegime && predictedRegime !== regime.regimeId ? 35 : 10;

  return {
    expectedSlippageBps,
    realizedSlippageBps: Math.round(realizedSlippageBps * 10) / 10,
    slippageDriftBps: Math.round(slippageDriftBps * 10) / 10,
    expectedFillPrice: Math.round(expectedFillPrice * 100) / 100,
    avgRealizedFillPrice: Math.round(avgRealizedFillPrice * 100) / 100,
    modelDriftScore,
    regimeMisclassificationPct,
    noteJa: `スリッページ・ドリフト ${slippageDriftBps.toFixed(1)}bps · モデル乖離 ${modelDriftScore}/100`,
  };
}

export function checkMarketReliability(params: {
  symbols: string[];
  apiLatencyMs?: number;
  lastOhlcvHoursAgo?: number;
  quoteJumps?: number;
  cacheOk?: boolean;
}): MarketReliabilityReport {
  const stale = (params.lastOhlcvHoursAgo ?? 0) > STALE_OHLCV_HOURS;
  const latency = params.apiLatencyMs ?? 500;
  const jumps = params.quoteJumps ?? 0;
  let score = 100;
  if (stale) score -= 25;
  if (latency > API_LATENCY_WARN_MS) score -= 20;
  if (jumps > 0) score -= jumps * 10;
  if (!params.cacheOk) score -= 15;
  score = clamp(score, 0, 100);

  return {
    staleOhlcvCount: stale ? params.symbols.length : 0,
    apiLatencyMs: latency,
    missingDataSymbols: stale ? params.symbols.slice(0, 3) : [],
    abnormalQuoteJumps: jumps,
    cacheConsistent: params.cacheOk ?? true,
    reliabilityScore: score,
    noteJa:
      score >= 70
        ? `市場データ信頼性 ${score}/100`
        : `データ品質低下 ${score}/100 — 取引は慎重に`,
  };
}

export function buildExecutionHealth(params: {
  fills: ShadowFill[];
  reliability: MarketReliabilityReport;
  microstructure: MarketMicrostructureSnapshot;
  snapshot: ShadowPortfolioSnapshot;
}): ExecutionHealthDashboard {
  const fillRate =
    params.fills.length > 0
      ? params.fills.filter((f) => f.shares > 0).length / params.fills.length
      : 1;
  const avgSlip =
    params.fills.length > 0
      ? params.fills.reduce((s, f) => s + f.slippageBps, 0) / params.fills.length
      : 5;
  const executionQualityScore = Math.round(
    clamp(params.reliability.reliabilityScore * 0.4 + (100 - avgSlip * 3) * 0.3 + fillRate * 100 * 0.3, 0, 100),
  );
  const liquidityRiskScore = Math.round(
    clamp(params.microstructure.intradayLiquidityDecay * 0.5 + (params.microstructure.volumeShockDetected ? 30 : 0), 0, 100),
  );
  const marketStress: SystemHealthStatus =
    params.microstructure.volatilityClusterScore > 70 ? 'red' : params.microstructure.volatilityClusterScore > 45 ? 'yellow' : 'green';
  const shadowHealth: SystemHealthStatus =
    params.snapshot.drawdownPct > 15 ? 'red' : params.snapshot.drawdownPct > 8 ? 'yellow' : 'green';

  return {
    executionQualityScore,
    liquidityRiskScore,
    fillReliabilityPct: Math.round(fillRate * 100),
    marketStressState: marketStress,
    shadowPortfolioHealth: shadowHealth,
    noteJa: `執行品質 ${executionQualityScore}/100 · 流動性リスク ${liquidityRiskScore}/100`,
  };
}

export function evaluateCapitalPreservation(params: {
  snapshot: ShadowPortfolioSnapshot;
  regimeTransitionPct: number;
  executionQualityScore: number;
  disagreementScore: number;
  liquidityRiskScore: number;
}): CapitalPreservationStatus {
  const reasons: string[] = [];
  const codes: string[] = [];
  if (params.snapshot.drawdownPct >= CP_DRAWDOWN_THRESHOLD_PCT) {
    reasons.push(`ドローダウン ${params.snapshot.drawdownPct}%`);
    codes.push('DRAWDOWN');
  }
  if (params.regimeTransitionPct >= CP_REGIME_TRANSITION_PCT) {
    reasons.push(`レジーム遷移 ${params.regimeTransitionPct}%`);
    codes.push('REGIME_UNCERTAIN');
  }
  if (params.executionQualityScore < CP_EXECUTION_QUALITY_MIN) {
    reasons.push(`執行品質 ${params.executionQualityScore}/100`);
    codes.push('EXECUTION_QUALITY');
  }
  if (params.disagreementScore >= CP_DISAGREEMENT_THRESHOLD) {
    reasons.push(`モデル不一致 ${params.disagreementScore}`);
    codes.push('DISAGREEMENT');
  }
  if (params.liquidityRiskScore >= CP_LIQUIDITY_RISK_MAX) {
    reasons.push(`流動性リスク ${params.liquidityRiskScore}/100`);
    codes.push('LIQUIDITY');
  }

  const active = reasons.length > 0;
  return {
    active,
    triggeredAt: active ? new Date().toISOString() : undefined,
    reasons,
    reasonCodes: codes,
    noteJa: active
      ? `資本保全モード: ${reasons[0]}`
      : '資本保全モード: オフ',
  };
}

export function appendEquityPoint(state: ShadowPortfolioState): PerformancePoint[] {
  const snap = computeShadowSnapshot(state);
  const date = new Date().toISOString().slice(0, 10);
  const curve = [...state.equityCurve];
  const last = curve[curve.length - 1];
  if (last?.date === date) {
    curve[curve.length - 1] = { date, portfolioValueMYR: snap.portfolioValueMYR };
  } else {
    curve.push({ date, portfolioValueMYR: snap.portfolioValueMYR });
  }
  return curve.slice(-120);
}
