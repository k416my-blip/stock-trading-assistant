import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuntimeDeploymentReadinessReport } from '../tooling/runtimeDeploymentReadinessReport';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};

if (scripts['verify:runtime-deployment-readiness'] !== 'npx tsx src/verify/runtimeDeploymentReadiness.verify.ts') {
  throw new Error('missing package script: verify:runtime-deployment-readiness');
}

for (const file of [
  'src/tooling/runtimeDeploymentReadinessReport.ts',
  'src/verify/runtimeDeploymentReadiness.verify.ts',
  'docs/review/RUNTIME_DEPLOYMENT_READINESS.md',
  'docs/review/ANDROID_PRODUCTION_CHECKLIST.md',
]) {
  if (!existsSync(join(root, file))) throw new Error(`missing runtime deployment readiness file: ${file}`);
}

const deploymentDocs = readFileSync(join(root, 'docs/review/RUNTIME_DEPLOYMENT_READINESS.md'), 'utf8').toLowerCase();
for (const phrase of [
  'runtime-freeze-v1 maintained',
  'android production readiness audit',
  'expo/eas audit',
  'dependency audit',
  'asset audit',
  'build audit',
  'security audit',
  'store readiness audit',
  'operational deployment readiness',
  'readonly deployment audit only',
]) {
  if (!deploymentDocs.includes(phrase)) throw new Error(`deployment readiness docs missing phrase: ${phrase}`);
}

const checklistDocs = readFileSync(join(root, 'docs/review/ANDROID_PRODUCTION_CHECKLIST.md'), 'utf8').toLowerCase();
for (const phrase of [
  'android production checklist',
  'release build readiness',
  'signing and integrity',
  'expo/eas production validation',
  'asset readiness',
  'play store readiness',
  'privacy disclosure candidates',
  'deployment blockers',
]) {
  if (!checklistDocs.includes(phrase)) throw new Error(`Android production checklist missing phrase: ${phrase}`);
}

const report = buildRuntimeDeploymentReadinessReport();

if (report.freezeTag !== 'runtime-freeze-v1') {
  throw new Error('deployment readiness audit must maintain runtime-freeze-v1');
}

if (report.androidProductionReadinessAudit.length !== 8) {
  throw new Error(`expected 8 Android readiness checks, got ${report.androidProductionReadinessAudit.length}`);
}

if (report.expoEasAudit.length !== 6) {
  throw new Error(`expected 6 Expo/EAS checks, got ${report.expoEasAudit.length}`);
}

if (report.dependencyAudit.length !== 6) {
  throw new Error(`expected 6 dependency checks, got ${report.dependencyAudit.length}`);
}

if (report.assetAudit.length !== 5) {
  throw new Error(`expected 5 asset checks, got ${report.assetAudit.length}`);
}

if (report.buildAudit.length !== 6) {
  throw new Error(`expected 6 build checks, got ${report.buildAudit.length}`);
}

if (report.securityAudit.length !== 6) {
  throw new Error(`expected 6 security checks, got ${report.securityAudit.length}`);
}

if (report.storeReadinessAudit.length !== 5) {
  throw new Error(`expected 5 store readiness checks, got ${report.storeReadinessAudit.length}`);
}

if (report.operationalDeploymentReadiness.length !== 5) {
  throw new Error(`expected 5 operational deployment checks, got ${report.operationalDeploymentReadiness.length}`);
}

for (const [metric, value] of Object.entries(report.metrics)) {
  if (typeof value !== 'number' || value < 0) throw new Error(`deployment readiness metric out of range: ${metric}=${value}`);
}

for (const metric of [
  'androidProductionReadinessScore',
  'expoEasReadinessScore',
  'playStoreReadinessScore',
  'operationalDeploymentReadinessScore',
  'runtimeFreezeIntegrityScore',
] as const) {
  const value = report.metrics[metric];
  if (value > 1) throw new Error(`deployment readiness score out of range: ${metric}=${value}`);
}

if (report.metrics.runtimeFreezeIntegrityScore !== 1) {
  throw new Error('deployment readiness audit must remain readonly and freeze-safe');
}

console.log(
  `runtimeDeploymentReadiness.verify: OK (blockers ${report.metrics.deploymentBlockerCount}, dependency risks ${report.metrics.dependencyRiskCount}, asset risks ${report.metrics.assetRiskCount})`,
);
console.log(
  `deployment metrics: android ${report.metrics.androidProductionReadinessScore}, expoEas ${report.metrics.expoEasReadinessScore}, playStore ${report.metrics.playStoreReadinessScore}, freeze ${report.metrics.runtimeFreezeIntegrityScore}`,
);
