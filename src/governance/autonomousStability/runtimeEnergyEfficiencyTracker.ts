let energyUnits = 0;
let recoveryEvents = 0;

export function resetRuntimeEnergyEfficiencyTrackerForTest(): void {
  energyUnits = 0;
  recoveryEvents = 0;
}

export function noteEnergySample(heapMb: number, lagMs: number): void {
  energyUnits += heapMb * 0.01 + lagMs * 0.002;
}

export function noteRecoveryEnergy(): void {
  recoveryEvents += 1;
}

export function getEnergyPerRecovery(): number {
  if (recoveryEvents === 0) return 0;
  return Math.round((energyUnits / recoveryEvents) * 100) / 100;
}
