/**
 * AI信託 — 画面表示用の内部用語除去（判定ロジックには触れない）
 */
const TRUST_DISPLAY_JARGON_PATTERN =
  /投資|株|売買|\bBUY\b|\bHOLD\b|\bREJECT\b|recommendationScore|confidence|confidencePct|adoptionVerdict|buyAllowed|decisionHash|Red Team|recommendationEngine|investmentCharter|AI投資委員会|委員会/gi;

export function sanitizeTrustDisplayText(text: string): string {
  return text
    .replace(TRUST_DISPLAY_JARGON_PATTERN, '')
    .replace(/[·・:：]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsTrustDisplayJargon(text: string): boolean {
  TRUST_DISPLAY_JARGON_PATTERN.lastIndex = 0;
  return TRUST_DISPLAY_JARGON_PATTERN.test(text);
}
