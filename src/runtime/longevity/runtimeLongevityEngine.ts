/**
 * Runtime Longevity Engine — long-session ecology coordinator.
 */
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { LongevityDashboard } from '../../types/runtimeLongevity';
import { FORBIDDEN_LONGEVITY_ACTIONS, SESSION_DASHBOARD_COMPRESS_MIN, SESSION_HEAP_ECOLOGY_LITE_MIN } from '../../constants/runtimeLongevity';
import { getAdaptiveLearningStore } from '../analysis/adaptiveRuntimeLearningStorage';
import { measureAdaptiveEntropy } from '../evolution/adaptiveEntropyEngine';
import { getSessionMinutes } from '../../services/longSessionStability';
import { isThermalSevere } from '../unified/thermalAuthorityLayer';
import { isSafeModeActive } from '../unified/safeModeRuntime';
import { getExplorationCemetery } from '../curiosity/explorationCemetery';
import { getExplanationCacheSize } from '../../services/explanationStormGuard';
import { assessEntropyHealth } from './entropyCollapseDetector';
import { detectReplayCivilization } from './replayCivilizationBreaker';
import { detectFossilizedState } from './fossilizedStateDetector';
import { assessCuriosityFatigue, buildFatigueRecoveryActions } from './curiosityFatigueRecovery';
import { computeMutationDiversity, preserveMutationDiversity } from './mutationDiversityPreserver';
import { balanceLongTermEntropy } from './longTermEntropyBalancer';
import { manageReplayEcology, scoreReplayEcology } from './replayEcologyManager';
import { cleanAsyncFragmentation } from './asyncFragmentationCleaner';
import { stabilizeHeapEcology } from './heapEcologyStabilizer';
import { cremateZombieCaches } from './zombieCacheCrematorium';
import { reduceDashboardPressure } from './dashboardPressureReducer';
import { monitorDeterministicDrift } from './deterministicDriftMonitor';
import { detectGovernanceOssification } from './governanceOssificationDetector';
import { breakRecoveryRitual } from './recoveryRitualBreaker';
import { trimLongTailMemory } from './longTailMemoryTrimmer';
import { runCivilizationSimulationSuite } from './runtimeCivilizationSimulator';
import { monitorThermalAging } from './thermalAgingMonitor';
import { restoreTickEntropy } from './tickEntropyRestorer';
import { runReplayDecayEcology } from './replayDecayEcology';
import { manageMutationCemetery } from './mutationCemeteryManager';
import { respawnSandboxCuriosity } from './curiosityRespawnEngine';
import { maybeGenerateEntropyPulse } from './entropyPulseGenerator';
import { predictLongTermSurvival } from './longTermSurvivalPredictor';
import { triggerRuntimeImmuneResponse, computeRuntimeImmunity } from './runtimeImmuneSystem';
import { cleanCognitivePlaque } from './cognitivePlaqueCleaner';
import { preventRuntimeCrust } from './runtimeAntiCrustLayer';
import { isInEntropySafeZone } from './entropySafeZone';
import { computeEcologyPressure } from './longTermAdaptiveEcology';
import { transitionLongevityState } from './longevityStateMachine';
import { noteRootTick, setLastEntropyScore, isQuarantineActive, isEntropyPulseActive } from './longevityStorage';
import { computeNoveltyPressure } from '../curiosity/noveltyPressureScore';

export type RedmiLongevityMode = 'stopped' | 'lightweight' | 'replay_decay_only' | 'full' | 'frozen';

