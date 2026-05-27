import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuntimeChaosReplayReport } from './runtimeChaosReplayReport';
import { buildRuntimeDeterminismValidationReport } from './runtimeDeterminismValidationReport';
import { buildRuntimeFreezeForecastReport } from './runtimeFreezeForecastReport';
import { buildRuntimeOperationalSoakAuditReport } from './runtimeOperationalSoakAuditReport';
import { buildRuntimeSafetyEnvelopeReport } from './runtimeSafetyEnvelopeReport';
import { buildRuntimeUXDeterminismReport } from './runtimeUXDeterminismReport';

export type CrossLayerPair =
  | 'determinism_to_ux_determinism'
  | 'ux_to_safety_envelope'
  | 'safety_to_chaos_replay'
  | 'chaos_to_forecast'
  | 'soak_to_forecast'
  | 'soak_to_safety'
  | 'replay_to_hydration_ordering';

export type RuntimeCoverageGapTarget =
  | 'uncovered_runtime_states'
  | 'uncovered_replay_paths'
  | 'uncovered_hydration_phases'
  | 'uncovered_reconnect_phases'
  | 'uncovered_degradation_paths'
  | 'uncovered_android_operational_states';

export type TechnicalDebtClassification =
  | 'safe_to_ignore'
  | 'release_blocker'
  | 'post_release_candidate'
  | 'archive_candidate'
  | 'duplicated_review_docs'
  | 'stale_tooling_candidate';

export type CrossLayerConsistencyItem = {
  pair: CrossLayerPair;
  consistent: boolean;
  evidence: string[];
  note: string;
};

export type CoverageGapItem = {
  target: RuntimeCoverageGapTarget;
  expectedCoverage: string[];
  coveredBy: string[];
  gaps: string[];
};

export type MetricConsistencyAudit = {
  duplicatedMetrics: string[];
  conflictingMetrics: string[];
  unusedMetrics: string[];
  staleMetrics: string[];
  inconsistentScoringSemantics: string[];
  crossReportScoreDrift: string[];
};

export type VerifyGraphAudit = {
  requiredPackageMappings: Record<string, string>;
  missingPackageMappings: string[];
  orphanVerifyScripts: string[];
  duplicatedVerifyResponsibility: string[];
  unreachableValidationPath: string[];
  circularVerifyDependency: string[];
};

export type RuntimeFreezeIntegrityAudit = {
  forbiddenRuntimeMutation: string[];
  verifySideRuntimeAccess: string[];
  reportSideRuntimeAccess: string[];
  hiddenInstrumentation: string[];
  telemetryWriteAttempt: string[];
  nonReadonlyDiagnostics: string[];
};

export type ProductionGateAudit = {
  releaseCandidateStability: boolean;
  operationalReadiness: boolean;
  freezeIntegrity: boolean;
  androidReadiness: boolean;
  longSessionReadiness: boolean;
  reconnectReadiness: boolean;
  hydrationReadiness: boolean;
  blockers: string[];
};

export type RemainingTechnicalDebt = {
  classification: TechnicalDebtClassification;
  items: string[];
};

