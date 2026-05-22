import type { ConciergeMarketRegimeId } from '../types/globalMarketAnalysis';

export const META_DAILY_CRITICAL_MAX = 3;
export const META_DAILY_HIGH_MAX = 5;
export const META_CURATED_FOCUS_MAX = 3;
export const META_QUEUE_DISPLAY_MAX = 12;

export const META_FATIGUE_WINDOW_MS = 2 * 60 * 60 * 1000;
export const META_SIGNAL_DECAY_HALF_LIFE_HOURS = 18;

export const META_REGIME_NORMAL_WEIGHT = 1;
export const META_REGIME_PANIC_ROUTINE_DAMPEN = 0.55;

export const META_AI_PROMPT_JA = `
【Meta Decision Engine】
- 大量シグナルから importance / urgency / confidence / portfolio impact で選別済みの topPriorities のみを優先参照。
- 各通知には whyImportantJa を必ず説明する。
`.trim();

export const META_LABELS_JA = {
  panelTitle: 'AI Top Priorities',
  executive: 'エグゼクティブサマリー',
  focus: '今日本当に見るべき3件',
  queue: '決定キュー',
  opportunities: '注目機会',
  contradictions: '矛盾シグナル',
  budget: '注意予算',
} as const;

export function regimeNotifyThresholdMultiplier(
  regimeId: ConciergeMarketRegimeId | 'unknown',
): number {
  if (regimeId === 'panic' || regimeId === 'risk_off') return 1.35;
  if (regimeId === 'bullish' || regimeId === 'risk_on') return 0.92;
  if (regimeId === 'sideways') return 1.05;
  return 1;
}
