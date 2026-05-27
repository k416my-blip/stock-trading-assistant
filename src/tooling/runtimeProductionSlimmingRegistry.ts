import type { AutomatedSoakScenarioId } from '../types/automatedSoakRunner';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';

export type VerifyTier = 'critical' | 'standard' | 'extended' | 'nightly' | 'archive';

export const PRODUCTION_SOAK_SCENARIO_IDS = [
  'foreground_background',
  'websocket_disconnect',
  'thermal_stress',
  'battery_saver',
  'memory_pressure',
  'native_kill_recovery',
] as const satisfies readonly AutomatedSoakScenarioId[];

export const OPTIONAL_SOAK_SCENARIO_IDS = [
  'async_flood',
  'replay_flood',
  'dashboard_render_storm',
  'android_lifecycle_stress',
  'runtime_self_recursion_endurance',
  'runtime_telemetry_entropy',
  'runtime_cognitive_governance',
  'runtime_civilization_topology',
] as const satisfies readonly AutomatedSoakScenarioId[];

export const ARCHIVED_SOAK_SCENARIO_IDS = AUTOMATED_SOAK_SCENARIO_IDS.filter(
  (id): id is Exclude<AutomatedSoakScenarioId, (typeof PRODUCTION_SOAK_SCENARIO_IDS)[number] | (typeof OPTIONAL_SOAK_SCENARIO_IDS)[number]> =>
    !(PRODUCTION_SOAK_SCENARIO_IDS as readonly AutomatedSoakScenarioId[]).includes(id) &&
    !(OPTIONAL_SOAK_SCENARIO_IDS as readonly AutomatedSoakScenarioId[]).includes(id),
);

export const VERIFY_TIER_REGISTRY: Record<VerifyTier, readonly string[]> = {
  critical: [
    'verify:runtime-light',
    'verify:diagnostics',
    'verify:security',
  ],
  standard: [
    'verify:runtime-stabilization',
    'verify:runtime-economics',
    'verify:runtime-operational-core',
  ],
  extended: [
    'verify:soak-runner',
    'verify:native-telemetry',
    'verify:telemetry-overhead',
    'verify:runtime-full',
  ],
  nightly: [
    'verify:full-release',
    'verify:full-audit',
    'test:unit:full',
  ],
  archive: [
    'verify:runtime-semantic-thermodynamics',
    'verify:runtime-semantic-phase-transition',
    'verify:runtime-adaptive-observation',
    'verify:runtime-observer-reality',
    'verify:runtime-inter-civilization',
    'verify:runtime-governance-freeze',
  ],
};

export const RUNTIME_LIGHT_VERIFY_SCRIPTS = [
  ...VERIFY_TIER_REGISTRY.critical,
  ...VERIFY_TIER_REGISTRY.standard,
] as const;

export const EXPORT_REGISTRY_SEGMENTS = {
  production: ['production slimming report', 'runtime weight report', 'verify cost report'],
  operational: ['dashboard cost report', 'dependency slimming report'],
  archive: ['archive migration report', 'cold-storage scenario inventory'],
} as const;

export const DASHBOARD_SLIMMING_REGISTRY = {
  executive: ['survival status', 'freeze integrity', 'production cost delta'],
  engineering: ['runtime-light registry', 'verify tier health', 'scenario tier inventory'],
  archive: ['semantic expansion history', 'long-form phase panels', 'low-frequency topology retrospectives'],
  observabilityDebug: ['economics simulations', 'operational-core simulations', 'archive migration candidates'],
} as const;

export const COLD_STORAGE_SCENARIO_INVENTORY = ARCHIVED_SOAK_SCENARIO_IDS.map((id) => ({
  id,
  archiveReason: 'post-freeze optional civilization analysis',
  executionPolicy: 'manual or scheduled diagnostic only',
}));
