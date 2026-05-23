export const LONGEVITY_RUNTIME_STATES = [
  'HEALTHY',
  'STABLE',
  'STAGNATING',
  'FOSSILIZING',
  'COLLAPSING',
  'IMMUNE_RESPONSE',
  'RECOVERY',
  'SAFE_MODE',
] as const;

export type LongevityRuntimeState = (typeof LONGEVITY_RUNTIME_STATES)[number];

export type ReplayEcologyRecord = {
  id: string;
  freshness: number;
  diversity: number;
  mutationLineage: string;
  collapseRisk: number;
  entropyContribution: number;
  weight: number;
  archived: boolean;
};

export type LongevityDashboard = {
  entropyHealth: number;
  replayCivilizationRisk: number;
  fossilizationRisk: number;
  curiosityFatigue: number;
  heapEcology: number;
  entropyPulse: boolean;
  deterministicDrift: number;
  mutationDiversity: number;
  replayEcology: number;
  runtimeImmunity: number;
  zombieCacheRatio: number;
  cognitivePlaque: number;
  thermalAging: number;
  longTermSurvival: number;
  entropySafeZone: boolean;
  ecologyPressure: number;
  longevityState: LongevityRuntimeState;
  longevityMode: 'stopped' | 'lightweight' | 'replay_decay_only' | 'full' | 'frozen';
};

export type RuntimeLongevityBundle = {
  version: string;
  builtAt: string;
  dashboard: LongevityDashboard;
  actionsJa: string[];
  productionMutationsBlocked: number;
};

export type DiversitySimulationHorizon = 30 | 90 | 180;

export type CivilizationSimulationReport = {
  horizonDays: DiversitySimulationHorizon;
  entropyCollapse: number;
  replayCivilization: number;
  fossilization: number;
  summaryJa: string;
};
