/**
 * Capital Allocation & Buying Power Intelligence — rule-based, paper-only, local.
 */
import {
  ATR_STOP_PROXY_PCT,
  BEGINNER_MAX_SUGGESTIONS,
  CAPITAL_ALLOCATION_HUMAN_CONFIRM_JA,
  CAPITAL_ALLOCATION_REGULATORY_JA,
  CONFIDENCE_ALLOC_MULT,
  CONVICTION_HIGH_MIN_CONF,
  CONVICTION_MEDIUM_MIN_CONF,
  CONVICTION_SIZE_MULT,
  FEE_BUFFER_BPS,
  FX_BUFFER_PCT,
  KELLY_SAFE_MAX_FRACTION,
  MIN_CASH_RESERVE_DEFENSIVE_PCT,
  MIN_CASH_RESERVE_NORMAL_PCT,
  MIN_CASH_RESERVE_PANIC_PCT,
  PORTFOLIO_MODE_SIZE_MULT,
  REAL_TRADING_LOCK_JA,
  SIZING_TIER_LABELS_JA,
  UNSETTLED_CASH_PCT,
  VOL_HIGH_SHRINK,
  VOL_HIGH_THRESHOLD_PCT,
} from '../constants/capitalAllocation';
import { PAPER_COMMISSION_BPS } from '../constants/paperBroker';
import type { Market } from '../types';
import type {
  BuildCapitalAllocationInput,
  BuyingPowerBreakdown,
  CapitalAllocationBundle,
  CapitalAllocationPersisted,
  ConvictionLevel,
  PaperOrderDraft,
  PortfolioMode,
  SizingTier,
  SuggestedOrder,
  TierShareCount,
} from '../types/capitalAllocation';
import type { StrategySymbolRecommendation } from '../types/strategyExecution';
import { toMYR } from './fx';
import { getLotRule, roundToLotSize, validateLotForMarket } from './capitalAllocationLot';
import {
  loadCapitalAllocationState,
  saveCapitalAllocationState,
} from './capitalAllocationStorage';

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n * 10) / 10));
}

function resolveMinCashReservePct(input: BuildCapitalAllocationInput): number {
  if (input.regimeId === 'panic') return MIN_CASH_RESERVE_PANIC_PCT;
  if (
    input.portfolioRiskBundle?.defensiveModeActive ||
    input.portfolioRiskBundle?.riskEscalationActive ||
    input.tacticalMode === 'defensive'
  ) {
    return MIN_CASH_RESERVE_DEFENSIVE_PCT;
  }
  const rec =
    input.portfolioRiskBundle?.recommendedCashRatioPct ??
    input.strategyBundle?.allocation.recommendedCashRatioPct;
  if (rec != null && rec > MIN_CASH_RESERVE_NORMAL_PCT) return Math.min(rec, 45);
  return MIN_CASH_RESERVE_NORMAL_PCT;
}

function convictionFromConfidence(conf: number): ConvictionLevel {
  if (conf >= CONVICTION_HIGH_MIN_CONF) return 'high';
  if (conf >= CONVICTION_MEDIUM_MIN_CONF) return 'medium';
  return 'low';
}

function buildBuyingPower(input: BuildCapitalAllocationInput): BuyingPowerBreakdown {
  const available = Math.max(0, input.availableCashMYR);
  const minReservePct = resolveMinCashReservePct(input);
  const equity = Math.max(available, input.totalEquityMYR, 1);
  const emergencyReserve = (minReservePct / 100) * equity;
  const unsettled = (UNSETTLED_CASH_PCT / 100) * available;
  const fxBuffer = (FX_BUFFER_PCT / 100) * available;
  const feeBuffer = (FEE_BUFFER_BPS / 10_000) * available;
  const reserved = emergencyReserve + unsettled;
  const usable = Math.max(0, available - reserved - fxBuffer - feeBuffer);

  return {
    availableCashMYR: Math.round(available),
    reservedCashMYR: Math.round(reserved + fxBuffer),
    unsettledCashMYR: Math.round(unsettled),
    emergencyReserveMYR: Math.round(emergencyReserve),
    fxBufferMYR: Math.round(fxBuffer),
    feeBufferMYR: Math.round(feeBuffer),
    usableCashMYR: Math.round(usable),
    minCashReservePct: minReservePct,
    noteJa: `利用可能 ${Math.round(available)} MYR — 最低現金 ${minReservePct}% · FX ${FX_BUFFER_PCT}% · 手数料バッファ込み`,
  };
}

