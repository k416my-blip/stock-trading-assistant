export const STRESS_SCENARIO_IDS = [
  'long_session_30m',
  'long_session_60m',
  'long_session_120m',
  'long_session_180m',
  'background_survival',
  'thermal_stress',
  'battery_saver',
  'replay_flood',
  'dashboard_leak',
  'websocket_storm',
  'gc_oscillation',
  'heap_growth',
  'async_saturation',
  'curiosity_flood',
  'replay_civilization',
  'entropy_collapse',
  'safe_mode_trigger',
  'emergency_brake',
  'dashboard_fps',
  'android_kill_recovery',
] as const;

export type StressScenarioId = (typeof STRESS_SCENARIO_IDS)[number];

export type MemorySnapshotSample = {
  atTick: number;
  sessionMinutes: number;
  jsHeapMb: number;
  replayCount: number;
  asyncQueueDepth: number;
  entropyHealth: number;
  orchestratorState: string;
  longevityState: string;
};

export type StressScenarioResult = {
  id: StressScenarioId;
  labelJa: string;
  passed: boolean;
  ticksRun: number;
  durationSimMinutes: number;
  failuresJa: string[];
  notesJa: string[];
};

export type FinalSurvivalReport = {
  version: string;
  builtAt: string;
  deviceModel: string;
  scenariosRun: number;
  scenariosPassed: number;
  memoryGrowthMb: number;
  replayGrowth: number;
  heapPressurePeak: number;
  gcFrequencyEstimate: number;
  dashboardPressurePeak: number;
  entropyStability: number;
  thermalDegradation: number;
  asyncStarvationPeak: number;
  replayCivilizationRisk: number;
  fossilizationRisk: number;
  survivalScore: number;
  expectedContinuousRuntimeHours: number;
  memorySnapshots: MemorySnapshotSample[];
  scenarioResults: StressScenarioResult[];
  summaryJa: string;
};
