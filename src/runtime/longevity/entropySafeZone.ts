import { ENTROPY_HEALTHY_MIN, ENTROPY_HEALTHY_MAX } from '../../constants/runtimeLongevity';

export function isInEntropySafeZone(entropyScore: number): boolean {
  return entropyScore >= ENTROPY_HEALTHY_MIN && entropyScore <= ENTROPY_HEALTHY_MAX;
}