function kellySafeFraction(confidencePct: number, rewardRisk: number | null): number {
  const p = Math.min(0.75, confidencePct / 100);
  const q = 1 - p;
  const b = rewardRisk != null && rewardRisk > 0 ? rewardRisk : 1.2;
  const f = (p * b - q) / b;
  return Math.max(0, Math.min(KELLY_SAFE_MAX_FRACTION, f));
}

function volShrink(intradayChangePct: number | null | undefined): number {
  const ch = Math.abs(intradayChangePct ?? 0);
  return ch >= VOL_HIGH_THRESHOLD_PCT ? VOL_HIGH_SHRINK : 1;
}

function computeSharesForBudget(
  budgetMYR: number,
  price: number,
  currency: import('../types').Currency,
  market: Market,
): number {
  if (price <= 0 || budgetMYR <= 0) return 0;
  const priceMYR = toMYR(price, currency);
  const raw = budgetMYR / priceMYR;
  return roundToLotSize(raw, market).shares;
}

function buildTierCounts(
  rec: StrategySymbolRecommendation,
  budgetMYR: number,
  price: number,
  modeMult: number,
): TierShareCount[] {
  const tiers: SizingTier[] = ['conservative', 'standard', 'aggressive'];
  const currency: import('../types').Currency =
    rec.market === 'us' ? 'USD' : rec.market === 'hk' ? 'HKD' : 'MYR';

  return tiers.map((tier) => {
    const pct = rec.positionSizePct[tier] / 100;
    const tierBudget = budgetMYR * pct * modeMult;
    const { shares, noteJa } = roundToLotSize(
      tierBudget / Math.max(toMYR(price, currency), 0.01),
      rec.market,
    );
    const notional = shares * toMYR(price, currency);
    const valid = validateLotForMarket(shares, rec.market).valid;
    return {
      tier,
      shares,
      notionalMYR: Math.round(notional),
      valid,
      lotNoteJa: noteJa,
    };
  });
}

function selectBuyCandidates(
  strategy: StrategySymbolRecommendation[] | undefined,
  beginnerMode: boolean,
): StrategySymbolRecommendation[] {
  const buys = (strategy ?? []).filter((r) => r.action === 'buy' && r.intent === 'action');
  const sorted = [...buys].sort((a, b) => b.confidencePct - a.confidencePct);
  const limit = beginnerMode ? BEGINNER_MAX_SUGGESTIONS : 6;
  return sorted.slice(0, limit);
}

function dynamicBudgetPerSymbol(usableMYR: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sumW = weights.reduce((s, w) => s + w, 0) || 1;
  return weights.map((w) => usableMYR * (w / sumW));
}

