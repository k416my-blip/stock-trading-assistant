/**
 * Curiosity Dashboard builder.
 */
import type { CuriosityDashboard } from '../../types/runtimeCuriosity';

export function buildCuriosityDashboard(partial: CuriosityDashboard): CuriosityDashboard {
  return { ...partial };
}
