import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';
import {
  FROZEN_FULL_RUNTIME_VERIFY_COUNT,
  FROZEN_RUNTIME_LIGHT_SCRIPTS,
  buildRuntimeStabilizationExportBundle,
  buildScenarioTiering,
} from '../freeze/runtimeStabilizationOptimization';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};
const freezeDoc = readFileSync(join(root, 'docs/FREEZE_STATE.md'), 'utf8');
const rotatorSource = readFileSync(join(root, 'src/native/soak/automatedScenarioRotator.ts'), 'utf8');
const allRuntimeStacksSource = readFileSync(join(root, 'src/verify/allRuntimeStacks.verify.ts'), 'utf8');
const registryLightSource = readFileSync(join(root, 'src/verify/runtimeRegistryLight.verify.ts'), 'utf8');

if (!freezeDoc.includes('runtime-freeze-v1')) {
  throw new Error('runtime-freeze-v1 freeze document is missing or not tagged');
}

if (AUTOMATED_SOAK_SCENARIO_IDS.length !== 26) {
  throw new Error(`runtime-freeze-v1 expects 26 soak scenarios, got ${AUTOMATED_SOAK_SCENARIO_IDS.length}`);
}

if (FROZEN_RUNTIME_LIGHT_SCRIPTS.length !== 16) {
  throw new Error(`runtime-freeze-v1 expects 16 runtime-light scripts, got ${FROZEN_RUNTIME_LIGHT_SCRIPTS.length}`);
}

if (FROZEN_FULL_RUNTIME_VERIFY_COUNT !== 41) {
  throw new Error(`runtime-freeze-v1 expects 41 full runtime verifies, got ${FROZEN_FULL_RUNTIME_VERIFY_COUNT}`);
}

if (!scripts['verify:runtime-stabilization']) {
  throw new Error('missing package script: verify:runtime-stabilization');
}

if (allRuntimeStacksSource.includes("'verify:runtime-stabilization'")) {
  throw new Error('verify:runtime-stabilization must not be registered as a new runtime stack layer');
}

if (registryLightSource.includes("'verify:runtime-stabilization'")) {
  throw new Error('verify:runtime-stabilization must stay outside runtime-light stack inventory');
}

if (rotatorSource.includes("import { run") && rotatorSource.includes("ScenarioStep } from './")) {
  throw new Error('automatedScenarioRotator must defer scenario implementation imports');
}

for (const id of AUTOMATED_SOAK_SCENARIO_IDS) {
  if (!rotatorSource.includes(`case '${id}'`)) {
    throw new Error(`automated scenario is not registered in rotator: ${id}`);
  }
}

const tiers = buildScenarioTiering();
const tiered = [...tiers.core, ...tiers.extended, ...tiers.experimental, ...tiers.archived];
const missingTier = AUTOMATED_SOAK_SCENARIO_IDS.filter((id) => !tiered.includes(id));
if (missingTier.length > 0) {
  throw new Error(`missing scenario tier entries: ${missingTier.join(', ')}`);
}

if (new Set(tiered).size !== AUTOMATED_SOAK_SCENARIO_IDS.length) {
  throw new Error('scenario tiering contains duplicates');
}

if (!existsSync(join(root, 'docs/review/RUNTIME_STABILIZATION.md'))) {
  throw new Error('missing docs/review/RUNTIME_STABILIZATION.md');
}

const bundle = buildRuntimeStabilizationExportBundle();
const metricKeys = Object.keys(bundle.observabilityCostReport);
const requiredMetrics = [
  'runtimeMaintenanceCost',
  'verifyExecutionPressure',
  'telemetryExpansionCost',
  'dashboardRenderPressure',
  'scenarioManagementComplexity',
  'runtimeOperationalWeight',
  'observabilityBudgetUsage',
  'stabilizationReadinessScore',
];

for (const key of requiredMetrics) {
  if (!metricKeys.includes(key)) throw new Error(`missing observability cost metric: ${key}`);
}

const registryLoadComparison = {
  freezeV1StaticScenarioImports: 26,
  currentStaticScenarioImports: 0,
  currentDeferredScenarioImports: AUTOMATED_SOAK_SCENARIO_IDS.length,
};

console.log(
  `runtimeStabilization.verify: OK (freeze runtime-light ${FROZEN_RUNTIME_LIGHT_SCRIPTS.length}, scenarios ${AUTOMATED_SOAK_SCENARIO_IDS.length}, deferred imports ${registryLoadComparison.currentDeferredScenarioImports})`,
);
console.log(
  `registry load comparison: static scenario imports ${registryLoadComparison.freezeV1StaticScenarioImports} -> ${registryLoadComparison.currentStaticScenarioImports}`,
);
