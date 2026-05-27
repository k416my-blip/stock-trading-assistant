import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuntimeDeterminismValidationReport } from '../tooling/runtimeDeterminismValidationReport';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};

if (scripts['verify:runtime-determinism'] !== 'npx tsx src/verify/runtimeDeterminism.verify.ts') {
  throw new Error('missing package script: verify:runtime-determinism');
}

const requiredFiles = [
  'src/tooling/runtimeDeterminismValidationReport.ts',
  'src/verify/runtimeDeterminism.verify.ts',
  'docs/review/RUNTIME_DETERMINISM_VALIDATION.md',
];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) throw new Error(`missing runtime determinism file: ${file}`);
}

const docs = readFileSync(join(root, 'docs/review/RUNTIME_DETERMINISM_VALIDATION.md'), 'utf8').toLowerCase();
for (const requiredPhrase of [
  'runtime-freeze-v1',
  'determinism validation theory',
  'timing-independent state consistency',
  'hydration equivalence',
  'reconnect equivalence',
  'retry ordering equivalence',
  'async lifecycle ordering',
  'state snapshot normalization',
  'non-intervention guarantee',
]) {
  if (!docs.includes(requiredPhrase)) {
    throw new Error(`determinism docs missing phrase: ${requiredPhrase}`);
  }
}

const report = buildRuntimeDeterminismValidationReport();
const requiredMetrics = [
  'determinismScore',
  'stateConsistencyScore',
  'timingIndependenceScore',
  'asyncOrderingSafetyScore',
  'hydrationEquivalenceScore',
  'reconnectEquivalenceScore',
  'retryEquivalenceScore',
  'runtimeFreezeIntegrityScore',
] as const;

for (const metric of requiredMetrics) {
  if (!(metric in report.metrics)) throw new Error(`missing determinism metric: ${metric}`);
  if (report.metrics[metric] < 1) throw new Error(`determinism metric below full consistency: ${metric}`);
}

if (report.deterministicReplayValidator.length < 7) {
  throw new Error('deterministic replay validator must cover hydration/reconnect/retry/offline/AppState/deferred/governor');
}

if (!report.deterministicReplayValidator.every((item) => item.equivalent)) {
  throw new Error('all deterministic replay validations must be equivalent');
}

if (!report.stateConsistencySnapshots.every((item) => item.consistent)) {
  throw new Error('state consistency snapshots must normalize to identical semantics');
}

for (const expected of [
  'delayed hydration equivalence',
  'deferred UI activation equivalence',
  'retry ordering equivalence',
  'reconnect pacing equivalence',
  'background/foreground transition equivalence',
  'governor suppression equivalence',
]) {
  if (!report.timingIndependentValidation.includes(expected)) {
    throw new Error(`missing timing-independent validation: ${expected}`);
  }
}

for (const expected of [
  'duplicate request ordering',
  'stale response rejection',
  'in-flight dedupe ordering',
  'retry cascade ordering',
  'deferred queue ordering',
  'lifecycle cleanup ordering',
]) {
  if (!report.asyncOrderingValidation.includes(expected)) {
    throw new Error(`missing async ordering validation: ${expected}`);
  }
}

console.log(
  `runtimeDeterminism.verify: OK (replays ${report.deterministicReplayValidator.length}, snapshots ${report.stateConsistencySnapshots.length})`,
);
console.log(
  `determinism metrics: determinism ${report.metrics.determinismScore}, stateConsistency ${report.metrics.stateConsistencyScore}, runtimeFreezeIntegrity ${report.metrics.runtimeFreezeIntegrityScore}`,
);
