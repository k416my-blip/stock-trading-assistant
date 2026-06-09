/**
 * Bursa Phase 7 — 保有銘柄の売買判断ロジック
 */
import type {
  BursaDisclosureBundle,
  BursaHoldingActionJudgment,
  BursaAddPositionVerdict,
  BursaOverallInvestmentJudgment,
  BursaPhase5Analysis,
  BursaPhase6RankedEntry,
  BursaPhase7AddPosition,
  BursaPhase7HoldingDiagnosis,
  BursaPhase7StopLoss,
  BursaPhase7TakeProfit,
} from '../../types/bursaDisclosure';

const MISSING = 'データ未取得';

export function mapOverallToHoldingAction(
  judgment: BursaOverallInvestmentJudgment | null,
): BursaHoldingActionJudgment | null {
  if (judgment == null) return null;
  if (judgment === '見送り') return '売却候補';
  return judgment;
}

export function buildHoldingDiagnosis(input: {
  symbol: string;
  companyName: string | null;
  phase5: BursaPhase5Analysis;
  ranked: BursaPhase6RankedEntry | null;
}): BursaPhase7HoldingDiagnosis {
  const judgment = mapOverallToHoldingAction(input.phase5.overallJudgment);
  return {
    symbol: input.symbol,
    companyName: input.companyName,
    judgment,
    reasons:
      input.phase5.judgmentReasons.length > 0 ? input.phase5.judgmentReasons : [MISSING],
    compositeScore: input.ranked?.compositeScore ?? null,
    rank: input.ranked?.rank ?? null,
  };
}

export function buildAddPositionJudgment(input: {
  symbol: string;
  companyName: string | null;
  phase5: BursaPhase5Analysis;
  holdingAction: BursaHoldingActionJudgment | null;
}): BursaPhase7AddPosition {
  const fv = input.phase5.fairValue;
  const discount = fv.discountPct;

  let verdict: BursaAddPositionVerdict | null = null;
  let reasonJa = MISSING;

  if (fv.currentPrice == null || fv.fairPrice == null) {
    return {
      symbol: input.symbol,
      companyName: input.companyName,
      currentPrice: fv.currentPrice,
      fairPrice: fv.fairPrice,
      industryMedianPe: fv.industryMedianPe,
      verdict: null,
      reasonJa: MISSING,
    };
  }

  if (
    input.holdingAction === '売却候補' ||
    input.holdingAction === '注意' ||
    (discount != null && discount <= -10)
  ) {
    verdict = '買い増し不可';
    reasonJa =
      discount != null && discount <= -10
        ? `割高 ${Math.abs(discount).toFixed(1)}% · 買い増し非推奨`
        : `総合判断 ${input.holdingAction ?? MISSING} · 買い増し非推奨`;
  } else if (
    (discount != null && discount >= 8) ||
    input.holdingAction === '強気買い' ||
    input.holdingAction === '買い'
  ) {
    verdict = '買い増し';
    reasonJa =
      discount != null && discount >= 8
        ? `理論株価 RM ${fv.fairPrice.toFixed(2)} · 割安 ${discount.toFixed(1)}%`
        : `総合判断 ${input.holdingAction} · 割安圏`;
  } else {
    verdict = '様子見';
    reasonJa = '割安率・判断ともに買い増し基準未達';
  }

  return {
    symbol: input.symbol,
    companyName: input.companyName,
    currentPrice: fv.currentPrice,
    fairPrice: fv.fairPrice,
    industryMedianPe: fv.industryMedianPe,
    verdict,
    reasonJa,
  };
}

export function buildTakeProfitJudgment(input: {
  symbol: string;
  companyName: string | null;
  phase5: BursaPhase5Analysis;
  bundle: BursaDisclosureBundle;
}): BursaPhase7TakeProfit {
  const fv = input.phase5.fairValue;
  const targetPrice = fv.fairPrice;
  const currentPrice = fv.currentPrice;

  let premiumPct: number | null = null;
  if (targetPrice != null && currentPrice != null && currentPrice > 0) {
    premiumPct = ((currentPrice - targetPrice) / currentPrice) * 100;
  }

  const tj = input.phase5.trendJudgment;
  const declining =
    tj.revenue === '下降' || tj.netProfit === '下降' || tj.eps === '下降';

  let recommendTakeProfit: boolean | null = null;
  let reasonJa = MISSING;

  if (premiumPct == null) {
    return {
      symbol: input.symbol,
      companyName: input.companyName,
      targetPrice,
      fairPrice: targetPrice,
      currentPrice,
      premiumPct: null,
      recommendTakeProfit: null,
      reasonJa: MISSING,
    };
  }

  if (premiumPct >= 15) {
    recommendTakeProfit = true;
    reasonJa = `割高 ${premiumPct.toFixed(1)}% · 利益確定推奨（PER法）`;
  } else if (premiumPct >= 8 && declining) {
    recommendTakeProfit = true;
    reasonJa = `割高 ${premiumPct.toFixed(1)}% · 業績トレンド悪化 · 利益確定推奨`;
  } else if (premiumPct <= 0) {
    recommendTakeProfit = false;
    reasonJa = `割安圏（${premiumPct.toFixed(1)}%）· 利益確定不要`;
  } else {
    recommendTakeProfit = false;
    reasonJa = `割高 ${premiumPct.toFixed(1)}% · 基準未達（15%以上で推奨）`;
  }

  return {
    symbol: input.symbol,
    companyName: input.companyName,
    targetPrice,
    fairPrice: targetPrice,
    currentPrice,
    premiumPct,
    recommendTakeProfit,
    reasonJa,
  };
}

export function buildStopLossWarnings(input: {
  symbol: string;
  companyName: string | null;
  phase5: BursaPhase5Analysis;
  ranked: BursaPhase6RankedEntry | null;
  universeScoredCount: number;
}): BursaPhase7StopLoss {
  const warnings: string[] = [];
  const tj = input.phase5.trendJudgment;

  if (tj.revenue === '下降') warnings.push('業績悪化: 売上トレンド下降（5年実データ）');
  if (tj.netProfit === '下降') warnings.push('業績悪化: 利益トレンド下降（5年実データ）');
  if (tj.eps === '下降') warnings.push('業績悪化: EPSトレンド下降（5年実データ）');

  const div = input.phase5.dividendJudgment;
  if (div.rating === '注意') {
    warnings.push(
      div.cutYears.length > 0
        ? `配当悪化: 減配 ${div.cutYears.join(', ')}年`
        : '配当悪化: 配当判定「注意」',
    );
  }

  const comp = input.ranked?.competitiveAdvantage;
  if (comp != null && comp < 40) {
    warnings.push(`競争力低下: 同業比較スコア ${comp}/100`);
  }

  const rank = input.ranked?.rank;
  const total = input.universeScoredCount;
  if (rank != null && total > 0 && rank > Math.ceil(total * 0.6)) {
    warnings.push(`ランキング下落: 総合 ${rank}位 / ${total}社（下位40%）`);
  }

  return {
    symbol: input.symbol,
    companyName: input.companyName,
    warnings,
    hasWarning: warnings.length > 0,
  };
}
