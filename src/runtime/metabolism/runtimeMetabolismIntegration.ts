/**
 * Runtime Metabolism & Cognitive GC — integration facade.
 */
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { RedmiMetabolismReport, RuntimeMetabolismBundle } from '../../types/runtimeMetabolism';
import { RUNTIME_METABOLISM_VERSION, REDMI_NOTE_13_PRO_5G } from '../../constants/runtimeMetabolism';
import { getAdaptiveLearningStore } from '../analysis/adaptiveRuntimeLearningStorage';
import { computeMemoryNutritionScore } from './memoryNutritionScore';
import { computeRuntimeCalorieFormula, getRuntimeCalorieUsed } from './runtimeCalorieBudget';
import { decayObsoleteReplays } from './obsoleteReplayDecay';
import { cremateStaleEdges } from './staleEdgeCremation';
import { detectFossilizedRollback } from './fossilizedRollbackDetection';
import { runEntropyDetox } from './entropyDetox';
import { applyAdaptiveForgetting } from './adaptiveForgetting';
import { collectCognitiveGarbage } from './cognitiveGarbageCollector';
import { buryDormantGraphNodes } from './dormantGraphBurial';
import { recordHeapEcologySample, computeHeapEcologyScore } from './longTermHeapEcology';
import { assessSelfHealingAddictionRisk } from './selfHealingAddictionGuard';
import { isolateToxicMemories } from './toxicMemoryIsolation';
import { computeMetabolicHealth } from './metabolicHealthScore';
import { buildMetabolismDashboard } from './metabolismDashboard';
import {
  getMetabolismStorageStats,
  getAuditTrail,
  getLastGcAt,
  resetMetabolismStorageForTest,
  recoverTombstoneEdge,
} from './metabolismStorage';
import { runMetabolismEnginePass } from './runtimeMetabolismEngine';
import { noteSelfHealingPassForMetabolism } from './metabolismStorage';
import { resetHeapEcologyForTest } from './longTermHeapEcology';
import { resetCalorieBudgetForTest } from './runtimeCalorieBudget';

let lastBundle: RuntimeMetabolismBundle | null = null;

export function resetRuntimeMetabolismForTest(): void {
  lastBundle = null;
  resetMetabolismStorageForTest();
  resetHeapEcologyForTest();
  resetCalorieBudgetForTest();
}

export function getLastMetabolismBundle(): RuntimeMetabolismBundle | null {
  return lastBundle;
}

export function tickRuntimeMetabolism(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RuntimeMetabolismBundle | null {
  if (!performance.appForeground && performance.offlineMode) {
    return null;
  }

  const store = getAdaptiveLearningStore('redmi');
  recordHeapEcologySample(metrics);
  computeRuntimeCalorieFormula(metrics);

  let obsoleteReplayCount = 0;
  let staleEdgeCount = 0;
  let entropyDetoxScore = 1;
  let fossilizedRollbackRisk = 0;
  let buriedGraphNodes = 0;

  const ctx = runMetabolismEnginePass(store, metrics, performance, {
    runGc: (redmiCtx) => {
      const replay = decayObsoleteReplays(store, Date.now(), redmiCtx.tombstoneOnly);
      obsoleteReplayCount = replay.archived;

      if (!redmiCtx.lightOnly) {
        const crem = cremateStaleEdges(store, redmiCtx.tombstoneOnly);
        staleEdgeCount = crem.tombstoned;
        const fossil = detectFossilizedRollback();
        fossilizedRollbackRisk = fossil.fossilizedRollbackRisk;
        const detox = runEntropyDetox(store);
        entropyDetoxScore = detox.detoxScore;
        isolateToxicMemories(store);
        const buried = buryDormantGraphNodes(store);
        buriedGraphNodes = buried.buried;
      } else {
        cremateStaleEdges(store, true);
        collectCognitiveGarbage(store, true);
      }

      const nutrition = computeMemoryNutritionScore(store);
      applyAdaptiveForgetting(store, nutrition);
      collectCognitiveGarbage(store, redmiCtx.lightOnly);
    },
  });

  const stats = getMetabolismStorageStats();
  const memoryNutritionScore = computeMemoryNutritionScore(store);
  const heapEcologyScore = computeHeapEcologyScore(ctx.sessionMinutes);
  const selfHealingAddictionRisk = assessSelfHealingAddictionRisk();
  const tombstoneRatio = stats.tombstoneCount / Math.max(1, Object.keys(store.edges).length);

  const metabolicHealth = computeMetabolicHealth({
    memoryNutritionScore,
    heapEcologyScore,
    entropyDetoxScore,
    fossilizedRollbackRisk,
    selfHealingAddictionRisk,
    tombstoneRatio,
  });

  const bundle: RuntimeMetabolismBundle = {
    version: RUNTIME_METABOLISM_VERSION,
    builtAt: new Date().toISOString(),
    dashboard: buildMetabolismDashboard({
      metabolicHealth,
      memoryNutritionScore,
      obsoleteReplayCount,
      staleEdgeCount,
      buriedGraphNodes: stats.buriedGraphNodes,
      replayCemeterySize: stats.replayCemeterySize,
      entropyDetoxScore,
      fossilizedRollbackRisk,
      selfHealingAddictionRisk,
      runtimeCalorieUsed: getRuntimeCalorieUsed(),
      heapEcologyScore,
      toxicMemoryCount: stats.toxicMemoryCount,
      lastGcAt: getLastGcAt(),
      nextGcReason: ctx.nextGcReason,
      gcMode: ctx.gcMode,
    }),
    auditTrail: getAuditTrail(),
    tombstoneCount: stats.tombstoneCount,
    recoveredAvailable: stats.tombstoneCount > 0,
  };

  lastBundle = bundle;
  return bundle;
}

export function recoverFromTombstone(edgeKey: string): boolean {
  return recoverTombstoneEdge(edgeKey);
}

export function buildRedmiNote13ProMetabolismReport(bundle: RuntimeMetabolismBundle): RedmiMetabolismReport {
  return {
    deviceModel: REDMI_NOTE_13_PRO_5G,
    metabolicHealth: bundle.dashboard.metabolicHealth,
    memoryNutritionScore: bundle.dashboard.memoryNutritionScore,
    heapEcologyScore: bundle.dashboard.heapEcologyScore,
    gcMode: bundle.dashboard.gcMode,
    summaryJa: `Redmi metabolism: health=${bundle.dashboard.metabolicHealth} nutrition=${bundle.dashboard.memoryNutritionScore.toFixed(2)} mode=${bundle.dashboard.gcMode}`,
  };
}

export { noteSelfHealingPassForMetabolism };
