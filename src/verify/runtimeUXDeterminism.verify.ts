import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuntimeUXDeterminismReport } from '../tooling/runtimeUXDeterminismReport';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};

if (scripts['verify:runtime-ux-determinism'] !== 'npx tsx src/verify/runtimeUXDeterminism.verify.ts') {
  throw new Error('missing package script: verify:runtime-ux-determinism');
}

for (const file of [
  'src/tooling/runtimeUXDeterminismReport.ts',
  'src/verify/runtimeUXDeterminism.verify.ts',
  'docs/review/RUNTIME_UX_DETERMINISM.md',
]) {
  if (!existsSync(join(root, file))) throw new Error(`missing UX determinism file: ${file}`);
}

const docs = readFileSync(join(root, 'docs/review/RUNTIME_UX_DETERMINISM.md'), 'utf8').toLowerCase();
for (const phrase of [
  'runtime-freeze-v1 maintained',
  'ux determinism theory',
  'interaction semantic equivalence',
  'visual hydration equivalence',
  'progressive reveal consistency',
  'perceived latency consistency',
  'reconnect ux equivalence',
  'interaction readiness validation',
  'loading phase equivalence',
  'non-intervention guarantee',
]) {
  if (!docs.includes(phrase)) throw new Error(`UX determinism docs missing phrase: ${phrase}`);
}

const report = buildRuntimeUXDeterminismReport();
const requiredMetrics = [
  'uxDeterminismScore',
  'interactionConsistencyScore',
  'visualHydrationEquivalenceScore',
  'loadingPhaseEquivalenceScore',
  'interactionReadinessScore',
  'perceivedLatencyConsistencyScore',
  'reconnectUXEquivalenceScore',
  'progressiveRevealConsistencyScore',
  'runtimeFreezeIntegrityScore',
] as const;

for (const metric of requiredMetrics) {
  if (!(metric in report.metrics)) throw new Error(`missing UX determinism metric: ${metric}`);
  if (report.metrics[metric] < 1) throw new Error(`UX determinism metric below equivalence: ${metric}`);
}

if (report.uxDeterminismReplayValidator.length < 8) {
  throw new Error('UX determinism replay validator must cover all requested replay kinds');
}

if (!report.uxDeterminismReplayValidator.every((item) => item.equivalent)) {
  throw new Error('all UX replay validations must be equivalent after timing normalization');
}

if (!report.interactionSemanticConsistency.every((item) => item.equivalent)) {
  throw new Error('interaction semantic consistency must remain equivalent');
}

for (const expected of [
  'hydration stage ordering',
  'deferred activation visibility ordering',
  'placeholder-to-content transition ordering',
  'analytics/archive reveal ordering',
  'proactive card reveal ordering',
  'AI settings expansion ordering',
  'staged hydration equivalence',
]) {
  if (!report.visualHydrationEquivalence.includes(expected)) {
    throw new Error(`missing visual hydration equivalence: ${expected}`);
  }
}

for (const expected of [
  'loading indicator timing equivalence',
  'loading dismissal ordering',
  'retry loading ordering',
  'reconnect loading ordering',
  'background resume loading ordering',
  'hydration completion visibility ordering',
]) {
  if (!report.loadingPhaseEquivalence.includes(expected)) {
    throw new Error(`missing loading phase equivalence: ${expected}`);
  }
}

for (const expected of [
  'toast/snackbar ordering',
  'reconnect notification ordering',
  'suggestion visibility ordering',
  'background refresh visibility ordering',
  'hydration completion ordering',
  'interaction unlock ordering',
]) {
  if (!report.uxAsyncOrderingValidation.includes(expected)) {
    throw new Error(`missing UX async ordering validation: ${expected}`);
  }
}

console.log(
  `runtimeUXDeterminism.verify: OK (replays ${report.uxDeterminismReplayValidator.length}, interaction checks ${report.interactionSemanticConsistency.length})`,
);
console.log(
  `UX determinism metrics: ux ${report.metrics.uxDeterminismScore}, interaction ${report.metrics.interactionConsistencyScore}, freeze ${report.metrics.runtimeFreezeIntegrityScore}`,
);
