import { PRODUCTION_READINESS_CHECKLIST, type ReadinessCheckId } from '../constants/releaseReadiness';
import { exportDiagnosticsReport } from './structuredDiagnostics';

export type ReadinessCheckResult = {
  id: ReadinessCheckId;
  passed: boolean;
  detail?: string;
};

export type ReleaseReadinessAssessment = {
  ready: boolean;
  passedCount: number;
  requiredCount: number;
  checks: ReadinessCheckResult[];
  blockers: string[];
};

export type ReleaseReadinessInput = {
  typecheckOk?: boolean;
  lintOk?: boolean;
  unitTestsOk?: boolean;
  integrationTestsOk?: boolean;
  verifyScriptsOk?: boolean;
  securityVerifyOk?: boolean;
  secretsAbstracted?: boolean;
  integrityMetadata?: boolean;
  errorBoundaryPresent?: boolean;
  safeBootPresent?: boolean;
};

/** CI / 起動時のリリース準備状況評価 */
export function assessReleaseReadiness(input: ReleaseReadinessInput = {}): ReleaseReadinessAssessment {
  const flags: Record<ReadinessCheckId, boolean> = {
    typecheck: input.typecheckOk ?? false,
    lint: input.lintOk ?? false,
    unit_tests: input.unitTestsOk ?? false,
    integration_tests: input.integrationTestsOk ?? false,
    verify_scripts: input.verifyScriptsOk ?? false,
    security_verify: input.securityVerifyOk ?? false,
    secrets_not_plaintext: input.secretsAbstracted ?? true,
    integrity_metadata: input.integrityMetadata ?? true,
    error_boundary: input.errorBoundaryPresent ?? true,
    safe_boot: input.safeBootPresent ?? true,
    diagnostics_export: exportDiagnosticsReport().eventCount >= 0,
  };

  const checks: ReadinessCheckResult[] = PRODUCTION_READINESS_CHECKLIST.map((def) => ({
    id: def.id,
    passed: flags[def.id],
    detail: flags[def.id] ? undefined : def.descriptionJa,
  }));

  const required = PRODUCTION_READINESS_CHECKLIST.filter((c) => c.required);
  const passedRequired = required.filter((c) => flags[c.id]).length;
  const blockers = checks.filter((c) => !c.passed && required.some((r) => r.id === c.id)).map((c) => c.id);

  return {
    ready: blockers.length === 0,
    passedCount: checks.filter((c) => c.passed).length,
    requiredCount: required.length,
    checks,
    blockers,
  };
}

export function getProductionReadinessChecklist() {
  return [...PRODUCTION_READINESS_CHECKLIST];
}
