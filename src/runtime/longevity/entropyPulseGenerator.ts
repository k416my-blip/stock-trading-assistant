import { setEntropyPulseActive } from './longevityStorage';
import { ENTROPY_COLLAPSE_THRESHOLD } from '../../constants/runtimeLongevity';

export function maybeGenerateEntropyPulse(entropyScore: number): { pulse: boolean; actionsJa: string[] } {
  if (entropyScore >= ENTROPY_COLLAPSE_THRESHOLD) {
    setEntropyPulseActive(false);
    return { pulse: false, actionsJa: [] };
  }
  setEntropyPulseActive(true);
  return {
    pulse: true,
    actionsJa: ['minority_replay_boost', 'dormant_revival_probe', 'curiosity_seed', 'synthetic_contradiction'],
  };
}
