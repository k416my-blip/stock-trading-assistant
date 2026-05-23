/**
 * Mock 7d/30d adaptive governance simulation for verification.
 */
import { buildRuntimeCausalGraphWithAdaptive } from '../analysis/runtimeCausalGraphAdaptive';
import { createAdaptiveRuntimeContext } from '../analysis/adaptiveRuntimeLearningEngine';
import { resetAdaptiveLearningStoreForTest } from '../analysis/adaptiveRuntimeLearningStorage';
import { resetAdaptiveGovernanceForTest, runAdaptiveGovernance } from './adaptiveRuntimeGovernance';
import { resetSessionOverfitGuardForTest } from './sessionOverfitGuard';
import { resetDeviceScopedStoresForTest } from './deviceBiasIsolation';
import { resetRollbackSystemForTest } from './adaptiveRollbackSystem';
import type { RuntimeCausalGraphInput } from '../../types/runtimeCausalGraph';
import type { DriftPhase } from '../../types/adaptiveRuntimeGovernance';

function simInput(seed: number): RuntimeCausalGraphInput {
  const t0 = `2026-01-${String((seed % 28) + 1).padStart(2, '0')}T10:00:00.000Z`;
  return {
    reconnectTimeline: [
      {
        at: t0,
        phase: 'schedule',
        delayMs: seed % 3,
        allowed: true,
        token: `t-${seed}`,
        detailJa: 'sim',
      },
    ],
    websocketOwnership: seed % 5 === 0
      ? [
          {
            reconnectUuid: `u-${seed}`,
            owner: 'js_coordinator',
            source: 'kernel_policy',
            scheduledAt: t0,
            duplicate: true,
          },
        ]
      : [],
    boundaryTrace: [{ at: t0, kind: 'telemetry_burst', detailJa: 'sim', native: false }],
    lifecycleTimeline: [
      { at: t0, kind: 'trim_memory', detailJa: 'trim', native: true },
      { at: t0, kind: 'foreground', detailJa: 'fg', native: false },
    ],
    failureTimeline: [],
    checkpoints: [],
    miui: {
      backgroundDurationMs: seed * 100,
      resumeLatencyMs: 2000 + (seed % 4) * 800,
      silentDisconnectCount: seed % 3,
      timerDriftMs: 1500 + seed * 50,
      lastResumeAt: Date.parse(t0),
    },
  };
}

export type GovernanceSimulationResult = {
  days: number;
  ticks: number;
  driftAccumulation: number;
  replayInstability: number;
  falseCausalPersistence: number;
  rollbackSuccess: boolean;
  deviceContamination: number;
  staleOptimizationGrowth: number;
  initialEdgeCount: number;
  finalEdgeCount: number;
  finalPhase: DriftPhase;
};

export function simulateAdaptiveGovernanceHorizon(opts: {
  days: number;
  deviceModel: string;
}): GovernanceSimulationResult {
  resetAdaptiveLearningStoreForTest();
  resetAdaptiveGovernanceForTest();
  resetSessionOverfitGuardForTest();
  resetDeviceScopedStoresForTest();
  resetRollbackSystemForTest();

  const ctx = createAdaptiveRuntimeContext(opts.deviceModel);
  const ticks = opts.days === 30 ? 48 : 24;
  let maxDrift = 0;
  let replayFlip = 0;
  let prevRoot: string | null = null;
  let finalPhase: DriftPhase = 'DRIFT_STABLE';
  let contamination = 0;

  const initialEdgeCount = Object.keys(ctx.store.edges).length;

  for (let i = 0; i < ticks; i += 1) {
    const bundle = buildRuntimeCausalGraphWithAdaptive(simInput(i), { adaptive: ctx });
    const gov = bundle.governanceReport ?? runAdaptiveGovernance(ctx, {
      graph: bundle.graph,
      latentChain: bundle.hierarchicalLatent.criticalLatentChain,
      deviceProfile: ctx.deviceProfile,
      sessionElapsedMs: (i + 1) * 3_600_000,
      previousRootKind: prevRoot,
      rootKind: bundle.graph.rootCauseKind,
    });
    maxDrift = Math.max(maxDrift, gov.drift.driftScore);
    replayFlip += prevRoot && bundle.graph.rootCauseKind !== prevRoot ? 1 : 0;
    prevRoot = bundle.graph.rootCauseKind;
    finalPhase = gov.drift.phase;
    contamination = gov.dashboard.crossDeviceContaminationRisk;
  }

  const finalEdgeCount = Object.keys(ctx.store.edges).length;
  const fpCount = ctx.store.falsePositives.length;

  return {
    days: opts.days,
    ticks,
    driftAccumulation: maxDrift,
    replayInstability: replayFlip / Math.max(1, ticks),
    falseCausalPersistence: fpCount / Math.max(1, ticks),
    rollbackSuccess: finalPhase !== 'DRIFT_CRITICAL' || maxDrift < 0.9,
    deviceContamination: contamination,
    staleOptimizationGrowth: Math.max(0, finalEdgeCount - initialEdgeCount),
    initialEdgeCount,
    finalEdgeCount,
    finalPhase,
  };
}
