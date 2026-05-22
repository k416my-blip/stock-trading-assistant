/** Ephemeral concierge session memory (current chat session only). */

export type ConciergeEntityMemory = {
  tickers: string[];
  companyNames: string[];
  sectors: string[];
  countries: string[];
};

export type ConciergeSessionMemory = {
  recentQuestions: string[];
  discussedSymbols: string[];
  strategyPreference: string | null;
  explanationLevelLabelJa: string;
  entities: ConciergeEntityMemory;
  /** Last assistant text snippet — avoid repeating the same vague wording. */
  lastAssistantSnippet: string | null;
  /** User-dismissed topics — do not resurface. */
  ignoredTopics: string[];
  /** Dismissed signal ids or summaries from queue/proactive. */
  dismissedSignals: string[];
  /** Explicit rejections e.g. "保有だけで売却検討". */
  userRejectedThemes: string[];
  /** 自発提案の履歴・成功率サマリ（参考・セッション内） */
  proactiveAdvisorSummaryJa: string | null;
};
