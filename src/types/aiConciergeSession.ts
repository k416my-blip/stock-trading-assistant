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
};