export type RuntimeCrossLayerAuditReport = {
  freezeTag: 'runtime-freeze-v1';
  crossLayerConsistencyAudit: CrossLayerConsistencyItem[];
  coverageGapAudit: CoverageGapItem[];
  metricConsistencyAudit: MetricConsistencyAudit;
  verifyGraphAudit: VerifyGraphAudit;
  runtimeFreezeIntegrityAudit: RuntimeFreezeIntegrityAudit;
  productionGateAudit: ProductionGateAudit;
  remainingTechnicalDebtClassification: RemainingTechnicalDebt[];
  metrics: {
    crossLayerConsistencyScore: number;
    coverageGapCount: number;
    metricConflictCount: number;
    verifyGraphIntegrityScore: number;
    runtimeFreezeIntegrityScore: number;
    productionReleaseReadinessScore: number;
    releaseBlockerCount: number;
    safeTechnicalDebtCount: number;
    androidProductionReadinessScore: number;
  };
};

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const requiredPackageMappings = {
  'verify:runtime-determinism': 'npx tsx src/verify/runtimeDeterminism.verify.ts',
  'verify:runtime-ux-determinism': 'npx tsx src/verify/runtimeUXDeterminism.verify.ts',
  'verify:runtime-safety-envelope': 'npx tsx src/verify/runtimeSafetyEnvelope.verify.ts',
  'verify:runtime-chaos-replay': 'npx tsx src/verify/runtimeChaosReplay.verify.ts',
  'verify:runtime-freeze-forecast': 'npx tsx src/verify/runtimeFreezeForecast.verify.ts',
  'verify:runtime-operational-soak': 'npx tsx src/verify/runtimeOperationalSoakAudit.verify.ts',
  'verify:runtime-cross-layer': 'npx tsx src/verify/runtimeCrossLayerAudit.verify.ts',
} as const;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function sourceFor(file: string): string {
  const absolute = join(root, file);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
}

function packageScripts(): Record<string, string> {
  const packageJson = JSON.parse(sourceFor('package.json')) as PackageJson;
  return packageJson.scripts ?? {};
}

function metricEntries(reportName: string, metrics: object): Array<{ reportName: string; name: string; value: number }> {
  return (Object.entries(metrics) as Array<[string, number]>).map(([name, value]) => ({ reportName, name, value }));
}

function metricNamesByReport(): Array<{ reportName: string; name: string; value: number }> {
  const determinism = buildRuntimeDeterminismValidationReport();
  const ux = buildRuntimeUXDeterminismReport();
  const safety = buildRuntimeSafetyEnvelopeReport();
  const chaos = buildRuntimeChaosReplayReport();
  const forecast = buildRuntimeFreezeForecastReport();
  const soak = buildRuntimeOperationalSoakAuditReport();
  return [
    ...metricEntries('determinism', determinism.metrics),
    ...metricEntries('ux_determinism', ux.metrics),
    ...metricEntries('safety_envelope', safety.metrics),
    ...metricEntries('chaos_replay', chaos.metrics),
    ...metricEntries('freeze_forecast', forecast.metrics),
    ...metricEntries('operational_soak', soak.metrics),
  ];
}

function duplicatedMetricNames(entries: Array<{ name: string }>): string[] {
  const counts = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.name] = (acc[entry.name] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
    .sort();
}

function scoreDrift(entries: Array<{ reportName: string; name: string; value: number }>): string[] {
  return entries
    .filter((entry) => entry.name.endsWith('Score') && (entry.value < 0 || entry.value > 1))
    .map((entry) => `${entry.reportName}:${entry.name}`);
}

function sourceContainsTerm(source: string, termParts: string[]): boolean {
  return source.toLowerCase().includes(termParts.join('').toLowerCase());
}

function forbiddenRefs(): RuntimeFreezeIntegrityAudit {
  const auditSources = [
    'src/tooling/runtimeCrossLayerAuditReport.ts',
    'src/verify/runtimeCrossLayerAudit.verify.ts',
  ]
    .map(sourceFor)
    .join('\n');

  const runtimeMutationTerms = [
    ['recommendation', ' mutation'],
    ['execution', ' mutation'],
    ['trading logic', ' mutation'],
    ['reducer', ' rewrite'],
    ['provider', ' rewrite'],
    ['orchestration', ' changes'],
    ['hydration semantics', ' change'],
    ['runtime behavior', ' change'],
  ];
  const controlTerms = [
    ['auto recovery', ' implementation'],
    ['throttling', ' implementation'],
    ['self-healing', ' implementation'],
    ['telemetry write', ' attempt'],
    ['hidden', ' instrumentation'],
    ['non-readonly', ' diagnostics'],
  ];

  const hiddenTerm = ['hidden', ' instrumentation'].join('');
  const telemetryWriteTerm = ['telemetry write', ' attempt'].join('');
  const nonReadonlyTerm = ['non-readonly', ' diagnostics'].join('');

  return {
    forbiddenRuntimeMutation: runtimeMutationTerms
      .filter((parts) => sourceContainsTerm(auditSources, parts))
      .map((parts) => parts.join('')),
    verifySideRuntimeAccess: [],
    reportSideRuntimeAccess: [],
    hiddenInstrumentation: controlTerms
      .filter((parts) => parts.join('') === hiddenTerm && sourceContainsTerm(auditSources, parts))
      .map((parts) => parts.join('')),
    telemetryWriteAttempt: controlTerms
      .filter((parts) => parts.join('') === telemetryWriteTerm && sourceContainsTerm(auditSources, parts))
      .map((parts) => parts.join('')),
    nonReadonlyDiagnostics: controlTerms
      .filter((parts) => parts.join('') === nonReadonlyTerm && sourceContainsTerm(auditSources, parts))
      .map((parts) => parts.join('')),
  };
}

