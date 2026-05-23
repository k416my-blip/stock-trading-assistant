import type { AutomatedSoakMeasurements } from '../../types/automatedSoakRunner';

export function computeContinuousSurvivalScore(
  measurements: AutomatedSoakMeasurements,
  freezeCount: number,
  deadlockRisk: number,
): number {
  let score = 100;
  if (measurements.backgroundRecoverySuccessRate < 0.8) score -= 15;
  if (measurements.websocketRecoverySuccessRate < 0.8) score -= 15;
  if (measurements.memoryDriftPerHourMb > 40) score -= 10;
  if (measurements.replayDriftPerHour > 30) score -= 8;
  if (measurements.tickStallFrequency > 20) score -= 12;
  if (measurements.jsStallDurationMsPeak > 800) score -= 10;
  if (measurements.freezeDurationMsTotal > 5_000) score -= 15;
  if (measurements.thermalDegradation > 0.6) score -= 10;
  if (measurements.dashboardPressurePeak > 0.85) score -= 8;
  score -= Math.min(20, freezeCount * 2);
  score -= Math.round(deadlockRisk * 15);
  return Math.max(0, Math.min(100, score));
}
