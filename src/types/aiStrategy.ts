import type { AiExplanationLevel } from '../constants/aiExplanationLevel';
import type { ConciergeSessionMemory } from './aiConciergeSession';
import type { ApiConnectionStatus } from './apiConnection';
import type { AiChatStructuredReply } from './aiChat';
import type { AiSystemAwareness, CentralIntelligenceOperations, CentralIntelligencePortfolioRisk } from './centralIntelligence';

export type AiPreferences = {
  aiEnabled: boolean;
  mockOnly: boolean;
  /** Persisted key: aiExplanationLevel */
  aiExplanationLevel: AiExplanationLevel;
  /** TTS for concierge responses */
  voiceEnabled: boolean;
  voiceAutoRead: boolean;
  /** 0.5–2.0 speech rate */
  voiceSpeechRate: number;
  /** Vibrate on 緊急 header signals */
  urgentVibrationEnabled: boolean;
  /** Sound/haptic alert on 緊急 signals */
  urgentSoundEnabled: boolean;
};

export type AiNormalizedHolding = {
  symbol: string;
  market: string;
  shares: number;
  priceSource: string;
  isStale: boolean;
  quoteAgeSeconds: number | null;
  hasPrice: boolean;
};

export type AiNormalizedWatchItem = {
  symbol: string;
  market: string;
  side: string;
};

export type AiNormalizedRecommendation = {
  ticker: string;
  action: string;
  urgency: string;
  confidence: number;
  rationale: string;
};

export type AiStrategyContextPayload = {
  generatedAt: string;
  appMode: string;
  riskMode: string;
  marketRegimeLabel: string;
  healthOverall: string | null;
  holdings: AiNormalizedHolding[];
  watchlist: AiNormalizedWatchItem[];
  recentRecommendations: AiNormalizedRecommendation[];
  journalSummary: {
    totalEntries: number;
    uncertainCount: number;
    inFlightCount: number;
    reconciliationMismatchCount: number;
    recentSymbols: string[];
  };
  staleHoldingsCount: number;
  /** Central Intelligence — system “world model”. */
  systemAwareness: AiSystemAwareness;
  operations: CentralIntelligenceOperations;
  portfolioRisk: CentralIntelligencePortfolioRisk;
  personality: {
    roleJa: string;
    toneGuidelinesJa: readonly string[];
  };
  concierge: {
    mode: string;
    modeLabelJa: string;
    promptHint: string;
    conversationMode: 'conversation' | 'elaboration' | 'analysis' | 'warning';
    conversationModeHintJa: string;
    currentQuestion: string;
    answerQuality: {
      requestsNamedEntities: boolean;
      wantsElaboration: boolean;
      specificityHintJa: string;
    };
  };
  /** Ephemeral session context (current app session only — not persisted training data). */
  sessionMemory: ConciergeSessionMemory;
  personalityGuardrails: {
    philosophyVersion: string;
    fixedPersonality: true;
    noUserLearning: true;
    noPersonalityMutation: true;
    ephemeralTurnOnly: true;
    allowedContextScopeJa: readonly string[];
    prohibitedMemoryCategoriesJa: readonly string[];
    fixedTraitsJa: readonly string[];
  };
  turnGuard: {
    userTrainingAttempt: boolean;
    instructionJa: string;
  };
  explanationLevel: {
    aiExplanationLevel: AiExplanationLevel;
    labelJa: string;
    promptHintJa: string;
  };
  apiHealth: {
    summaryJa: string;
    openAiStatusJa: string;
    newsStatusJa: string;
    anyQuotaLimited: boolean;
    anyStaleWarning: boolean;
    degradedByApis: boolean;
  };
};

export type AiStrategyResponseSource = 'api' | 'mock' | 'mock_fallback';

export type AiRequestStatus =
  | 'idle'
  | 'checking_api_key'
  | 'api_key_missing'
  | 'connecting'
  | 'thinking'
  | 'waiting_response'
  | 'retrying'
  | 'reconnecting'
  | 'degraded'
  | 'streaming'
  | 'success'
  | 'fallback_mock'
  | 'timeout'
  | 'error';

export type AiStrategyChatResult = {
  source: AiStrategyResponseSource;
  text: string;
  structured: AiChatStructuredReply;
  apiConnected: boolean;
  usedMockFallback: boolean;
  isLoading: false;
  errorJa: string | null;
  statusJa: string;
  fallbackReasonJa: string | null;
  connectionStatus: ApiConnectionStatus;
  staleHoldingsCount: number;
  requestStatus: AiRequestStatus;
};

export type AiConnectionProbeResult = {
  requestStatus: AiRequestStatus;
  statusJa: string;
  errorJa: string | null;
  apiConnected: boolean;
  isLoading: false;
  hasApiKey: boolean;
  connectionStatus: ApiConnectionStatus;
};

export type AiApiConnectionTestResult = {
  ok: boolean;
  connectionStatus: ApiConnectionStatus;
  messageJa: string;
  statusJa: string;
};
