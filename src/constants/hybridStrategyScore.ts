/** Phase B — ルールスコアと AI スコアの統合重み */
export const HYBRID_RULE_SCORE_WEIGHT = 0.7;
export const HYBRID_AI_SCORE_WEIGHT = 0.3;

export const AI_SECOND_EVALUATOR_CACHE_TTL_MS = 5 * 60 * 1000;
/** 1回の OpenAI リクエストあたりの銘柄数 */
export const AI_SECOND_EVALUATOR_CHUNK_SIZE = 8;
/** 保有銘柄 AI 評価の上限（全保有を対象） */
export const AI_SECOND_EVALUATOR_MAX_SYMBOLS = 40;
export const AI_SECOND_EVALUATOR_TIMEOUT_MS = 35_000;
export const AI_SECOND_EVALUATOR_MAX_OUTPUT_TOKENS = 600;
export function aiSecondEvaluatorOutputTokensForChunk(symbolCount: number): number {
  return Math.min(4000, 180 + symbolCount * 90);
}
