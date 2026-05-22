import { PROACTIVE_UI } from '../constants/proactiveConcierge';
import type { ProactiveSuggestion } from '../types/proactiveSuggestion';
import { isUnhandledProactiveStatus } from '../types/proactiveSuggestion';

export function buildProactiveResumeSummaryJa(
  suggestions: ProactiveSuggestion[],
  maxItems = 5,
): string | null {
  const pending = suggestions
    .filter((s) => isUnhandledProactiveStatus(s.status))
    .sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 };
      return rank[a.priority] - rank[b.priority] || Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });

  if (pending.length === 0) return null;

  const head = `前回から${pending.length}件の重要変化があります。`;
  const lines = pending.slice(0, maxItems).map((s, i) => `${i + 1}件目、${s.titleJa}。`);
  return [head, ...lines, PROACTIVE_UI.safetyFooter].join('\n');
}
