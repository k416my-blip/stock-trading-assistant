import { recordSoakTimeline } from './sessionTimelineRecorder';

export function runAsyncFloodScenarioStep(asyncQueueDepth: number): string {
  recordSoakTimeline('scenario_start', `async flood observe · depth ${asyncQueueDepth}`);
  return `async flood observe-only · depth ${asyncQueueDepth}`;
}
