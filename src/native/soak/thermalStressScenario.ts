import { recordSoakTimeline } from './sessionTimelineRecorder';

export function runThermalStressScenarioStep(thermalStatus: string): string {
  recordSoakTimeline('scenario_start', `thermal observe · ${thermalStatus}`);
  return `thermal stress observe-only · ${thermalStatus}`;
}
