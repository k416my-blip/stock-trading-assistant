import type { RedmiLongSoakExport } from './redmiLongSoakValidation';
import type { TemporalDecayStatus } from './runtimeTemporalCausality';
import type { LatentRuntimeStateKind } from './runtimeLatentStateInference';

export type LatentCausalEventKind = `latent_${LatentRuntimeStateKind}`;

export type ObservableCausalEventKind =
  | 'resume'
  | 'reconnect_schedule'
  | 'reconnect_execute'
  | 'trim_memory'
  | 'timer_drift'
  | 'delayed_resume'
  | 'hydration_lock_overlap'
  | 'duplicate_schedule'
  | 'ownership_violation'
  | 'duplicate_socket'
  | 'silent_disconnect'
  | 'reconnect_storm'
  | 'async_saturation'
  | 'thermal_throttle'
  | 'event_loop_lag'
  | 'native_lifecycle'
  | 'budget_block'
  | 'coalesce';

export type CausalEventKind = ObservableCausalEventKind | LatentCausalEventKind;

export type CausalEventNode = {
  id: string;
  kind: CausalEventKind;
  at: string;
  sortKey: number;
  detailJa: string;
  reconnectUuid?: string;
  source?: string;
  rootPriority: number;
  cascadeOnly: boolean;
  isLatent?: boolean;
  latentState?: LatentRuntimeStateKind;
  latentCritical?: boolean;
  latentEscalation?: import('./hierarchicalLatentRuntimeGraph').LatentEscalationLevel;
  latentRecovered?: boolean;
};

export type CausalEdge = {
  id: string;
  from: string;
  to: string;
  relation: string;
  /** Synthesized confidence (causal + temporal + replay + ownership). */
  confidence: number;
  gapMs: number;
  causalRuleWeight: number;
  temporalWeight: number;
  replayConsistency: number;
  ownershipConsistency: number;
  decayStatus: TemporalDecayStatus;
  edgeClass?: 'observable' | 'latent_transition' | 'latent_evidence' | 'recovery';
  transitionProbability?: number;
  runtimeLearnedWeight?: number;
  learnedDelta?: number;
  stability?: number;
  replaySupport?: number;
  edgeStability?: 'stable' | 'unstable' | 'learned_high';
};

export type CausalAnomalyAttribution = {
  anomalyId: string;
  summaryJa: string;
  primaryCause: CausalEventKind;
  primaryNodeId: string;
  secondaryCascade: CausalEventKind[];
  confidence: number;
};

export type RuntimeCausalGraph = {
  version: string;
  builtAt: string;
  nodes: CausalEventNode[];
  edges: CausalEdge[];
  rootCauseChain: string[];
  cascadeNodeIds: string[];
  rootNodeId: string | null;
  rootCauseKind: CausalEventKind | null;
  confidenceScore: number;
  anomalyAttributions: CausalAnomalyAttribution[];
  latentCriticalChain?: import('./runtimeLatentStateInference').LatentRuntimeStateKind[];
  latentRootChain?: import('./runtimeLatentStateInference').LatentRuntimeStateKind[];
  latentChainConfidence?: number;
  latentRecoveries?: import('./hierarchicalLatentRuntimeGraph').LatentRecoveryEvent[];
};

export type RuntimeCausalGraphInput = {
  reconnectTimeline: RedmiLongSoakExport['boundaryValidation']['reconnectTimeline'];
  websocketOwnership: RedmiLongSoakExport['boundaryValidation']['websocketOwnership'];
  boundaryTrace: RedmiLongSoakExport['boundaryValidation']['recentBoundaryTrace'];
  lifecycleTimeline: RedmiLongSoakExport['boundaryValidation']['lifecycleTimeline'];
  failureTimeline: RedmiLongSoakExport['failureTimeline'];
  checkpoints: RedmiLongSoakExport['checkpoints'];
  miui: RedmiLongSoakExport['anomalyReplaySnapshot']['miui'];
  reconnectTrace?: RedmiLongSoakExport['anomalyReplaySnapshot']['reconnectTrace'];
  stabilityAnomalies?: { kind: string; summaryJa: string; at?: string }[];
};

import type { LatentStateInferenceResult } from './runtimeLatentStateInference';
import type { HierarchicalLatentRuntimeGraph } from './hierarchicalLatentRuntimeGraph';

import type { AdaptiveRuntimeReport } from './adaptiveRuntimeLearning';
import type { AdaptiveGovernanceReport } from './adaptiveRuntimeGovernance';

export type RuntimeCausalGraphBundle = {
  graph: RuntimeCausalGraph;
  latentInference: LatentStateInferenceResult;
  hierarchicalLatent: HierarchicalLatentRuntimeGraph;
  adaptiveReport?: AdaptiveRuntimeReport;
  governanceReport?: AdaptiveGovernanceReport;
  mermaid: string;
  markdown: string;
  json: string;
};
