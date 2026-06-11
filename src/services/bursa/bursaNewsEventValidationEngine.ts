/**
 * Phase18.6 — Event Validation Engine（Stage1キーワード → Stage2検証）
 */
import type { NewsEventType } from '../../types/bursaNewsIntelligence';

export type ValidatedEventClassification = {
  stage1EventType: NewsEventType;
  eventType: NewsEventType;
  eventConfidence: number;
  eventValidated: boolean;
  rejectionReason: string | null;
};

const VALIDATED_EVENT_TYPES: NewsEventType[] = ['Guidance Raise', 'Earnings', 'Contract Award'];

/** Guidance Raise — いずれか必須（満たさなければ Guidance Raise 禁止） */
export const GUIDANCE_RAISE_REQUIRED = [
  /raise\s+guidance/i,
  /increase\s+forecast/i,
  /higher\s+outlook/i,
  /earnings\s+upgrade/i,
  /profit\s+forecast\s+raised/i,
] as const;

/** Earnings — いずれか必須 */
export const EARNINGS_REQUIRED = [
  /quarterly\s+results?/i,
  /\bQ[1-4]\b/i,
  /earnings\s+report/i,
] as const;

/** Contract Award — いずれか必須 */
export const CONTRACT_AWARD_REQUIRED = [
  /contract\s+award/i,
  /new\s+project/i,
  /order\s+book/i,
  /contract\s+secured/i,
] as const;

const REQUIRED_BY_TYPE: Partial<Record<NewsEventType, readonly RegExp[]>> = {
  'Guidance Raise': GUIDANCE_RAISE_REQUIRED,
  Earnings: EARNINGS_REQUIRED,
  'Contract Award': CONTRACT_AWARD_REQUIRED,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function countMatches(patterns: readonly RegExp[], headline: string): number {
  return patterns.filter((p) => p.test(headline)).length;
}

function passesRequiredPhrases(eventType: NewsEventType, headline: string): boolean {
  const patterns = REQUIRED_BY_TYPE[eventType];
  if (!patterns) return true;
  return countMatches(patterns, headline) > 0;
}

function resolveFallbackEventType(headline: string, rejected: NewsEventType): NewsEventType {
  const candidates: NewsEventType[] = ['Guidance Raise', 'Earnings', 'Contract Award'];
  for (const candidate of candidates) {
    if (candidate !== rejected && passesRequiredPhrases(candidate, headline)) {
      return candidate;
    }
  }
  return 'Other';
}

function computeConfidence(input: {
  stage1EventType: NewsEventType;
  eventType: NewsEventType;
  headline: string;
  eventValidated: boolean;
}): number {
  const required = REQUIRED_BY_TYPE[input.stage1EventType];

  if (!required) {
    return input.eventType === input.stage1EventType ? 72 : 45;
  }

  const matchCount = countMatches(required, input.headline);

  if (input.eventValidated && input.eventType === input.stage1EventType) {
    return clamp(78 + matchCount * 6, 78, 100);
  }

  if (input.eventType !== input.stage1EventType) {
    const altRequired = REQUIRED_BY_TYPE[input.eventType];
    const altMatches = altRequired ? countMatches(altRequired, input.headline) : 0;
    if (altRequired && altMatches > 0 && input.eventValidated) {
      return clamp(78 + altMatches * 6, 78, 100);
    }
    if (altRequired && altMatches > 0) {
      return clamp(60 + altMatches * 8, 60, 88);
    }
    return clamp(22 + matchCount * 5, 15, 40);
  }

  return 50;
}

function promoteFromRequiredPhrases(headline: string): NewsEventType | null {
  if (countMatches(GUIDANCE_RAISE_REQUIRED, headline) > 0) return 'Guidance Raise';
  if (countMatches(EARNINGS_REQUIRED, headline) > 0) return 'Earnings';
  if (countMatches(CONTRACT_AWARD_REQUIRED, headline) > 0) return 'Contract Award';
  return null;
}

/** Stage2 — Stage1結果を検証し最終EventとConfidenceを返す */
export function validateNewsEventClassification(
  stage1EventType: NewsEventType,
  headline: string,
): ValidatedEventClassification {
  if (stage1EventType === 'Other') {
    const promoted = promoteFromRequiredPhrases(headline);
    if (promoted) {
      const result: ValidatedEventClassification = {
        stage1EventType,
        eventType: promoted,
        eventConfidence: 0,
        eventValidated: true,
        rejectionReason: null,
      };
      result.eventConfidence = computeConfidence({
        stage1EventType: promoted,
        eventType: promoted,
        headline,
        eventValidated: true,
      });
      return result;
    }
  }

  if (!VALIDATED_EVENT_TYPES.includes(stage1EventType)) {
    return {
      stage1EventType,
      eventType: stage1EventType,
      eventConfidence: computeConfidence({
        stage1EventType,
        eventType: stage1EventType,
        headline,
        eventValidated: true,
      }),
      eventValidated: true,
      rejectionReason: null,
    };
  }

  if (passesRequiredPhrases(stage1EventType, headline)) {
    const result: ValidatedEventClassification = {
      stage1EventType,
      eventType: stage1EventType,
      eventConfidence: 0,
      eventValidated: true,
      rejectionReason: null,
    };
    result.eventConfidence = computeConfidence({
      stage1EventType,
      eventType: result.eventType,
      headline,
      eventValidated: true,
    });
    return result;
  }

  const fallback = resolveFallbackEventType(headline, stage1EventType);
  const validated =
    fallback === stage1EventType ||
    !VALIDATED_EVENT_TYPES.includes(fallback) ||
    passesRequiredPhrases(fallback, headline);

  const result: ValidatedEventClassification = {
    stage1EventType,
    eventType: fallback,
    eventConfidence: 0,
    eventValidated: validated,
    rejectionReason: `${stage1EventType}: required phrase missing → ${fallback}`,
  };
  result.eventConfidence = computeConfidence({
    stage1EventType,
    eventType: result.eventType,
    headline,
    eventValidated: result.eventValidated,
  });
  return result;
}

export function buildConfidenceDistribution(articles: Array<{ eventConfidence: number }>): {
  low: number;
  mid: number;
  high: number;
  avg: number;
} {
  let low = 0;
  let mid = 0;
  let high = 0;
  let sum = 0;
  for (const a of articles) {
    sum += a.eventConfidence;
    if (a.eventConfidence < 50) low += 1;
    else if (a.eventConfidence < 80) mid += 1;
    else high += 1;
  }
  return {
    low,
    mid,
    high,
    avg: articles.length > 0 ? sum / articles.length : 0,
  };
}

export type EventMisclassificationSample = {
  headline: string;
  stage1EventType: NewsEventType;
  eventType: NewsEventType;
  eventConfidence: number;
  rejectionReason: string | null;
};

export function collectMisclassificationSamples(
  articles: Array<{
    headline: string;
    stage1EventType: NewsEventType;
    eventType: NewsEventType;
    eventConfidence: number;
    rejectionReason?: string | null;
  }>,
  limit = 8,
): EventMisclassificationSample[] {
  return articles
    .filter(
      (a) =>
        a.stage1EventType !== a.eventType ||
        a.eventConfidence < 50 ||
        a.rejectionReason != null,
    )
    .sort((a, b) => a.eventConfidence - b.eventConfidence)
    .slice(0, limit)
    .map((a) => ({
      headline: a.headline.slice(0, 96),
      stage1EventType: a.stage1EventType,
      eventType: a.eventType,
      eventConfidence: a.eventConfidence,
      rejectionReason: a.rejectionReason ?? null,
    }));
}
