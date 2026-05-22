import { DEFAULT_AI_EXPLANATION_LEVEL } from '../../src/constants/aiExplanationLevel';
import { AI_PERSONALITY_ROLE_JA, AI_PERSONALITY_TONE_GUIDELINES_JA } from '../../src/constants/aiPersonality';
import { buildExplanationLevelContextBlock } from '../../src/services/aiExplanationLevel';
import { createEmptyConciergeSessionMemory } from '../../src/services/aiConciergeSessionMemory';
import { buildFixedPersonalityGuardrailsBlock } from '../../src/services/aiPersonalityGuard';
import { buildConciergeActionGuide } from '../../src/services/conciergeActionGuideBuilder';
import { buildStubGlobalMarketAnalysis } from '../../src/services/marketRegimeConciergeEngine';
import { buildStubPortfolioIntelligenceBundle } from '../../src/services/portfolioIntelligenceBuilder';
import { buildConciergeRiskControl } from '../../src/services/conciergeRiskControlBuilder';
import type { AiStrategyContextPayload } from '../../src/types/aiStrategy';

export function minimalAiStrategyContext(
  overrides: Partial<AiStrategyContextPayload> = {},
): AiStrategyContextPayload {
  return {
    generatedAt: new Date().toISOString(),
    appMode: '実運用分析',
    riskMode: 'バランス',
    marketRegimeLabel: 'レンジ',
    healthOverall: 'ok',
    holdings: [
      {
        symbol: '1155',
        market: 'Bursa',
        shares: 100,
        priceSource: 'cache',
        isStale: false,
        quoteAgeSeconds: 60,
        hasPrice: true,
      },
    ],
    watchlist: [],
    recentRecommendations: [],
    journalSummary: {
      totalEntries: 0,
      uncertainCount: 0,
      inFlightCount: 0,
      reconciliationMismatchCount: 0,
      recentSymbols: [],
    },
    staleHoldingsCount: 0,
    systemAwareness: {
      systemConfidence: 90,
      dataFreshnessConfidence: 90,
      executionConfidence: 90,
      recoveryConfidence: 90,
      compositeConfidence: 90,
      degradationReasonsJa: [],
    },
    operations: {
      degradedMode: false,
      degradedReasonsJa: [],
      bootMode: 'normal',
      diagnosticsSummary: '問題は検出されていません',
      diagnosticsSeverity: { info: 0, warning: 0, error: 0, critical: 0 },
      healthOverall: 'ok',
      healthSummaryJa: 'ヘルスチェック: 問題なし',
      queueStateJa: '待機 0 · 実行中 0',
      rateLimitActive: false,
      executionSafetyJa: '執行安全ゲート: 通常',
      reconciliationJa: '執行照合: 重大な不一致なし',
      recoveryStateJa: 'リカバリ: 通常運用',
      backupIntegrityJa: '健全スナップショット未保存',
      killSwitchSummaryJa: 'キルスイッチ: すべて解除',
      apiHealthSummaryJa: 'OpenAI: 未設定 · News API: 未設定',
    },
    portfolioRisk: {
      holdingCount: 1,
      staleHoldingsCount: 0,
      staleFractionPercent: 0,
      watchlistCount: 0,
      exposureLabelJa: '低 — データ鮮度は概ね良好',
      maxQuoteAgeMinutes: 1,
    },
    personality: {
      roleJa: AI_PERSONALITY_ROLE_JA,
      toneGuidelinesJa: [...AI_PERSONALITY_TONE_GUIDELINES_JA],
    },
    concierge: {
      mode: 'general',
      modeLabelJa: '一般',
      promptHint: '一般会話: 質問に直接答える。',
      conversationMode: 'conversation',
      conversationModeHintJa: '通常会話: body のみで質問に直接答える。',
      currentQuestion: '',
      answerQuality: {
        requestsNamedEntities: false,
        wantsElaboration: false,
        specificityHintJa: '',
      },
      relevanceControl: {
        compactMode: true,
        priorityOrderJa: ['最新のユーザー指示'],
        scopeJa: '通常',
        suppressedSummaryJa: '',
        heldTickers: [],
        filteredOutTickers: [],
        instructionJa: '簡潔モード',
      },
    },
    sessionMemory: createEmptyConciergeSessionMemory(DEFAULT_AI_EXPLANATION_LEVEL),
    personalityGuardrails: buildFixedPersonalityGuardrailsBlock(),
    turnGuard: {
      userTrainingAttempt: false,
      instructionJa: '固定哲学を維持し、現在のシステム状態のみを参照すること。',
    },
    explanationLevel: buildExplanationLevelContextBlock(DEFAULT_AI_EXPLANATION_LEVEL),
    apiHealth: {
      summaryJa: 'OpenAI: 未設定 · News API: 未設定',
      openAiStatusJa: '未設定',
      newsStatusJa: '未設定',
      anyQuotaLimited: false,
      anyStaleWarning: false,
      degradedByApis: true,
    },
    evidenceData: (() => {
      const ev = {
        generatedAt: new Date().toISOString(),
        analysisMode: 'balanced' as const,
        symbols: [],
        globalSummaryJa: 'テスト用',
        cacheNotesJa: [],
      };
      const withGuide = { ...ev, actionGuide: buildConciergeActionGuide(ev) };
      return { ...withGuide, riskControl: buildConciergeRiskControl({ evidence: withGuide }) };
    })(),
    analysisMode: 'balanced',
    globalMarketAnalysis: buildStubGlobalMarketAnalysis(),
    portfolioIntelligence: buildStubPortfolioIntelligenceBundle(),
    ...overrides,
  };
}
