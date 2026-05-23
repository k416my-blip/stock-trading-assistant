import { decayReplayEcologyWeights } from './longevityStorage';

export function runReplayDecayEcology(factor = 0.92): { decayed: number } {
  return { decayed: decayReplayEcologyWeights(factor) };
}
