/**
 * Red Team Analyst — 判定への反証（判定権なし・decisionHash 対象外）
 */
import { AI_API_CHAT_URL, AI_API_MODEL } from '../constants/aiStrategy';
import {
  COMMITTEE_NARRATIVE_OPENAI_TIMEOUT_MS,
  RED_TEAM_ANALYST_LABEL_JA,
  RED_TEAM_SYSTEM_INSTRUCTION_JA,
} from '../constants/investmentCommitteeNarrative';
import type { AdoptionVerdict } from '../types/investmentCharter';
import type { RedTeamReview, RedTeamReviewFetchResult } from '../types/investmentCommitteeNarrative';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import { loadAiApiKey } from './aiApiKey';
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import { parseAiApiJsonContent } from './aiResponseSanitizer';
import {
  buildRedTeamCacheKey,
  getRedTeamFromMemoryCache,
  getRedTeamFromPersistentCache,
  setRedTeamCache,
} from './committeeRedTeamCache';
import { FORBIDDEN_REVIEW_KEYS } from './investmentCommitteeReviewService';
import { shouldPauseApiRequests } from './performanceCostRuntime';
import { shouldPauseConciergeAi } from './productionStability/productionStabilityRuntime';
import { secureWarn } from './secureLogger';

const ALLOWED_RED_TEAM_KEYS = new Set(['counterArgumentsJa', 'redTeamScore']);

export type RedTeamReviewInput = {
  symbol: string;
  name?: string;
  lockedVerdict: AdoptionVerdict;
  lockedVerdictLabelJa: string;
  recommendationScore: number;
  confidencePct: number;
  charterApprovalReasonsJa: string[];
  charterOppositionReasonsJa: string[];
  evidence?: ConciergeSymbolEvidence;
};

function extractResponsesText(data: unknown): string | null {
  const payload = data as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  for (const item of payload.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      const text = part.text?.trim();
      if (!text) continue;
      if (part.type === 'output_text' || part.type === 'text') return text;
    }
  }
  return null;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
}

function redTeamMissionJa(verdict: AdoptionVerdict): string {
  if (verdict === 'adopt') {
    return 'lockedVerdict=adopt(BUY) — 「買わない理由」を1〜3個、最も強力な反証として提示。';
  }
  if (verdict === 'reject') {
    return 'lockedVerdict=reject — 「実は買うべき理由」を1〜3個、最も強力な反証として提示。';
  }
  return 'lockedVerdict=hold — 保留判定が誤りであると仮定し、反対方向の最強反証を1〜3個提示。';
}

/** JSON Schema: counterArgumentsJa のみ許可（1〜3件） */
export function validateRedTeamResponse(parsed: unknown): RedTeamReview | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_REVIEW_KEYS.has(key.toLowerCase())) return null;
    if (!ALLOWED_RED_TEAM_KEYS.has(key)) return null;
  }

  const counterArgumentsJa = parseStringArray(obj.counterArgumentsJa).slice(0, 3);
  if (counterArgumentsJa.length === 0) return null;

  let redTeamScore = 50;
  if (typeof obj.redTeamScore === 'number' && Number.isFinite(obj.redTeamScore)) {
    redTeamScore = Math.max(0, Math.min(100, Math.round(obj.redTeamScore)));
  }

  return {
    counterArgumentsJa,
    redTeamScore,
    generatedAt: new Date().toISOString(),
  };
}

function buildRedTeamPrompt(input: RedTeamReviewInput): string {
  return [
    RED_TEAM_SYSTEM_INSTRUCTION_JA,
    `Role — ${RED_TEAM_ANALYST_LABEL_JA}`,
    'JSON only. Allowed keys: counterArgumentsJa (string array 1-3), redTeamScore (0-100).',
    'Do NOT output verdict, adoptionVerdict, buyAllowed, recommendationScore, confidencePct.',
    redTeamMissionJa(input.lockedVerdict),
    `lockedVerdictLabel=${input.lockedVerdictLabelJa}`,
    `symbol=${input.symbol} name=${input.name ?? '-'}`,
    `charterApproval=${input.charterApprovalReasonsJa.join('; ')}`,
    `charterOpposition=${input.charterOppositionReasonsJa.join('; ')}`,
    'Write Japanese. Challenge the locked verdict without changing it.',
  ].join('\n');
}

async function fetchRedTeamFromOpenAiOnce(
  input: RedTeamReviewInput,
  fetchImpl: typeof fetch,
): Promise<RedTeamReview | null> {
  const rawKey = await loadAiApiKey();
  const apiKey = normalizeStoredApiKey(rawKey);
  if (!isUsableApiKey(apiKey)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMMITTEE_NARRATIVE_OPENAI_TIMEOUT_MS);

  try {
    const response = await fetchImpl(AI_API_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_API_MODEL,
        temperature: 0.3,
        max_output_tokens: 480,
        text: { format: { type: 'json_object' } },
        input: buildRedTeamPrompt(input),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      secureWarn('[red-team] OpenAI HTTP', response.status);
      return null;
    }

    const data = await response.json();
    const text = extractResponsesText(data);
    if (!text) return null;
    const parsed = parseAiApiJsonContent(text);
    return validateRedTeamResponse(parsed);
  } catch (err) {
    secureWarn('[red-team] fetch failed', err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type FetchRedTeamReviewOptions = {
  fetchImpl?: typeof fetch;
  forceApi?: boolean;
};

export async function fetchRedTeamReview(
  input: RedTeamReviewInput,
  options: FetchRedTeamReviewOptions = {},
): Promise<RedTeamReviewFetchResult | null> {
  const cacheKey = buildRedTeamCacheKey({
    symbol: input.symbol,
    lockedVerdict: input.lockedVerdict,
    recommendationScore: input.recommendationScore,
    confidencePct: input.confidencePct,
  });

  if (!options.forceApi) {
    const memHit = getRedTeamFromMemoryCache(cacheKey);
    if (memHit) {
      return { review: memHit, cacheStatus: 'hit', apiCalled: false };
    }
    const persisted = await getRedTeamFromPersistentCache(cacheKey);
    if (persisted) {
      return { review: persisted, cacheStatus: 'hit', apiCalled: false };
    }
  }

  if (shouldPauseApiRequests() || shouldPauseConciergeAi()) {
    return null;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const review = await fetchRedTeamFromOpenAiOnce(input, fetchImpl);
  if (!review) return null;

  await setRedTeamCache(cacheKey, review);
  return { review, cacheStatus: 'miss', apiCalled: true };
}
