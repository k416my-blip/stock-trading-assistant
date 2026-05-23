export const UNIFIED_RUNTIME_TICK_PHASES = [
  'observability',
  'self_healing',
  'evolution',
  'constitution',
  'metabolism',
  'curiosity',
  'longevity',
  'orchestration',
  'ux',
] as const;

export type UnifiedRuntimeTickPhase = (typeof UNIFIED_RUNTIME_TICK_PHASES)[number];

export const UNIFIED_ORCHESTRATOR_STATES = [
  'HEALTHY',
  'DEGRADED',
  'RECOVERING',
  'STRESSED',
  'CRITICAL',
  'EMERGENCY',
  'SAFE_MODE',
] as const;

export type UnifiedOrchestratorState = (typeof UNIFIED_ORCHESTRATOR_STATES)[number];

export type UnifiedOrchestratorDashboard = {
  orchestratorState: UnifiedOrchestratorState;
  currentTickPhase: UnifiedRuntimeTickPhase | 'idle';
  runtimePressure: number;
  thermalAuthority: string;
  replayQueue: number;
  asyncPressure: number;
  layerBudgetUsage: number;
  deterministicHealth: number;
  cascadeRisk: number;
  safeMode: boolean;
  emergencyBrake: boolean;
  governanceLock: boolean;
  snapshotLatency: number;
  tickDrift: number;
  replayRaceRisk: number;
  deadlockRisk: number;
};

export type UnifiedRuntimeOrchestratorBundle = {
  version: string;
  builtAt: string;
  tickSeq: number;
  deterministicSeed: number;
  dashboard: UnifiedOrchestratorDashboard;
  phasesCompleted: UnifiedRuntimeTickPhase[];
  layersSkipped: string[];
};

export type UnifiedTickGate = {
  allowCuriosity: boolean;
  allowReplay: boolean;
  allowDeepGc: boolean;
  allowDashboard: boolean;
  allowEvolutionFull: boolean;
  survivalOnly: boolean;
};

export type UnifiedLayerBudget = {
  observability: number;
  selfHealing: number;
  evolution: number;
  constitution: number;
  metabolism: number;
  curiosity: number;
  longevity: number;
  orchestration: number;
  ux: number;
};
