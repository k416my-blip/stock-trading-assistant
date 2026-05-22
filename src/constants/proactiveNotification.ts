import type { ProactiveSuggestionPriority } from '../types/proactiveSuggestion';

/** 同一 dedupeKey のプッシュ再送禁止（30分〜2時間） */
export const PROACTIVE_PUSH_COOLDOWN_MS: Record<ProactiveSuggestionPriority, number> = {
  critical: 10 * 60 * 1000,
  high: 30 * 60 * 1000,
  medium: 60 * 60 * 1000,
  low: 2 * 60 * 60 * 1000,
};

/** キュー内重複抑制（PROACTIVE_SUPPRESS_MS と揃える） */
export const PROACTIVE_QUEUE_COOLDOWN_MS: Record<ProactiveSuggestionPriority, number> = {
  critical: 15 * 60 * 1000,
  high: 30 * 60 * 1000,
  medium: 60 * 60 * 1000,
  low: 2 * 60 * 60 * 1000,
};
