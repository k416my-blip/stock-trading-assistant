import { verboseLog } from '../productionLogger';
import { noteNetworkSuccess } from '../performanceCostRuntime';
import { recomputeEmergencySafeMode } from './emergencySafeMode';

type RecoveryHandler = () => void | Promise<void>;

const handlers = new Set<RecoveryHandler>();
let offlineRecoveryPending = false;

export function registerOfflineRecoveryHandler(handler: RecoveryHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function markOfflinePending(): void {
  offlineRecoveryPending = true;
}

export function isOfflineRecoveryPending(): boolean {
  return offlineRecoveryPending;
}

export async function runOfflineRecoverySync(): Promise<void> {
  offlineRecoveryPending = false;
  noteNetworkSuccess();
  recomputeEmergencySafeMode();
  verboseLog('[production] offline recovery sync');
  for (const h of handlers) {
    try {
      await h();
    } catch {
      /* non-fatal */
    }
  }
}

export function resetOfflineRecoveryForTest(): void {
  handlers.clear();
  offlineRecoveryPending = false;
}
