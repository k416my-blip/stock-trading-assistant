import { EFFECT_LOOP_MAX_PER_WINDOW, EFFECT_LOOP_WINDOW_MS } from '../../constants/productionStability';
import { verboseWarn } from '../productionLogger';

type Window = { startMs: number; count: number };

const windows = new Map<string, Window>();
const warnings: string[] = [];

export function noteEffectRun(effectName: string, nowMs = Date.now()): void {
  let w = windows.get(effectName);
  if (!w || nowMs - w.startMs > EFFECT_LOOP_WINDOW_MS) {
    w = { startMs: nowMs, count: 0 };
    windows.set(effectName, w);
  }
  w.count += 1;
  if (w.count > EFFECT_LOOP_MAX_PER_WINDOW) {
    const msg = `Effect loop疑い: ${effectName} (${w.count}回/${EFFECT_LOOP_WINDOW_MS / 1000}s)`;
    if (!warnings.includes(msg)) {
      warnings.push(msg);
      if (warnings.length > 8) warnings.shift();
      verboseWarn(msg);
    }
  }
}

export function getEffectLoopWarnings(): string[] {
  return [...warnings];
}

export function resetEffectLoopDetectorForTest(): void {
  windows.clear();
  warnings.length = 0;
}
