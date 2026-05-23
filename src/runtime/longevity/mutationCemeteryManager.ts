import { getMutationCemeterySize, archiveMutationCemetery } from './longevityStorage';

export function manageMutationCemetery(lineage: string): number {
  archiveMutationCemetery(lineage);
  return getMutationCemeterySize();
}
