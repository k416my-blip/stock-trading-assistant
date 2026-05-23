import { noteAppBackground, noteAppForeground } from '../../runtime/stability/miuiBatteryDiagnostics';
import { beginRecovery, completeRecovery } from './recoveryTimeTracker';
import { recordSoakTimeline } from './sessionTimelineRecorder';

let phase: 'fg' | 'bg' = 'fg';
let step = 0;

export function resetForegroundBackgroundOscillatorForTest(): void {
  phase = 'fg';
  step = 0;
}

/** Telemetry-only oscillation signals (does not change AppState). */
export function runForegroundBackgroundOscillatorStep(): string {
  step += 1;
  if (phase === 'fg') {
    phase = 'bg';
    noteAppBackground();
    beginRecovery('background');
    recordSoakTimeline('scenario_start', 'simulated background (telemetry signal)');
    return 'background signal';
  }
  phase = 'fg';
  noteAppForeground();
  completeRecovery('background', true, 'foreground resume signal');
  recordSoakTimeline('scenario_end', 'simulated foreground (telemetry signal)');
  return 'foreground signal';
}

export function getOscillatorPhase(): string {
  return phase;
}
