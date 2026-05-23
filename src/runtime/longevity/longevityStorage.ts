/**
 * Longevity storage — ecology records, counters (production immutable).
 */
import type { ReplayEcologyRecord } from '../../types/runtimeLongevity';
import type { LongevityRuntimeState } from '../../types/runtimeLongevity';
import { MAX_MUTATION_CEMETERY, MAX_REPLAY_ECOLOGY } from '../../constants/runtimeLongevity';

let replaySeq = 0;
let cemeterySeq = 0;
let sameRootTicks = 0;
let noNovelMutationTicks = 0;
let dominantRootKey: string | null = null;
let lastDominantRoot: string | null = null;
let mutationFamilyCounts: Record<string, number> = {};
let productionBlocked = 0;
let longevityState: LongevityRuntimeState = 'HEALTHY';
let entropyPulseActive = false;
let quarantineActive = false;
let lastEntropyScore = 0.5;

const replayEcology: ReplayEcologyRecord[] = [];
const mutationCemetery: { id: string; lineage: string; at: string }[] = [];
const driftLog: { seed: number; mismatch: boolean; at: string }[] = [];

export function resetLongevityStorageForTest(): void {
  replaySeq = 0;
  cemeterySeq = 0;
  sameRootTicks = 0;
  noNovelMutationTicks = 0;
  dominantRootKey = null;
  lastDominantRoot = null;
  mutationFamilyCounts = {};
  productionBlocked = 0;
  longevityState = 'HEALTHY';
  entropyPulseActive = false;
  quarantineActive = false;
  lastEntropyScore = 0.5;
  replayEcology.length = 0;
  mutationCemetery.length = 0;
  driftLog.length = 0;
}

export function getLongevityState(): LongevityRuntimeState {
  return longevityState;
}

export function setLongevityState(state: LongevityRuntimeState): void {
  longevityState = state;
}

export function noteProductionBlocked(): void {
  productionBlocked += 1;
}

export function getProductionMutationsBlocked(): number {
  return productionBlocked;
}

export function setEntropyPulseActive(active: boolean): void {
  entropyPulseActive = active;
}

export function isEntropyPulseActive(): boolean {
  return entropyPulseActive;
}

export function setQuarantine(active: boolean): void {
  quarantineActive = active;
}

export function isQuarantineActive(): boolean {
  return quarantineActive;
}

export function setLastEntropyScore(score: number): void {
  lastEntropyScore = score;
}

export function getLastEntropyScore(): number {
  return lastEntropyScore;
}

export function noteRootTick(dominantRoot: string | null, novelMutation: boolean): void {
  if (dominantRoot && dominantRoot === lastDominantRoot) sameRootTicks += 1;
  else {
    sameRootTicks = 0;
    lastDominantRoot = dominantRoot;
  }
  if (novelMutation) noNovelMutationTicks = 0;
  else noNovelMutationTicks += 1;
  dominantRootKey = dominantRoot;
}

export function getFossilCounters(): {
  sameRootTicks: number;
  noNovelMutationTicks: number;
  dominantRootKey: string | null;
} {
  return { sameRootTicks, noNovelMutationTicks, dominantRootKey };
}

export function upsertReplayEcology(
  partial: Omit<ReplayEcologyRecord, 'id'> & { id?: string },
): ReplayEcologyRecord {
  replaySeq += 1;
  const rec: ReplayEcologyRecord = {
    id: partial.id ?? `reco-${replaySeq}`,
    freshness: partial.freshness,
    diversity: partial.diversity,
    mutationLineage: partial.mutationLineage,
    collapseRisk: partial.collapseRisk,
    entropyContribution: partial.entropyContribution,
    weight: partial.weight,
    archived: partial.archived,
  };
  replayEcology.push(rec);
  if (replayEcology.length > MAX_REPLAY_ECOLOGY) replayEcology.shift();
  return rec;
}

export function decayReplayEcologyWeights(factor: number): number {
  let decayed = 0;
  for (const r of replayEcology) {
    if (r.archived) continue;
    const before = r.weight;
    r.weight = Math.max(0.05, r.weight * factor);
    r.entropyContribution *= factor;
    if (before !== r.weight) decayed += 1;
    if (r.weight < 0.12) {
      r.archived = true;
      archiveMutationCemetery(r.mutationLineage);
    }
  }
  return decayed;
}

export function archiveMutationCemetery(lineage: string): void {
  cemeterySeq += 1;
  mutationCemetery.push({
    id: `mcem-${cemeterySeq}`,
    lineage: lineage.slice(0, 40),
    at: new Date().toISOString(),
  });
  if (mutationCemetery.length > MAX_MUTATION_CEMETERY) mutationCemetery.shift();
}

export function getReplayEcologyRecords(): ReplayEcologyRecord[] {
  return [...replayEcology];
}

export function getMutationCemeterySize(): number {
  return mutationCemetery.length;
}

export function noteMutationFamily(family: string): void {
  mutationFamilyCounts[family] = (mutationFamilyCounts[family] ?? 0) + 1;
}

export function getMutationFamilyCounts(): Record<string, number> {
  return { ...mutationFamilyCounts };
}

export function rotateMutationFamilies(): string[] {
  const total = Object.values(mutationFamilyCounts).reduce((s, n) => s + n, 0);
  if (total === 0) return [];
  const rotated: string[] = [];
  for (const [family, count] of Object.entries(mutationFamilyCounts)) {
    if (count / total > 0.65) {
      mutationFamilyCounts[family] = Math.floor(count * 0.4);
      rotated.push(family);
    }
  }
  return rotated;
}

export function logDeterministicDrift(seed: number, mismatch: boolean): void {
  driftLog.push({ seed, mismatch, at: new Date().toISOString() });
  if (driftLog.length > 32) driftLog.shift();
}

export function getDeterministicDriftRate(): number {
  if (driftLog.length === 0) return 0;
  return driftLog.filter((d) => d.mismatch).length / driftLog.length;
}

export function getZombieCacheRatioEstimate(cacheSize: number, heapMb: number): number {
  if (heapMb <= 0) return 0;
  return Math.min(1, cacheSize / Math.max(1, heapMb * 2));
}
