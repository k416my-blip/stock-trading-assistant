/**
 * Self-Healing Addiction Guard — frequent healing becoming load source.
 */
import { getSelfHealingPhase } from '../selfHealing/runtimeSelfHealingOrchestrator';
import { getSelfHealingPassCount } from './metabolismStorage';
import { SELF_HEALING_ADDICTION_THRESHOLD } from '../../constants/runtimeMetabolism';

export function assessSelfHealingAddictionRisk(): number {
  const passes = getSelfHealingPassCount();
  const phase = getSelfHealingPhase();
  let risk = Math.min(1, passes / Math.max(1, SELF_HEALING_ADDICTION_THRESHOLD * 2));
  if (phase === 'SELF_HEALING' || phase === 'EMERGENCY_RECOVERY') risk = Math.min(1, risk + 0.25);
  return Math.round(risk * 1000) / 1000;
}
