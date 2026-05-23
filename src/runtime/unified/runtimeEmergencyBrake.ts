/** Runtime Emergency Brake — minimum layers only. */
import { setEmergencyBrake, isEmergencyBrakeActive } from './unifiedOrchestratorStorage';

export function activateEmergencyBrake(reasonJa: string): void {
  setEmergencyBrake(true);
  void reasonJa;
}

export function releaseEmergencyBrakeIfSafe(cascadeRisk: number, recoveryEmergency: boolean): void {
  if (!recoveryEmergency && cascadeRisk < 0.45) {
    setEmergencyBrake(false);
  }
}

export { isEmergencyBrakeActive };
