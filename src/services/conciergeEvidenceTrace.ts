/** Metro — evidenceData の送信→UI 追跡 */
export type EvidenceTraceStage =
  | 'context_built'
  | 'strategy_result'
  | 'result_to_message'
  | 'append_assistant'
  | 'message_in_state'
  | 'short_answer_build';

export function logEvidenceTrace(
  stage: EvidenceTraceStage,
  payload: {
    hasEvidence: boolean;
    symbol?: string | null;
    messageId?: string;
    symbolCount?: number;
    note?: string;
  },
): void {
  console.warn('[EVIDENCE_TRACE]', JSON.stringify({ stage, ...payload }));
}

export function logConciergeShortAnswerDiag(payload: {
  hasEvidence: boolean;
  factsCount: number;
  symbol: string | null;
  messageId?: string;
}): void {
  console.warn('[CONCIERGE_SHORT_ANSWER]', JSON.stringify(payload));
}

/** Metro — 本日のAIコメントが参照する bestToday[0] */
export function logDailyCommentTarget(payload: {
  symbol: string | null;
  score: number | null;
  action: string | null;
  conflict: boolean;
  source: string;
}): void {
  console.warn('[DAILY_COMMENT_TARGET]', JSON.stringify(payload));
}

/** Metro — portfolioAiEvaluation 生成の全件（bestToday 調査用） */
export function logPortfolioBestTodayBuild(payload: {
  portfolioScore: number;
  batchSource: string;
  bestToday: Array<{
    rank: number;
    symbol: string;
    finalScore: number;
    ruleScore: number;
    aiScore: number;
    action: string;
    conflict: boolean;
  }>;
  rankedTop10: Array<{
    rank: number;
    symbol: string;
    finalScore: number;
    action: string;
    conflict: boolean;
  }>;
}): void {
  console.warn('[PORTFOLIO_BEST_TODAY]', JSON.stringify(payload));
}
