/**
 * Curiosity Budget — exploration cost from runtime calorie pool.
 */
import { getRuntimeCalorieUsed } from '../metabolism/runtimeCalorieBudget';
import { CURIOSITY_TICK_COOLDOWN_MS } from '../../constants/runtimeCuriosity';

export function allocateCuriosityBudget(
  mode: 'lightweight' | 'sandbox_only' | 'stopped' | 'frozen' | 'deferred',
): number {
  const calorie = getRuntimeCalorieUsed();
  if (mode === 'stopped' || mode === 'frozen' || mode === 'deferred') return 0;
  if (mode === 'lightweight') return Math.min(15, Math.round(calorie * 0.12));
  return Math.min(35, Math.round(calorie * 0.25));
}

export function isCuriosityCooldownActive(nowMs = Date.now(), lastTickMs: number): boolean {
  return nowMs - lastTickMs < CURIOSITY_TICK_COOLDOWN_MS;
}
