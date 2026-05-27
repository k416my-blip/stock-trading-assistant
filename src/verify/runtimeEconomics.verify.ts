import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FROZEN_FULL_RUNTIME_VERIFY_COUNT,
  FROZEN_RUNTIME_LIGHT_SCRIPTS,
} from '../freeze/runtimeStabilizationOptimization';
import {
  buildRuntimeEconomicsExportBundle,
  runRuntimeEconomicsSimulations,
} from '../freeze/runtimeObservabilityEconomics';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';

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

if (!scripts['verify:runtime-economics']) {
  throw new Error('missing package script: verify:runtime-economics');
}

if (allRuntimeStacksSource.includes("'verify:runtime-economics'")) {
  throw new Error('verify:runtime-economics must not be registered as a runtime stack layer');
}

if (runtimeLightSource.includes("'verify:runtime-economics'")) {
  throw new Error('verify:runtime-economics must stay outside runtime-light frozen inventory');
}

if (!existsSync(join(root, 'docs/review/RUNTIME_OBSERVABILITY_ECONOMICS.md'))) {
  throw new Error('missing docs/review/RUNTIME_OBSERVABILITY_ECONOMICS.md');
}

const bundle = buildRuntimeEconomicsExportBundle();
const requiredEconomicsMetrics = [
  'observabilityCostIndex',
  'runtimeMaintenanceEntropy',
  'telemetryStoragePressure',
  'dashboardAttentionCost',
  'scenarioExecutionExpense',
  'verificationScalabilityIndex',
  'runtimeCognitiveCost',
  'operatorAttentionConsumption',
];

for (const metric of requiredEconomicsMetrics) {
  if (!(metric in bundle.observabilityEconomicsReport)) {
    throw new Error(`missing observability economics metric: ${metric}`);
  }
}

const requiredFailureMetrics = [
  'registryFailurePropagationRisk',
  'verifyCascadeFailureRisk',
  'telemetryFloodCollapseRisk',
  'dashboardHydrationFailureRisk',
  'recursiveDependencyBreakRisk',
  'soakExecutionDeadlockRisk',
  'scenarioIsolationFailureRisk',
  'runtimeFragmentationRisk',
];

for (const metric of requiredFailureMetrics) {
  if (!(metric in bundle.failureSurfaceReport)) {
    throw new Error(`missing failure surface metric: ${metric}`);
  }
}

const simulations = runRuntimeEconomicsSimulations();
if (simulations.length !== 6 || !simulations.every((simulation) => simulation.observeOnly)) {
  throw new Error('runtime economics simulations must be six observe-only results');
}

console.log(
  `runtimeEconomics.verify: OK (freeze runtime-light ${FROZEN_RUNTIME_LIGHT_SCRIPTS.length}, scenarios ${AUTOMATED_SOAK_SCENARIO_IDS.length}, simulations ${simulations.length})`,
);
console.log(
  `economics summary: cost ${bundle.observabilityEconomicsReport.observabilityCostIndex}, fragility ${bundle.operationalFragilityReport.maintainabilityFragilityScore}`,
);
