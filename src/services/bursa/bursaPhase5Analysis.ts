/**
 * Bursa Phase 5 — アナリスト機能（同業比較強化・PER法・配当/トレンド判定・総合判断）
 */
import type {
  BursaDisclosureBundle,
  BursaPhase3Analysis,
  BursaPhase5Analysis,
} from '../../types/bursaDisclosure';
import { computeDividendJudgment } from './bursaDividendJudgment';
import { computeFairValueByPer } from './bursaFairValue';
import { computeOverallInvestmentJudgment } from './bursaOverallJudgment';
import { buildEnhancedPeerComparison } from './bursaPeerEnhancedComparison';
import { peerMedianPe } from './bursaPeerComparison';
import { filterCompleteFyAnnual } from './bursaTrendAnalysis';
import { computeTrendJudgment } from './bursaTrendJudgment';

export function buildBursaPhase5Analysis(input: {
  bundle: BursaDisclosureBundle;
  phase3: BursaPhase3Analysis | null;
  currentPrice: number | null;
}): BursaPhase5Analysis {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];
  const { bundle, phase3, currentPrice } = input;
  const stockCode = bundle.stockCode;

  const snapshots = phase3?.peerSnapshots ?? [];
  const enhancedPeerComparison = buildEnhancedPeerComparison(stockCode, snapshots);
  if (enhancedPeerComparison.some((r) => r.industryAverage != null)) {
    fetchedFields.push('phase5.enhancedPeerComparison');
  } else {
    missingFields.push('phase5.enhancedPeerComparison');
  }

  const annual = filterCompleteFyAnnual(bundle.quarterly.annualRecords);
  const epsSen = annual[0]?.eps ?? bundle.quarterly.latestQuarter?.eps ?? null;
  const industryMedianPe = phase3?.peerMedianPe ?? peerMedianPe(snapshots);

  const fairValue = computeFairValueByPer({
    currentPrice,
    epsSen,
    industryMedianPe,
  });
  if (fairValue.fairPrice != null && fairValue.discountPct != null) {
    fetchedFields.push('phase5.fairValue');
  } else {
    missingFields.push('phase5.fairValue');
  }

  const dividendJudgment = computeDividendJudgment(bundle);
  if (dividendJudgment.rating != null) fetchedFields.push('phase5.dividendJudgment');
  else missingFields.push('phase5.dividendJudgment');

  const trendJudgment = computeTrendJudgment(bundle);
  if (Object.values(trendJudgment).some((v) => v != null)) {
    fetchedFields.push('phase5.trendJudgment');
  } else {
    missingFields.push('phase5.trendJudgment');
  }

  const { judgment, reasons } = computeOverallInvestmentJudgment({
    fairValue,
    dividendJudgment,
    trendJudgment,
    enhancedPeerComparison,
    phase3,
  });
  if (judgment != null) fetchedFields.push('phase5.overallJudgment');
  else missingFields.push('phase5.overallJudgment');

  return {
    enhancedPeerComparison,
    fairValue,
    dividendJudgment,
    trendJudgment,
    overallJudgment: judgment,
    judgmentReasons: reasons,
    fetchedFields,
    missingFields,
  };
}
