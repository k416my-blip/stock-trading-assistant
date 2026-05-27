import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUTOMATED_SOAK_SCENARIO_LABELS_JA } from '../constants/automatedSoakRunner';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';
import {
  ARCHIVED_SOAK_SCENARIO_IDS,
  COLD_STORAGE_SCENARIO_INVENTORY,
  OPTIONAL_SOAK_SCENARIO_IDS,
  PRODUCTION_SOAK_SCENARIO_IDS,
  RUNTIME_LIGHT_VERIFY_SCRIPTS,
} from '../tooling/runtimeProductionSlimmingRegistry';

type PackageJson = {
  scripts?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const scripts = packageJson.scripts ?? {};
const frozenScenarioIds = [...AUTOMATED_SOAK_SCENARIO_IDS];
const runtimeLightScenarioIds = [...PRODUCTION_SOAK_SCENARIO_IDS, ...OPTIONAL_SOAK_SCENARIO_IDS];
const segmentedScenarioIds = [...runtimeLightScenarioIds, ...ARCHIVED_SOAK_SCENARIO_IDS];
const duplicateScenarioIds = segmentedScenarioIds.filter((id, index) => segmentedScenarioIds.indexOf(id) !== index);

if (duplicateScenarioIds.length > 0) {
  throw new Error(`duplicate automated soak scenario ids: ${duplicateScenarioIds.join(', ')}`);
}

if (segmentedScenarioIds.length !== frozenScenarioIds.length) {
  throw new Error(`scenario segmentation changed frozen size: ${segmentedScenarioIds.length}`);
}

if (COLD_STORAGE_SCENARIO_INVENTORY.length !== ARCHIVED_SOAK_SCENARIO_IDS.length) {
  throw new Error('cold-storage scenario inventory must match archived scenario ids');
}

for (const id of runtimeLightScenarioIds) {
  if (!AUTOMATED_SOAK_SCENARIO_LABELS_JA[id]) {
    throw new Error(`missing automated soak scenario label: ${id}`);
  }
}

const rotatorSource = readFileSync(join(root, 'src/native/soak/automatedScenarioRotator.ts'), 'utf8');
for (const id of runtimeLightScenarioIds) {
  if (!rotatorSource.includes(`case '${id}'`)) {
    throw new Error(`automated scenario is not registered in rotator: ${id}`);
  }
}

const expectedRuntimeScripts = [...RUNTIME_LIGHT_VERIFY_SCRIPTS];

for (const script of expectedRuntimeScripts) {
  if (!scripts[script]) throw new Error(`missing package script: ${script}`);
}

if (scripts['verify:runtime-full'] !== 'npm run verify:all-runtime-stacks') {
  throw new Error('verify:runtime-full must delegate to verify:all-runtime-stacks');
}

if (!scripts['verify:quick']?.includes('verify:critical')) {
  throw new Error('verify:quick must include verify:critical');
}

if (!scripts['verify:critical']?.includes('verify:runtime-light')) {
  throw new Error('verify:critical must include verify:runtime-light');
}

if (scripts['verify:quick']?.includes('verify:all-runtime-stacks')) {
  throw new Error('verify:quick must not run verify:all-runtime-stacks');
}

const requiredEntrypoints = [
  'src/tooling/runtimeProductionSlimmingRegistry.ts',
  'src/freeze/runtimeStabilizationOptimization.ts',
  'src/freeze/runtimeObservabilityEconomics.ts',
  'src/freeze/runtimeOperationalCoreExtraction.ts',
];

for (const relativePath of requiredEntrypoints) {
  if (!existsSync(join(root, relativePath))) {
    throw new Error(`missing runtime entrypoint: ${relativePath}`);
  }
}

console.log(
  `runtimeRegistryLight.verify: OK (${runtimeLightScenarioIds.length} production/optional scenarios, ${ARCHIVED_SOAK_SCENARIO_IDS.length} archived scenarios, ${expectedRuntimeScripts.length} critical+standard scripts)`,
);
