import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetCompressionSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setCompressionSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function simulateStackCompressionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'cross-stack compression replay');
}