export function resolveRedmiLongevityMode(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RedmiLongevityMode {
  if (!performance.appForeground) return 'stopped';
  if (performance.batterySaverActive || metrics.native.batterySaverActive) return 'replay_decay_only';
  if (isThermalSevere()) return 'frozen';
  if (isSafeModeActive()) return 'stopped';
  return 'lightweight';
}

export function auditLongevityAction(detailJa: string): boolean {
  const blob = detailJa.toLowerCase().replace(/[\s_-]/g, '');
  return !FORBIDDEN_LONGEVITY_ACTIONS.some((f) => blob.includes(f.replace(/_/g, '')));
}

export function runLongevityEnginePass(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
  seed: number,
): { dashboard: LongevityDashboard; actionsJa: string[]; mode: RedmiLongevityMode } {
  const mode = resolveRedmiLongevityMode(metrics, performance);
  const actionsJa: string[] = [];
  const store = getAdaptiveLearningStore('redmi');
  const sessionMinutes = getSessionMinutes();
  const liteHeap = sessionMinutes >= SESSION_HEAP_ECOLOGY_LITE_MIN;
  const compressDash = sessionMinutes >= SESSION_DASHBOARD_COMPRESS_MIN;

  let entropyScore = measureAdaptiveEntropy(store).entropyScore;
  setLastEntropyScore(entropyScore);

  const emptyDashboard: LongevityDashboard = {
    entropyHealth: 50,
    replayCivilizationRisk: 0,
    fossilizationRisk: 0,
    curiosityFatigue: 0,
    heapEcology: 0.5,
    entropyPulse: false,
    deterministicDrift: 0,
    mutationDiversity: 0.5,
    replayEcology: 0.5,
    runtimeImmunity: 0.5,
    zombieCacheRatio: 0,
    cognitivePlaque: 0,
    thermalAging: 0,
    longTermSurvival: 0.5,
    entropySafeZone: true,
    ecologyPressure: 0,
    longevityState: 'HEALTHY',
    longevityMode: mode,
  };

  if (mode === 'stopped') return { dashboard: emptyDashboard, actionsJa, mode };

  if (mode === 'replay_decay_only') {
    const decay = runReplayDecayEcology(0.88);
    actionsJa.push(`replay_decay:${decay.decayed}`);
    emptyDashboard.longevityState = 'STABLE';
    return { dashboard: emptyDashboard, actionsJa, mode };
  }

  if (mode === 'frozen') {
    emptyDashboard.longevityState = 'IMMUNE_RESPONSE';
    return { dashboard: emptyDashboard, actionsJa, mode };
  }

  const entropy = assessEntropyHealth(entropyScore);
  const civilization = detectReplayCivilization(store);
  const fossil = detectFossilizedState(store);
  const novelty = computeNoveltyPressure(store);
  const fatigue = assessCuriosityFatigue({
    replayCount: store.replayCount,
    noveltyPressure: novelty.noveltyPressure,
    sandboxReplayHeavy: getExplorationCemetery().length > 12,
  });
  const heap = stabilizeHeapEcology(metrics, sessionMinutes, liteHeap);
  const drift = monitorDeterministicDrift(seed % 1000);
  const mutationDiversity = computeMutationDiversity();
  const ecology = manageReplayEcology(seed, entropyScore);
  const immunity = computeRuntimeImmunity(isQuarantineActive(), entropy.collapseRisk);
  const zombie = cremateZombieCaches(getExplanationCacheSize(), metrics.jsHeapEstimateMb);
  const plaque = cleanCognitivePlaque(store);
  const thermalAging = monitorThermalAging();
  const ecologyPressure = computeEcologyPressure(store, entropyScore, metrics.asyncQueueDepth);

  noteRootTick(
    Object.entries(store.rootRankingHistory).sort((a, b) => b[1].count - a[1].count)[0]?.[0] ?? null,
    seed % 4 === 0,
  );

  if (auditLongevityAction('longevity_pass')) {
    cleanAsyncFragmentation(metrics);
    trimLongTailMemory(store);
    breakRecoveryRitual(store);
    detectGovernanceOssification();
    const balance = balanceLongTermEntropy(entropyScore);
    entropyScore = restoreTickEntropy(entropyScore, balance.targetBias);
    preserveMutationDiversity(seed);
    preventRuntimeCrust(store, seed);
    reduceDashboardPressure({ sessionMinutes, asyncQueueDepth: metrics.asyncQueueDepth, compressStrong: compressDash });
    manageMutationCemetery(`lineage-${seed % 5}`);
    runReplayDecayEcology(0.94);
    runCivilizationSimulationSuite(store, entropyScore);
  }

  let pulse = false;
  if (!isThermalSevere() && entropyScore < 0.25) {
    const p = maybeGenerateEntropyPulse(entropyScore);
    pulse = p.pulse;
    actionsJa.push(...p.actionsJa);
    if (pulse) respawnSandboxCuriosity(seed);
  }

  if (civilization.isCivilization || fossil.isFossilized || entropy.collapseRisk >= 0.85) {
    const immune = triggerRuntimeImmuneResponse('civilization or fossil or collapse');
    actionsJa.push(...immune.actionsJa);
  }

  actionsJa.push(...buildFatigueRecoveryActions(fatigue.curiosityFatigue));

  const longevityState = transitionLongevityState({
    entropyCollapse: entropy.collapseRisk,
    civilization: civilization.isCivilization,
    fossilized: fossil.isFossilized,
    quarantine: isQuarantineActive(),
    safeMode: isSafeModeActive(),
  });

  const dashboard: LongevityDashboard = {
    entropyHealth: entropy.entropyHealth,
    replayCivilizationRisk: civilization.replayCivilizationRisk,
    fossilizationRisk: fossil.fossilizationRisk,
    curiosityFatigue: fatigue.curiosityFatigue,
    heapEcology: heap.heapEcology,
    entropyPulse: pulse || isEntropyPulseActive(),
    deterministicDrift: drift.deterministicDrift,
    mutationDiversity,
    replayEcology: scoreReplayEcology() || ecology / 64,
    runtimeImmunity: immunity,
    zombieCacheRatio: zombie.zombieCacheRatio,
    cognitivePlaque: plaque.plaqueScore,
    thermalAging,
    longTermSurvival: predictLongTermSurvival({
      entropyHealth: entropy.entropyHealth,
      civilizationRisk: civilization.replayCivilizationRisk,
      fossilRisk: fossil.fossilizationRisk,
      heapEcology: heap.heapEcology,
      immunity,
    }),
    entropySafeZone: isInEntropySafeZone(entropyScore),
    ecologyPressure,
    longevityState,
    longevityMode: mode,
  };

  return { dashboard, actionsJa, mode };
}
