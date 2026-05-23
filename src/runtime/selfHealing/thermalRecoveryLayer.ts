/**
 * Thermal recovery — deep freeze >=75%, staged recovery <=55%.
 */
import type { ThermalRecoveryState } from '../../types/runtimeSelfHealing';
import { THERMAL_DEEP_FREEZE_PCT, THERMAL_STAGED_RECOVERY_PCT } from '../../constants/runtimeSelfHealing';

let lastState: ThermalRecoveryState = {
  thermalPressurePct: 0,
  deepAnalysisFrozen: false,
  dashboardCompact: false,
  websocketLowFrequency: false,
  adaptiveLearningPaused: false,
  renderSuppressed: false,
  stagedRecoveryActive: false,
};

export function resetThermalRecoveryForTest(): void {
  lastState = {
    thermalPressurePct: 0,
    deepAnalysisFrozen: false,
    dashboardCompact: false,
    websocketLowFrequency: false,
    adaptiveLearningPaused: false,
    renderSuppressed: false,
    stagedRecoveryActive: false,
  };
}

function thermalToPressurePct(thermalState: string, memoryTrendPct: number): number {
  const map: Record<string, number> = {
    none: 15,
    light: 35,
    moderate: 55,
    severe: 78,
    critical: 92,
    emergency: 98,
    shutdown: 100,
  };
  const base = map[thermalState] ?? 25;
  return Math.min(100, Math.round(base + memoryTrendPct * 0.08));
}

export function evaluateThermalRecovery(
  thermalState: string,
  memoryTrendPct: number,
  batterySaver: boolean,
): ThermalRecoveryState {
  const thermalPressurePct = thermalToPressurePct(thermalState, memoryTrendPct);
  const deepFreeze = thermalPressurePct >= THERMAL_DEEP_FREEZE_PCT || batterySaver;

  if (deepFreeze) {
    lastState = {
      thermalPressurePct,
      deepAnalysisFrozen: true,
      dashboardCompact: true,
      websocketLowFrequency: true,
      adaptiveLearningPaused: true,
      renderSuppressed: true,
      stagedRecoveryActive: false,
    };
    return lastState;
  }

  const stagedRecovery = thermalPressurePct <= THERMAL_STAGED_RECOVERY_PCT;
  lastState = {
    thermalPressurePct,
    deepAnalysisFrozen: false,
    dashboardCompact: thermalPressurePct > 60,
    websocketLowFrequency: thermalPressurePct > 65,
    adaptiveLearningPaused: thermalPressurePct > 70,
    renderSuppressed: thermalPressurePct > 68,
    stagedRecoveryActive: stagedRecovery,
  };
  return lastState;
}

export function getLastThermalRecoveryState(): ThermalRecoveryState {
  return lastState;
}
