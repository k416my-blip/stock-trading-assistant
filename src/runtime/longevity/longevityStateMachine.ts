import type { LongevityRuntimeState } from '../../types/runtimeLongevity';
import { getLongevityState, setLongevityState } from './longevityStorage';

export function transitionLongevityState(input: {
  entropyCollapse: number;
  civilization: boolean;
  fossilized: boolean;
  quarantine: boolean;
  safeMode: boolean;
}): LongevityRuntimeState {
  if (input.safeMode) {
    setLongevityState('SAFE_MODE');
    return 'SAFE_MODE';
  }
  if (input.quarantine) {
    setLongevityState('IMMUNE_RESPONSE');
    return 'IMMUNE_RESPONSE';
  }
  if (input.entropyCollapse >= 0.85) {
    setLongevityState('COLLAPSING');
    return 'COLLAPSING';
  }
  if (input.fossilized) {
    setLongevityState('FOSSILIZING');
    return 'FOSSILIZING';
  }
  if (input.civilization || input.entropyCollapse >= 0.55) {
    setLongevityState('STAGNATING');
    return 'STAGNATING';
  }
  if (input.entropyCollapse >= 0.35) {
    setLongevityState('STABLE');
    return 'STABLE';
  }
  setLongevityState('HEALTHY');
  return 'HEALTHY';
}

export function getCurrentLongevityState(): LongevityRuntimeState {
  return getLongevityState();
}
