/** Governance Lock Manager — prevent multi governance intervention. */
import { isGovernanceLocked, lockGovernance } from './unifiedOrchestratorStorage';
import { UNIFIED_GOVERNANCE_LOCK_MS } from '../../constants/runtimeUnifiedOrchestrator';

export function tryAcquireGovernanceLock(nowMs = Date.now()): boolean {
  if (isGovernanceLocked(nowMs)) return false;
  lockGovernance(nowMs, UNIFIED_GOVERNANCE_LOCK_MS);
  return true;
}

export function isGovernanceLockActive(nowMs = Date.now()): boolean {
  return isGovernanceLocked(nowMs);
}
