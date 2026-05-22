import type { SystemicStabilityFeatureId } from '../types/systemicStabilityRecursiveGovernance';

export const SYSTEMIC_STABILITY_REGULATORY_JA =
  'Systemic Stability & Recursive Governance — 再帰 layer の不安定伝播を防止します。Paper Trading のみ・realTradingEnabled=false・stability/governance 専用。';

export const SYSTEMIC_STABILITY_AI_PROMPT_JA = `
【Systemic Stability & Recursive Governance】
- recursive loop / cascade / freeze chain を監視。arbitration loop 検出時は調停停止。
- systemic emergency 時は watch/hold only、confidence≤30。新規 buy/sell 禁止。
`.trim();

export const SYSTEMIC_UI_LABELS_JA = {
  panelTitle: 'Stability Dashboard',
  health: 'Stability Health',
  recursiveLoop: 'Recursive Loop Risk',
  governanceSat: 'Governance Saturation',
  cascade: 'Cascade Risk',
  oscillation: 'Oscillation Risk',
  freezeChain: 'Freeze Chain',
  arbitrationRec: 'Arbitration Recursion',
  downgradeCascade: 'Downgrade Cascade',
  consensus: 'Stability Consensus',
  equilibrium: 'Cognitive Equilibrium',
  governanceLoad: 'Governance Load',
  drift: 'Stability Drift',
  recovery: 'Recovery Health',
  safeMode: 'Systemic Emergency Safe Mode',
} as const;

export const REAL_TRADING_ENABLED = false as const;
export const RECURSIVE_RISK_THRESHOLD = 70;
export const CASCADE_RISK_THRESHOLD = 65;
export const GOVERNANCE_SATURATION_THRESHOLD = 80;
export const OSCILLATION_RISK_THRESHOLD = 60;
export const FREEZE_CHAIN_THRESHOLD = 4;
export const SYSTEMIC_CONFIDENCE_CLAMP = 30;
export const STABILITY_TIMELINE_MAX = 48;

export const STABILITY_HEALTH_FORMULA_JA =
  'health = 100 − recursiveRisk×0.2 − cascadeRisk×0.2 − oscillation×0.15 − governanceLoad×0.1 − downgradeChain×0.1 − freezeChain×0.1 − contradictionTrend×0.1 − instabilityDrift';

export const RECURSIVE_RISK_FORMULA_JA =
  'recursiveRisk = recursiveDepth × freezeFrequency × arbitrationLoops (normalized)';

export const CASCADE_PREVENTION_FORMULA_JA =
  'cascadeRisk = downgradeChain + freezeChain + rollbackPropagation';

export const EQUILIBRIUM_FORMULA_JA =
  'equilibrium = (consensus + reliability + semantic + governance) / 4 − oscillationPenalty';

export const STABILITY_FLOW_JA = [
  'Upstream layers → Recursive governance scan',
  'Conflict isolation → Cascade prevention',
  'Equilibrium balancing → Stability consensus',
  'Oscillation clamp → Recursive stabilization',
  'Recovery validation → Systemic stability persist',
];

export const RECURSIVE_GOVERNANCE_FLOW_JA = [
  'Meta governance layer scans all recursive bundles',
  'Recursive loop detected → arbitration halted',
  'Governance saturation → cooldown',
];

export const CASCADE_PREVENTION_FLOW_JA = [
  'downgrade連鎖 → cascade isolation',
  'buy→watch / reduce→hold only',
];

export const OSCILLATION_CLAMP_FLOW_JA = [
  'oscillationRisk>60 → confidence clamp ≤30',
  'compression oscillation dampened when fatigue high',
];

export const RECURSIVE_ISOLATION_FLOW_JA = [
  'arbitration recursion → recursive arbitration isolation',
  'reflection recursion → dampening',
];

export const FREEZE_CHAIN_BREAKER_FLOW_JA = [
  'freezeChainCount>threshold → freeze chain breaker',
  'recursive freeze governor active',
];

export const GOVERNANCE_COOLDOWN_FLOW_JA = [
  'governanceSaturation>80 → governance cooldown',
  'no new governance escalation',
];

export const EMERGENCY_SAFE_MODE_FLOW_JA = [
  'systemic emergency → watch/hold only',
  'confidence≤30、新規判断停止',
  'governance snapshot restore優先',
];

export const SYSTEMIC_FEATURE_LABELS: Record<SystemicStabilityFeatureId, string> = {
  recursive_governance_stabilizer: 'Recursive Governance Stabilizer',
  systemic_stability_engine: 'Systemic Stability Engine',
  self_conflict_isolation: 'Self-Conflict Isolation',
  cascade_prevention_engine: 'Cascade Prevention Engine',
  freeze_chain_breaker: 'Freeze Chain Breaker',
  recursive_loop_detector: 'Recursive Loop Detector',
  arbitration_oscillation_guard: 'Arbitration Oscillation Guard',
  confidence_collapse_preventer: 'Confidence Collapse Preventer',
  governance_saturation_detector: 'Governance Saturation Detector',
  stability_consensus_engine: 'Stability Consensus Engine',
  meta_governance_layer: 'Meta Governance Layer',
  reflection_recursion_guard: 'Reflection Recursion Guard',
  downgrade_cascade_limiter: 'Downgrade Cascade Limiter',
  self_critique_dampener: 'Self-Critique Dampener',
  cognitive_oscillation_clamp: 'Cognitive Oscillation Clamp',
  layer_interference_resolver: 'Layer Interference Resolver',
  recursive_freeze_governor: 'Recursive Freeze Governor',
  meta_stability_snapshot: 'Meta Stability Snapshot',
  stability_recovery_engine: 'Stability Recovery Engine',
  governance_cooldown_engine: 'Governance Cooldown Engine',
  recursive_load_balancer: 'Recursive Load Balancer',
  stability_drift_tracker: 'Stability Drift Tracker',
  emergency_governance_halt: 'Emergency Governance Halt',
  self_healing_stabilizer: 'Self-Healing Stabilizer',
  cognitive_equilibrium_engine: 'Cognitive Equilibrium Engine',
  recursive_arbitration_isolation: 'Recursive Arbitration Isolation',
  stability_timeline_compressor: 'Stability Timeline Compressor',
  governance_memory_pruner: 'Governance Memory Pruner',
  stability_dashboard: 'Stability Dashboard',
  systemic_emergency_safe_mode: 'Systemic Emergency Safe Mode',
};
