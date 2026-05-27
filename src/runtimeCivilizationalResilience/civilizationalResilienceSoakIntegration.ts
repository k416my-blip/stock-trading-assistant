import type { CivilizationalEcologyTimelineEntry } from '../types/runtimeCivilizationalResilience';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetCivilizationalResilienceSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setCivilizationalResilienceSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordCivilizationalResilienceSoakEvent(
  entry: CivilizationalEcologyTimelineEntry,
): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `civilizational ecology ${entry.flow} · ${entry.detailJa}`);
}

export function simulateGovernanceRecursionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance recursion replay');
}

export function simulateObserverEcosystemExplosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer ecosystem explosion replay');
}

export function simulateUtilityMonocultureReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'utility monoculture replay');
}

export function simulateOrchestrationEmpireReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'orchestration empire replay');
}

export function simulateEquilibriumIdeologyReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'equilibrium ideology replay');
}

export function simulateAuditCivilizationPersistenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'audit civilization persistence replay');
}

export function simulateLongSessionEcologyDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session ecology drift replay');
}

export function simulateMetaGovernanceLockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'meta governance lock replay');
}
