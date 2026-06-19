import type { ConciergeEvidenceBundle } from '../types/conciergeEvidence';

let lastTurnEvidence: ConciergeEvidenceBundle | null = null;

export function setLastConciergeTurnEvidence(bundle: ConciergeEvidenceBundle | null): void {
  lastTurnEvidence = bundle;
}

export function getLastConciergeTurnEvidence(): ConciergeEvidenceBundle | null {
  return lastTurnEvidence;
}
