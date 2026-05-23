import { JS_CHOREOGRAPHER_CALLBACK_CAP } from '../../constants/jsThreadSchedulerStabilization';

let callbackCount = 0;
let windowStart = Date.now();

export function resetChoreographerCallbackLimiterForTest(): void {
  callbackCount = 0;
  windowStart = Date.now();
}

export function noteChoreographerCallback(now = Date.now()): boolean {
  if (now - windowStart > 1_000) {
    callbackCount = 0;
    windowStart = now;
  }
  callbackCount += 1;
  return callbackCount <= JS_CHOREOGRAPHER_CALLBACK_CAP;
}

export function getCallbackDensity(): number {
  return Math.min(1, callbackCount / JS_CHOREOGRAPHER_CALLBACK_CAP);
}
