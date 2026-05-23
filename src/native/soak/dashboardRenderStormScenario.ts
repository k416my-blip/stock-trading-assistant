import { noteRenderFrame, noteDashboardCommitDuration, noteSubtreeRerenderBurst } from '../../services/renderPerformanceObserver';
import { recordSoakTimeline } from './sessionTimelineRecorder';

export function runDashboardRenderStormScenarioStep(): string {
  for (let i = 0; i < 6; i += 1) {
    noteRenderFrame(8, true);
    noteDashboardCommitDuration(18 + i * 2);
    noteSubtreeRerenderBurst(3);
  }
  recordSoakTimeline('scenario_start', 'dashboard render storm telemetry burst');
  return 'render storm telemetry burst';
}
