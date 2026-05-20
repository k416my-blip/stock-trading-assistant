import { REGIME_RISK_MULTIPLIER } from '../constants/marketRegime';
import { SECTOR_THEME_LABEL } from '../constants/marketRegime';
import type { AccountType, Currency, PortfolioPosition, PositionSizingResult } from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import { buildCrossAssetPortfolioGuidance } from './crossAssetLiquidityFlowEngine';
import {
  liquidityAdjustedMaxAllocationPct,
  macroRiskReduction,
} from './portfolioConstructionEngine';
import type { StockRecommendation } from '../types/recommendation';
import { isAccountSupported } from './buyingPower';
import { stockToSectorTheme } from './marketIndicators';
import { toMYR } from './fx';
import type { StockFundamentals, TechnicalSnapshot } from '../types';

import type { ConvictionTier, PositionSizingRiskCategory } from '../types';

export interface PositionSizingInput {
  stock: StockFundamentals;
  buyingPowerMYR: number;
  accountType: AccountType;
  regime: MarketRegimeResult;
  technicals?: TechnicalSnapshot;
  recommendation?: StockRecommendation | null;
  riskPerTradePct?: number;
  stopLossPrice?: number;
  entryPrice?: number;
  /** 同一銘柄の既存ポートフォリオ比率 0–100 */
  existingAllocationPct?: number;
  totalCapitalMYR?: number;
  /** 流動性・集中度連携用の現在ポートフォリオ */
  portfolio?: PortfolioPosition[];
  /** ピーク比ドローダウン% */
  portfolioDrawdownPct?: number;
}

const BASE_ALLOCATION_PCT: Record<ConvictionTier, number> = {
  low: 1,
  medium: 3,
  high: 7,
  extreme: 10,
};

function convictionFromScore(totalScore: number): ConvictionTier {
  if (totalScore >= 85) return 'extreme';
  if (totalScore >= 70) return 'high';
  if (totalScore >= 55) return 'medium';
  return 'low';
}

function liquidityScore(stock: StockFundamentals): number {
  const volScore = Math.min(100, (stock.volume / 1_000_000) * 25);
  const capScore = Math.min(100, Math.log10(Math.max(stock.marketCap, 1)) * 12);
  return (volScore + capScore) / 2;
}

function trendStrengthScore(technicals?: TechnicalSnapshot): number {
  if (!technicals) return 50;
  let score = 50;
  if (technicals.buySignal === 'buy') score += 20;
  if (technicals.buySignal === 'wait') score -= 15;
  if (technicals.ma20 >= technicals.ma50) score += 15;
  if (technicals.rsi14 >= 40 && technicals.rsi14 <= 65) score += 10;
  if (technicals.volumeTrend === 'rising') score += 5;
  return Math.max(0, Math.min(100, score));
}

function drawdownPenalty(rec?: StockRecommendation | null): number {
  const dd = rec?.historicalDetail?.maxDrawdownPct;
  if (dd == null) return 0;
  return Math.min(25, dd * 0.35);
}

function valuationAdjustment(stock: StockFundamentals, rec?: StockRecommendation | null): number {
  const per = rec?.fundamentalDetail?.per ?? stock.per;
  if (per <= 0) return 0;
  if (per > 35) return -12;
  if (per > 25) return -6;
  if (per < 12) return 4;
  return 0;
}

function riskCategoryFrom(
  allocationPct: number,
  warnings: string[],
): PositionSizingRiskCategory {
  if (warnings.some((w) => w.includes('集中') || w.includes('過大'))) return 'elevated';
  if (allocationPct >= 7) return 'high';
  if (allocationPct >= 3) return 'medium';
  return 'low';
}

