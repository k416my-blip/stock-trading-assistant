import {
  EXECUTION_STAGE_LABEL,
  SIGNAL_DECAY_CRITICAL_SCORE,
  SIGNAL_DECAY_STALE_DAYS,
  SLIPPAGE_BPS_BASE,
  SPREAD_BPS_BY_MARKET,
  STAGED_ENTRY_PCTS,
} from '../constants/institutionalExecution';
import { FX_TO_MYR } from '../constants/rakutenTrade';
import type { Currency, Market, PositionSizingResult, TradeSuggestion } from '../types';
import type {
  EntryStage,
  SignalDecayScore,
  StagedEntryPlan,
  TransactionCostModel,
} from '../types/institutionalRisk';
import type { StockRecommendation } from '../types/recommendation';
import { getBrokerageEstimate } from './brokerage';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** 段階的エントリー計画（機関投資家型） */
export function buildStagedEntryPlan(
  sizing: PositionSizingResult,
  tradeSuggestion: TradeSuggestion,
  signalDecay: SignalDecayScore,
  priceMYR: number,
): StagedEntryPlan {
  const totalShares = Math.max(0, sizing.suggestedShares);
  const totalTargetMYR = totalShares * priceMYR;

  if (totalShares <= 0 || signalDecay.stale) {
    return {
      stages: [],
      totalTargetShares: 0,
      totalTargetMYR: 0,
      rationaleJa: signalDecay.stale
        ? 'シグナル減衰が大きい — 新規エントリーは見送り'
        : 'サイズ算出不可 — 資金・リスク設定を確認',
    };
  }

  const stageIds = ['probe', 'scale', 'full'] as const;
  let allocated = 0;
  const stages: EntryStage[] = stageIds.map((stageId) => {
    const pct = STAGED_ENTRY_PCTS[stageId];
    let shares = Math.floor((totalShares * pct) / 100);
    if (stageId === 'full') {
      shares = Math.max(0, totalShares - allocated);
    }
    allocated += shares;
    const limitPrice =
      stageId === 'probe'
        ? tradeSuggestion.entryPrice
        : stageId === 'scale'
          ? Number((tradeSuggestion.entryPrice * 1.01).toFixed(2))
          : Number((tradeSuggestion.entryPrice * 1.02).toFixed(2));
    return {
      stageId,
      labelJa: EXECUTION_STAGE_LABEL[stageId],
      sharePct: pct,
      shares,
      limitPrice,
      conditionsJa:
        stageId === 'probe'
          ? 'シグナル維持を確認後、Rakuten Tradeで手動指値'
          : stageId === 'scale'
            ? '押し目または出来高確認後に追加'
            : '目標配分まで完了（流動性・ターンオーバー上限内）',
    };
  });

  return {
    stages: stages.filter((s) => s.shares > 0),
    totalTargetShares: totalShares,
    totalTargetMYR: Math.round(totalTargetMYR),
    rationaleJa: `3段階実行: プローブ${STAGED_ENTRY_PCTS.probe}% → スケール${STAGED_ENTRY_PCTS.scale}% → フル${STAGED_ENTRY_PCTS.full}%`,
  };
}

/** 取引コストモデル（手数料+スプレッド+スリッページ） */
export function modelTransactionCosts(
  market: Market,
  shares: number,
  price: number,
  currency: Currency,
  volatilityPct = 20,
): TransactionCostModel {
  const fee = getBrokerageEstimate(market, shares, price, currency);
  const tradeValueMYR = fee.tradeValue * FX_TO_MYR[currency];
  const spreadBps = SPREAD_BPS_BY_MARKET[market];
  const slippageBps = SLIPPAGE_BPS_BASE + volatilityPct * 0.15;
  const spreadCostMYR = tradeValueMYR * (spreadBps / 10000);
  const slippageMYR = tradeValueMYR * (slippageBps / 10000);
  const explicitFeeMYR = fee.estimatedFee * FX_TO_MYR[currency];
  const totalCostMYR = explicitFeeMYR + spreadCostMYR + slippageMYR;
  const costBps = tradeValueMYR > 0 ? (totalCostMYR / tradeValueMYR) * 10000 : 0;

  return {
    explicitFeeMYR: Math.round(explicitFeeMYR * 100) / 100,
    spreadCostEstimateMYR: Math.round(spreadCostMYR * 100) / 100,
    slippageEstimateMYR: Math.round(slippageMYR * 100) / 100,
    totalCostMYR: Math.round(totalCostMYR * 100) / 100,
    costBps: Math.round(costBps),
    roundTripCostBps: Math.round(costBps * 2),
    noteJa: `片道約${Math.round(costBps)}bps · 往復約${Math.round(costBps * 2)}bps（推定）`,
  };
}

/** シグナル減衰スコア */
export function computeSignalDecay(
  recommendation: StockRecommendation | null | undefined,
  positionOpenedAt?: string,
  entryScore?: number,
): SignalDecayScore {
  const currentScore = recommendation?.totalScore ?? 50;
  const opened = positionOpenedAt ? new Date(positionOpenedAt).getTime() : Date.now();
  const ageDays = Math.max(0, Math.floor((Date.now() - opened) / (24 * 60 * 60 * 1000)));
  const base = entryScore ?? currentScore;
  const decayPct = base > 0 ? clamp(((base - currentScore) / base) * 100, 0, 100) : 0;
  const agePenalty = Math.min(40, ageDays * 2);
  const score = clamp(Math.round(currentScore - agePenalty - decayPct * 0.3), 0, 100);
  const stale = ageDays >= SIGNAL_DECAY_STALE_DAYS || score < SIGNAL_DECAY_CRITICAL_SCORE;

  let labelJa = 'シグナル有効';
  if (stale) labelJa = 'シグナル減衰 — エントリー見送り推奨';
  else if (decayPct > 20) labelJa = 'シグナル弱化 — サイズ縮小を検討';

  return {
    score,
    ageDays,
    entryScore: entryScore ?? base,
    currentScore,
    decayPct: Math.round(decayPct),
    labelJa,
    stale,
  };
}
