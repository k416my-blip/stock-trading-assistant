import { getZombieCacheRatioEstimate } from './longevityStorage';
import { DASHBOARD_RING_CAP } from '../../constants/runtimeLongevity';

export function cremateZombieCaches(cacheSize: number, heapMb: number): {
  cremated: number;
  zombieCacheRatio: number;
} {
  const zombieCacheRatio = getZombieCacheRatioEstimate(cacheSize, heapMb);
  const cremated = zombieCacheRatio > 0.35 ? Math.min(DASHBOARD_RING_CAP, Math.ceil(cacheSize * 0.2)) : 0;
  return {
    cremated,
    zombieCacheRatio: Math.round(zombieCacheRatio * 1000) / 1000,
  };
}
