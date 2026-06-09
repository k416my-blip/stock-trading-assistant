import { CANNOT_BUY_ONE_SHARE_WARNING } from '../constants/allocation';
import { EMPTY_USER_SYMBOLS_ALLOCATION_JA } from '../constants/aiAnalysisScope';
import { STOCK_CATEGORY_LABEL } from '../constants/stockCatalog';
import { getStocksByMarket, getSamplePriceHistory } from '../data/sampleStocks';
import type {
  AllocationCandidate,
  AllocationPlan,
  AllocationPlanInput,
  InvestmentStyle,
  RiskLevel,
  StockFundamentals,
} from '../types';
import { pickDiversifiedStocks, type ScoredStock } from './diversifiedSelection';
import { toMYR } from './fx';
import { buildBeginnerNote, buildSelectionReason } from './recommendationReasons';
import { buildStockRecommendation } from './recommendationEngine';
import { isMegaCap, isTooExpensiveForSlot, oneShareMYR } from './stockCatalog';
import { analyzeTechnicals } from './technicalAnalysis';
import { buildTradeSuggestion } from './tradeSuggestions';
import type { AiLearningState } from './analysis/aiLearning';
import {
  buildAllocationRecommendationMeta,
  conciergeRankBonus,
  findConciergeEvidenceForSymbol,
  findConciergeGuideForSymbol,
  malaysiaV4ReferenceRankBonus,
  metaToAuditEntry,
} from './recommendationProvenance';
import type { ConciergeEvidenceBundle } from '../types/conciergeEvidence';
import {
  countCommitteeJudgments,
  filterAdoptableCandidates,
  logCommitteeJudgmentCounts,
  promoteCandidateForTrustFallback,
  resolveFallbackPickCount,
  selectWatchFallbackCandidates,
} from './allocationCommitteeFallback';

const MAX_SINGLE_PCT = 0.35;
const MIN_CASH_PCT = 0.05;
const MAX_CASH_PCT = 0.15;

function priceMYR(stock: StockFundamentals): number {
  return toMYR(stock.price, stock.currency);
}

function minAllocationForOneShare(stock: StockFundamentals): number {
  return oneShareMYR(stock);
}

function cashReservePct(risk: RiskLevel): number {
  if (risk === 'low') return 0.15;
  if (risk === 'high') return 0.05;
  return 0.1;
}

function targetStockCount(depositMYR: number, available: number): number {
  if (depositMYR <= 1000) return Math.min(5, Math.max(3, available));
  if (depositMYR >= 3000) return Math.min(8, Math.max(5, available));
  return Math.min(6, Math.max(4, available));
}

function estimateShares(
  allocationMYR: number,
  sharePriceMYR: number,
  fractional: boolean,
): number {
  if (sharePriceMYR <= 0 || allocationMYR <= 0) return 0;
  if (fractional) return Math.round((allocationMYR / sharePriceMYR) * 10000) / 10000;
  return Math.floor(allocationMYR / sharePriceMYR);
}

