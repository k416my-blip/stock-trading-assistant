/**
 * Runtime Curiosity & Controlled Mutation — integration facade.
 */
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { RuntimeCuriosityBundle } from '../../types/runtimeCuriosity';
import { RUNTIME_CURIOSITY_VERSION, REDMI_NOTE_13_PRO_5G } from '../../constants/runtimeCuriosity';
import { getAdaptiveLearningStore } from '../analysis/adaptiveRuntimeLearningStorage';
import { getLastGovernanceState } from '../governance/adaptiveRuntimeGovernance';
import { getConstitutionalDirectives } from '../constitution/runtimeConstitutionIntegration';
import { measureAdaptiveEntropy } from '../evolution/adaptiveEntropyEngine';
import { resolveRedmiCuriosityContext } from './runtimeCuriosityEngine';
import { computeNoveltyPressure } from './noveltyPressureScore';
import { detectReplayMonoculture } from './replayMonocultureDetector';
import { countMinorityEdges, minorityEdgeHealth } from './minorityEdgePreservation';
import { detectConsensusBias } from './consensusBiasDetector';
import { computeDiversityRetention } from './diversityPreservationEngine';
import { computeInnovationScore } from './runtimeInnovationScore';
import { computeEntropyBalance } from './entropyRebalancer';
import { assessDogmatismRisk } from './antiDogmatismEngine';
import { computeCuriosityHealth } from './curiosityHealthScore';
import { buildCuriosityDashboard } from './curiosityDashboard';
import { allocateCuriosityBudget, isCuriosityCooldownActive } from './curiosityBudget';
import {
  beginCuriosityTick,
  getCuriosityStorageStats,
  getDormantRevivalCount,
  getProductionMutationsBlocked,
  getSyntheticScenarioCount,
  noteCuriosityTickComplete,
  resetCuriosityStorageForTest,
  setLastCuriosityTickMsForTest,
} from './curiosityStorage';
import {
  getCuriosityProposals,
  resetCuriosityGovernanceBridgeForTest,
  submitCuriosityProposal,
} from './curiosityGovernanceBridge';
import { runSandboxMutation } from './controlledMutationSandbox';
import { runDeterministicSandboxReplay } from './sandboxEvolutionReplay';
import { attemptDormantPathRevival } from './dormantPathRevival';
import { incubateRarePaths } from './rarePathIncubator';
import { simulateAlternativeRecovery } from './alternativeRecoverySimulation';
import { injectControlledContradiction } from './controlledContradictionInjection';
import { generateSyntheticScenario } from './syntheticScenarioGenerator';
import { runCuriosityExplorationRecovery } from './curiosityExplorationRecoveryLayer';
import { runAntiFossilizationPass } from './antiFossilizationLayer';
import { assessRollbackAddictionRisk, runRollbackAddictionRecovery } from './rollbackAddictionRecovery';
import { computeCuriosityDecayFactor } from './adaptiveCuriosityDecay';
import {
  getCuriosityCooldownActive,
  isMutationOverheated,
  noteMutationHeat,
  resetMutationCoolingForTest,
  tickMutationCooling,
} from './mutationCoolingSystem';
import { runDiversitySimulationSuite } from './longTermDiversitySimulator';
import { getLastCuriosityTickMs } from './curiosityStorage';
import { appendRuntimeJournalEvent } from '../observability/runtimeEventJournal';

let lastBundle: RuntimeCuriosityBundle | null = null;

export function resetRuntimeCuriosityForTest(): void {
  lastBundle = null;
  resetCuriosityStorageForTest();
  resetCuriosityGovernanceBridgeForTest();
  resetMutationCoolingForTest();
}

export { setLastCuriosityTickMsForTest };

export function getLastCuriosityBundle(): RuntimeCuriosityBundle | null {
  return lastBundle;
}

