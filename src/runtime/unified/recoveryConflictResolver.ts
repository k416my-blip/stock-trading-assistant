/** Recovery Conflict Resolver — arbitrate competing recovery paths. */
import { noteRecoveryAttempt } from './unifiedOrchestratorStorage';

let activeRecoveryLabel: string | null = null;

export function resetRecoveryConflictResolverForTest(): void {
  activeRecoveryLabel = null;
}

export function tryAcquireRecovery(label: string): boolean {
  if (activeRecoveryLabel && activeRecoveryLabel !== label) {
    noteRecoveryAttempt(false);
    return false;
  }
  activeRecoveryLabel = label;
  return true;
}

export function releaseRecovery(label: string, success: boolean): void {
  if (activeRecoveryLabel === label) activeRecoveryLabel = null;
  noteRecoveryAttempt(success);
}
