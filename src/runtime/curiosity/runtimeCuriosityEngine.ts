/**
 * Runtime Curiosity Engine — exploration / novelty / mutation pressure core.
 */
import type { CuriosityMode } from '../../types/runtimeCuriosity';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import { getConstitutionalDirectives, getLastConstitutionBundle } from '../constitution/runtimeConstitutionIntegration';
import { getConstitutionalState } from '../constitution/runtimeConstitutionCoordinator';
import { isHydrationLockActive } from '../stability/hydrationLock';
import { GOVERNANCE_FAIRNESS_MIN } from '../../constants/runtimeCuriosity';
import { isCuriosityCooldownActive } from './curiosityBudget';
import { getLastCuriosityTickMs } from './curiosityStorage';

export type RedmiCuriosityContext = {
  mode: CuriosityMode;
  allowMutation: boolean;
  allowSandbox: boolean;
  allowDeepExploration: boolean;
  reasonJa: string;
};

export function resolveRedmiCuriosityContext(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RedmiCuriosityContext {
  const constitution = getConstitutionalDirectives();
  const constState = getConstitutionalState();
  const bundle = getLastConstitutionBundle();
  const fairness =
    bundle?.senate?.budgetFairness ??
    Math.max(0, 1 - (bundle?.collapse?.asyncStarvationRisk ?? 0) * 0.5);
  const asyncStarvation = bundle?.collapse?.asyncStarvationRisk ?? 0;

  if (constState === 'CONSTITUTIONAL_CRISIS') {
    return {
      mode: 'frozen',
      allowMutation: false,
      allowSandbox: false,
      allowDeepExploration: false,
      reasonJa: 'constitutional crisis — curiosity frozen',
    };
  }

  if (!performance.appForeground) {
    return {
      mode: 'stopped',
      allowMutation: false,
      allowSandbox: false,
      allowDeepExploration: false,
      reasonJa: 'background — mutation prohibited',
    };
  }

  if (performance.batterySaverActive || metrics.native.batterySaverActive) {
    return {
      mode: 'stopped',
      allowMutation: false,
      allowSandbox: false,
      allowDeepExploration: false,
      reasonJa: 'battery saver — curiosity stopped',
    };
  }

  const thermalSevere =
    metrics.thermalState === 'severe' ||
    metrics.thermalState === 'critical' ||
    metrics.native.thermalThrottlingDetected;

  if (thermalSevere) {
    return {
      mode: 'frozen',
      allowMutation: false,
      allowSandbox: false,
      allowDeepExploration: false,
      reasonJa: 'thermal severe — sandbox freeze',
    };
  }

  if (metrics.websocket.reconnectStormDetected) {
    return {
      mode: 'deferred',
      allowMutation: false,
      allowSandbox: false,
      allowDeepExploration: false,
      reasonJa: 'ws reconnect storm — exploration prohibited',
    };
  }

  if (isHydrationLockActive()) {
    return {
      mode: 'deferred',
      allowMutation: false,
      allowSandbox: false,
      allowDeepExploration: false,
      reasonJa: 'hydration pause — sandbox stopped',
    };
  }

  if (constitution.replayFreeze || constitution.suppressExploration) {
    return {
      mode: 'lightweight',
      allowMutation: false,
      allowSandbox: constitution.sandboxExplorationOnly,
      allowDeepExploration: false,
      reasonJa: 'constitution — lightweight curiosity only',
    };
  }

  const mutationOk =
    fairness >= GOVERNANCE_FAIRNESS_MIN &&
    !constitution.replayFreeze &&
    asyncStarvation < 0.55;

  if (!mutationOk) {
    return {
      mode: 'sandbox_only',
      allowMutation: false,
      allowSandbox: true,
      allowDeepExploration: false,
      reasonJa: 'governance/async guard — sandbox only',
    };
  }

  if (isCuriosityCooldownActive(Date.now(), getLastCuriosityTickMs())) {
    return {
      mode: 'lightweight',
      allowMutation: false,
      allowSandbox: true,
      allowDeepExploration: false,
      reasonJa: '60s tick cooldown — lightweight',
    };
  }

  return {
    mode: 'sandbox_only',
    allowMutation: true,
    allowSandbox: true,
    allowDeepExploration: false,
    reasonJa: 'foreground sandbox curiosity',
  };
}
