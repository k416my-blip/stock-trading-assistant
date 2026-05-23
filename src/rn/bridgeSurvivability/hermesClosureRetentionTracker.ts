import { RN_CLOSURE_RETENTION_WARN } from '../../constants/rnBridgeSurvivability';

let closureRefs = 0;
let lastHeap = 0;

export function resetHermesClosureRetentionTrackerForTest(): void {
  closureRefs = 0;
  lastHeap = 0;
}

export function observeClosureRetention(jsHeapMb: number): number {
  if (jsHeapMb > lastHeap + 2) closureRefs += 1;
  if (jsHeapMb < lastHeap - 3) closureRefs = Math.max(0, closureRefs - 1);
  lastHeap = jsHeapMb;
  return Math.min(1, closureRefs / 12);
}

export function isClosureRetentionElevated(risk: number): boolean {
  return risk >= RN_CLOSURE_RETENTION_WARN;
}
