/**
 * Meta Governance Layer — evolution actions must not bypass core governance.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import {
  FORBIDDEN_META_EVOLUTION_ACTIONS,
  META_PROTECTED_INVARIANTS,
} from '../../constants/runtimeEvolution';
import { auditSafeAdaptiveConstraints } from '../governance/safeAdaptiveConstraints';

export type MetaGovernanceAudit = {
  allowed: boolean;
  violations: string[];
  protectedInvariantCount: number;
};

export function auditMetaEvolutionAction(actionJa: string): MetaGovernanceAudit {
  const violations: string[] = [];
  const blob = actionJa.toLowerCase().replace(/[\s_-]/g, '');
  for (const forbidden of FORBIDDEN_META_EVOLUTION_ACTIONS) {
    if (blob.includes(forbidden.replace(/_/g, ''))) {
      violations.push(forbidden);
    }
  }
  return {
    allowed: violations.length === 0,
    violations,
    protectedInvariantCount: META_PROTECTED_INVARIANTS.length,
  };
}

export function auditMetaEvolutionStore(store: AdaptiveRuntimeLearningState): MetaGovernanceAudit {
  const base = auditSafeAdaptiveConstraints(store);
  const violations = [...base.violations];
  for (const rec of Object.values(store.edges)) {
    const blob = `${rec.from} ${rec.to} ${rec.relation}`.toLowerCase();
    for (const inv of META_PROTECTED_INVARIANTS) {
      if (blob.includes(inv.replace(/_/g, '')) && rec.runtimeLearnedWeight < 0.4) {
        violations.push(`protected_undermined:${rec.edgeKey}`);
      }
    }
  }
  return {
    allowed: violations.length === 0,
    violations,
    protectedInvariantCount: base.protectedEdgeCount,
  };
}

export function isForbiddenEdgeResurrection(from: string, to: string): boolean {
  const blob = `${from} ${to}`.toLowerCase().replace(/[\s_-]/g, '');
  return META_PROTECTED_INVARIANTS.some((inv) => blob.includes(inv.replace(/_/g, '')));
}
