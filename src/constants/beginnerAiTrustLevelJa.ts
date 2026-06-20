export type BeginnerAiTrustLevel = 'high' | 'medium' | 'low';

export function parseMaterialQualityStarCount(starsStr?: string | null): number | undefined {
  if (!starsStr) return undefined;
  const count = (starsStr.match(/★/g) ?? []).length;
  return count > 0 ? count : undefined;
}

export function resolveAiTrustLevelJa(input: {
  pct: number;
  isEstimated: boolean;
  dataQualityStars?: number;
}): {
  level: BeginnerAiTrustLevel;
  labelJa: string;
  explainJa: string;
  barFillRatio: number;
} {
  const pct = Math.max(0, Math.min(100, Math.round(input.pct)));
  let level: BeginnerAiTrustLevel = pct >= 70 ? 'high' : pct >= 45 ? 'medium' : 'low';

  if (level === 'high' && (input.dataQualityStars ?? 5) <= 2) {
    level = 'medium';
  }

  const labelBase = { high: '高い', medium: '普通', low: '低い' }[level];
  const labelJa = input.isEstimated ? `${labelBase}（推定）` : labelBase;

  let explainJa: string;
  if (level === 'high') {
    explainJa =
      (input.dataQualityStars ?? 5) <= 2
        ? '判断材料はそろっていますが、一部不足があります'
        : '判断材料は十分あります';
  } else if (level === 'medium') {
    explainJa = '判断材料はやや不足しています';
  } else {
    explainJa = '判断材料が少ないため、参考程度にしてください';
  }

  const barFillRatio = level === 'high' ? 1 : level === 'medium' ? 0.66 : 0.33;

  return { level, labelJa, explainJa, barFillRatio };
}

export function resolveAiTrustPct(input: {
  enhancedConfidence?: number | null;
  hybridConfidence?: number | null;
  finalScore?: number | null;
  dataQualityStars?: number;
}): { pct: number; isEstimated: boolean } {
  let pct =
    input.enhancedConfidence ??
    input.hybridConfidence ??
    input.finalScore ??
    50;
  if (input.dataQualityStars != null && input.dataQualityStars <= 2) {
    pct = Math.min(pct, 55);
  }
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  const isEstimated = input.enhancedConfidence == null && input.hybridConfidence == null;
  return { pct, isEstimated };
}
