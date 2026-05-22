import type { AiExplanationLevel } from '../constants/aiExplanationLevel';
import type { AiAnalysisMode } from '../constants/aiDataDriven';
import type { ConciergeEvidenceBundle } from './conciergeEvidence';
import type { GlobalMarketAnalysisBundle } from './globalMarketAnalysis';
import type { PortfolioIntelligenceBundle } from './portfolioIntelligence';
import type { ConciergeUxDisplayMode } from './conciergeUx';
import type { DataReliabilityBundle } from './dataReliability';
import type { PortfolioRiskExposureBundle } from './portfolioRiskExposure';
import type { CapitalAllocationBundle } from './capitalAllocation';
import type { SystemStabilityIntegrityBundle } from './systemStabilityIntegrity';
import type { AiGovernanceDecisionBundle } from './aiGovernanceDecision';
import type { ReactiveEventOrchestrationBundle } from './reactiveEventOrchestration';
import type { ExplainableCognitiveTraceBundle } from './explainableCognitiveTrace';
import type { AdaptiveResourceComputeBudgetBundle } from './adaptiveResourceComputeBudget';
import type { StateIntegrityTemporalConsistencyBundle } from './stateIntegrityTemporalConsistency';
import type { SemanticConsistencyDecisionCoherenceBundle } from './semanticConsistencyDecisionCoherence';
import type { EpistemicReliabilityEvidenceWeightBundle } from './epistemicReliabilityEvidenceWeight';
import type { CognitiveGoalArbitrationIntentPriorityBundle } from './cognitiveGoalArbitrationIntentPriority';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from './metaCognitiveRiskReflectionSelfCritique';
import type { RecursiveMemoryCompressionStrategicAbstractionBundle } from './recursiveMemoryCompressionStrategicAbstraction';
import type { SystemicStabilityRecursiveGovernanceBundle } from './systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from './executionRecoveryAdaptiveConfidence';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from './dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { AutonomousMarketRegimeDetectionBundle } from './autonomousMarketRegimeDetection';
import type { CognitiveArbitrationConsensusBundle } from './cognitiveArbitrationConsensus';
import type { MetaReliabilityLongitudinalTrustBundle } from './metaReliabilityLongitudinalTrust';
import type { SelfEvolvingArchitectureReflectiveRefactorBundle } from './selfEvolvingArchitectureReflectiveRefactor';
import type { EpistemicIntegrityTruthCalibrationBundle } from './epistemicIntegrityTruthCalibration';
import type { StrategicMemoryGraphTemporalCausalityBundle } from './strategicMemoryGraphTemporalCausality';
import type { CognitiveResourceEconomyAttentionAllocationBundle } from './cognitiveResourceEconomyAttentionAllocation';
import type { UnifiedCognitiveStateExecutiveAwarenessBundle } from './unifiedCognitiveStateExecutiveAwareness';
import type { HumanIntentContinuityAlignmentPreservationBundle } from './humanIntentContinuityAlignmentPreservation';
import type { AdaptiveExplorationAntiDogmaBundle } from './adaptiveExplorationAntiDogma';
import type { ConstitutionalGovernanceSystemCoherenceBundle } from './constitutionalGovernanceSystemCoherence';
import type { ExplainableGovernanceTransparentReasoningBundle } from './explainableGovernanceTransparentReasoning';
import type { RuntimeSurvivalMobileResilienceBundle } from './runtimeSurvivalMobileResilience';
import type { AutonomousAggressiveness } from './autonomousMonitoring';
import type { TacticalMode } from './strategyExecution';
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
  /** 自発提案（AIコンシェルジュ・未読キュー） */
  proactiveBriefingsEnabled: boolean;
  /** 復帰時に読み上げ確認ダイアログ */
  proactiveVoiceOnResume: boolean;
  /** 実データ分析の厳しさ（conservative / balanced / aggressive） */
  aiAnalysisMode: AiAnalysisMode;
  /** デバッグ: 直近AIプロンプト全文を表示 */
  aiConciergeDebugMode: boolean;
  /** バッテリーセーバー — 更新頻度低下・X API停止 */
  batterySaverEnabled: boolean;
  /** コンシェルジュ表示 — 初心者（要点のみ） / 上級者（詳細根拠） */
  conciergeUxMode: ConciergeUxDisplayMode;
  /** 自律監視エージェント — バックグラウンド市場監視 */
  autonomousMonitoringEnabled: boolean;
  autonomousNotificationsPaused: boolean;
  autonomousAggressiveness: AutonomousAggressiveness;
  autonomousExcludedSymbols: string[];
  /** Meta Decision Engine — シグナル選別・注意予算 */
  metaDecisionEnabled: boolean;
  strategyExecutionEnabled: boolean;
  strategyTacticalMode: TacticalMode;
  /** Portfolio Simulation & Reality Validation */
  realityValidationEnabled: boolean;
  /** Paper Trading & Broker Integration（紙上のみ） */
  paperBrokerEnabled: boolean;
  /** Self-Evaluation & Adaptive Intelligence（ローカル・ルールベース） */
  selfEvaluationEnabled: boolean;
  /** Macro Intelligence & World Model（ルールベース） */
  macroIntelligenceEnabled: boolean;
  /** Data Reliability & Market Data Integrity */
  dataReliabilityEnabled: boolean;
  /** Portfolio Risk & Exposure Intelligence（ルールベース） */
  portfolioRiskExposureEnabled: boolean;
  /** Capital Allocation & Buying Power Intelligence（Paperのみ） */
  capitalAllocationEnabled: boolean;
  /** System Stability & State Integrity — 全レイヤー整合監査 */
  systemStabilityIntegrityEnabled: boolean;
  /** AI Governance & Decision Hierarchy — 最終決定の一貫化 */
  aiGovernanceDecisionEnabled: boolean;
  /** Reactive Event Orchestration — 更新・再計算・再描画制御 */
  reactiveEventOrchestrationEnabled: boolean;
  /** Explainable Cognitive Trace — 判断の完全追跡（reasoning only） */
  explainableCognitiveTraceEnabled: boolean;
  /** Adaptive Resource & Compute Budget — 端末負荷予算 */
  adaptiveResourceComputeBudgetEnabled: boolean;
  /** State Integrity & Temporal Consistency — 状態整合 */
  stateIntegrityTemporalConsistencyEnabled: boolean;
  /** Semantic Consistency & Decision Coherence — 意味的一貫性 */
  semanticConsistencyDecisionCoherenceEnabled: boolean;
  /** Epistemic Reliability & Evidence Weight — 信頼度・根拠重み */
  epistemicReliabilityEvidenceWeightEnabled: boolean;
  /** Cognitive Goal Arbitration & Intent Priority — 目的調停 */
  cognitiveGoalArbitrationIntentPriorityEnabled: boolean;
  /** Meta-Cognitive Risk Reflection & Self-Critique — 自己監査 */
  metaCognitiveRiskReflectionSelfCritiqueEnabled: boolean;
  /** Recursive Memory Compression & Strategic Abstraction — memory最適化 */
  recursiveMemoryCompressionStrategicAbstractionEnabled: boolean;
  /** Systemic Stability & Recursive Governance — 再帰不安定伝播防止 */
  systemicStabilityRecursiveGovernanceEnabled: boolean;
  /** Execution Recovery & Adaptive Confidence — 安全な復帰・段階 thaw */
  executionRecoveryAdaptiveConfidenceEnabled: boolean;
  /** Dynamic Layer Orchestration & Mobile Runtime — 動的実行制御 */
  dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled: boolean;
  /** Autonomous Market Regime Detection — 現在局面分類・risk-aware 適応 */
  autonomousMarketRegimeDetectionEnabled: boolean;
  /** Cognitive Arbitration & Consensus — 分散layer安全合議 */
  cognitiveArbitrationConsensusEnabled: boolean;
  /** Meta Reliability & Longitudinal Trust — AI長期信頼寿命監査 */
  metaReliabilityLongitudinalTrustEnabled: boolean;
  /** Self-Evolving Architecture & Reflective Refactor — 構造監査・提案のみ */
  selfEvolvingArchitectureReflectiveRefactorEnabled: boolean;
  /** Epistemic Integrity & Truth Calibration — 推論品質監査 */
  epistemicIntegrityTruthCalibrationEnabled: boolean;
  /** Strategic Memory Graph & Temporal Causality — 時系列因果グラフ監査 */
  strategicMemoryGraphTemporalCausalityEnabled: boolean;
  /** Cognitive Resource Economy & Attention Allocation — 認知リソース配分 */
  cognitiveResourceEconomyAttentionAllocationEnabled: boolean;
  /** Unified Cognitive State & Executive Awareness — 統合認知状態監査 */
  unifiedCognitiveStateExecutiveAwarenessEnabled: boolean;
  /** Human Intent Continuity & Alignment Preservation — ユーザー意図整合監査 */
  humanIntentContinuityAlignmentPreservationEnabled: boolean;
  /** Adaptive Exploration & Anti-Dogma — 過度固定化の検出・緩和 */
  adaptiveExplorationAntiDogmaEnabled: boolean;
  /** Constitutional Governance & System Coherence — 中央憲法層 */
  constitutionalGovernanceSystemCoherenceEnabled: boolean;
  /** Explainable Governance & Transparent Reasoning — 安全な監査説明のみ */
  explainableGovernanceTransparentReasoningEnabled: boolean;
  /** Runtime Survival & Mobile Resilience — モバイル実運用 survivability */
  runtimeSurvivalMobileResilienceEnabled: boolean;
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
  /** Dynamic runtime orchestrator — pacing / suppression hints (not strategy). */
  runtimeHealthSummary?: string;
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
    relevanceControl: {
      compactMode: boolean;
      priorityOrderJa: readonly string[];
      scopeJa: string;
      suppressedSummaryJa: string;
      heldTickers: string[];
      filteredOutTickers: string[];
      instructionJa: string;
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
  /** X API節約モード — 質問時に取得した要約のみ（投稿全文なし） */
  xApi?: {
    conservationModeJa: string;
    usageSummaryJa: string;
    socialBriefJa: string | null;
  };
  /** 実データ根拠（市場・ニュース・X・異常フラグ） */
  evidenceData: ConciergeEvidenceBundle;
  analysisMode: AiAnalysisMode;
  /** 市場レジーム分析（指数・VIX・為替・セクター） */
  globalMarketAnalysis: GlobalMarketAnalysisBundle;
  /** ポートフォリオ記憶・学習・予測追跡（ローカル集計サマリー） */
  portfolioIntelligence: PortfolioIntelligenceBundle;
  /** UX要約 — AIが冒頭で状況を1文要約するため */
  conciergeUx?: {
    displayMode: ConciergeUxDisplayMode;
    situationLineJa: string;
    dangerLineJa: string;
    judgmentLineJa: string;
    riskLabelJa: string;
  };
  metaDecision?: {
    topPrioritiesJa: string[];
    executiveSummaryJa: string;
    emergencyOverride: boolean;
  };
  /** データ信頼性・整合性（ルールベース） */
  dataReliability?: DataReliabilityBundle;
  /** ポートフォリオリスク・エクスポーザ（ルールベース） */
  portfolioRiskExposure?: PortfolioRiskExposureBundle;
  /** 資金配分・Buying Power（ルールベース・Paperのみ） */
  capitalAllocation?: CapitalAllocationBundle;
  /** システム安定性・状態整合（ルールベース監査） */
  systemStabilityIntegrity?: SystemStabilityIntegrityBundle;
  /** ガバナンス・決定階層（最終裁定） */
  aiGovernanceDecision?: AiGovernanceDecisionBundle;
  /** Reactive Event Orchestration（イベント制御） */
  reactiveEventOrchestration?: ReactiveEventOrchestrationBundle;
  /** Explainable Cognitive Trace（推論トレース） */
  explainableCognitiveTrace?: ExplainableCognitiveTraceBundle;
  /** Adaptive Resource & Compute Budget（端末予算） */
  adaptiveResourceComputeBudget?: AdaptiveResourceComputeBudgetBundle;
  /** State Integrity & Temporal Consistency（時系列整合） */
  stateIntegrityTemporalConsistency?: StateIntegrityTemporalConsistencyBundle;
  /** Semantic Consistency & Decision Coherence（意味整合） */
  semanticConsistencyDecisionCoherence?: SemanticConsistencyDecisionCoherenceBundle;
  /** Epistemic Reliability & Evidence Weight（信頼度・根拠重み） */
  epistemicReliabilityEvidenceWeight?: EpistemicReliabilityEvidenceWeightBundle;
  /** Cognitive Goal Arbitration & Intent Priority（目的調停） */
  cognitiveGoalArbitrationIntentPriority?: CognitiveGoalArbitrationIntentPriorityBundle;
  /** Meta-Cognitive Risk Reflection & Self-Critique（自己批判） */
  metaCognitiveRiskReflectionSelfCritique?: MetaCognitiveRiskReflectionSelfCritiqueBundle;
  /** Recursive Memory Compression & Strategic Abstraction（memory圧縮） */
  recursiveMemoryCompressionStrategicAbstraction?: RecursiveMemoryCompressionStrategicAbstractionBundle;
  /** Systemic Stability & Recursive Governance（系統安定・再帰統治） */
  systemicStabilityRecursiveGovernance?: SystemicStabilityRecursiveGovernanceBundle;
  /** Execution Recovery & Adaptive Confidence（安全復帰・confidence 再構築） */
  executionRecoveryAdaptiveConfidence?: ExecutionRecoveryAdaptiveConfidenceBundle;
  dynamicLayerOrchestrationMobileRuntimeOptimization?: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle;
  autonomousMarketRegimeDetection?: AutonomousMarketRegimeDetectionBundle;
  cognitiveArbitrationConsensus?: CognitiveArbitrationConsensusBundle;
  metaReliabilityLongitudinalTrust?: MetaReliabilityLongitudinalTrustBundle;
  selfEvolvingArchitectureReflectiveRefactor?: SelfEvolvingArchitectureReflectiveRefactorBundle;
  epistemicIntegrityTruthCalibration?: EpistemicIntegrityTruthCalibrationBundle;
  /** Strategic Memory Graph & Temporal Causality（因果=仮説・監査のみ） */
  strategicMemoryGraphTemporalCausality?: StrategicMemoryGraphTemporalCausalityBundle;
  /** Cognitive Resource Economy & Attention Allocation（有限リソース下の思考配分） */
  cognitiveResourceEconomyAttentionAllocation?: CognitiveResourceEconomyAttentionAllocationBundle;
  /** Unified Cognitive State & Executive Awareness（監査のみ・意思決定主体ではない） */
  unifiedCognitiveStateExecutiveAwareness?: UnifiedCognitiveStateExecutiveAwarenessBundle;
  /** Human Intent Continuity & Alignment Preservation（監査のみ・勝手な解釈禁止） */
  humanIntentContinuityAlignmentPreservation?: HumanIntentContinuityAlignmentPreservationBundle;
  /** Adaptive Exploration & Anti-Dogma（監査のみ・固定化緩和） */
  adaptiveExplorationAntiDogma?: AdaptiveExplorationAntiDogmaBundle;
  /** Constitutional Governance & System Coherence（中央憲法・全レイヤー統治） */
  constitutionalGovernanceSystemCoherence?: ConstitutionalGovernanceSystemCoherenceBundle;
  /** Explainable Governance & Transparent Reasoning（安全な監査説明・CoT禁止） */
  explainableGovernanceTransparentReasoning?: ExplainableGovernanceTransparentReasoningBundle;
  /** Runtime Survival & Mobile Resilience（モバイル生存性・graceful degradation） */
  runtimeSurvivalMobileResilience?: RuntimeSurvivalMobileResilienceBundle;
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
  /** 直近ターンでAIに渡した実データ根拠 */
  evidenceData?: ConciergeEvidenceBundle;
  /** 直近ターンの市場全体分析 */
  globalMarketAnalysis?: GlobalMarketAnalysisBundle;
  /** 直近ターンのポートフォリオインテリジェンス */
  portfolioIntelligence?: PortfolioIntelligenceBundle;
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
