import type { DependencyEdge, IntegrityFeatureId } from '../types/systemStabilityIntegrity';

export const INTEGRITY_REGULATORY_JA =
  '整合性レイヤー — 機能追加ではなく既存全レイヤーの状態監査・競合防止・復旧を統合します。';

export const INTEGRITY_AI_PROMPT_JA = `
【System Stability & State Integrity】
- systemHealthScore と featureStatuses を優先。freeze/race/persistence の説明のみ。
- 多層AIの矛盾より「端末内の安定性・データ鮮度・Paperのみ」を先に伝える。
`.trim();

export const INTEGRITY_UI_LABELS_JA = {
  panelTitle: 'System Stability & State Integrity',
  health: 'System Health',
  layers: 'レイヤー整合',
  features: 'ガード一覧',
  deps: '依存グラフ',
  flow: 'State Flow',
  persist: 'Persistence',
} as const;

/** System Health Score — 100起点・減点式 */
export const HEALTH_BASE = 100;
export const HEALTH_DEDUCT_EMERGENCY_L1 = 10;
export const HEALTH_DEDUCT_EMERGENCY_L2 = 25;
export const HEALTH_DEDUCT_EMERGENCY_L3 = 40;
export const HEALTH_DEDUCT_STALE_ASYNC = 12;
export const HEALTH_DEDUCT_RENDER_BLOCK = 8;
export const HEALTH_DEDUCT_QUEUE_TRIM = 6;
export const HEALTH_DEDUCT_STORAGE = 25;
export const HEALTH_DEDUCT_STALE_CACHE = 15;
export const HEALTH_DEDUCT_LAYER_GAP = 8;
export const HEALTH_DEDUCT_ZOMBIE_ORDERS = 10;
export const HEALTH_DEDUCT_MEMORY = 10;
export const HEALTH_DEDUCT_READONLY = 12;

export const CONCIERGE_LAYER_DEPENDENCY_GRAPH: DependencyEdge[] = [
  { from: 'AppContext', to: 'ProactiveConcierge.refreshProactive', noteJa: '単一フライト刷新' },
  { from: 'refreshProactive', to: 'DataReliability', noteJa: 'AIゲート前' },
  { from: 'refreshProactive', to: 'MacroIntelligence', noteJa: 'レジーム・ストレス' },
  { from: 'MacroIntelligence', to: 'MetaDecision', noteJa: '候補フィルタ' },
  { from: 'MacroIntelligence', to: 'StrategyExecution', noteJa: 'tacticalMode' },
  { from: 'refreshProactive', to: 'StrategyExecution', noteJa: '買い候補' },
  { from: 'StrategyExecution', to: 'RealityValidation', noteJa: '実績' },
  { from: 'StrategyExecution', to: 'PaperExecution', noteJa: '紙上DD' },
  { from: 'refreshProactive', to: 'PortfolioRisk', noteJa: 'cap・現金推奨' },
  { from: 'PortfolioRisk', to: 'CapitalAllocation', noteJa: 'maxPosition・reserve' },
  { from: 'CapitalAllocation', to: 'PaperExecution', noteJa: 'サイズ・ドラフト' },
  { from: 'DataReliability', to: 'AiStrategyChat', noteJa: 'allowSpeculativeAi' },
  { from: 'ProductionStability', to: 'refreshProactive', noteJa: 'renderBudget・pause' },
  { from: 'portfolioSnapshot', to: 'AppContext.persist', noteJa: '健全スナップショット' },
];

export const INTEGRITY_FEATURE_LABELS: Record<IntegrityFeatureId, string> = {
  global_state_audit: 'Global State Audit',
  cross_layer_dependency: 'Cross-layer Dependency Graph',
  async_race_detector: 'Async Race Detector',
  stale_cache_guard: 'Stale Cache Guard',
  memory_leak_watcher: 'Memory Leak Watcher',
  render_frequency_guard: 'Render Frequency Guard',
  event_storm_prevention: 'Event Storm Prevention',
  duplicate_execution_guard: 'Duplicate Execution Guard',
  zombie_order_cleaner: 'Zombie Order Cleaner',
  invalid_state_recovery: 'Invalid State Recovery',
  session_restore_engine: 'Session Restore Engine',
  background_resume_recovery: 'Background Resume Recovery',
  api_retry_throttle: 'API Retry Throttle',
  websocket_reconnect_guard: 'WebSocket Reconnect Guard',
  portfolio_snapshot_engine: 'Portfolio Snapshot Engine',
  immutable_critical_state: 'Immutable Critical State',
  crash_safe_persistence: 'Crash-safe Persistence',
  safe_fallback_mode: 'Safe Fallback Mode',
  emergency_readonly_mode: 'Emergency Read-only Mode',
  full_system_health_score: 'Full System Health Score',
};

export const STATE_FLOW_STEPS_JA = [
  'AppContext stateRef → guardAppStateForPersistence → AsyncStorage envelope+checksum',
  'ProactiveConcierge.refreshProactive → 単一フライト → renderBudget → 各Intelligence bundle',
  'ProductionStability snapshot → emergencyLevel → shouldPauseConciergeAi',
  'AI sendAiStrategyMessage → asyncRaceGuard(ai-chat) → attach layer bundles',
];

export const PERSISTENCE_FLOW_STEPS_JA = [
  'app_state v3 + integrity checksum',
  'portfolioHealthySnapshot / portfolioBackup',
  'proactiveSuggestions + layer persisted states',
  'systemStabilityIntegrity checkpoint（セッション復元）',
  'background/inactive → crash-safe flush handlers',
];
