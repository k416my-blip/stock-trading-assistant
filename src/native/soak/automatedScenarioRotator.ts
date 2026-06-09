import type { AutomatedSoakScenarioId } from '../../types/automatedSoakRunner';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../../types/automatedSoakRunner';
import { SOAK_SCENARIO_ROTATE_MS } from '../../constants/automatedSoakRunner';
import { recordSoakTimeline } from './sessionTimelineRecorder';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';

let index = 0;
let scenarioStartedAt = 0;
let current: AutomatedSoakScenarioId = AUTOMATED_SOAK_SCENARIO_IDS[0];

export function resetAutomatedScenarioRotatorForTest(): void {
  index = 0;
  scenarioStartedAt = 0;
  current = AUTOMATED_SOAK_SCENARIO_IDS[0];
}

export function getCurrentSoakScenario(): AutomatedSoakScenarioId {
  return current;
}

function rotateIfNeeded(now: number): void {
  if (scenarioStartedAt === 0) {
    scenarioStartedAt = now;
    recordSoakTimeline('scenario_start', `scenario ${current}`, current);
    return;
  }
  if (now - scenarioStartedAt < SOAK_SCENARIO_ROTATE_MS) return;
  recordSoakTimeline('scenario_end', `scenario ${current} complete`, current);
  index = (index + 1) % AUTOMATED_SOAK_SCENARIO_IDS.length;
  current = AUTOMATED_SOAK_SCENARIO_IDS[index];
  scenarioStartedAt = now;
  recordSoakTimeline('scenario_start', `scenario ${current}`, current);
}

export async function tickAutomatedScenarioRotator(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): Promise<string> {
  const now = Date.now();
  rotateIfNeeded(now);

  switch (current) {
    case 'foreground_background': {
      const { runForegroundBackgroundOscillatorStep } = await import('./foregroundBackgroundOscillator');
      return runForegroundBackgroundOscillatorStep();
    }
    case 'websocket_disconnect': {
      const { runWebSocketDisconnectSimulatorStep } = await import('./websocketDisconnectSimulator');
      return runWebSocketDisconnectSimulatorStep();
    }
    case 'thermal_stress': {
      const { runThermalStressScenarioStep } = await import('./thermalStressScenario');
      return runThermalStressScenarioStep(metrics.thermalState);
    }
    case 'battery_saver': {
      const { runBatterySaverScenarioStep } = await import('./batterySaverScenario');
      return runBatterySaverScenarioStep(performance.batterySaverActive);
    }
    case 'memory_pressure': {
      const { runMemoryPressureScenarioStep } = await import('./memoryPressureScenario');
      return runMemoryPressureScenarioStep();
    }
    case 'async_flood': {
      const { runAsyncFloodScenarioStep } = await import('./asyncFloodScenario');
      return runAsyncFloodScenarioStep(metrics.asyncQueueDepth);
    }
    case 'replay_flood': {
      const { runReplayFloodScenarioStep } = await import('./replayFloodScenario');
      return runReplayFloodScenarioStep();
    }
    case 'dashboard_render_storm': {
      const { runDashboardRenderStormScenarioStep } = await import('./dashboardRenderStormScenario');
      return runDashboardRenderStormScenarioStep();
    }
    case 'native_kill_recovery': {
      const { runNativeKillRecoveryScenarioStep } = await import('./nativeKillRecoveryScenario');
      return runNativeKillRecoveryScenarioStep();
    }
    case 'android_lifecycle_stress': {
      const { runAndroidLifecycleStressObserveStep } = await import('./androidLifecycleStressRunner');
      return runAndroidLifecycleStressObserveStep();
    }
    case 'runtime_self_recursion_endurance':
    case 'runtime_telemetry_entropy':
    case 'runtime_cognitive_governance':
    case 'runtime_civilization_topology':
    case 'runtime_meta_limit_governance':
    case 'runtime_federation_governance':
    case 'runtime_ontology_stabilization':
    case 'runtime_finite_boundary':
    case 'runtime_semantic_compression':
    case 'runtime_semantic_gravity':
    case 'runtime_semantic_thermodynamics':
    case 'runtime_semantic_phase_transition':
    case 'runtime_adaptive_observation':
    case 'runtime_observer_reality_selection':
    case 'runtime_inter_civilization_resonance':
    case 'runtime_governance_freeze':
      return 'archived diagnostic scenario';
    default:
      return 'idle';
  }
}