function scoreStock(
  stock: StockFundamentals,
  style: InvestmentStyle,
  risk: RiskLevel,
  budgetPerSlotMYR: number,
  conciergeEvidence?: ConciergeEvidenceBundle,
  aiState?: AiLearningState,
): number {
  const rec = buildStockRecommendation(stock, { style, risk, budgetPerSlotMYR, aiState });
  let score = rec.totalScore;
  const guide = findConciergeGuideForSymbol(
    stock.symbol,
    conciergeEvidence?.actionGuide.symbols,
  );
  score += conciergeRankBonus(stock.symbol, guide, rec);
  score += malaysiaV4ReferenceRankBonus(stock.symbol);
  const oneShare = minAllocationForOneShare(stock);
  if (oneShare <= budgetPerSlotMYR) score += 8;
  else if (isTooExpensiveForSlot(stock, budgetPerSlotMYR, budgetPerSlotMYR * 10)) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function distributeAllocations(
  depositMYR: number,
  investableMYR: number,
  stocks: StockFundamentals[],
  scores: number[],
): number[] {
  const n = stocks.length;
  if (n === 0) return [];

  const totalScore = scores.reduce((a, b) => a + b, 0) || n;
  let amounts = stocks.map((_, i) => (investableMYR * scores[i]) / totalScore);
  const maxEach = depositMYR * MAX_SINGLE_PCT;

  let changed = true;
  let guard = 0;
  while (changed && guard < 20) {
    guard++;
    changed = false;
    let excess = 0;
    amounts = amounts.map((amt) => {
      if (amt > maxEach) {
        excess += amt - maxEach;
        changed = true;
        return maxEach;
      }
      return amt;
    });
    if (excess > 0) {
      const room = amounts.map((amt) => maxEach - amt);
      const roomSum = room.reduce((a, b) => a + b, 0);
      if (roomSum > 0) {
        amounts = amounts.map((amt, i) => amt + excess * (room[i] / roomSum));
      }
    }
  }

  const sum = amounts.reduce((a, b) => a + b, 0);
  if (sum > 0 && Math.abs(sum - investableMYR) > 1) {
    amounts = amounts.map((a) => (a * investableMYR) / sum);
  }

  return amounts.map((a) => Math.floor(a));
}

function affordabilityBonus(stock: StockFundamentals, budgetPerSlot: number): number {
  const min = minAllocationForOneShare(stock);
  if (budgetPerSlot <= 0) return 0;
  if (min <= budgetPerSlot) return 5;
  if (min <= budgetPerSlot * 1.5) return 2;
  return 0;
}

function rankStocks(
  universe: StockFundamentals[],
  style: InvestmentStyle,
  risk: RiskLevel,
  budgetPerSlot: number,
  conciergeEvidence?: ConciergeEvidenceBundle,
): ScoredStock[] {
  return universe
    .map((stock) => ({
      stock,
      score:
        scoreStock(stock, style, risk, budgetPerSlot, conciergeEvidence) +
        affordabilityBonus(stock, budgetPerSlot),
    }))
    .sort((a, b) => b.score - a.score);
}

function fitsWholeShareCap(stock: StockFundamentals, maxEachMYR: number): boolean {
  return minAllocationForOneShare(stock) <= maxEachMYR;
}

type Slot = { stock: StockFundamentals; amountMYR: number; adjusted: boolean };

function enforceWholeShareSlots(
  slots: Slot[],
  reserve: ScoredStock[],
  depositMYR: number,
  investableMYR: number,
): Slot[] {
  const maxEach = depositMYR * MAX_SINGLE_PCT;
  const used = new Set(slots.map((s) => s.stock.symbol));
  let pool = reserve.filter((r) => !used.has(r.stock.symbol));

  const nextReplacement = (): StockFundamentals | undefined => {
    const pick = pool.find((r) => fitsWholeShareCap(r.stock, maxEach));
    if (pick) {
      pool = pool.filter((r) => r.stock.symbol !== pick.stock.symbol);
      used.add(pick.stock.symbol);
      return pick.stock;
    }
    return undefined;
  };

  let result: Slot[] = [];

  for (const slot of slots) {
    let { stock, amountMYR } = slot;
    let adjusted = slot.adjusted;
    const sharePrice = priceMYR(stock);
    let shares = estimateShares(amountMYR, sharePrice, false);

    if (shares >= 1) {
      result.push({ stock, amountMYR, adjusted });
      continue;
    }

    const minNeeded = minAllocationForOneShare(stock);
    if (minNeeded <= maxEach) {
      result.push({ stock, amountMYR: minNeeded, adjusted: true });
      continue;
    }

    const replacement = nextReplacement();
    if (!replacement) continue;

    stock = replacement;
    amountMYR = Math.min(maxEach, Math.max(minAllocationForOneShare(stock), amountMYR));
    shares = estimateShares(amountMYR, priceMYR(stock), false);
    if (shares < 1) {
      amountMYR = minAllocationForOneShare(stock);
    }
    result.push({ stock, amountMYR, adjusted: true });
  }

  let total = result.reduce((s, x) => s + x.amountMYR, 0);
  while (total > investableMYR && result.length > 1) {
    const dropIdx = result.reduce(
      (minI, s, i, arr) => (s.amountMYR < arr[minI].amountMYR ? i : minI),
      0,
    );
    result = result.filter((_, i) => i !== dropIdx);
    total = result.reduce((s, x) => s + x.amountMYR, 0);
  }

  return result.filter((s) => estimateShares(s.amountMYR, priceMYR(s.stock), false) >= 1);
}

function buildSlots(
  depositMYR: number,
  investableMYR: number,
  ranked: ScoredStock[],
  count: number,
  fractional: boolean,
  style: InvestmentStyle,
): { slots: Slot[]; reserve: ScoredStock[] } {
  const maxEach = depositMYR * MAX_SINGLE_PCT;
  const budgetPerSlot = count > 0 ? investableMYR / count : investableMYR;

  const stocks = pickDiversifiedStocks(ranked, count, style, maxEach, budgetPerSlot, fractional);
  if (stocks.length === 0) {
    return { slots: [], reserve: ranked };
  }

  const scoreMap = new Map(ranked.map((r) => [r.stock.symbol, r.score]));
  const scores = stocks.map((s) => Math.max(scoreMap.get(s.symbol) ?? 1, 1));
  let amounts = distributeAllocations(depositMYR, investableMYR, stocks, scores);

  let slots: Slot[] = stocks.map((stock, i) => ({
    stock,
    amountMYR: amounts[i],
    adjusted: false,
  }));

  if (!fractional) {
    slots = enforceWholeShareSlots(slots, ranked.slice(count), depositMYR, investableMYR);
    slots = slots.map((slot) => {
      const min = minAllocationForOneShare(slot.stock);
      if (estimateShares(slot.amountMYR, priceMYR(slot.stock), false) < 1 && min <= maxEach) {
        return { ...slot, amountMYR: min, adjusted: true };
      }
      return slot;
    });
    slots = slots.filter((s) => estimateShares(s.amountMYR, priceMYR(s.stock), false) >= 1);
  }

  return { slots, reserve: ranked };
}

function toCandidate(
  slot: Slot,
  depositMYR: number,
  style: InvestmentStyle,
  risk: RiskLevel,
  fractional: boolean,
  budgetPerSlotMYR: number,
  conciergeEvidence?: ConciergeEvidenceBundle,
): AllocationCandidate {
  const { stock, amountMYR, adjusted } = slot;
  const sharePrice = priceMYR(stock);
  const estimatedShares = estimateShares(amountMYR, sharePrice, fractional);
  const technicals = analyzeTechnicals(getSamplePriceHistory(stock.symbol));
  const suggestion = buildTradeSuggestion(stock.price, technicals);
  const selectionReason = buildSelectionReason(stock, style, risk, budgetPerSlotMYR);
  const recommendation = buildStockRecommendation(stock, { style, risk, budgetPerSlotMYR });
  const allocationPct = depositMYR > 0 ? (amountMYR / depositMYR) * 100 : 0;
  const conciergeGuide = findConciergeGuideForSymbol(
    stock.symbol,
    conciergeEvidence?.actionGuide.symbols,
  );
  const conciergeSymbolEvidence = findConciergeEvidenceForSymbol(
    stock.symbol,
    conciergeEvidence?.symbols,
  );

  const unpurchasableWarning =
    !fractional && estimatedShares < 1 ? CANNOT_BUY_ONE_SHARE_WARNING : undefined;

  const recommendationMeta = buildAllocationRecommendationMeta({
    symbol: stock.symbol,
    name: stock.name,
    rec: recommendation,
    selectionReason,
    allocationPct,
    conciergeGuide,
    conciergeEvidence: conciergeSymbolEvidence,
  });

  return {
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    currency: stock.currency,
    category: stock.category,
    categoryLabel: STOCK_CATEGORY_LABEL[stock.category],
    allocationMYR: amountMYR,
    allocationPct,
    estimatedShares,
    isFractionalShares: fractional,
    allocationAdjusted: adjusted,
    unpurchasableWarning,
    entryPrice: suggestion.entryPrice,
    stopLoss: suggestion.stopLoss,
    takeProfit: suggestion.takeProfit,
    selectionReason,
    beginnerNote: buildBeginnerNote(stock, style),
    recommendation,
    recommendationMeta,
  };
}

export function buildAllocationPlan(input: AllocationPlanInput): AllocationPlan | { error: string } {
  const { depositMYR, market, riskLevel, investmentStyle, fractionalSharesEnabled } = input;

  if (depositMYR < 100) {
    return { error: '入金額はRM100以上で入力してください。' };
  }

  const universe =
    input.userUniverse !== undefined
      ? input.userUniverse.filter((s) => s.market === market)
      : getStocksByMarket(market);

  if (input.userUniverse !== undefined && universe.length === 0) {
    return { error: EMPTY_USER_SYMBOLS_ALLOCATION_JA };
  }

  const reservePct = Math.min(MAX_CASH_PCT, Math.max(MIN_CASH_PCT, cashReservePct(riskLevel)));
  let cashReserveMYR = Math.round(depositMYR * reservePct);
  let investableMYR = depositMYR - cashReserveMYR;

  const countWanted = targetStockCount(depositMYR, universe.length);
  const budgetPerSlot = countWanted > 0 ? investableMYR / countWanted : investableMYR;
  const maxEach = depositMYR * MAX_SINGLE_PCT;
  const ranked = rankStocks(universe, investmentStyle, riskLevel, budgetPerSlot, input.conciergeEvidence);

  if (!fractionalSharesEnabled) {
    const affordable = ranked.filter((r) => fitsWholeShareCap(r.stock, maxEach));
    const minNeeded = depositMYR <= 1000 ? 3 : depositMYR >= 3000 ? 5 : 4;
    if (affordable.length === 0) {
      const cheapest = [...universe].sort(
        (a, b) => minAllocationForOneShare(a) - minAllocationForOneShare(b),
      )[0];
      return {
        error: `この入金額では1株単位の購入候補を作れません。端株をONにするか、入金額を増やしてください（例：${cheapest.name}は1株あたり約RM${minAllocationForOneShare(cheapest).toLocaleString('ja-JP')}）。`,
      };
    }
    if (affordable.length < Math.min(minNeeded, countWanted)) {
      // 候補数は減らして続行
    }
  }

  const count = Math.min(
    countWanted,
    fractionalSharesEnabled ? universe.length : ranked.filter((r) => fitsWholeShareCap(r.stock, maxEach)).length,
  );

  if (count < 1) {
    return { error: '購入候補を作成できません。入金額を増やすか、端株をONにしてください。' };
  }

  const { slots } = buildSlots(
    depositMYR,
    investableMYR,
    ranked,
    count,
    fractionalSharesEnabled,
    investmentStyle,
  );

  if (slots.length === 0) {
    return {
      error: fractionalSharesEnabled
        ? '参考プランを作成できませんでした。入金額を見直してください。'
        : '1株単位で買える銘柄が足りません。端株をONにするか、入金額を増やしてください。',
    };
  }

  const budgetPerSlotFinal = slots.length > 0 ? investableMYR / slots.length : budgetPerSlot;
  let candidates = slots.map((slot) =>
    toCandidate(
      slot,
      depositMYR,
      investmentStyle,
      riskLevel,
      fractionalSharesEnabled,
      budgetPerSlotFinal,
      input.conciergeEvidence,
    ),
  );

  if (!fractionalSharesEnabled) {
    candidates = candidates.filter((c) => c.estimatedShares >= 1);
  }

  const allCandidates = candidates;
  const judgmentCounts = countCommitteeJudgments(allCandidates);
  logCommitteeJudgmentCounts(judgmentCounts);

  let adoptable = filterAdoptableCandidates(allCandidates);

  if (adoptable.length === 0 && allCandidates.length > 0) {
    const pickCount = resolveFallbackPickCount(count);
    const fallbackPicks = selectWatchFallbackCandidates(allCandidates, pickCount);
    adoptable = fallbackPicks.map(promoteCandidateForTrustFallback);
    logCommitteeJudgmentCounts(judgmentCounts, {
      fallback: true,
      fallbackPicked: adoptable.length,
      symbols: adoptable.map((c) => c.symbol),
    });
  }

  if (adoptable.length === 0 && ranked.length > 0) {
    const pickCount = resolveFallbackPickCount(count);
    const fallbackStocks = ranked.slice(0, pickCount).map((r) => r.stock);
    const scoreMap = new Map(ranked.map((r) => [r.stock.symbol, r.score]));
    const scores = fallbackStocks.map((s) => Math.max(scoreMap.get(s.symbol) ?? 1, 1));
    const amounts = distributeAllocations(depositMYR, investableMYR, fallbackStocks, scores);
    const budget = pickCount > 0 ? investableMYR / pickCount : budgetPerSlotFinal;
    adoptable = fallbackStocks
      .map((stock, i) =>
        toCandidate(
          { stock, amountMYR: amounts[i], adjusted: false },
          depositMYR,
          investmentStyle,
          riskLevel,
          fractionalSharesEnabled,
          budget,
          input.conciergeEvidence,
        ),
      )
      .filter((c) => fractionalSharesEnabled || c.estimatedShares >= 1)
      .map(promoteCandidateForTrustFallback);
    logCommitteeJudgmentCounts(judgmentCounts, {
      fallback: true,
      fallbackFromRanked: true,
      fallbackPicked: adoptable.length,
      symbols: adoptable.map((c) => c.symbol),
    });
  }

  candidates = adoptable;

  if (candidates.length === 0) {
    return {
      error:
        '配分候補を作成できませんでした。ウォッチリストに銘柄を追加するか、入金額を見直してください。',
    };
  }

  const allocated = candidates.reduce((s, c) => s + c.allocationMYR, 0);
  const leftover = investableMYR - allocated;
  cashReserveMYR += Math.max(0, leftover);
  investableMYR = depositMYR - cashReserveMYR;

  const skippedExpensive =
    !fractionalSharesEnabled &&
    ranked.some((r) => !fitsWholeShareCap(r.stock, maxEach)) &&
    candidates.length < countWanted;

  return {
    depositMYR,
    market,
    riskLevel,
    investmentStyle,
    fractionalSharesEnabled,
    cashReserveMYR,
    cashReservePct: depositMYR > 0 ? (cashReserveMYR / depositMYR) * 100 : 0,
    investableMYR,
    candidates,
    highRiskWarning:
      riskLevel === 'high'
        ? '高リスク設定です。損失が大きくなることがあります。余裕のある金額だけで、Rakuten Tradeで慎重に手動注文してください。'
        : undefined,
    affordabilityWarning: skippedExpensive
      ? '株価が高い銘柄（例：米国メガキャップ）は、1株単位では配分上限内に収まらないため候補から外しました。ETF・低価格株・バルサ銘柄を優先しています。'
      : undefined,
  };
}

/** 投資憲章審議結果を監査ログに保存 */
export async function persistAllocationPlanAudit(plan: AllocationPlan): Promise<void> {
  const { appendRecommendationAuditEntries } = await import('./recommendationAuditLog');
  const entries = plan.candidates
    .filter((c) => c.recommendationMeta)
    .map((c) =>
      metaToAuditEntry(c.recommendationMeta!, {
        symbol: c.symbol,
        name: c.name,
        context: 'allocation_plan',
      }),
    );
  if (entries.length > 0) {
    await appendRecommendationAuditEntries(entries);
  }
}

/** OpenAI ナラティブ enrichment 後の監査（decisionHash + cacheHit/Miss） */
export async function persistAllocationPlanEnrichmentAudit(
  plan: AllocationPlan,
  audits: Array<{ symbol: string; audit: import('../types/investmentCommitteeNarrative').RecommendationEnrichmentAudit }>,
): Promise<void> {
  const { appendRecommendationAuditEntries } = await import('./recommendationAuditLog');
  const auditBySymbol = new Map(audits.map((a) => [a.symbol, a.audit]));
  const entries = plan.candidates
    .filter((c) => c.recommendationMeta)
    .map((c) =>
      metaToAuditEntry(c.recommendationMeta!, {
        symbol: c.symbol,
        name: c.name,
        context: 'allocation_plan',
        enrichmentAudit: auditBySymbol.get(c.symbol),
      }),
    );
  if (entries.length > 0) {
    await appendRecommendationAuditEntries(entries);
  }
}
