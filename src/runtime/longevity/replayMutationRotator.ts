import { preserveMutationDiversity } from './mutationDiversityPreserver';

export function rotateReplayMutationFamilies(seed: number): string[] {
  const { rotated } = preserveMutationDiversity(seed);
  return rotated;
}
