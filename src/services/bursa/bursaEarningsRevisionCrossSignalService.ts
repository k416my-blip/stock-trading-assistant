/**
 * Phase23.1 — Earnings Revision × Insider/Institutional Cross Signal
 */
import {
  CROSS_SIGNAL_BEARISH_SCORE,
  CROSS_SIGNAL_BULLISH_SCORE,
  CROSS_SIGNAL_COMPONENT_BIAS_JA,
  CROSS_SIGNAL_DIRECTION_JA,
  CROSS_SIGNAL_DIVERGENCE_SCORE,
  CROSS_SIGNAL_MATERIAL_SCORE_CAP,
  CROSS_SIGNAL_MATERIAL_WEIGHT,
  CROSS_SIGNAL_REVISION_ONLY_SCORE,
  CROSS_SIGNAL_SCORE_MAX,
  CROSS_SIGNAL_SCORE_MIN,
  CROSS_SIGNAL_STRONG_BEARISH_SCORE,
  CROSS_SIGNAL_STRONG_BULLISH_SCORE,
} from '../../constants/bursaEarningsRevisionCrossSignal';
import type { BursaEarningsRevisionIntelligenceAnalysis } from '../../types/bursaEarningsRevisionIntelligence';
import type {
  BursaEarningsRevisionCrossSignalAnalysis,
  CrossSignalComponentBias,
  EarningsRevisionCrossSignalConfidence,
  EarningsRevisionCrossSignalDirection,
} from '../../types/bursaEarningsRevisionCrossSignal';
import type { BursaInsiderTradingAnalysis } from '../../types/bursaInsiderTrading';
import type { BursaInstitutionalOwnershipAnalysis } from '../../types/bursaInstitutionalOwnership';
import type { BursaMaterialItem, BursaMaterialSentiment } from '../../types/bursaDisclosure';
import {
  isDownwardRevision,
  isUpwardRevision,
} from './bursaEarningsRevisionIntelligenceService';
import type { RawMaterialInput } from './bursaMaterialSentiment';

function clampScore(score: number): number {
  return Math.max(CROSS_SIGNAL_SCORE_MIN, Math.min(CROSS_SIGNAL_SCORE_MAX, score));
}

export function resolveRevisionComponentBias(
  revision: BursaEarningsRevisionIntelligenceAnalysis | null | undefined,
): CrossSignalComponentBias {
  if (!revision || revision.availability !== 'available' || !revision.hasExtractableData) {
    return 'unavailable';
  }
  if (isUpwardRevision(revision.revisionDirection)) return 'bullish';
  if (isDownwardRevision(revision.revisionDirection)) return 'bearish';
  return 'neutral';
}

export function resolveInsiderComponentBias(
  insider: BursaInsiderTradingAnalysis | null | undefined,
): CrossSignalComponentBias {
  if (!insider || insider.availability !== 'available') return 'unavailable';
  if (insider.netInsiderActivity === '買い優勢') return 'bullish';
  if (insider.netInsiderActivity === '売り優勢') return 'bearish';
  return 'neutral';
}

export function resolveInstitutionalComponentBias(
  institutional: BursaInstitutionalOwnershipAnalysis | null | undefined,
): CrossSignalComponentBias {
  if (!institutional || institutional.availability !== 'available') return 'unavailable';
  switch (institutional.netInstitutionalFlow) {
    case 'Strong Buying':
    case 'Buying':
      return 'bullish';
    case 'Strong Selling':
    case 'Selling':
      return 'bearish';
    default:
      return 'neutral';
  }
}

