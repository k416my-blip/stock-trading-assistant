export const SURVIVABILITY_AUDIT_VALIDATION_VERSION = '1.0.0';

export const SURVIVABILITY_AUDIT_POLL_MS = 29_000;
export const SURVIVABILITY_AUDIT_TIMELINE_MAX = 400;
export const SURVIVABILITY_AUDIT_LONG_SESSION_MIN = 120;

export const SURVIVABILITY_AUDIT_UI_JA = {
  sectionTitle: 'Auditability & Validation',
  safety:
    'audit / validation / observability — recommendation・policy・governance 意味は変更しません',
  survivabilityEffectiveness: 'survivabilityEffectiveness',
  runtimeBlindSpotRisk: 'runtimeBlindSpotRisk',
  observerSuppressionLoss: 'observerSuppressionLoss',
  recoverySideEffectRisk: 'recoverySideEffectRisk',
  stabilizationCostEfficiency: 'stabilizationCostEfficiency',
  survivabilityOverfittingRisk: 'survivabilityOverfittingRisk',
  runtimeEquilibriumIntegrity: 'runtimeEquilibriumIntegrity',
  continuityIntegrityScore: 'continuityIntegrityScore',
  runtimeResilienceScore: 'runtimeResilienceScore',
  runtimeValidationConfidence: 'runtimeValidationConfidence',
  effectivenessEvolution: 'survivability effectiveness evolution',
  blindSpotMap: 'blind-spot propagation map',
  recoverySideEffectChain: 'recovery side-effect chain',
  continuityTimeline: 'continuity integrity timeline',
  resilienceEvolution: 'resilience evolution graph',
  auditConfidenceTimeline: 'audit confidence timeline',
  timeline: 'audit timeline',
} as const;

export const TRADING_CONTINUITY_FEATURES = [
  'holdings',
  'prices',
  'alerts',
  'manual_trade_path',
  'websocket_continuity',
] as const;

export const OVERFITTING_CONDITIONS = [
  'redmi',
  'miui_reclaim',
  'screen_off',
  'long_session',
  'websocket_instability',
] as const;
