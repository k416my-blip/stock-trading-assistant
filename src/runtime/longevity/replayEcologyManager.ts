import { upsertReplayEcology, getReplayEcologyRecords } from './longevityStorage';

export function manageReplayEcology(seed: number, entropyScore: number): number {
  upsertReplayEcology({
    freshness: Math.max(0.1, 1 - seed % 10 / 10),
    diversity: (seed % 5) / 5,
    mutationLineage: `lineage-${seed % 6}`,
    collapseRisk: entropyScore < 0.25 ? 0.6 : 0.15,
    entropyContribution: entropyScore * 0.2,
    weight: 1,
    archived: false,
  });
  const active = getReplayEcologyRecords().filter((r) => !r.archived);
  return active.length;
}

export function scoreReplayEcology(): number {
  const records = getReplayEcologyRecords().filter((r) => !r.archived);
  if (records.length === 0) return 0.5;
  const avg = records.reduce((s, r) => s + r.diversity * r.freshness, 0) / records.length;
  return Math.round(avg * 1000) / 1000;
}
