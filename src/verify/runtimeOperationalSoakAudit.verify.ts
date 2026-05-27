import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuntimeOperationalSoakAuditReport } from '../tooling/runtimeOperationalSoakAuditReport';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};

if (scripts['verify:runtime-operational-soak'] !== 'npx tsx src/verify/runtimeOperationalSoakAudit.verify.ts') {
  throw new Error('missing package script: verify:runtime-operational-soak');
}

for (const file of [
  'src/tooling/runtimeOperationalSoakAuditReport.ts',
  'src/verify/runtimeOperationalSoakAudit.verify.ts',
  'docs/review/RUNTIME_OPERATIONAL_SOAK_AUDIT.md',
]) {
  if (!existsSync(join(root, file))) throw new Error(`missing runtime operational soak audit file: ${file}`);
}

const docs = readFileSync(join(root, 'docs/review/RUNTIME_OPERATIONAL_SOAK_AUDIT.md'), 'utf8').toLowerCase();
for (const phrase of [
  'runtime-freeze-v1 maintained',
  'real session soak audit',
  'background/foreground drift audit',
  'market/runtime synchronization audit',
  'operational latency audit',
  'drift accumulation diagnostics',
  'runtime memory stability audit',
  'android operational audit',
  'non-intervention guarantee',
]) {
  if (!docs.includes(phrase)) throw new Error(`operational soak audit docs missing phrase: ${phrase}`);
}

const report = buildRuntimeOperationalSoakAuditReport();
const requiredMetrics = [
  'operationalReadinessScore',
  'longSessionStabilityScore',
  'driftAccumulationRisk',
  'backgroundRecoveryQualityScore',
  'reconnectConsistencyScore',
  'memoryStabilityScore',
  'androidDegradationRisk',
  'runtimeFreezeIntegrityScore',
] as const;

for (const metric of requiredMetrics) {
  if (!(metric in report.metrics)) throw new Error(`missing operational soak metric: ${metric}`);
}

for (const [metric, value] of Object.entries(report.metrics)) {
  if (typeof value !== 'number' || value < 0 || value > 1) {
    throw new Error(`operational soak metric out of range: ${metric}=${value}`);
  }
}

if (report.freezeTag !== 'runtime-freeze-v1') {
  throw new Error('operational soak audit must maintain runtime-freeze-v1');
}

if (report.realSessionSoakAudit.length !== 4) {
  throw new Error(`expected 4 real session soak windows, got ${report.realSessionSoakAudit.length}`);
}

if (report.backgroundForegroundDriftAudit.length !== 4) {
  throw new Error(`expected 4 background/foreground scenarios, got ${report.backgroundForegroundDriftAudit.length}`);
}

if (report.marketRuntimeSynchronizationAudit.length !== 4) {
  throw new Error(`expected 4 market/runtime sync targets, got ${report.marketRuntimeSynchronizationAudit.length}`);
}

if (report.operationalLatencyAudit.length !== 6) {
  throw new Error(`expected 6 operational latency targets, got ${report.operationalLatencyAudit.length}`);
}

if (report.driftAccumulationDiagnostics.length !== 6) {
  throw new Error(`expected 6 drift diagnostics, got ${report.driftAccumulationDiagnostics.length}`);
}

if (report.runtimeMemoryStabilityAudit.length !== 5) {
  throw new Error(`expected 5 memory stability targets, got ${report.runtimeMemoryStabilityAudit.length}`);
}

if (report.androidOperationalAudit.length !== 5) {
  throw new Error(`expected 5 Android operational targets, got ${report.androidOperationalAudit.length}`);
}

if (report.instrumentationCoverage.length < 8) {
  throw new Error('operational soak audit must inspect existing telemetry and validation sources');
}

if (report.metrics.runtimeFreezeIntegrityScore !== 1) {
  throw new Error('operational soak audit must remain readonly and non-intervention');
}

console.log(
  `runtimeOperationalSoakAudit.verify: OK (sessions ${report.realSessionSoakAudit.length}, latency ${report.operationalLatencyAudit.length}, android ${report.androidOperationalAudit.length})`,
);
console.log(
  `operational soak metrics: readiness ${report.metrics.operationalReadinessScore}, driftRisk ${report.metrics.driftAccumulationRisk}, freezeIntegrity ${report.metrics.runtimeFreezeIntegrityScore}`,
);
