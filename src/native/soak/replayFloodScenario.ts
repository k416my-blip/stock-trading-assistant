import { getAdaptiveLearningStore } from '../../runtime/analysis/adaptiveRuntimeLearningStorage';
import { recordSoakTimeline } from './sessionTimelineRecorder';

let lastReplay = 0;

export function resetReplayFloodScenarioForTest(): void {
  lastReplay = 0;
}

export function runReplayFloodScenarioStep(): string {
  const store = getAdaptiveLearningStore('redmi');
  const delta = store.replayCount - lastReplay;
  lastReplay = store.replayCount;
  recordSoakTimeline('scenario_start', `replay flood observe · count ${store.replayCount} (+${delta})`);
  return `replay observe-only · ${store.replayCount}`;
}