export function computeCrossSignalResult(input: {
  revisionBias: CrossSignalComponentBias;
  insiderBias: CrossSignalComponentBias;
  institutionalBias: CrossSignalComponentBias;
}): {
  direction: EarningsRevisionCrossSignalDirection;
  score: number;
  alignmentCount: number;
} {
  const { revisionBias, insiderBias, institutionalBias } = input;
  const components = [revisionBias, insiderBias, institutionalBias];
  const available = components.filter((c) => c !== 'unavailable');

  if (available.length === 0) {
    return { direction: 'Unavailable', score: 0, alignmentCount: 0 };
  }

  const bullishCount = available.filter((c) => c === 'bullish').length;
  const bearishCount = available.filter((c) => c === 'bearish').length;

  if (
    available.length === 3 &&
    revisionBias === 'bullish' &&
    insiderBias === 'bullish' &&
    institutionalBias === 'bullish'
  ) {
    return {
      direction: 'Strong Bullish',
      score: CROSS_SIGNAL_STRONG_BULLISH_SCORE,
      alignmentCount: 3,
    };
  }

  if (
    available.length === 3 &&
    revisionBias === 'bearish' &&
    insiderBias === 'bearish' &&
    institutionalBias === 'bearish'
  ) {
    return {
      direction: 'Strong Bearish',
      score: CROSS_SIGNAL_STRONG_BEARISH_SCORE,
      alignmentCount: 3,
    };
  }

  if (revisionBias !== 'unavailable') {
    if (revisionBias === 'bullish') {
      const supportive = [insiderBias, institutionalBias].filter((c) => c === 'bullish').length;
      const contradictory = [insiderBias, institutionalBias].some((c) => c === 'bearish');
      if (supportive >= 1 && !contradictory) {
        return {
          direction: 'Bullish',
          score: clampScore(CROSS_SIGNAL_BULLISH_SCORE + supportive * 2),
          alignmentCount: 1 + supportive,
        };
      }
      if (contradictory) {
        return {
          direction: 'Neutral',
          score: CROSS_SIGNAL_DIVERGENCE_SCORE,
          alignmentCount: 1,
        };
      }
      return {
        direction: 'Bullish',
        score: CROSS_SIGNAL_REVISION_ONLY_SCORE,
        alignmentCount: 1,
      };
    }

    if (revisionBias === 'bearish') {
      const supportive = [insiderBias, institutionalBias].filter((c) => c === 'bearish').length;
      const contradictory = [insiderBias, institutionalBias].some((c) => c === 'bullish');
      if (supportive >= 1 && !contradictory) {
        return {
          direction: 'Bearish',
          score: clampScore(CROSS_SIGNAL_BEARISH_SCORE - supportive * 2),
          alignmentCount: 1 + supportive,
        };
      }
      if (contradictory) {
        return {
          direction: 'Neutral',
          score: -CROSS_SIGNAL_DIVERGENCE_SCORE,
          alignmentCount: 1,
        };
      }
      return {
        direction: 'Bearish',
        score: -CROSS_SIGNAL_REVISION_ONLY_SCORE,
        alignmentCount: 1,
      };
    }
  }

  if (bullishCount >= 2 && bearishCount === 0) {
    return { direction: 'Bullish', score: 5, alignmentCount: bullishCount };
  }
  if (bearishCount >= 2 && bullishCount === 0) {
    return { direction: 'Bearish', score: -5, alignmentCount: bearishCount };
  }

  return { direction: 'Neutral', score: 0, alignmentCount: 0 };
}

function resolveCrossSignalConfidence(input: {
  availableComponentCount: number;
  alignmentCount: number;
  revisionConfidence?: string | null;
}): EarningsRevisionCrossSignalConfidence {
  if (input.availableComponentCount >= 3 && input.alignmentCount >= 2) {
    if (input.revisionConfidence === 'High') return 'High';
    return 'Medium';
  }
  if (input.availableComponentCount >= 2) return 'Medium';
  return 'Low';
}

function buildEvaluationJa(input: {
  direction: EarningsRevisionCrossSignalDirection;
  revisionBias: CrossSignalComponentBias;
  insiderBias: CrossSignalComponentBias;
  institutionalBias: CrossSignalComponentBias;
  score: number;
}): string {
  const dir = CROSS_SIGNAL_DIRECTION_JA[input.direction];
  const rev = CROSS_SIGNAL_COMPONENT_BIAS_JA[input.revisionBias];
  const ins = CROSS_SIGNAL_COMPONENT_BIAS_JA[input.insiderBias];
  const inst = CROSS_SIGNAL_COMPONENT_BIAS_JA[input.institutionalBias];
  return `Phase23.1 Cross Signal ${dir}（Score ${input.score}）— Revision:${rev} / Insider:${ins} / Institutional:${inst}`;
}

function fmtScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

