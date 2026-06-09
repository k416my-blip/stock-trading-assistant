import type {
  BursaDividendJudgment,
  BursaFairValueAnalysis,
  BursaOverallInvestmentJudgment,
  BursaPhase3Analysis,
  BursaTrendJudgment,
} from '../../types/bursaDisclosure';
import type { BursaEnhancedPeerComparison } from '../../types/bursaDisclosure';

type JudgmentInput = {
  fairValue: BursaFairValueAnalysis;
  dividendJudgment: BursaDividendJudgment;
  trendJudgment: BursaTrendJudgment;
  enhancedPeerComparison: BursaEnhancedPeerComparison[];
  phase3: BursaPhase3Analysis | null;
};

function trendScore(t: BursaTrendJudgment['revenue']): number {
  if (t === '上昇') return 8;
  if (t === '横ばい') return 0;
  if (t === '下降') return -10;
  return 0;
}

export function computeOverallInvestmentJudgment(input: JudgmentInput): {
  judgment: BursaOverallInvestmentJudgment | null;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;
  let signalCount = 0;

  const discount = input.fairValue.discountPct;
  if (discount != null) {
    signalCount++;
    if (discount >= 15) {
      score += 25;
      reasons.push(`PER法 割安率 +${discount.toFixed(1)}%（理論株価 RM ${input.fairValue.fairPrice?.toFixed(2)}）`);
    } else if (discount >= 5) {
      score += 12;
      reasons.push(`PER法 割安率 +${discount.toFixed(1)}%`);
    } else if (discount <= -15) {
      score -= 25;
      reasons.push(`PER法 割高 ${discount.toFixed(1)}%`);
    } else if (discount <= -5) {
      score -= 12;
      reasons.push(`PER法 やや割高 ${discount.toFixed(1)}%`);
    }
  }

  const div = input.dividendJudgment;
  if (div.rating != null) {
    signalCount++;
    if (div.rating === '優秀') {
      score += 15;
      reasons.push('配当判定: 優秀（減配なし・成長）');
    } else if (div.rating === '注意') {
      score -= 18;
      const cutLabel =
        div.cutYears.length > 0 ? `減配 ${div.cutYears.join(', ')}年` : '減配履歴あり';
      reasons.push(`配当判定: 注意（${cutLabel}）`);
    } else {
      score += 2;
    }
  }

  const tj = input.trendJudgment;
  const trends = [tj.revenue, tj.netProfit, tj.eps];
  const trendLabels: string[] = [];
  for (const [label, dir] of [
    ['売上', tj.revenue],
    ['利益', tj.netProfit],
    ['EPS', tj.eps],
  ] as const) {
    if (dir != null) {
      signalCount++;
      score += trendScore(dir);
      trendLabels.push(`${label}${dir}`);
    }
  }
  if (trendLabels.length > 0) {
    reasons.push(`5年トレンド: ${trendLabels.join(' · ')}`);
  }

  const roeRow = input.enhancedPeerComparison.find((r) => r.metricKey === 'roePct');
  if (roeRow?.diffPct != null && roeRow.targetValue != null && roeRow.industryAverage != null) {
    signalCount++;
    if (roeRow.diffPct >= 10) {
      score += 12;
      reasons.push(
        `ROE ${roeRow.targetValue.toFixed(1)}% · 業界平均 ${roeRow.industryAverage.toFixed(1)}%（+${roeRow.diffPct.toFixed(1)}%）`,
      );
    } else if (roeRow.diffPct <= -10) {
      score -= 12;
      reasons.push(
        `ROE ${roeRow.targetValue.toFixed(1)}% · 業界平均 ${roeRow.industryAverage.toFixed(1)}%（${roeRow.diffPct.toFixed(1)}%）`,
      );
    }
  }

  const buffett = input.phase3?.buffettScore.totalScore;
  if (buffett != null) {
    signalCount++;
    if (buffett >= 70) {
      score += 10;
      reasons.push(`バフェットスコア ${buffett}/100`);
    } else if (buffett < 45) {
      score -= 10;
      reasons.push(`バフェットスコア ${buffett}/100（低水準）`);
    }
  }

  const overallRank = input.phase3?.industryRanks.overall;
  if (overallRank != null && overallRank <= 2) {
    signalCount++;
    score += 8;
    reasons.push(`業界総合 ${overallRank}位`);
  }

  if (signalCount === 0) {
    return { judgment: null, reasons: [] };
  }

  let judgment: BursaOverallInvestmentJudgment;
  if (score >= 40) judgment = '強気買い';
  else if (score >= 15) judgment = '買い';
  else if (score >= -10) judgment = '保有';
  else if (score >= -30) judgment = '注意';
  else judgment = '見送り';

  return { judgment, reasons: reasons.slice(0, 3) };
}
