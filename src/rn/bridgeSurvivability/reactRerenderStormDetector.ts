import { RN_RERENDER_STORM_PER_MIN } from '../../constants/rnBridgeSurvivability';

let rerenderCount = 0;
let windowStart = Date.now();

export function resetReactRerenderStormDetectorForTest(): void {
  rerenderCount = 0;
  windowStart = Date.now();
}

export function noteRerenderBurst(count = 1): void {
  rerenderCount += count;
}

export function detectRenderStormRisk(): { risk: number; perMinute: number } {
  const now = Date.now();
  const minutes = Math.max(0.01, (now - windowStart) / 60_000);
  const perMinute = rerenderCount / minutes;
  if (now - windowStart > 60_000) {
    rerenderCount = 0;
    windowStart = now;
  }
  const risk = Math.min(1, perMinute / RN_RERENDER_STORM_PER_MIN);
  return { risk, perMinute: Math.round(perMinute) };
}
