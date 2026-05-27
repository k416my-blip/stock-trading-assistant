import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuntimeSafetyEnvelopeReport } from '../tooling/runtimeSafetyEnvelopeReport';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};

if (scripts['verify:runtime-safety-envelope'] !== 'npx tsx src/verify/runtimeSafetyEnvelope.verify.ts') {
  throw new Error('missing package script: verify:runtime-safety-envelope');
}

for (const file of [
  'src/tooling/runtimeSafetyEnvelopeReport.ts',
  'src/verify/runtimeSafetyEnvelope.verify.ts',
  'docs/review/RUNTIME_SAFETY_ENVELOPE.md',
]) {
  if (!existsSync(join(root, file))) throw new Error(`missing runtime safety envelope file: ${file}`);
}

const docs = readFileSync(join(root, 'docs/review/RUNTIME_SAFETY_ENVELOPE.md'), 'utf8').toLowerCase();
for (const phrase of [
  'runtime-freeze-v1',
  'safety tier',
  'maximum hydration backlog',
  'maximum deferred queue depth',
  'maximum reconnect storm',
  'maximum retry cascade depth',
  'maximum js stall window',
  'maximum render burst',
  'maximum interaction latency',
  'maximum memory retention',
  'non-intervention guarantee',
]) {
  if (!docs.includes(phrase)) throw new Error(`safety envelope docs missing phrase: ${phrase}`);
}

const report = buildRuntimeSafetyEnvelopeReport();
const requiredMetrics = [
  'runtimeSafetyEnvelopeScore',
  'hydrationBacklogLimit',
  'deferredQueueSafetyMargin',
  'reconnectStormRisk',
  'retryCascadeRisk',
  'jsStallSafetyWindow',
  'renderBurstTolerance',
  'interactionLatencyBudget',
  'memoryRetentionRisk',
  'backgroundRecoveryRisk',
  'unsafeTransitionRisk',
  'runtimeFreezeIntegrityScore',
] as const;

for (const metric of requiredMetrics) {
  if (!(metric in report.metrics)) throw new Error(`missing safety envelope metric: ${metric}`);
}

for (const tier of ['normal', 'degraded', 'unstable', 'critical', 'unsafe'] as const) {
  if (!report.safetyTierDefinitions[tier]) throw new Error(`missing safety tier definition: ${tier}`);
}

if (report.safetyBoundaries.length !== 10) {
  throw new Error(`expected 10 safety boundaries, got ${report.safetyBoundaries.length}`);
}

for (const boundary of report.safetyBoundaries) {
  if (boundary.normalLimit > boundary.degradedLimit) throw new Error(`invalid normal/degraded limit: ${boundary.name}`);
  if (boundary.degradedLimit > boundary.unstableLimit) throw new Error(`invalid degraded/unstable limit: ${boundary.name}`);
  if (boundary.unstableLimit > boundary.criticalLimit) throw new Error(`invalid unstable/critical limit: ${boundary.name}`);
  if (boundary.criticalLimit > boundary.unsafeLimit) throw new Error(`invalid critical/unsafe limit: ${boundary.name}`);
}

if (report.metrics.runtimeFreezeIntegrityScore !== 1) {
  throw new Error('runtime safety envelope must remain non-intervention and freeze-safe');
}

if (report.metrics.unsafeTransitionRisk !== 0) {
  throw new Error('runtime safety envelope should not classify current readonly boundaries as unsafe');
}

console.log(
  `runtimeSafetyEnvelope.verify: OK (${report.safetyBoundaries.length} boundaries, unsafe risk ${report.metrics.unsafeTransitionRisk})`,
);
console.log(
  `safety metrics: envelope ${report.metrics.runtimeSafetyEnvelopeScore}, hydrationLimit ${report.metrics.hydrationBacklogLimit}, freeze ${report.metrics.runtimeFreezeIntegrityScore}`,
);
