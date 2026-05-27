import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';
import {
  FROZEN_FULL_RUNTIME_VERIFY_COUNT,
  FROZEN_RUNTIME_LIGHT_SCRIPTS,
} from '../freeze/runtimeStabilizationOptimization';
import {
  buildOperationalCoreExportBundle,
  runOperationalCoreSimulations,
} from '../freeze/runtimeOperationalCoreExtraction';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};
const freezeDoc = readFileSync(join(root, 'docs/FREEZE_STATE.md'), 'utf8');
const allRuntimeStacksSource = readFileSync(join(root, 'src/verify/allRuntimeStacks.verify.ts'), 'utf8');
const runtimeLightSource = readFileSync(join(root, 'src/verify/runtimeRegistryLight.verify.ts'), 'utf8');

if (!freezeDoc.includes('runtime-freeze-v1')) {
  throw new Error('runtime-freeze-v1 freeze document is missing');
}

if (AUTOMATED_SOAK_SCENARIO_IDS.length !== 26) {
  throw new Error(`runtime-freeze-v1 scenario inventory changed: ${AUTOMATED_SOAK_SCENARIO_IDS.length}`);
}

if (FROZEN_RUNTIME_LIGHT_SCRIPTS.length !== 16) {
  throw new Error(`runtime-freeze-v1 runtime-light inventory changed: ${FROZEN_RUNTIME_LIGHT_SCRIPTS.length}`);
}

if (FROZEN_FULL_RUNTIME_VERIFY_COUNT !== 41) {
  throw new Error(`runtime-freeze-v1 full verify inventory changed: ${FROZEN_FULL_RUNTIME_VERIFY_COUNT}`);
}

if (!scripts['verify:runtime-operational-core']) {
  throw new Error('missing package script: verify:runtime-operational-core');
}

if (allRuntimeStacksSource.includes("'verify:runtime-operational-core'")) {
  throw new Error('verify:runtime-operational-core must not be registered as a runtime stack layer');
}

if (runtimeLightSource.includes("'verify:runtime-operational-core'")) {
  throw new Error('verify:runtime-operational-core must stay outside runtime-light frozen inventory');
}

if (!existsSync(join(root, 'docs/review/RUNTIME_OPERATIONAL_CORE.md'))) {
  throw new Error('missing docs/review/RUNTIME_OPERATIONAL_CORE.md');
}

const bundle = buildOperationalCoreExportBundle();
if (bundle.scenarioReductionAnalysis.length !== 26) {
  throw new Error(`scenario reduction analysis must classify 26 scenarios, got ${bundle.scenarioReductionAnalysis.length}`);
}

if (bundle.verifyReductionAnalysis.length !== 41) {
  throw new Error(`verify reduction analysis must classify 41 verifies, got ${bundle.verifyReductionAnalysis.length}`);
}

const requiredReductionMetrics = [
  'observabilityReductionPotential',
  'telemetryNoiseRatio',
  'dashboardSignalEfficiency',
  'operatorAttentionEfficiency',
  'runtimeSignalValueDensity',
  'maintenanceReductionGain',
  'runtimeComplexityCompression',
  'operationalSimplicityScore',
];

for (const metric of requiredReductionMetrics) {
  if (!(metric in bundle.observabilityReductionReport)) {
    throw new Error(`missing observability reduction metric: ${metric}`);
  }
}

const simulations = runOperationalCoreSimulations();
if (simulations.length !== 5 || !simulations.every((simulation) => simulation.observeOnly)) {
  throw new Error('runtime operational core simulations must be five observe-only results');
}

const optionalScenarios = bundle.scenarioReductionAnalysis.filter((row) => row.classification === 'optional').length;
const nightlyOrArchivedVerify = bundle.verifyReductionAnalysis.filter(
  (row) => row.classification === 'nightly' || row.classification === 'archived',
).length;

console.log(
  `runtimeOperationalCore.verify: OK (scenarios 26, verifies 41, optional scenarios ${optionalScenarios}, deferred verifies ${nightlyOrArchivedVerify})`,
);
console.log(
  `operational projections: cost delta ${simulations[0]?.projectedCostDelta}, verify reduction candidates ${nightlyOrArchivedVerify}, scenario reduction candidates ${optionalScenarios}`,
);
