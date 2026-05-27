import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuntimeChaosReplayReport } from '../tooling/runtimeChaosReplayReport';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};

if (scripts['verify:runtime-chaos-replay'] !== 'npx tsx src/verify/runtimeChaosReplay.verify.ts') {
  throw new Error('missing package script: verify:runtime-chaos-replay');
}

for (const file of [
  'src/tooling/runtimeChaosReplayReport.ts',
  'src/verify/runtimeChaosReplay.verify.ts',
  'docs/review/RUNTIME_CHAOS_REPLAY_VALIDATION.md',
]) {
  if (!existsSync(join(root, file))) throw new Error(`missing runtime chaos replay file: ${file}`);
}

const docs = readFileSync(join(root, 'docs/review/RUNTIME_CHAOS_REPLAY_VALIDATION.md'), 'utf8').toLowerCase();
for (const phrase of [
  'runtime-freeze-v1',
  'reconnect storm replay',
  'rapid foreground/background replay',
  'hydration starvation replay',
  'render burst replay',
  'js stall cascade replay',
  'offline-online oscillation replay',
  'retry cascade replay',
  'recovery equivalence',
  'replay ordering',
  'chaos diagnostics',
  'non-intervention guarantee',
]) {
  if (!docs.includes(phrase)) throw new Error(`chaos replay docs missing phrase: ${phrase}`);
}

const report = buildRuntimeChaosReplayReport();
const requiredMetrics = [
  'runtimeChaosReplayScore',
  'recoveryEquivalenceScore',
  'replayOrderingIntegrityScore',
  'reconnectOscillationRisk',
  'retryAmplificationRisk',
  'hiddenStarvationRisk',
  'interactionBlackoutRisk',
  'hydrationRecoveryIntegrity',
  'deferredReplayIntegrity',
  'runtimeFreezeIntegrityScore',
] as const;

for (const metric of requiredMetrics) {
  if (!(metric in report.metrics)) throw new Error(`missing chaos replay metric: ${metric}`);
}

if (report.replaySequenceCoverage.length !== 12) {
  throw new Error(`expected 12 chaos replay sequences, got ${report.replaySequenceCoverage.length}`);
}

if (!report.replaySequenceCoverage.every((item) => item.equivalentRecovery)) {
  throw new Error('all chaos replay sequences must preserve recovery equivalence');
}

if (!report.replaySequenceCoverage.every((item) => item.orderingPreserved)) {
  throw new Error('all chaos replay sequences must preserve first/last ordering');
}

if (report.recoveryEquivalenceCoverage.length !== 6) {
  throw new Error('recovery equivalence coverage must include six requested categories');
}

if (report.replayOrderingValidation.length !== 6) {
  throw new Error('replay ordering validation must include six requested categories');
}

if (report.chaosDiagnosticsCoverage.length !== 10) {
  throw new Error('chaos diagnostics coverage must include ten requested diagnostics');
}

for (const metric of [
  'runtimeChaosReplayScore',
  'recoveryEquivalenceScore',
  'replayOrderingIntegrityScore',
  'hydrationRecoveryIntegrity',
  'deferredReplayIntegrity',
  'runtimeFreezeIntegrityScore',
] as const) {
  if (report.metrics[metric] !== 1) {
    throw new Error(`chaos replay equivalence metric must be 1: ${metric}`);
  }
}

for (const metric of [
  'reconnectOscillationRisk',
  'retryAmplificationRisk',
  'hiddenStarvationRisk',
  'interactionBlackoutRisk',
] as const) {
  if (report.metrics[metric] !== 0) {
    throw new Error(`chaos replay risk metric must be 0 after normalization: ${metric}`);
  }
}

console.log(
  `runtimeChaosReplay.verify: OK (sequences ${report.replaySequenceCoverage.length}, diagnostics ${report.chaosDiagnosticsCoverage.length})`,
);
console.log(
  `chaos replay metrics: replay ${report.metrics.runtimeChaosReplayScore}, ordering ${report.metrics.replayOrderingIntegrityScore}, freeze ${report.metrics.runtimeFreezeIntegrityScore}`,
);