export function buildEarningsRevisionCrossSignalAnalysis(input: {
  earningsRevisionIntelligence?: BursaEarningsRevisionIntelligenceAnalysis | null;
  insiderTrading?: BursaInsiderTradingAnalysis | null;
  institutionalOwnership?: BursaInstitutionalOwnershipAnalysis | null;
}): BursaEarningsRevisionCrossSignalAnalysis {
  const revisionBias = resolveRevisionComponentBias(input.earningsRevisionIntelligence);
  const insiderBias = resolveInsiderComponentBias(input.insiderTrading);
  const institutionalBias = resolveInstitutionalComponentBias(input.institutionalOwnership);

  const availableComponentCount = [revisionBias, insiderBias, institutionalBias].filter(
    (c) => c !== 'unavailable',
  ).length;

  const { direction, score, alignmentCount } = computeCrossSignalResult({
    revisionBias,
    insiderBias,
    institutionalBias,
  });

  const hasExtractableData = availableComponentCount >= 2 && direction !== 'Unavailable';
  const crossSignalConfidence = resolveCrossSignalConfidence({
    availableComponentCount,
    alignmentCount,
    revisionConfidence: input.earningsRevisionIntelligence?.revisionConfidence ?? null,
  });

  const unavailableReason =
    availableComponentCount === 0
      ? 'Revision / Insider / Institutional のいずれも取得不可'
      : availableComponentCount === 1
        ? 'クロスシグナル判定に必要な2系統以上のデータが不足'
        : null;

  const evaluationJa = buildEvaluationJa({
    direction,
    revisionBias,
    insiderBias,
    institutionalBias,
    score,
  });

  return {
    availability: hasExtractableData ? 'available' : 'unavailable',
    availabilityLabelJa: hasExtractableData
      ? 'Phase23.1 Cross Signal 利用可'
      : 'Phase23.1 Cross Signal データ不足',
    crossSignalDirection: direction,
    crossSignalScore: score,
    revisionBias,
    insiderBias,
    institutionalBias,
    alignmentCount,
    availableComponentCount,
    crossSignalConfidence,
    unavailableReason,
    displayJa: {
      crossSignalDirection: CROSS_SIGNAL_DIRECTION_JA[direction],
      crossSignalScore: fmtScore(score),
      revisionBias: CROSS_SIGNAL_COMPONENT_BIAS_JA[revisionBias],
      insiderBias: CROSS_SIGNAL_COMPONENT_BIAS_JA[insiderBias],
      institutionalBias: CROSS_SIGNAL_COMPONENT_BIAS_JA[institutionalBias],
      alignmentCount: String(alignmentCount),
      confidence: crossSignalConfidence,
      unavailableReason: unavailableReason ?? '—',
    },
    evaluationJa,
    hasExtractableData,
    fetchedAt: hasExtractableData ? new Date().toISOString() : null,
  };
}

export function earningsRevisionCrossSignalMaterialScoreAdjustment(
  analysis: BursaEarningsRevisionCrossSignalAnalysis,
): number {
  if (analysis.availability !== 'available' || !analysis.hasExtractableData) return 0;
  const weighted = Math.round(analysis.crossSignalScore * CROSS_SIGNAL_MATERIAL_WEIGHT);
  return Math.max(-CROSS_SIGNAL_MATERIAL_SCORE_CAP, Math.min(CROSS_SIGNAL_MATERIAL_SCORE_CAP, weighted));
}

export function earningsRevisionCrossSignalToMaterialInputs(
  analysis: BursaEarningsRevisionCrossSignalAnalysis,
): Array<RawMaterialInput & { id?: string }> {
  if (analysis.availability !== 'available' || !analysis.hasExtractableData) return [];
  const d = analysis.displayJa;
  return [
    {
      id: 'phase23_1-earnings-revision-cross-signal',
      title: `Cross Signal ${d.crossSignalDirection} · Score ${d.crossSignalScore}`,
      source: 'bursa_announcement',
      url: null,
      publishedAt: null,
      sourceLabelJa: 'Phase23.1 Earnings Revision Cross Signal',
    },
  ];
}

export function scoreEarningsRevisionCrossSignalMaterialItem(
  analysis: BursaEarningsRevisionCrossSignalAnalysis,
  raw: RawMaterialInput & { id?: string },
): BursaMaterialItem {
  const weighted = Math.round(analysis.crossSignalScore * CROSS_SIGNAL_MATERIAL_WEIGHT * 2);
  const score = Math.max(-100, Math.min(100, weighted));
  const sentiment: BursaMaterialSentiment =
    score > 8 ? '好材料' : score < -8 ? '悪材料' : '中立';
  return {
    id: raw.id ?? 'phase23_1-earnings-revision-cross-signal',
    title: raw.title,
    source: raw.source,
    sourceLabelJa: raw.sourceLabelJa ?? 'Phase23.1 Earnings Revision Cross Signal',
    score,
    sentiment,
    scoreJa: fmtScore(score),
    reasonJa: analysis.evaluationJa,
    detailJa: analysis.evaluationJa,
    publishedAt: raw.publishedAt ?? null,
    url: raw.url ?? null,
  };
}
