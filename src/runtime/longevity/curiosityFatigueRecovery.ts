import type { LongevityDashboard } from '../../types/runtimeLongevity';

export function assessCuriosityFatigue(input: {
  replayCount: number;
  noveltyPressure: number;
  sandboxReplayHeavy: boolean;
}): { curiosityFatigue: number; extendCooldown: boolean } {
  const replayFatigue = Math.min(1, input.replayCount / 30);
  const noveltyLack = Math.min(1, input.noveltyPressure);
  const sandboxBias = input.sandboxReplayHeavy ? 0.25 : 0;
  const curiosityFatigue = Math.round(Math.min(1, replayFatigue * 0.4 + noveltyLack * 0.35 + sandboxBias) * 1000) / 1000;
  return {
    curiosityFatigue,
    extendCooldown: curiosityFatigue >= 0.55,
  };
}

export function buildFatigueRecoveryActions(fatigue: number): string[] {
  const actions: string[] = [];
  if (fatigue >= 0.55) actions.push('curiosity_cooldown_extended');
  if (fatigue >= 0.45) actions.push('replay_decay_boost');
  if (fatigue >= 0.35) actions.push('novelty_pulse');
  return actions;
}

export function applyFatigueToDashboard(
  dashboard: Pick<LongevityDashboard, 'curiosityFatigue'>,
  fatigue: number,
): void {
  dashboard.curiosityFatigue = fatigue;
}
