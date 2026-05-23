/**
 * Curiosity Governance Bridge — Constitution final; curiosity proposes only.
 */
import type { ConstitutionalDirectives } from '../../types/runtimeConstitution';
import { noteProductionMutationBlocked } from './curiosityStorage';
import { auditMutationAllowed } from './controlledMutationSandbox';

export type CuriosityProposal = {
  id: string;
  kind: 'sandbox_mutation' | 'recovery_alt' | 'dormant_revival' | 'synthetic';
  detailJa: string;
  approvedForSandbox: boolean;
  blockedReasonJa: string | null;
};

let proposalSeq = 0;
const proposals: CuriosityProposal[] = [];

export function resetCuriosityGovernanceBridgeForTest(): void {
  proposalSeq = 0;
  proposals.length = 0;
}

export function submitCuriosityProposal(
  kind: CuriosityProposal['kind'],
  detailJa: string,
  directives: ConstitutionalDirectives,
  allowSandbox: boolean,
): CuriosityProposal {
  proposalSeq += 1;
  let approvedForSandbox = allowSandbox && auditMutationAllowed(detailJa);
  let blockedReasonJa: string | null = null;

  if (directives.replayFreeze || directives.suppressExploration) {
    approvedForSandbox = false;
    blockedReasonJa = 'constitution suppresses exploration';
  }
  if (!auditMutationAllowed(detailJa)) {
    approvedForSandbox = false;
    blockedReasonJa = 'forbidden mutation tag';
    noteProductionMutationBlocked();
  }

  const proposal: CuriosityProposal = {
    id: `cprop-${proposalSeq}`,
    kind,
    detailJa: detailJa.slice(0, 120),
    approvedForSandbox,
    blockedReasonJa,
  };
  proposals.push(proposal);
  if (proposals.length > 48) proposals.shift();
  return proposal;
}

export function getCuriosityProposals(): CuriosityProposal[] {
  return [...proposals];
}

export function assertNoProductionApply(): void {
  noteProductionMutationBlocked();
}
