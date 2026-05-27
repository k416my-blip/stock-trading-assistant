export const RUNTIME_COGNITIVE_GOVERNANCE_VERSION = '1.0.0';
export const RUNTIME_COGNITIVE_GOVERNANCE_POLL_MS = 34_000;
export const RUNTIME_COGNITIVE_GOVERNANCE_TIMELINE_MAX = 400;
export const RUNTIME_COGNITIVE_GOVERNANCE_LONG_SESSION_MIN = 120;

export const COGNITIVE_GOVERNANCE_LAYERS = [
  'dashboard',
  'telemetry',
  'governance',
  'replay',
  'timeline',
  'operator',
] as const;

export const RUNTIME_COGNITIVE_GOVERNANCE_UI_JA = {
  sectionTitle: 'Cognitive Governance & Semantic Signals',
  safety:
    'observe-only cognitive governance — signal removal/pruning/runtime prioritization/forced simplification 禁止',
  dashboardCognitiveLoad: 'dashboardCognitiveLoad',
  semanticNoiseRatio: 'semanticNoiseRatio',
  signalPriorityDrift: 'signalPriorityDrift',
  observerAttentionFragmentation: 'observerAttentionFragmentation',
  replayNarrativeComplexity: 'replayNarrativeComplexity',
  governanceAbstractionDepth: 'governanceAbstractionDepth',
  metricInterpretationDifficulty: 'metricInterpretationDifficulty',
  timelineContextLossRisk: 'timelineContextLossRisk',
  operatorDecisionLatencyRisk: 'operatorDecisionLatencyRisk',
  narrativeContinuity: 'narrativeContinuity',
  semanticDivergence: 'semanticDivergence',
  governanceDrift: 'governanceDrift',
  observerContextDecay: 'observerContextDecay',
  recursiveMeaningAmplification: 'recursiveMeaningAmplification',
} as const;
