import { getRuntimeDeterministicSeed } from '../unified/runtimeClockAuthority';
import { getDeterministicDriftRate, logDeterministicDrift } from './longevityStorage';

export function monitorDeterministicDrift(expectedHash: number): {
  deterministicDrift: number;
  mismatch: boolean;
} {
  const seed = getRuntimeDeterministicSeed();
  const actualHash = (seed * 1103515245 + 12345) % 1000;
  const mismatch = Math.abs(actualHash - expectedHash) > 2 && expectedHash > 0;
  logDeterministicDrift(seed, mismatch);
  return {
    deterministicDrift: Math.round(getDeterministicDriftRate() * 1000) / 1000,
    mismatch,
  };
}
