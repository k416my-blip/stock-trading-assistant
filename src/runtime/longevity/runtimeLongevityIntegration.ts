/**
 * Runtime Longevity & Entropy Collapse Prevention — integration facade.
 */
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { RuntimeLongevityBundle } from '../../types/runtimeLongevity';
import { RUNTIME_LONGEVITY_VERSION, REDMI_NOTE_13_PRO_5G } from '../../constants/runtimeLongevity';
import { getRuntimeDeterministicSeed } from '../unified/runtimeClockAuthority';
import { runLongevityEnginePass } from './runtimeLongevityEngine';
import { resetLongevityStorageForTest, getProductionMutationsBlocked } from './longevityStorage';
import { resetThermalAgingForTest } from './thermalAgingMonitor';
import { appendRuntimeJournalEvent } from '../observability/runtimeEventJournal';

let lastBundle: RuntimeLongevityBundle | null = null;

export function resetRuntimeLongevityForTest(): void {
  lastBundle = null;
  resetLongevityStorageForTest();
  resetThermalAgingForTest();
}

export function getLastLongevityBundle(): RuntimeLongevityBundle | null {
  return lastBundle;
}

export function tickRuntimeLongevity(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RuntimeLongevityBundle | null {
  const seed = getRuntimeDeterministicSeed();
  const { dashboard, actionsJa, mode } = runLongevityEnginePass(metrics, performance, seed);

  if (mode === 'stopped') return null;

  const bundle: RuntimeLongevityBundle = {
    version: RUNTIME_LONGEVITY_VERSION,
    builtAt: new Date().toISOString(),
    dashboard,
    actionsJa,
    productionMutationsBlocked: getProductionMutationsBlocked(),
  };

  lastBundle = bundle;
  appendRuntimeJournalEvent(
    'snapshot_captured',
    `longevity ${mode} state=${dashboard.longevityState} entropy=${dashboard.entropyHealth}`,
    { tag: 'longevity', v1: dashboard.entropyHealth },
  );
  return bundle;
}

export function buildRedmiNote13ProLongevityReport(bundle: RuntimeLongevityBundle): {
  deviceModel: string;
  longTermSurvival: number;
  summaryJa: string;
} {
  return {
    deviceModel: REDMI_NOTE_13_PRO_5G,
    longTermSurvival: bundle.dashboard.longTermSurvival,
    summaryJa: `Redmi longevity: ${bundle.dashboard.longevityState} survival=${bundle.dashboard.longTermSurvival.toFixed(2)} entropy=${bundle.dashboard.entropyHealth}`,
  };
}
