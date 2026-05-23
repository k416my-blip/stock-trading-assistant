/** Safe Mode Runtime — minimal survival profile. */
import { setSafeMode, isSafeModeActive } from './unifiedOrchestratorStorage';

export function enterSafeMode(reasonJa: string): void {
  setSafeMode(true);
  void reasonJa;
}

export function exitSafeModeIfAllowed(pressure: number, emergencyBrake: boolean): void {
  if (!emergencyBrake && pressure < 0.35) {
    setSafeMode(false);
  }
}

export { isSafeModeActive };

export function getSafeModePolicy(): {
  stopCuriosity: boolean;
  stopExploration: boolean;
  limitReplay: boolean;
  minimizeWebsocket: boolean;
  lightweightDashboard: boolean;
  lightGcOnly: boolean;
} {
  const active = isSafeModeActive();
  return {
    stopCuriosity: active,
    stopExploration: active,
    limitReplay: active,
    minimizeWebsocket: active,
    lightweightDashboard: active,
    lightGcOnly: active,
  };
}