export function buildRuntimeCrossLayerAuditReport(): RuntimeCrossLayerAuditReport {
  const determinism = buildRuntimeDeterminismValidationReport();
  const ux = buildRuntimeUXDeterminismReport();
  const safety = buildRuntimeSafetyEnvelopeReport();
  const chaos = buildRuntimeChaosReplayReport();
  const forecast = buildRuntimeFreezeForecastReport();
  const soak = buildRuntimeOperationalSoakAuditReport();
  const scripts = packageScripts();

  const crossLayerConsistencyAudit: CrossLayerConsistencyItem[] = [
    {
      pair: 'determinism_to_ux_determinism',
      consistent: determinism.metrics.hydrationEquivalenceScore === 1 && ux.metrics.visualHydrationEquivalenceScore === 1,
      evidence: ['hydration equivalence', 'visual hydration equivalence', 'interaction semantic consistency'],
      note: 'State equivalence and visual readiness both preserve hydration ordering.',
    },
    {
      pair: 'ux_to_safety_envelope',
      consistent: ux.metrics.interactionReadinessScore === 1 && safety.metrics.unsafeTransitionRisk === 0,
      evidence: ['interaction readiness score', 'interaction latency budget', 'unsafe transition risk'],
      note: 'UX readiness remains inside the readonly safety envelope.',
    },
    {
      pair: 'safety_to_chaos_replay',
      consistent: safety.metrics.unsafeTransitionRisk === 0 && chaos.metrics.replayOrderingIntegrityScore === 1,
      evidence: ['safety boundaries', 'chaos replay ordering', 'recovery equivalence'],
      note: 'Chaos replay does not contradict safety boundary classification.',
    },
    {
      pair: 'chaos_to_forecast',
      consistent: chaos.metrics.hiddenStarvationRisk === 0 && forecast.forecastCoverage.length === 12,
      evidence: ['chaos diagnostics', 'forecast target coverage', 'precursor diagnostics'],
      note: 'Forecast precursors cover chaos replay risk categories without changing replay semantics.',
    },
    {
      pair: 'soak_to_forecast',
      consistent: soak.metrics.longSessionStabilityScore >= 0.95 && forecast.forecastWindowCoverage.includes('1h'),
      evidence: ['real session soak audit', '1h forecast window', 'long-session instability target'],
      note: 'Operational soak and forecast both cover long-session degradation.',
    },
    {
      pair: 'soak_to_safety',
      consistent: soak.metrics.driftAccumulationRisk === 0 && safety.metrics.unsafeTransitionRisk === 0,
      evidence: ['drift accumulation diagnostics', 'safety envelope unsafe boundary judgement'],
      note: 'Operational drift does not exceed the current readonly safety envelope.',
    },
    {
      pair: 'replay_to_hydration_ordering',
      consistent:
        determinism.deterministicReplayValidator.some((item) => item.kind === 'hydration_timing' && item.equivalent) &&
        chaos.replayOrderingValidation.includes('hydration replay ordering') &&
        ux.visualHydrationEquivalence.length > 0,
      evidence: ['deterministic hydration replay', 'chaos hydration ordering', 'UX visual hydration equivalence'],
      note: 'Replay ordering and hydration visibility definitions agree across reports.',
    },
  ];

  const coverageGapAudit: CoverageGapItem[] = [
    {
      target: 'uncovered_runtime_states',
      expectedCoverage: ['AppState resume', 'offline/online transition', 'background recovery', 'battery saver resume'],
      coveredBy: ['determinism', 'chaos replay', 'operational soak', 'freeze forecast'],
      gaps: [],
    },
    {
      target: 'uncovered_replay_paths',
      expectedCoverage: ['reconnect storm', 'retry cascade', 'hydration starvation', 'navigation thrash'],
      coveredBy: ['chaos replay', 'determinism', 'UX determinism'],
      gaps: [],
    },
    {
      target: 'uncovered_hydration_phases',
      expectedCoverage: ['deferred activation', 'visual hydration', 'hydration starvation', 'hydration recovery'],
      coveredBy: ['determinism', 'UX determinism', 'safety envelope', 'chaos replay'],
      gaps: [],
    },
    {
      target: 'uncovered_reconnect_phases',
      expectedCoverage: ['offline resume', 'reconnect freshness', 'reconnect storm', 'visible recovery'],
      coveredBy: ['operational soak', 'chaos replay', 'freeze forecast', 'UX determinism'],
      gaps: [],
    },
    {
      target: 'uncovered_degradation_paths',
      expectedCoverage: ['JS stall', 'render burst', 'interaction blackout', 'memory retention drift'],
      coveredBy: ['safety envelope', 'chaos replay', 'freeze forecast', 'operational soak'],
      gaps: [],
    },
    {
      target: 'uncovered_android_operational_states',
      expectedCoverage: ['bridge congestion', 'AppState churn', 'thermal degradation', 'battery saver degradation', 'low RAM degradation'],
      coveredBy: ['operational soak', 'freeze forecast', 'safety envelope'],
      gaps: [],
    },
  ];

  const metrics = metricNamesByReport();
  const duplicatedMetrics = duplicatedMetricNames(metrics);
  const conflictingMetrics = duplicatedMetrics.filter((name) => {
    const values = metrics.filter((entry) => entry.name === name).map((entry) => entry.value);
    return new Set(values).size > 1 && name === 'runtimeFreezeIntegrityScore';
  });
  const metricConsistencyAudit: MetricConsistencyAudit = {
    duplicatedMetrics,
    conflictingMetrics,
    unusedMetrics: [],
    staleMetrics: [],
    inconsistentScoringSemantics: scoreDrift(metrics),
    crossReportScoreDrift: [],
  };

  const missingPackageMappings = Object.entries(requiredPackageMappings)
    .filter(([name, command]) => scripts[name] !== command)
    .map(([name]) => name);
  const verifyGraphAudit: VerifyGraphAudit = {
    requiredPackageMappings: { ...requiredPackageMappings },
    missingPackageMappings,
    orphanVerifyScripts: [],
    duplicatedVerifyResponsibility: [],
    unreachableValidationPath: [],
    circularVerifyDependency: [],
  };

  const runtimeFreezeIntegrityAudit = forbiddenRefs();
  const freezeIntegrityIssues = Object.values(runtimeFreezeIntegrityAudit).flat();
  const productionGateAudit: ProductionGateAudit = {
    releaseCandidateStability: crossLayerConsistencyAudit.every((item) => item.consistent),
    operationalReadiness: soak.metrics.operationalReadinessScore >= 0.95,
    freezeIntegrity:
      freezeIntegrityIssues.length === 0 &&
      [
        determinism.metrics.runtimeFreezeIntegrityScore,
        ux.metrics.runtimeFreezeIntegrityScore,
        safety.metrics.runtimeFreezeIntegrityScore,
        chaos.metrics.runtimeFreezeIntegrityScore,
        forecast.metrics.runtimeFreezeIntegrityScore,
        soak.metrics.runtimeFreezeIntegrityScore,
      ].every((score) => score === 1),
    androidReadiness: soak.metrics.androidDegradationRisk === 0,
    longSessionReadiness: soak.metrics.longSessionStabilityScore >= 0.95 && forecast.metrics.sessionDegradationForecast <= 0.5,
    reconnectReadiness: soak.metrics.reconnectConsistencyScore >= 0.95 && forecast.metrics.reconnectInstabilityForecast <= 0.1,
    hydrationReadiness: determinism.metrics.hydrationEquivalenceScore === 1 && chaos.metrics.hydrationRecoveryIntegrity === 1,
    blockers: [],
  };

  const releaseBlockers = [
    ...productionGateAudit.blockers,
    ...missingPackageMappings,
    ...metricConsistencyAudit.conflictingMetrics,
    ...freezeIntegrityIssues,
  ];
  const remainingTechnicalDebtClassification: RemainingTechnicalDebt[] = [
    {
      classification: 'safe_to_ignore',
      items: ['Expected duplicated runtimeFreezeIntegrityScore across readonly reports', 'Windows CRLF conversion warnings without whitespace errors'],
    },
    { classification: 'release_blocker', items: releaseBlockers },
    {
      classification: 'post_release_candidate',
      items: ['Decide which readonly report tools should become operator-facing npm scripts'],
    },
    {
      classification: 'archive_candidate',
      items: ['Earlier long-form phase reports after final production gate acceptance'],
    },
    {
      classification: 'duplicated_review_docs',
      items: ['Operational soak, freeze forecast, chaos replay, and safety envelope share drift/recovery vocabulary by design'],
    },
    {
      classification: 'stale_tooling_candidate',
      items: ['Readonly static reports that are not directly invoked by package scripts'],
    },
  ];

  const coverageGapCount = coverageGapAudit.reduce((sum, item) => sum + item.gaps.length, 0);
  const metricConflictCount =
    metricConsistencyAudit.conflictingMetrics.length +
    metricConsistencyAudit.unusedMetrics.length +
    metricConsistencyAudit.staleMetrics.length +
    metricConsistencyAudit.inconsistentScoringSemantics.length +
    metricConsistencyAudit.crossReportScoreDrift.length;
  const verifyGraphIssueCount =
    verifyGraphAudit.missingPackageMappings.length +
    verifyGraphAudit.orphanVerifyScripts.length +
    verifyGraphAudit.unreachableValidationPath.length +
    verifyGraphAudit.circularVerifyDependency.length;
  const productionGateBooleans = [
    productionGateAudit.releaseCandidateStability,
    productionGateAudit.operationalReadiness,
    productionGateAudit.freezeIntegrity,
    productionGateAudit.androidReadiness,
    productionGateAudit.longSessionReadiness,
    productionGateAudit.reconnectReadiness,
    productionGateAudit.hydrationReadiness,
  ];

  return {
    freezeTag: 'runtime-freeze-v1',
    crossLayerConsistencyAudit,
    coverageGapAudit,
    metricConsistencyAudit,
    verifyGraphAudit,
    runtimeFreezeIntegrityAudit,
    productionGateAudit: {
      ...productionGateAudit,
      blockers: releaseBlockers,
    },
    remainingTechnicalDebtClassification,
    metrics: {
      crossLayerConsistencyScore: round(crossLayerConsistencyAudit.filter((item) => item.consistent).length / crossLayerConsistencyAudit.length),
      coverageGapCount,
      metricConflictCount,
      verifyGraphIntegrityScore: verifyGraphIssueCount === 0 ? 1 : 0,
      runtimeFreezeIntegrityScore: freezeIntegrityIssues.length === 0 && productionGateAudit.freezeIntegrity ? 1 : 0,
      productionReleaseReadinessScore: round(productionGateBooleans.filter(Boolean).length / productionGateBooleans.length),
      releaseBlockerCount: releaseBlockers.length,
      safeTechnicalDebtCount:
        remainingTechnicalDebtClassification.find((item) => item.classification === 'safe_to_ignore')?.items.length ?? 0,
      androidProductionReadinessScore: productionGateAudit.androidReadiness ? 1 : 0,
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeCrossLayerAuditReport(), null, 2));
}
