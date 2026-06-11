/**
 * Phase18.7 — Event Expansion Engine（Other細分化）
 */
import type { NewsEventType, NewsSentiment } from '../../types/bursaNewsIntelligence';
import type { NewsImpactRange } from './bursaNewsImpactEngine';
import type { ValidatedEventClassification } from './bursaNewsEventValidationEngine';

export type NewsEventDirection = 'Bullish' | 'Bearish' | 'Neutral';

export type ExpansionEventDefinition = {
  type: NewsEventType;
  required: readonly RegExp[];
  impact: NewsImpactRange;
  direction: NewsEventDirection;
};

/** 拡張Event定義 — 必須キーワード・Impactレンジ・方向 */
export const EXPANSION_EVENT_DEFINITIONS: ExpansionEventDefinition[] = [
  {
    type: 'Analyst Upgrade',
    required: [
      /analyst\s+upgrade/i,
      /price\s+target\s+raised/i,
      /target\s+price\s+raised/i,
      /\boverweight\b/i,
      /upgraded\s+to\s+buy/i,
      /rating\s+upgrade/i,
      /reiterates\s+buy/i,
      /maintains\s+buy/i,
    ],
    impact: { min: 50, max: 80 },
    direction: 'Bullish',
  },
  {
    type: 'Analyst Downgrade',
    required: [
      /analyst\s+downgrade/i,
      /price\s+target\s+cut/i,
      /target\s+price\s+cut/i,
      /\bunderweight\b/i,
      /downgraded\s+to\s+(sell|hold)/i,
      /rating\s+downgrade/i,
      /reiterates\s+sell/i,
    ],
    impact: { min: 50, max: 80 },
    direction: 'Bearish',
  },
  {
    type: 'Share Buyback',
    required: [
      /share\s+buyback/i,
      /share\s+repurchase/i,
      /repurchase\s+shares/i,
      /buy[\s-]?back\s+program/i,
      /treasury\s+shares/i,
    ],
    impact: { min: 45, max: 70 },
    direction: 'Bullish',
  },
  {
    type: 'Capital Raising',
    required: [
      /capital\s+raising/i,
      /rights\s+issue/i,
      /private\s+placement/i,
      /bond\s+issue/i,
      /fundraising|fund\s+raising/i,
    ],
    impact: { min: 40, max: 65 },
    direction: 'Bearish',
  },
  {
    type: 'M&A',
    required: [
      /\bM&A\b/i,
      /\bmerger\b/i,
      /\bacquisition\b/i,
      /\btakeover\b/i,
      /\bbuyout\b/i,
      /\bacquires\b/i,
    ],
    impact: { min: 60, max: 90 },
    direction: 'Bullish',
  },
  {
    type: 'Product Launch',
    required: [
      /product\s+launch/i,
      /launches\s+new/i,
      /\bunveils\b/i,
      /new\s+product/i,
      /product\s+rollout/i,
      /digital\s+banking/i,
      /debut(s|ed)?\s+(new|its)/i,
    ],
    impact: { min: 45, max: 75 },
    direction: 'Bullish',
  },
  {
    type: 'Partnership',
    required: [
      /\bpartnership\b/i,
      /strategic\s+alliance/i,
      /joint\s+venture/i,
      /collaborat(es|ion)\s+with/i,
      /projects\s+and/i,
      /ties\s+with/i,
      /\bventure\b/i,
    ],
    impact: { min: 40, max: 70 },
    direction: 'Bullish',
  },
  {
    type: 'Expansion',
    required: [
      /\bexpansion\b/i,
      /expands\s+into/i,
      /new\s+facility/i,
      /capacity\s+expansion/i,
      /opens\s+(new\s+)?branch/i,
      /\bprojects\b/i,
      /\bfootprint\b/i,
      /\bcapex\b/i,
      /new\s+plant/i,
      /regional\s+\w+/i,
    ],
    impact: { min: 40, max: 70 },
    direction: 'Bullish',
  },
  {
    type: 'Management Change',
    required: [
      /management\s+change/i,
      /\bCEO\s+appoint/i,
      /appoints\s+(new\s+)?(CEO|CFO|chairman)/i,
      /new\s+(CEO|CFO|chairman)/i,
      /(resign|step\s+down)\s+as\s+(CEO|CFO)/i,
      /director\s+appointed/i,
      /named\s+(CEO|CFO|chairman)/i,
    ],
    impact: { min: 35, max: 65 },
    direction: 'Neutral',
  },
  {
    type: 'Regulatory',
    required: [
      /\bregulatory\b/i,
      /\bregulator\b/i,
      /\bcompliance\b/i,
      /\bBNM\b/i,
      /securities\s+commission/i,
      /license\s+(granted|renewed|approved)/i,
      /bursa\s+malaysia/i,
      /listing\s+requirements/i,
    ],
    impact: { min: 45, max: 75 },
    direction: 'Neutral',
  },
];

export const EXPANSION_IMPACT_RANGES: Partial<Record<NewsEventType, NewsImpactRange>> =
  Object.fromEntries(EXPANSION_EVENT_DEFINITIONS.map((d) => [d.type, d.impact]));

export const EXPANSION_EVENT_DIRECTIONS: Partial<Record<NewsEventType, NewsEventDirection>> =
  Object.fromEntries(EXPANSION_EVENT_DEFINITIONS.map((d) => [d.type, d.direction]));

function countMatches(patterns: readonly RegExp[], headline: string): number {
  return patterns.filter((p) => p.test(headline)).length;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Other候補から拡張Eventを検索（必須キーワード一致） */
export function classifyExpansionEvent(headline: string): NewsEventType | null {
  for (const def of EXPANSION_EVENT_DEFINITIONS) {
    if (countMatches(def.required, headline) > 0) return def.type;
  }
  return null;
}

export function getExpansionEventDirection(eventType: NewsEventType): NewsEventDirection | null {
  return EXPANSION_EVENT_DIRECTIONS[eventType] ?? null;
}

export function getExpansionImpactRange(eventType: NewsEventType): NewsImpactRange | null {
  return EXPANSION_IMPACT_RANGES[eventType] ?? null;
}

/** Stage2拡張 — Other を細分化 */
export function tryExpandOtherEvent(
  headline: string,
  stage1EventType: NewsEventType,
  preExpansionEventType: NewsEventType,
): ValidatedEventClassification | null {
  const expanded = classifyExpansionEvent(headline);
  if (!expanded) return null;

  const def = EXPANSION_EVENT_DEFINITIONS.find((d) => d.type === expanded);
  if (!def) return null;

  const matchCount = countMatches(def.required, headline);
  return {
    stage1EventType,
    eventType: expanded,
    eventConfidence: clamp(74 + matchCount * 5, 74, 96),
    eventValidated: true,
    rejectionReason:
      preExpansionEventType === 'Other'
        ? null
        : `${preExpansionEventType} → expanded to ${expanded}`,
  };
}

/** Neutral時にEvent方向を材料寄与ヒントに利用可能 */
export function eventDirectionSentimentHint(
  eventType: NewsEventType,
  headlineSentiment: NewsSentiment,
): NewsSentiment {
  if (headlineSentiment !== 'Neutral') return headlineSentiment;
  const dir = getExpansionEventDirection(eventType);
  if (dir === 'Bullish' || dir === 'Bearish') return dir;
  return 'Neutral';
}
