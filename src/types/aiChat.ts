import type { AiConciergeConversationMode, AiConciergeResponseIntent } from './aiConcierge';
import type { ConciergeEvidenceBundle } from './conciergeEvidence';
import type { GlobalMarketAnalysisBundle } from './globalMarketAnalysis';
import type { PortfolioIntelligenceBundle } from './portfolioIntelligence';

export type AiChatRole = 'user' | 'assistant' | 'system';

/** Origin for audit export / trade-history linkage. */
export type AiChatMessageSource =
  | 'chat'
  | 'signal'
  | 'queue_ack'
  | 'warning'
  | 'voice'
  | 'audit';

export type AiChatStructuredReply = {
  reason: string;
  risk: string;
  market: string;
  urgency: string;
  confidence: string;
  dataFreshness: string;
  followUp?: string;
  conclusion?: string;
  technicalReason?: string;
  macroReason?: string;
  systemStateReason?: string;
  confidenceDegradationReason?: string;
};

export type AiChatDeliveryStatus =
  | 'ok'
  | 'pending_response'
  | 'timeout'
  | 'failed'
  | 'retried';

export type AiChatMessage = {
  id: string;
  role: AiChatRole;
  text: string;
  structured?: AiChatStructuredReply;
  responseIntent?: AiConciergeResponseIntent;
  conversationMode?: AiConciergeConversationMode;
  /** ISO-8601 UTC instant at creation — never rewritten on reload. */
  createdAt: string;
  /** Monotonic tie-breaker when createdAt collides (ms). */
  sortKey: number;
  /** Local offset at creation for audit export. */
  timezoneOffsetMinutes: number;
  messageSource?: AiChatMessageSource;
  /** 送信・応答ライフサイクル（履歴用） */
  deliveryStatus?: AiChatDeliveryStatus;
  /** 失敗時に同じユーザー文を再送するため */
  pendingUserText?: string;
  failureKindJa?: string;
  /** AI回答の根拠データ（実データ分析型） */
  evidenceData?: ConciergeEvidenceBundle;
  /** 市場状況（レジーム・指数・VIX等） */
  globalMarketAnalysis?: GlobalMarketAnalysisBundle;
  /** ポートフォリオ学習・予測追跡サマリー */
  portfolioIntelligence?: PortfolioIntelligenceBundle;
  /** Rakuten import confirm card (R2 NL) */
  rakutenImportCandidateId?: string;
  rakutenImportBlocked?: boolean;
};
