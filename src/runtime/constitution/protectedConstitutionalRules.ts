/**
 * Protected constitutional rules — absolute prohibitions.
 */
import { ABSOLUTE_PROTECTED_RULES, FORBIDDEN_CONSTITUTIONAL_ACTIONS } from '../../constants/runtimeConstitution';

export function auditConstitutionalAction(actionJa: string): { allowed: boolean; violations: string[] } {
  const violations: string[] = [];
  const blob = actionJa.toLowerCase().replace(/[\s_-]/g, '');
  for (const forbidden of FORBIDDEN_CONSTITUTIONAL_ACTIONS) {
    if (blob.includes(forbidden.replace(/_/g, ''))) violations.push(forbidden);
  }
  return { allowed: violations.length === 0, violations };
}

export function isProtectedConstitutionalInvariant(kind: string): boolean {
  const blob = kind.toLowerCase().replace(/[\s_-]/g, '');
  return ABSOLUTE_PROTECTED_RULES.some((r) => blob.includes(r.replace(/_/g, '')));
}
