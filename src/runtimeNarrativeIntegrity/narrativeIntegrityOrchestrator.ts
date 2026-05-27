import type {
  NarrativeIntegrityTimelineEntry,
  RuntimeNarrativeIntegrityObserveInput,
} from '../types/runtimeNarrativeIntegrity';
import { scoreRuntimeNarrativeIntegrity } from './runtimeNarrativeIntegrityCoordinator';
import {
  buildRecursiveNarrativeGraph,
  scoreRecursiveNarrativeInflationRisk,
} from './recursiveNarrativeInflationModel';
import { scoreRuntimeSemanticDriftRisk } from './semanticDriftAccumulationEngine';
import { scoreExplanationLoopFixationRisk } from './explanationLoopFixationDetector';
import { scoreRuntimeNarrativeLockRisk } from './narrativeLockInTracker';
import { scoreCoherenceMythologyRisk } from './coherenceMythologyAnalyzer';
import { scoreStorylineSelfReinforcementRisk } from './storylineSelfReinforcementMonitor';
import {
  buildCrossLayerSemanticGraph,
  scoreCrossLayerSemanticConsistency,
} from './crossLayerSemanticConsistencyHarmonizer';
import {
  detectNarrativeDriftSignals,
  scoreRuntimeNarrativeDriftRisk,
} from './longSessionNarrativeDriftEngine';
import {
  scoreInterpretationPersistence,
  scoreNarrativeRigidity,
  scoreSemanticInflation,
  scoreSemanticVariance,
  scoreStorylineRecursion,
} from './runtimeNarrativeEvolutionCoordinator';
import { analyzeSemanticVariance } from './semanticVarianceAnalyzer';
import { trackStorylineRecursion } from './storylineRecursionTracker';
import { analyzeInterpretationPersistence } from './interpretationPersistenceAnalyzer';
import { detectCoherenceMythology } from './coherenceMythologyDetector';
import { detectNarrativeRigidity } from './narrativeRigidityDetector';
import { monitorSemanticInflation } from './semanticInflationMonitor';
import { scoreSemanticHallucinationPersistence } from './semanticHallucinationPersistenceDetector';
import { monitorExplanationRecursion } from './explanationRecursionMonitor';
import { scoreRuntimeNarrativeConfidence } from './narrativeConfidenceEngine';
import { registerNarrativeSignals } from './narrativeSignalRegistry';
import { recordNarrativeIntegrityTimeline } from './narrativeIntegrityTimeline';

export type NarrativeIntegrityFlowResult = {
  flow: NarrativeIntegrityTimelineEntry['flow'];
  detailJa: string;
};

export function runNarrativeIntegrityFlowFlow(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult {
  void scoreRuntimeNarrativeConfidence(input);
  void scoreSemanticHallucinationPersistence(input);
  return {
    flow: 'narrative_integrity_flow',
    detailJa: `narrative ${scoreRuntimeNarrativeIntegrity(input)} · meta ${input.runtimeMetaCognitionScore}`,
  };
}

export function runRecursiveNarrativeInflationFlow(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult {
  void buildRecursiveNarrativeGraph(input);
  void monitorExplanationRecursion(input);
  return {
    flow: 'recursive_narrative_inflation',
    detailJa: `inflation ${scoreRecursiveNarrativeInflationRisk(input)} · audit ${input.runtimeAuditCoverage}`,
  };
}

export function runSemanticDriftAccumulationFlow(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult {
  void monitorSemanticInflation(input);
  return {
    flow: 'semantic_drift_accumulation',
    detailJa: `drift ${scoreRuntimeSemanticDriftRisk(input)} · epistemic ${input.runtimeEpistemicDriftRisk}`,
  };
}

export function runExplanationLoopFixationFlow(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult {
  void analyzeInterpretationPersistence(input);
  return {
    flow: 'explanation_loop_fixation',
    detailJa: `fixation ${scoreExplanationLoopFixationRisk(input)} · coherence ${input.runtimeStrategicCoherence}`,
  };
}

export function runNarrativeLockInFlow(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult {
  void detectNarrativeRigidity(input);
  return {
    flow: 'narrative_lock_in',
    detailJa: `lock ${scoreRuntimeNarrativeLockRisk(input)} · worldview ${input.runtimeWorldviewLockRisk}`,
  };
}

export function runCoherenceMythologyFlow(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult {
  void detectCoherenceMythology(input);
  return {
    flow: 'coherence_mythology',
    detailJa: `mythology ${scoreCoherenceMythologyRisk(input)} · ideology ${input.runtimeStabilityIdeologyRisk}`,
  };
}

export function runStorylineSelfReinforcementFlow(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult {
  void trackStorylineRecursion(input);
  return {
    flow: 'storyline_self_reinforcement',
    detailJa: `reinforcement ${scoreStorylineSelfReinforcementRisk(input)} · belief ${input.recursiveBeliefReinforcementRisk}`,
  };
}

export function runCrossLayerSemanticConsistencyFlow(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult {
  void buildCrossLayerSemanticGraph(input);
  void analyzeSemanticVariance(input);
  return {
    flow: 'cross_layer_semantic_consistency',
    detailJa: `consistency ${scoreCrossLayerSemanticConsistency(input)} · variance ${scoreSemanticVariance(input)}`,
  };
}

export function runLongSessionNarrativeDriftFlow(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult {
  void registerNarrativeSignals(input);
  const signals = detectNarrativeDriftSignals(input);
  return {
    flow: 'long_session_narrative_drift',
    detailJa:
      signals.length > 0
        ? signals.join(' · ')
        : `session ${input.sessionMinutes}min · drift ${scoreRuntimeNarrativeDriftRisk(input)}`,
  };
}

export function runNarrativeEvolutionFlow(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult {
  void scoreNarrativeRigidity(input);
  return {
    flow: 'narrative_evolution',
    detailJa: `rigidity ${scoreNarrativeRigidity(input)} · recursion ${scoreStorylineRecursion(input)} · persistence ${scoreInterpretationPersistence(input)} · inflation ${scoreSemanticInflation(input)}`,
  };
}

export function runNarrativeIntegrityFlows(
  input: RuntimeNarrativeIntegrityObserveInput,
): NarrativeIntegrityFlowResult[] {
  const results = [
    runNarrativeIntegrityFlowFlow(input),
    runRecursiveNarrativeInflationFlow(input),
    runSemanticDriftAccumulationFlow(input),
    runExplanationLoopFixationFlow(input),
    runNarrativeLockInFlow(input),
    runCoherenceMythologyFlow(input),
    runStorylineSelfReinforcementFlow(input),
    runCrossLayerSemanticConsistencyFlow(input),
    runLongSessionNarrativeDriftFlow(input),
    runNarrativeEvolutionFlow(input),
  ];
  for (const r of results) recordNarrativeIntegrityTimeline(r.flow, r.detailJa);
  return results;
}
