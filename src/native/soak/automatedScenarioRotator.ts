import type { AutomatedSoakScenarioId } from '../../types/automatedSoakRunner';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../../types/automatedSoakRunner';
import { SOAK_SCENARIO_ROTATE_MS } from '../../constants/automatedSoakRunner';
import { recordSoakTimeline } from './sessionTimelineRecorder';
import { runForegroundBackgroundOscillatorStep } from './foregroundBackgroundOscillator';
import { runWebSocketDisconnectSimulatorStep } from './websocketDisconnectSimulator';
import { runThermalStressScenarioStep } from './thermalStressScenario';
import { runBatterySaverScenarioStep } from './batterySaverScenario';
import { runMemoryPressureScenarioStep } from './memoryPressureScenario';
import { runAsyncFloodScenarioStep } from './asyncFloodScenario';
import { runReplayFloodScenarioStep } from './replayFloodScenario';
import { runDashboardRenderStormScenarioStep } from './dashboardRenderStormScenario';
import { runNativeKillRecoveryScenarioStep } from './nativeKillRecoveryScenario';
import { runAndroidLifecycleStressObserveStep } from './androidLifecycleStressRunner';
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
    case 'foreground_background':
      return runForegroundBackgroundOscillatorStep();
    case 'websocket_disconnect':
      return runWebSocketDisconnectSimulatorStep();
    case 'thermal_stress':
      return runThermalStressScenarioStep(metrics.thermalState);
    case 'battery_saver':
      return runBatterySaverScenarioStep(performance.batterySaverActive);
    case 'memory_pressure':
      return runMemoryPressureScenarioStep();
    case 'async_flood':
      return runAsyncFloodScenarioStep(metrics.asyncQueueDepth);
    case 'replay_flood':
      return runReplayFloodScenarioStep();
    case 'dashboard_render_storm':
      return runDashboardRenderStormScenarioStep();
    case 'native_kill_recovery':
      return runNativeKillRecoveryScenarioStep();
    case 'android_lifecycle_stress':
      return runAndroidLifecycleStressObserveStep();
    default:
      return 'idle';
  }
}