export function buildCapitalAllocationBundle(
  persisted: CapitalAllocationPersisted,
  input: BuildCapitalAllocationInput,
): CapitalAllocationBundle {
  const buyingPower = buildBuyingPower(input);
  const portfolioMode = input.portfolioMode ?? persisted.portfolioMode;
  const beginnerMode = input.beginnerMode ?? persisted.beginnerMode;
  const preferredTier = persisted.preferredSizingTier;

  const safeModeActive =
    input.regimeId === 'panic' ||
    input.portfolioRiskBundle?.defensiveModeActive === true ||
    input.portfolioRiskBundle?.riskEscalationActive === true;

  const emergencyGuardActive =
    safeModeActive ||
    Boolean(input.executionBundle?.newOrdersBlockedJa) ||
    (input.drawdownPct ?? 0) >= (input.executionBundle?.maxDrawdownPct ?? 18);

  const emergencyGuardNoteJa = emergencyGuardActive
    ? input.executionBundle?.newOrdersBlockedJa ??
      '緊急流動性ガード — 新規投入を制限（小ロット・現金維持）'
    : null;

  const maxPositionCapPct =
    input.portfolioRiskBundle?.dynamicMaxPositionCapPct ?? 18;

  const deployableMYR = Math.max(
    0,
    buyingPower.usableCashMYR * (1 - buyingPower.minCashReservePct / 100),
  );

  const modeMult = PORTFOLIO_MODE_SIZE_MULT[portfolioMode] * (safeModeActive ? 0.55 : 1);

  const candidates = selectBuyCandidates(
    input.strategyBundle?.todayRecommendations,
    beginnerMode,
  );

  const weights = candidates.map((c) => {
    const conv = convictionFromConfidence(c.confidencePct);
    const confMult = CONFIDENCE_ALLOC_MULT[conv];
    const convMult = CONVICTION_SIZE_MULT[conv];
    const kelly = kellySafeFraction(c.confidencePct, c.riskReward.rewardRiskRatio);
    return confMult * convMult * (0.5 + kelly) * volShrink(null);
  });

  const budgets = dynamicBudgetPerSymbol(deployableMYR, weights);

  const suggestedOrders: SuggestedOrder[] = [];
  let runningCash = buyingPower.usableCashMYR;

  for (let i = 0; i < candidates.length; i++) {
    const rec = candidates[i];
    const price = input.priceBySymbol[rec.symbol] ?? 0;
    if (price <= 0) continue;

    let budget = budgets[i] ?? 0;
    const capNotional = (maxPositionCapPct / 100) * input.totalEquityMYR;
    budget = Math.min(budget, capNotional);

    if (emergencyGuardActive) budget *= 0.35;

    const tiers = buildTierCounts(rec, budget, price, modeMult);
    const tierPick = tiers.find((t) => t.tier === preferredTier && t.valid && t.shares > 0)
      ?? tiers.find((t) => t.tier === 'standard' && t.valid && t.shares > 0)
      ?? tiers.find((t) => t.valid && t.shares > 0);

    const recommendedShares = tierPick?.shares ?? 0;
    const currency: import('../types').Currency =
      rec.market === 'us' ? 'USD' : rec.market === 'hk' ? 'HKD' : 'MYR';
    const estimatedTotalMYR = recommendedShares * toMYR(price, currency);
    const fee = estimatedTotalMYR * (PAPER_COMMISSION_BPS / 10_000);
    const totalWithFee = estimatedTotalMYR + fee;

    if (totalWithFee > runningCash) continue;

    runningCash -= totalWithFee;

    suggestedOrders.push({
      symbol: rec.symbol,
      market: rec.market,
      displayLabelJa: rec.displayLabelJa,
      action: 'buy',
      confidencePct: rec.confidencePct,
      conviction: convictionFromConfidence(rec.confidencePct),
      tiers,
      recommendedTier: tierPick?.tier ?? 'standard',
      recommendedShares,
      estimatedTotalMYR: Math.round(totalWithFee),
      cashAfterMYR: Math.round(runningCash),
      reasonJa: [
        `${SIZING_TIER_LABELS_JA[tierPick?.tier ?? 'standard']} · confidence ${rec.confidencePct}%`,
        `Kelly安全枠 · 最大ポジション ${maxPositionCapPct}%`,
        getLotRule(rec.market).labelJa,
        rec.whyProposedJa,
      ].join(' — '),
      paperDraftNoteJa: 'Paper Trading へドラフト（自動送信なし）',
    });
  }

  const totalProposedMYR = suggestedOrders.reduce((s, o) => s + o.estimatedTotalMYR, 0);
  const overAllocationBlocked = totalProposedMYR > buyingPower.usableCashMYR + 1;
  const finalOrders = overAllocationBlocked ? [] : suggestedOrders;
  const finalProposed = overAllocationBlocked ? 0 : totalProposedMYR;
  const remainingCashMYR = Math.round(buyingPower.usableCashMYR - finalProposed);
  const equity = Math.max(input.totalEquityMYR, 1);
  const proposedCashRatioPct = clamp((remainingCashMYR / equity) * 100);

  const capitalEfficiencyScore = clamp(
    (finalProposed / equity) * 50 +
      (buyingPower.usableCashMYR / equity) * 30 +
      (finalOrders.length > 0 ? 20 : 0) -
      (overAllocationBlocked ? 30 : 0) -
      (safeModeActive ? 15 : 0),
  );

  const efficiencyLabelJa =
    capitalEfficiencyScore >= 70
      ? '効率的'
      : capitalEfficiencyScore >= 45
        ? '余裕あり'
        : '現金厚め';

  const orderParts = finalOrders.map(
    (o) => `${o.displayLabelJa.split(' ')[0] ?? o.symbol} ${o.recommendedShares}株`,
  );
  const aiRecommendationLineJa =
    finalOrders.length > 0
      ? `あなたなら: ${orderParts.join(' · ')} · 現金${proposedCashRatioPct}%維持`
      : 'あなたなら: 新規買いは見送り — 現金比率を維持';

  const aiSizingSummaryJa = [
    aiRecommendationLineJa,
    `利用可能 ${buyingPower.usableCashMYR} MYR · 提案合計 ${finalProposed} MYR`,
    safeModeActive ? 'セーフモード — 小ロット' : null,
  ]
    .filter(Boolean)
    .join(' — ');

  const paperOrderDrafts: PaperOrderDraft[] = finalOrders
    .filter((o) => o.recommendedShares > 0)
    .map((o) => {
      const price = input.priceBySymbol[o.symbol] ?? 0;
      const currency: import('../types').Currency =
        o.market === 'us' ? 'USD' : o.market === 'hk' ? 'HKD' : 'MYR';
      return {
        symbol: o.symbol,
        market: o.market,
        quantity: o.recommendedShares,
        referencePrice: price,
        estimatedNotionalMYR: o.estimatedTotalMYR,
        watchOnly: true as const,
        simulationNoteJa: `${CAPITAL_ALLOCATION_REGULATORY_JA} ${REAL_TRADING_LOCK_JA}`,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: CAPITAL_ALLOCATION_REGULATORY_JA,
    humanConfirmationJa: CAPITAL_ALLOCATION_HUMAN_CONFIRM_JA,
    realTradingEnabled: false,
    portfolioMode,
    beginnerMode,
    safeModeActive,
    emergencyGuardActive,
    emergencyGuardNoteJa,
    buyingPower,
    capitalEfficiencyScore,
    capitalEfficiencyLabelJa: efficiencyLabelJa,
    overAllocationBlocked,
    overAllocationNoteJa: overAllocationBlocked
      ? '総提案額が利用可能現金を超過 — 提案をブロック'
      : null,
    maxPositionCapPct,
    dynamicBudgetSplitJa:
      finalOrders.length > 1
        ? `${finalOrders.length}銘柄へ信頼度加重で配分`
        : '単一銘柄または現金維持',
    aiRecommendationLineJa,
    aiSizingSummaryJa,
    suggestedOrders: finalOrders,
    totalProposedMYR: Math.round(finalProposed),
    remainingCashMYR,
    proposedCashRatioPct,
    paperOrderDrafts,
    executionCapitalSummary: {
      availableBuyingPowerMYR: buyingPower.availableCashMYR,
      reservedCashMYR: buyingPower.reservedCashMYR,
      usableCashMYR: buyingPower.usableCashMYR,
      proposedAllocationMYR: Math.round(finalProposed),
      remainingCashMYR,
    },
    explainRuleBasisJa:
      'Buying Power分解 + Strategy positionSizePct + ロット丸め + Portfolio Risk上限 + Kelly安全版。Paperのみ。',
  };
}

export async function refreshCapitalAllocationBundle(
  input: BuildCapitalAllocationInput,
): Promise<CapitalAllocationBundle> {
  const persisted = await loadCapitalAllocationState();
  const bundle = buildCapitalAllocationBundle(persisted, input);
  await saveCapitalAllocationState(persisted);
  return bundle;
}
