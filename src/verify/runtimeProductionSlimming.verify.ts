import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';
import {
  ARCHIVED_SOAK_SCENARIO_IDS,
  COLD_STORAGE_SCENARIO_INVENTORY,
  OPTIONAL_SOAK_SCENARIO_IDS,
  PRODUCTION_SOAK_SCENARIO_IDS,
  RUNTIME_LIGHT_VERIFY_SCRIPTS,
  VERIFY_TIER_REGISTRY,
} from '../tooling/runtimeProductionSlimmingRegistry';
import { buildProductionSlimmingReportBundle } from '../tooling/runtimeProductionSlimming';

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

for (const script of ['verify:critical', 'verify:standard', 'verify:extended', 'verify:nightly']) {
  if (!scripts[script]) throw new Error(`missing package script: ${script}`);
}

for (const script of ['verify:runtime-production-slimming', 'verify:runtime-operational-core']) {
  if (!scripts[script]) throw new Error(`missing package script: ${script}`);
}

if (allRuntimeStacksSource.includes("'verify:runtime-production-slimming'")) {
  throw new Error('verify:runtime-production-slimming must not be registered as a runtime stack layer');
}

if (!runtimeLightSource.includes('RUNTIME_LIGHT_VERIFY_SCRIPTS')) {
  throw new Error('runtime-light must use production slimming verify tier registry');
}

const segmentedScenarios = [
  ...PRODUCTION_SOAK_SCENARIO_IDS,
  ...OPTIONAL_SOAK_SCENARIO_IDS,
  ...ARCHIVED_SOAK_SCENARIO_IDS,
];
if (segmentedScenarios.length !== AUTOMATED_SOAK_SCENARIO_IDS.length) {
  throw new Error(`scenario segmentation changed inventory size: ${segmentedScenarios.length}`);
}

if (new Set(segmentedScenarios).size !== AUTOMATED_SOAK_SCENARIO_IDS.length) {
  throw new Error('scenario segmentation contains duplicate scenario ids');
}

if (COLD_STORAGE_SCENARIO_INVENTORY.length !== ARCHIVED_SOAK_SCENARIO_IDS.length) {
  throw new Error('cold-storage scenario inventory must match archived scenario count');
}

const expectedRuntimeLight = [...VERIFY_TIER_REGISTRY.critical, ...VERIFY_TIER_REGISTRY.standard];
if (RUNTIME_LIGHT_VERIFY_SCRIPTS.join('|') !== expectedRuntimeLight.join('|')) {
  throw new Error('runtime-light must contain critical + standard verify tiers only');
}

if (!existsSync(join(root, 'docs/review/RUNTIME_PRODUCTION_SLIMMING.md'))) {
  throw new Error('missing docs/review/RUNTIME_PRODUCTION_SLIMMING.md');
}

const bundle = buildProductionSlimmingReportBundle();
const metrics = bundle.metrics;
const requiredMetrics = [
  'runtimeWeightReduction',
  'registryCompressionGain',
  'verifyExecutionReduction',
  'dashboardRenderReduction',
  'observabilityCostReduction',
  'dependencyLoadReduction',
  'operationalSimplicityGain',
];

for (const metric of requiredMetrics) {
  if (!(metric in metrics)) throw new Error(`missing production slimming metric: ${metric}`);
}

console.log(
  `runtimeProductionSlimming.verify: OK (production scenarios ${PRODUCTION_SOAK_SCENARIO_IDS.length}, optional ${OPTIONAL_SOAK_SCENARIO_IDS.length}, archived ${ARCHIVED_SOAK_SCENARIO_IDS.length})`,
);
console.log(
  `slimming summary: runtimeWeightReduction ${metrics.runtimeWeightReduction}, verifyExecutionReduction ${metrics.verifyExecutionReduction}, registryCompressionGain ${metrics.registryCompressionGain}`,
);
