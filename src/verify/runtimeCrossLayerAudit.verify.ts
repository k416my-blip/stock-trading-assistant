import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuntimeCrossLayerAuditReport } from '../tooling/runtimeCrossLayerAuditReport';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};

if (scripts['verify:runtime-cross-layer'] !== 'npx tsx src/verify/runtimeCrossLayerAudit.verify.ts') {
  throw new Error('missing package script: verify:runtime-cross-layer');
}

for (const file of [
  'src/tooling/runtimeCrossLayerAuditReport.ts',
  'src/verify/runtimeCrossLayerAudit.verify.ts',
  'docs/review/RUNTIME_CROSS_LAYER_AUDIT.md',
  'docs/review/RUNTIME_FINAL_PRODUCTION_GATE.md',
]) {
  if (!existsSync(join(root, file))) throw new Error(`missing runtime cross-layer audit file: ${file}`);
}

const crossLayerDocs = readFileSync(join(root, 'docs/review/RUNTIME_CROSS_LAYER_AUDIT.md'), 'utf8').toLowerCase();
for (const phrase of [
  'runtime-freeze-v1 maintained',
  'cross-layer consistency audit',
  'coverage gap audit',
  'metric consistency audit',
  'verify graph audit',
  'runtime freeze integrity audit',
  'readonly audit only',
]) {
  if (!crossLayerDocs.includes(phrase)) throw new Error(`cross-layer docs missing phrase: ${phrase}`);
}

const gateDocs = readFileSync(join(root, 'docs/review/RUNTIME_FINAL_PRODUCTION_GATE.md'), 'utf8').toLowerCase();
for (const phrase of [
  'final production gate',
  'release candidate stability',
  'operational readiness',
  'android readiness',
  'long-session readiness',
  'reconnect readiness',
  'hydration readiness',
  'remaining technical debt classification',
]) {
  if (!gateDocs.includes(phrase)) throw new Error(`final production gate docs missing phrase: ${phrase}`);
}

const report = buildRuntimeCrossLayerAuditReport();

if (report.freezeTag !== 'runtime-freeze-v1') {
  throw new Error('cross-layer audit must maintain runtime-freeze-v1');
}

if (report.crossLayerConsistencyAudit.length !== 7) {
  throw new Error(`expected 7 cross-layer consistency checks, got ${report.crossLayerConsistencyAudit.length}`);
}

if (!report.crossLayerConsistencyAudit.every((item) => item.consistent)) {
  throw new Error('cross-layer consistency audit contains a contradiction');
}

if (report.coverageGapAudit.length !== 6) {
  throw new Error(`expected 6 coverage gap audit targets, got ${report.coverageGapAudit.length}`);
}

if (report.metrics.coverageGapCount !== 0) {
  throw new Error(`expected zero coverage gaps, got ${report.metrics.coverageGapCount}`);
}

if (report.metrics.metricConflictCount !== 0) {
  throw new Error(`expected zero metric conflicts, got ${report.metrics.metricConflictCount}`);
}

if (report.metrics.verifyGraphIntegrityScore !== 1) {
  throw new Error('verify graph integrity must be complete');
}

if (report.metrics.runtimeFreezeIntegrityScore !== 1) {
  throw new Error('cross-layer audit must remain readonly and freeze-safe');
}

if (report.metrics.productionReleaseReadinessScore !== 1) {
  throw new Error('production gate must report full release readiness');
}

if (report.metrics.releaseBlockerCount !== 0) {
  throw new Error(`release blockers remain: ${report.productionGateAudit.blockers.join(', ')}`);
}

if (report.metrics.androidProductionReadinessScore !== 1) {
  throw new Error('Android production readiness must pass');
}

for (const metric of [
  'crossLayerConsistencyScore',
  'verifyGraphIntegrityScore',
  'runtimeFreezeIntegrityScore',
  'productionReleaseReadinessScore',
  'androidProductionReadinessScore',
] as const) {
  const value = report.metrics[metric];
  if (value < 0 || value > 1) throw new Error(`bounded metric out of range: ${metric}=${value}`);
}

console.log(
  `runtimeCrossLayerAudit.verify: OK (consistency ${report.metrics.crossLayerConsistencyScore}, gaps ${report.metrics.coverageGapCount}, blockers ${report.metrics.releaseBlockerCount})`,
);
console.log(
  `production gate metrics: readiness ${report.metrics.productionReleaseReadinessScore}, freeze ${report.metrics.runtimeFreezeIntegrityScore}, android ${report.metrics.androidProductionReadinessScore}`,
);
