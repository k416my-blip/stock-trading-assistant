/**
 * Safe adaptive constraints — forbidden learning patterns, invariant enforcement.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import {
  FORBIDDEN_LEARNING_PATTERNS,
  GOVERNANCE_PROTECTED_INVARIANT_KINDS,
} from '../../constants/adaptiveRuntimeGovernance';
import { isProtectedEdge } from '../../constants/adaptiveRuntimeLearning';

export type SafetyAuditResult = {
  passed: boolean;
  violations: string[];
  protectedEdgeCount: number;
};

export function auditSafeAdaptiveConstraints(store: AdaptiveRuntimeLearningState): SafetyAuditResult {
  const violations: string[] = [];

  for (const rec of Object.values(store.edges)) {
    const blob = `${rec.from} ${rec.to} ${rec.relation}`.toLowerCase();
    for (const forbidden of FORBIDDEN_LEARNING_PATTERNS) {
      if (blob.includes(forbidden.replace(/_/g, ''))) {
        violations.push(`forbidden pattern: ${forbidden} on ${rec.edgeKey}`);
      }
    }
    if (GOVERNANCE_PROTECTED_INVARIANT_KINDS.some((k) => rec.from === k || rec.to === k)) {
      if (rec.runtimeLearnedWeight < 0.5 && rec.falsePositiveCount > 0) {
        violations.push(`protected edge suppressed: ${rec.edgeKey}`);
      }
    }
  }

  const protectedEdgeCount = Object.values(store.edges).filter((e) =>
    isProtectedEdge(String(e.from), String(e.to), e.relation),
  ).length;

  return {
    passed: violations.length === 0,
    violations,
    protectedEdgeCount,
  };
}

export function enforceProtectedInvariants(store: AdaptiveRuntimeLearningState): void {
  for (const rec of Object.values(store.edges)) {
    if (isProtectedEdge(String(rec.from), String(rec.to), rec.relation)) {
      rec.protectedInvariant = true;
      rec.runtimeLearnedWeight = Math.max(rec.runtimeLearnedWeight, 0.75);
      rec.falsePositiveCount = Math.min(rec.falsePositiveCount, 1);
    }
  }
}

export function rejectForbiddenLearningUpdate(
  from: string,
  to: string,
  relation: string,
): boolean {
  const blob = `${from} ${to} ${relation}`.toLowerCase();
  return FORBIDDEN_LEARNING_PATTERNS.some((p) => blob.includes(p.replace(/_/g, '')));
}
