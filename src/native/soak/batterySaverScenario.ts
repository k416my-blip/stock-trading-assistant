import { recordSoakTimeline } from './sessionTimelineRecorder';

export function runBatterySaverScenarioStep(batterySaverActive: boolean): string {
  recordSoakTimeline('scenario_start', `battery saver observe · ${batterySaverActive ? 'ON' : 'OFF'}`);
  return `battery saver observe-only`;
}
