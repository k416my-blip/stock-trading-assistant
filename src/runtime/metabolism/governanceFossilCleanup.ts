/**
 * Governance Fossil Cleanup — detect rigid old rollback/governance patterns.
 */
import { getRollbackSnapshots } from '../governance/adaptiveRollbackSystem';
import { governanceRelevance } from './memoryRelevanceHalfLife';
import { FOSSIL_ROLLBACK_COUNT } from '../../constants/runtimeMetabolism';
import { appendGcAudit } from './metabolismStorage';

export function cleanupGovernanceFossils(nowMs = Date.now()): {
  fossilCount: number;
  fossilizedRollbackRisk: number;
} {
  const snaps = getRollbackSnapshots().filter((s) => !s.isBaseline);
  let fossilCount = 0;
  for (const s of snaps) {
    const age = nowMs - Date.parse(s.createdAt);
    const rel = governanceRelevance(age);
    if (rel < 0.25) {
      fossilCount += 1;
      appendGcAudit('governance_fossil', s.id, 'archived', `fossil rule: ${s.reason}`);
    }
  }
  const fossilizedRollbackRisk = Math.min(1, snaps.length / Math.max(1, FOSSIL_ROLLBACK_COUNT));
  return { fossilCount, fossilizedRollbackRisk };
}