export function tickRuntimeCuriosity(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RuntimeCuriosityBundle | null {
  const ctx = resolveRedmiCuriosityContext(metrics, performance);
  if (ctx.mode === 'stopped') return null;

  const store = getAdaptiveLearningStore('redmi');
  const gov = getLastGovernanceState();
  const driftScore = gov?.drift.driftScore ?? 0;
  const directives = getConstitutionalDirectives();
  const seed = Math.floor(Date.now() / 1000) % 10000;

  beginCuriosityTick();
  tickMutationCooling();

  const novelty = computeNoveltyPressure(store);
  const mono = detectReplayMonoculture(store);
  const consensus = detectConsensusBias(store);
  const diversityRetention = computeDiversityRetention(store, gov?.contradictions.length ?? 0);
  const innovationScore = computeInnovationScore(store);
  const { entropyBalance, boostExploration } = computeEntropyBalance(store, gov?.contradictions.length ?? 0);
  const dogma = assessDogmatismRisk(store);
  const rollbackRisk = assessRollbackAddictionRisk(store, driftScore);
  const minorityCount = countMinorityEdges(store);
  const minHealth = minorityEdgeHealth(store);
  const dormantCount = getDormantRevivalCount();
  const dormantHealth = Math.min(1, dormantCount / 10);
  const decay = computeCuriosityDecayFactor(metrics, dogma.fossilizationRisk, rollbackRisk);
  const budget = Math.round(allocateCuriosityBudget(ctx.mode) * decay);
  const stats = getCuriosityStorageStats();
  const cooldownTick = isCuriosityCooldownActive(Date.now(), getLastCuriosityTickMs());
  const cooldownHeat = getCuriosityCooldownActive(isMutationOverheated());

  if (ctx.allowSandbox && !cooldownTick && ctx.mode !== 'frozen' && ctx.mode !== 'deferred') {
    if (ctx.allowMutation && !isMutationOverheated()) {
      const prop = submitCuriosityProposal('sandbox_mutation', 'edge weight sandbox tweak', directives, true);
      if (prop.approvedForSandbox) {
        const mut = runSandboxMutation(store, 'edge_weight_tweak', prop.detailJa, seed);
        noteMutationHeat(mut.success);
      }
    }
    if (boostExploration) runCuriosityExplorationRecovery(store, seed, false);
    incubateRarePaths(store);
    if (ctx.allowMutation) {
      simulateAlternativeRecovery(store, seed);
      injectControlledContradiction(store, seed);
      attemptDormantPathRevival(store, seed);
      generateSyntheticScenario(store, seed);
      for (let i = 0; i < 3; i++) runDeterministicSandboxReplay(seed + i, `tick replay ${i}`);
      runRollbackAddictionRecovery(store, driftScore, seed);
      runAntiFossilizationPass(store, seed);
    }
    noteCuriosityTickComplete();
  }

  const curiosityHealth = computeCuriosityHealth({
    diversityRetention,
    innovationScore,
    minorityEdgeHealth: minHealth,
    dormantRevivalHealth: dormantHealth,
    entropyBalance,
    replayMonocultureRisk: mono.replayMonocultureRisk,
    fossilizationRisk: dogma.fossilizationRisk,
  });

  const dashboard = buildCuriosityDashboard({
    curiosityHealth,
    noveltyPressure: novelty.noveltyPressure,
    replayMonocultureRisk: mono.replayMonocultureRisk,
    rollbackAddictionRisk: rollbackRisk,
    minorityEdgeCount: minorityCount,
    dormantRevivalCount: dormantCount,
    explorationBudget: budget,
    mutationSandboxCount: stats.mutationSandboxCount,
    consensusBiasRisk: consensus.consensusBiasRisk,
    innovationScore,
    diversityRetention,
    fossilizationRisk: dogma.fossilizationRisk,
    entropyBalance,
    curiosityCooldown: cooldownTick || cooldownHeat,
    sandboxFailureRate: stats.sandboxFailureRate,
    syntheticScenarioCount: getSyntheticScenarioCount(),
    curiosityMode: ctx.mode,
  });

  const bundle: RuntimeCuriosityBundle = {
    version: RUNTIME_CURIOSITY_VERSION,
    builtAt: new Date().toISOString(),
    dashboard,
    proposalsCount: getCuriosityProposals().length,
    productionMutationsBlocked: getProductionMutationsBlocked(),
  };

  lastBundle = bundle;
  appendRuntimeJournalEvent(
    'snapshot_captured',
    `curiosity ${ctx.mode} health=${curiosityHealth} novelty=${novelty.noveltyPressure.toFixed(2)}`,
    { tag: 'curiosity', v1: curiosityHealth },
  );

  runDiversitySimulationSuite(store, driftScore);
  measureAdaptiveEntropy(store, gov?.contradictions.length ?? 0);

  return bundle;
}

export function buildRedmiNote13ProCuriosityReport(bundle: RuntimeCuriosityBundle): {
  deviceModel: string;
  curiosityHealth: number;
  noveltyPressure: number;
  summaryJa: string;
} {
  return {
    deviceModel: REDMI_NOTE_13_PRO_5G,
    curiosityHealth: bundle.dashboard.curiosityHealth,
    noveltyPressure: bundle.dashboard.noveltyPressure,
    summaryJa: `Redmi curiosity: mode=${bundle.dashboard.curiosityMode} health=${bundle.dashboard.curiosityHealth} mono=${bundle.dashboard.replayMonocultureRisk.toFixed(2)}`,
  };
}
