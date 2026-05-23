import { noteNativeTrimMemory } from '../runtime/nativeRuntimeBridge';
import { recordSoakTimeline } from './sessionTimelineRecorder';

export function runMemoryPressureScenarioStep(): string {
  noteNativeTrimMemory(20);
  recordSoakTimeline('scenario_start', 'trim memory signal (diagnostic)');
  return 'memory pressure trim signal';
}
