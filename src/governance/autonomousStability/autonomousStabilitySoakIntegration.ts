import type { AutonomousGovernanceTimelineEntry } from '../../types/autonomousStabilityGovernance';
import { recordSoakTimeline } from '../../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetAutonomousStabilitySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setAutonomousGovernanceSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordAutonomousGovernanceSoakEvent(entry: AutonomousGovernanceTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `governance ${entry.flow} · ${entry.detailJa}`);
}

export function simulateGovernanceDrift(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance drift simulation');
}

export function simulateThermalGovernance(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'thermal governance scenario');
}

export function simulateObserverOverload(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer overload simulation');
}

export function simulateAdaptationOscillation(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'adaptation oscillation simulation');
}

export function simulateReclaimAdaptation(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'reclaim adaptation scenario');
}
