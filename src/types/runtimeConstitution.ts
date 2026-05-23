export const CONSTITUTIONAL_STATES = [
  'BALANCED',
  'TENSION',
  'POLARIZED',
  'UNSTABLE',
  'CONSTITUTIONAL_CRISIS',
] as const;

export type ConstitutionalState = (typeof CONSTITUTIONAL_STATES)[number];

export const COLLAPSE_RISK_LEVELS = ['LOW_RISK', 'ELEVATED', 'SEVERE', 'COLLAPSING'] as const;
export type CollapseRiskLevel = (typeof COLLAPSE_RISK_LEVELS)[number];

export type RuntimeLayerId =
  | 'governance'
  | 'recovery'
  | 'entropy'
  | 'exploration'
  | 'async'
  | 'observability'
  | 'survival';

export type LayerPressureMap = Record<RuntimeLayerId, number>;

export type LayerConflict = {
  layers: [RuntimeLayerId, RuntimeLayerId];
  kind: string;
  severity: number;
  detailJa: string;
};

export type LayerConflictReport = {
  conflicts: LayerConflict[];
  conflictSeverity: number;
  constitutionalRisk: number;
  layerDominanceIndex: number;
};

export type LayerPowerBalance = {
  dominantLayer: RuntimeLayerId;
  suppressedLayers: RuntimeLayerId[];
  quotas: Record<RuntimeLayerId, number>;
  throttles: Partial<Record<RuntimeLayerId, number>>;
};

export type ConstitutionalBudget = {
  cpuBudgetPct: number;
  asyncBudgetPct: number;
  memoryBudgetPct: number;
  mutationBudgetPct: number;
  replayBudgetPct: number;
  fairnessScore: number;
};

export type DiplomacyOutcome = {
  negotiationWeights: Partial<Record<RuntimeLayerId, number>>;
  cooperativeSuppressions: string[];
  sharedCooldownMs: number;
  compromiseJa: string;
};

export type CollapsePrediction = {
  level: CollapseRiskLevel;
  civilWarRisk: number;
  governanceDeadlockRisk: number;
  entropyRunawayRisk: number;
  replayCollapseRisk: number;
  asyncStarvationRisk: number;
  recoveryMonopolizationRisk: number;
};

export type ConstitutionalRecoveryState = {
  active: boolean;
  dictatorshipMode: boolean;
  replayFrozen: boolean;
  sandboxExplorationOnly: boolean;
  demotedLayers: RuntimeLayerId[];
  startedAtMs: number;
  rebalanceAtMs: number;
};

export type ConstitutionalDirectives = {
  suppressRecovery: boolean;
  suppressExploration: boolean;
  suppressAsyncBurst: boolean;
  governanceThrottle: number;
  replayFreeze: boolean;
  sandboxExplorationOnly: boolean;
  observabilityThrottle: number;
  entropyCap: number;
};

export type SenateDashboard = {
  dominantLayer: RuntimeLayerId;
  suppressedLayers: RuntimeLayerId[];
  constitutionalTension: number;
  equilibriumScore: number;
  cooperationRatio: number;
  layerAggression: Record<RuntimeLayerId, number>;
  budgetFairness: number;
  collapseRisk: CollapseRiskLevel;
};

export type RuntimeConstitutionBundle = {
  version: string;
  builtAt: string;
  state: ConstitutionalState;
  pressures: LayerPressureMap;
  conflicts: LayerConflictReport;
  powerBalance: LayerPowerBalance;
  budget: ConstitutionalBudget;
  diplomacy: DiplomacyOutcome;
  collapse: CollapsePrediction;
  recovery: ConstitutionalRecoveryState;
  directives: ConstitutionalDirectives;
  senate: SenateDashboard;
  actionsJa: string[];
};

export type ConstitutionalSimulationHorizon = 1 | 7 | 30 | 90;

export type ConstitutionalSimulationReport = {
  horizonDays: ConstitutionalSimulationHorizon;
  equilibriumRetention: number;
  monopolyPrevention: number;
  democracyStability: number;
  recoveryAddiction: number;
  governanceOverreach: number;
  entropyRunaway: number;
  asyncStarvation: number;
  summaryJa: string;
};

export type RedmiConstitutionReport = {
  deviceModel: string;
  equilibriumRetention: number;
  governanceFairness: number;
  recoveryDominanceSuppression: number;
  asyncStarvationPrevention: number;
  constitutionalStability: number;
  layerCooperationScore: number;
  systemicCollapseProbability: number;
  constitutionalRecoveryEffectiveness: number;
  ninetyDayCivilizationSurvivability: number;
  summaryJa: string;
};