/** レジーム・銘柄リスクに基づくポジションサイズ（予測ではなくリスク調整） */
export function calculatePositionSize(input: PositionSizingInput): PositionSizingResult {
  const {
    stock,
    buyingPowerMYR,
    accountType,
    regime,
    technicals,
    recommendation,
    riskPerTradePct = 1,
    stopLossPrice,
    entryPrice,
    existingAllocationPct = 0,
    totalCapitalMYR,
    portfolio,
    portfolioDrawdownPct = 0,
  } = input;

  const warnings: string[] = [];

  if (!isAccountSupported(accountType)) {
    return emptyResult(riskPerTradePct, 'Cash Upfront口座のみポジションサイズを算出します。');
  }

  const price = entryPrice ?? stock.price;
  const priceMYR = toMYR(price, stock.currency);
  if (buyingPowerMYR <= 0 || priceMYR <= 0) {
    return emptyResult(riskPerTradePct, '投資金額または買付余力を先に設定してください。');
  }

  const totalScore = recommendation?.totalScore ?? 50;
  const conviction = convictionFromScore(totalScore);
  let allocationPct = BASE_ALLOCATION_PCT[conviction];

  const regimeMult = REGIME_RISK_MULTIPLIER[regime.regimeId] ?? 0.85;
  allocationPct *= regimeMult;

  const liq = liquidityScore(stock);
  if (liq < 35) {
    allocationPct *= 0.7;
    warnings.push('流動性が低い銘柄のため配分を抑えています');
  }

  const trend = trendStrengthScore(technicals);
  allocationPct *= 0.85 + (trend / 100) * 0.3;

  const vol = recommendation?.historicalDetail?.volatilityPct ?? 20;
  if (vol > 30) {
    allocationPct *= 0.75;
    warnings.push('ボラティリティが高いため配分を縮小しています');
  }

  allocationPct -= drawdownPenalty(recommendation);
  allocationPct += valuationAdjustment(stock, recommendation);

  const sector = stockToSectorTheme(stock);
  if (regime.avoidSectors.includes(sector)) {
    allocationPct *= 0.65;
    warnings.push(
      `現在のレジーム（${regime.labelJa}）では${SECTOR_THEME_LABEL[sector]}セクターを避ける傾向`,
    );
  }
  if (regime.preferredSectors.includes(sector)) {
    allocationPct *= 1.05;
  }

  const macro = macroRiskReduction(regime.regimeId);
  if (macro.pct > 0) {
    allocationPct *= 1 - macro.pct / 100;
    warnings.push(macro.noteJa);
  }

  const crossGuidance = buildCrossAssetPortfolioGuidance(
    portfolioDrawdownPct,
    regime.indicators,
  );
  if (crossGuidance.totalExposureReductionPct > 0) {
    allocationPct *= 1 - crossGuidance.totalExposureReductionPct / 100;
    if (crossGuidance.defense.active) {
      warnings.push(
        `クロスアセット防御: 最大${crossGuidance.totalExposureReductionPct}%削減（${crossGuidance.flow.capitalFlowLabelJa}）`,
      );
    }
  }

  const capitalBaseEarly =
    totalCapitalMYR && totalCapitalMYR > 0 ? totalCapitalMYR : buyingPowerMYR;
  if (portfolio && portfolio.length > 0 && capitalBaseEarly > 0) {
    const liquidCap = liquidityAdjustedMaxAllocationPct(
      stock.symbol,
      portfolio,
      capitalBaseEarly,
    );
    if (liquidCap != null) {
      const headroom = Math.max(0, liquidCap - existingAllocationPct);
      if (headroom < allocationPct) {
        allocationPct = headroom;
        warnings.push(`流動性調整: 追加配分上限 約${headroom.toFixed(1)}%`);
      }
    }
  }

  allocationPct = Math.max(0.5, Math.min(10, allocationPct));

  const capitalBase = totalCapitalMYR && totalCapitalMYR > 0 ? totalCapitalMYR : buyingPowerMYR;
  let maxPositionMYR = capitalBase * (allocationPct / 100);

  const stop = stopLossPrice ?? price * 0.94;
  const riskPerShare = Math.max(priceMYR - toMYR(stop, stock.currency), priceMYR * 0.02);
  const riskBudgetMYR = buyingPowerMYR * (riskPerTradePct / 100);
  const sharesByRisk = Math.floor(riskBudgetMYR / riskPerShare);
  const maxByRiskMYR = sharesByRisk * priceMYR;

  if (maxByRiskMYR > 0 && maxByRiskMYR < maxPositionMYR) {
    maxPositionMYR = maxByRiskMYR;
  }

  const hardCapPct = conviction === 'extreme' ? 10 : conviction === 'high' ? 8 : 5;
  const hardCapMYR = capitalBase * (hardCapPct / 100);
  if (maxPositionMYR > hardCapMYR) {
    maxPositionMYR = hardCapMYR;
  }

  const suggestedShares = Math.floor(maxPositionMYR / priceMYR);

  if (existingAllocationPct >= 8) {
    warnings.push(`集中リスク: 既存ポジションがポートフォリオの約${existingAllocationPct.toFixed(0)}%`);
  }
  if (allocationPct >= 8 && existingAllocationPct > 0) {
    warnings.push('過大エクスポージャー: 追加買いは総リスクを押し上げます');
  }
  if (stock.volume < 500_000) {
    warnings.push('出来高が少なく約定リスクがあります');
  }

  const riskCategory = riskCategoryFrom(allocationPct, warnings);

  const convictionLabel: Record<ConvictionTier, string> = {
    low: '低信頼',
    medium: '中信頼',
    high: '高信頼',
    extreme: '極高信頼',
  };

  return {
    maxPositionValue: maxPositionMYR,
    suggestedShares,
    riskPerTradePct,
    suggestedAllocationPct: Math.round(allocationPct * 10) / 10,
    maxPositionSizeMYR: maxPositionMYR,
    riskCategory,
    convictionTier: conviction,
    warnings,
    notes: [
      `レジーム: ${regime.labelJa}（リスクスコア ${regime.riskScore}）`,
      `信頼度: ${convictionLabel[conviction]} → 目標配分 約${allocationPct.toFixed(1)}%`,
      `1トレードリスク目安 約${riskPerTradePct}%（RM${riskBudgetMYR.toFixed(0)}）`,
    ].join(' · '),
  };
}

function emptyResult(riskPerTradePct: number, notes: string): PositionSizingResult {
  return {
    maxPositionValue: 0,
    suggestedShares: 0,
    riskPerTradePct,
    suggestedAllocationPct: 0,
    maxPositionSizeMYR: 0,
    riskCategory: 'low',
    convictionTier: 'low',
    warnings: [],
    notes,
  };
}
