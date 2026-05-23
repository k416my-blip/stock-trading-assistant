export type CuriosityMode =
  | 'stopped'
  | 'lightweight'
  | 'sandbox_only'
  | 'frozen'
  | 'deferred';

export type SandboxMutationKind =
  | 'edge_weight_tweak'
  | 'recovery_alt'
  | 'contradiction_probe'
  | 'dormant_revival'
  | 'synthetic_scenario';

export type SandboxMutation = {
  id: string;
  kind: SandboxMutationKind;
  at: string;
  detailJa: string;
  deterministicSeed: number;
  success: boolean;
  productionApplied: false;
};

export type SandboxGraphClone = {
  id: string;
  clonedAt: string;
  edges: Record<string, { edgeKey: string; weight: number; from: string; to: string }>;
  mutations: SandboxMutation[];
};

export type ExplorationCemeteryEntry = {
  id: string;
  mutationId: string;
  reasonJa: string;
  archivedAt: string;
  recoverable: true;
};

export type SandboxReplayArchive = {
  id: string;
  seed: number;
  scenarioJa: string;
  outcomeJa: string;
  at: string;
  deterministic: true;
};

export type CuriosityDashboard = {
  curiosityHealth: number;
  noveltyPressure: number;
  replayMonocultureRisk: number;
  rollbackAddictionRisk: number;
  minorityEdgeCount: number;
  dormantRevivalCount: number;
  explorationBudget: number;
  mutationSandboxCount: number;
  consensusBiasRisk: number;
  innovationScore: number;
  diversityRetention: number;
  fossilizationRisk: number;
  entropyBalance: number;
  curiosityCooldown: boolean;
  sandboxFailureRate: number;
  syntheticScenarioCount: number;
  curiosityMode: CuriosityMode;
};

export type RuntimeCuriosityBundle = {
  version: string;
  builtAt: string;
  dashboard: CuriosityDashboard;
  proposalsCount: number;
  productionMutationsBlocked: number;
};

export type DiversitySimulationHorizon = 30 | 90 | 180;

export type DiversitySimulationReport = {
  horizonDays: DiversitySimulationHorizon;
  replayFixation: number;
  diversityDecay: number;
  governanceRigidity: number;
  entropyCollapse: number;
  rollbackAddiction: number;
  curiosityStarvation: number;
  summaryJa: string;
};
