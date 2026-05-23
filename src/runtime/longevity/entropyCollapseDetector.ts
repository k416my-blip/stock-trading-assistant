import {
  ENTROPY_CHAOS_THRESHOLD,
  ENTROPY_COLLAPSE_THRESHOLD,
  ENTROPY_HEALTHY_MAX,
  ENTROPY_HEALTHY_MIN,
  ENTROPY_STAGNATION_CRITICAL,
} from '../../constants/runtimeLongevity';

export function assessEntropyHealth(entropyScore: number): {
  entropyHealth: number;
  collapseRisk: number;
  chaotic: boolean;
  inSafeZone: boolean;
} {
  const inSafeZone = entropyScore >= ENTROPY_HEALTHY_MIN && entropyScore <= ENTROPY_HEALTHY_MAX;
  let collapseRisk = 0;
  if (entropyScore < ENTROPY_STAGNATION_CRITICAL) collapseRisk = 1;
  else if (entropyScore < ENTROPY_COLLAPSE_THRESHOLD) collapseRisk = 0.7;
  else if (entropyScore > ENTROPY_CHAOS_THRESHOLD) collapseRisk = 0.5;

  const entropyHealth = Math.round(
    Math.max(0, Math.min(100, inSafeZone ? 70 + (entropyScore - ENTROPY_HEALTHY_MIN) * 80 : 40 - collapseRisk * 30)),
  );
  return {
    entropyHealth,
    collapseRisk: Math.round(collapseRisk * 1000) / 1000,
    chaotic: entropyScore > ENTROPY_CHAOS_THRESHOLD,
    inSafeZone,
  };
}
