import { getNativeBoundaryHistograms } from '../../native/runtime/nativeBoundaryHistograms';

let congestion = 0;

export function resetJsToNativeCongestionTrackerForTest(): void {
  congestion = 0;
}

export function trackJsToNativeCongestion(): number {
  const hist = getNativeBoundaryHistograms();
  const bridge = hist.bridgeFetchMs.reduce((s, b) => s + b.count, 0);
  congestion = Math.min(100, bridge * 4);
  return congestion;
}
