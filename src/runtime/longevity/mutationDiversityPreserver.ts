import { MUTATION_LINEAGE_MAX_SHARE } from '../../constants/runtimeLongevity';
import { getMutationFamilyCounts, noteMutationFamily, rotateMutationFamilies } from './longevityStorage';

export function computeMutationDiversity(): number {
  const counts = getMutationFamilyCounts();
  const values = Object.values(counts);
  const total = values.reduce((s, n) => s + n, 0);
  if (total === 0) return 0.6;
  const maxShare = Math.max(...values) / total;
  return Math.round((1 - maxShare) * 1000) / 1000;
}

export function preserveMutationDiversity(seed: number): { rotated: string[] } {
  noteMutationFamily(`fam-${seed % 7}`);
  const counts = getMutationFamilyCounts();
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const maxShare = total > 0 ? Math.max(...Object.values(counts)) / total : 0;
  if (maxShare > MUTATION_LINEAGE_MAX_SHARE) {
    return { rotated: rotateMutationFamilies() };
  }
  return { rotated: [] };
}
