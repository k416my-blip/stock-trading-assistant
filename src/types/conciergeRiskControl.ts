/** Risk Control & Anti-Hallucination — ルールベース信頼層 */

export type SourceReliabilityTier =
  | 'official_filing'
  | 'exchange_data'
  | 'major_news'
  | 'social_media'
  | 'anonymous_rumor';

export type EvidenceSourceFamily = 'price' | 'news' | 'x' | 'volume';

export type DataFreshnessMeta = {
  timestampIso: string;
  ageSeconds: number;
  stale: boolean;
  staleWarningJa: string | null;
};

export type SourceReliabilityEntry = {
  tier: SourceReliabilityTier;
  labelJa: string;
  weight: number;
};

export type CrossValidationResult = {
  agreeingFamilies: EvidenceSourceFamily[];
  familyCount: number;
  strongWarningAllowed: boolean;
  summaryJa: string;
};

export type ApiIsolationStatus = {
  xApiDegraded: boolean;
  newsApiDegraded: boolean;
  quoteApiDegraded: boolean;
  isolationNoteJa: string | null;
};

export type ConciergeSymbolRiskControl = {
  symbol: string;
  dataQualityScore: number;
  confidenceGateOpen: boolean;
  allowActionRecommendations: boolean;
  allowSpeculativeAi: boolean;
  crossValidation: CrossValidationResult;
  rumorLabelsJa: string[];
  staleWarningsJa: string[];
  sourceBreakdown: SourceReliabilityEntry[];
  freshness: {
    quote: DataFreshnessMeta | null;
    news: DataFreshnessMeta | null;
    x: DataFreshnessMeta | null;
  };
};

export type ConciergeRiskControlBundle = {
  generatedAt: string;
  overallDataQualityScore: number;
  overallConfidencePct: number;
  confidenceGateOpen: boolean;
  allowSpeculativeAi: boolean;
  allowActionRecommendations: boolean;
  analysisBlockedJa: string | null;
  apiIsolation: ApiIsolationStatus;
  symbols: ConciergeSymbolRiskControl[];
  globalStaleWarningJa: string | null;
  burstSuppressActive: boolean;
  deterministicModeHintJa: string;
};
