import type { ConciergeNewsHeadlineEvidence } from '../types/conciergeEvidence';

export function scoreNewsImportance(headlines: ConciergeNewsHeadlineEvidence[]): number {
  if (headlines.length === 0) return 0;
  let score = Math.min(40, headlines.length * 12);
  for (const h of headlines.slice(0, 3)) {
    const s = h.sentiment?.toLowerCase() ?? '';
    if (s.includes('negative') || s.includes('bear')) score += 18;
    if (s.includes('positive') || s.includes('bull')) score += 10;
    if (h.rumorLabel) score += 8;
    if (h.sourceTier === 'major_news' || h.sourceTier === 'exchange_data') score += 6;
  }
  return Math.min(100, Math.round(score));
}
