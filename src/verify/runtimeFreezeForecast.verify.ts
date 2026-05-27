import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRuntimeFreezeForecastReport } from '../tooling/runtimeFreezeForecastReport';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};

if (scripts['verify:runtime-freeze-forecast'] !== 'npx tsx src/verify/runtimeFreezeForecast.verify.ts') {
  throw new Error('missing package script: verify:runtime-freeze-forecast');
}

for (const file of [
  'src/tooling/runtimeFreezeForecastReport.ts',
  'src/verify/runtimeFreezeForecast.verify.ts',
  'docs/review/RUNTIME_FREEZE_FORECAST.md',
]) {
  if (!existsSync(join(root, file))) throw new Error(`missing runtime freeze forecast file: ${file}`);
}

const docs = readFileSync(join(root, 'docs/review/RUNTIME_FREEZE_FORECAST.md'), 'utf8').toLowerCase();
for (const phrase of [
  'runtime-freeze-v1 maintained',
  'forecast coverage',
  'freeze precursor forecast',
  'js stall escalation forecast',
  'hydration starvation forecast',
  'reconnect storm forecast',
  'retry cascade forecast',
  'long-session instability forecast',
  'stability modeling',
  'forecast windows',
  'non-intervention guarantee',
]) {
  if (!docs.includes(phrase)) throw new Error(`freeze forecast docs missing phrase: ${phrase}`);
}

const report = buildRuntimeFreezeForecastReport();
const requiredMetrics = [
  'runtimeForecastScore',
  'freezeRiskForecast',
  'sessionDegradationForecast',
  'reconnectInstabilityForecast',
  'hydrationStarvationForecast',
  'queueCongestionForecast',
  'interactionDriftForecast',
  'renderBurstForecast',
  'jsStallEscalationForecast',
  'runtimeFreezeIntegrityScore',
] as const;

for (const metric of requiredMetrics) {
  if (!(metric in report.metrics)) throw new Error(`missing freeze forecast metric: ${metric}`);
}

if (report.forecastCoverage.length !== 12) {
  throw new Error(`expected 12 forecast targets, got ${report.forecastCoverage.length}`);
}

for (const window of ['30s', '2m', '5m', '15m', '1h']) {
  if (!report.forecastWindowCoverage.includes(window as never)) {
    throw new Error(`missing forecast window: ${window}`);
  }
}

if (report.forecastTelemetryInputs.length !== 11) {
  throw new Error('forecast telemetry inputs must include 11 requested input categories');
}

if (report.precursorDiagnosticsCoverage.length !== 9) {
  throw new Error('precursor diagnostics coverage must include 9 requested precursors');
}

if (report.stabilityModelingCoverage.length !== 8) {
  throw new Error('stability modeling coverage must include 8 requested models');
}

if (report.metrics.runtimeForecastScore !== 1) {
  throw new Error('runtime forecast score must show complete forecast-window coverage');
}

if (report.metrics.runtimeFreezeIntegrityScore !== 1) {
  throw new Error('freeze forecast must remain readonly and non-intervention');
}

console.log(
  `runtimeFreezeForecast.verify: OK (targets ${report.forecastCoverage.length}, windows ${report.forecastWindowCoverage.length})`,
);
console.log(
  `forecast metrics: coverage ${report.metrics.runtimeForecastScore}, freezeRisk ${report.metrics.freezeRiskForecast}, freezeIntegrity ${report.metrics.runtimeFreezeIntegrityScore}`,
);
