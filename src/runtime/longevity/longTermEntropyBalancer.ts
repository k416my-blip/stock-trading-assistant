import { ENTROPY_HEALTHY_MIN, ENTROPY_HEALTHY_MAX } from '../../constants/runtimeLongevity';

export function balanceLongTermEntropy(entropyScore: number): { targetBias: number; adjustJa: string } {
  if (entropyScore < ENTROPY_HEALTHY_MIN) {
    return { targetBias: 0.08, adjustJa: 'raise entropy toward safe zone' };
  }
  if (entropyScore > ENTROPY_HEALTHY_MAX) {
    return { targetBias: -0.06, adjustJa: 'dampen chaotic entropy' };
  }
  return { targetBias: 0, adjustJa: 'entropy in safe zone' };
}
