import { SPREAD_BPS_BY_MARKET } from '../constants/institutionalExecution';
import type { AdaptiveExecutionHints } from '../types/adaptiveExecution';
import type {
  ExecutionRealismResult,
  ShadowExecutionConfig,
  SubmitShadowOrderInput,
} from '../types/shadowTrading';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** スプレッド・スリッページ・部分約定・遅延・ギャップをシミュレート */
export function simulateExecutionRealism(params: {
  input: SubmitShadowOrderInput;
  config: ShadowExecutionConfig;
  isOpeningSession?: boolean;
  liquidityScore?: number;
  adaptiveHints?: AdaptiveExecutionHints;
}): ExecutionRealismResult {
  const { input, config, isOpeningSession, adaptiveHints } = params;
  const liquidityScore = adaptiveHints?.liquidityScore ?? params.liquidityScore ?? 70;
  const now = Date.now();
  const priceAge = input.priceUpdatedAt
    ? now - new Date(input.priceUpdatedAt).getTime()
    : config.stalePriceMaxAgeMs + 1;

  if (priceAge > config.stalePriceMaxAgeMs) {
    return {
      slippageBps: 0,
      spreadBps: 0,
      fillPrice: input.expectedPrice,
      fillPct: 0,
      delayMs: 0,
      gapAdjustmentPct: 0,
      stalePriceRejected: true,
      liquidityCapped: false,
      noteJa: '価格が古いため拒否（ステール・クォート）',
    };
  }

  const spreadBps = SPREAD_BPS_BY_MARKET[input.market] ?? 12;
  const vol = input.volatilityProxyPct ?? 20;
  const timingAdj = adaptiveHints ? (100 - adaptiveHints.timingScore) * 0.03 : 0;
  const slippageBps =
    config.slippageBpsBase +
    vol * config.slippageVolMultiplier +
    (isOpeningSession ? 8 : 0) +
    timingAdj;

  const liquidityFactor = clamp(liquidityScore / 100, 0.3, 1);
  const sliceFactor =
    adaptiveHints && adaptiveHints.sliceCount > 1
      ? 1 / adaptiveHints.sliceCount
      : 1;
  let fillPct = clamp((0.55 + liquidityFactor * 0.45) * sliceFactor, config.partialFillMinPct, 1);
  const dailyVol = input.dailyVolume ?? 1_000_000;
  const orderNotional = input.shares * input.expectedPrice;
  const maxNotional = dailyVol * (config.maxOrderPctOfDailyVolume / 100);
  let liquidityCapped = false;
  if (orderNotional > maxNotional && maxNotional > 0) {
    fillPct = Math.min(fillPct, maxNotional / orderNotional);
    liquidityCapped = true;
  }

  const delayMs =
    (adaptiveHints?.optimalDelayMs ?? 0) +
    Math.floor(Math.random() * config.maxFillDelayMs * sliceFactor);
  const sideSign = input.side === 'buy' ? 1 : -1;
  const totalBps = (spreadBps / 2 + slippageBps) / 10000;
  const fillPrice = input.expectedPrice * (1 + sideSign * totalBps);

  let gapAdjustmentPct = 0;
  if (config.overnightGapEnabled && Math.random() < 0.08) {
    gapAdjustmentPct = (Math.random() - 0.5) * 4;
  }

  return {
    slippageBps: Math.round(slippageBps * 10) / 10,
    spreadBps,
    fillPrice: Math.round(fillPrice * 10000) / 10000,
    fillPct: Math.round(fillPct * 1000) / 1000,
    delayMs,
    gapAdjustmentPct: Math.round(gapAdjustmentPct * 100) / 100,
    stalePriceRejected: false,
    liquidityCapped,
    noteJa: liquidityCapped
      ? `流動性上限で約定 ${(fillPct * 100).toFixed(0)}% · スリッページ ${slippageBps.toFixed(1)}bps`
      : `約定 ${(fillPct * 100).toFixed(0)}% · 遅延 ${delayMs}ms · スリッページ ${slippageBps.toFixed(1)}bps`,
  };
}
