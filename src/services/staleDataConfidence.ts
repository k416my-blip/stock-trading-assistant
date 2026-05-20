/** ステール市場データに基づく分析信頼度の減衰 */
export function applyStaleDataConfidencePenalty(
  baseConfidence: number,
  staleFraction: number,
): number {
  const fraction = Math.max(0, Math.min(1, staleFraction));
  const penalty = 1 - fraction * 0.45;
  return Math.max(0.15, Math.min(1, baseConfidence * penalty));
}

export function staleFractionFromFlags(flags: boolean[]): number {
  if (flags.length === 0) return 0;
  const stale = flags.filter(Boolean).length;
  return stale / flags.length;
}
