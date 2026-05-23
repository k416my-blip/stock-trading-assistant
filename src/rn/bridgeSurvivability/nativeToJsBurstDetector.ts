import { RN_BRIDGE_BURST_WINDOW_MS } from '../../constants/rnBridgeSurvivability';
import { getNativeBoundaryTrace } from '../../native/runtime/nativeBoundaryTrace';

export function detectNativeBurstDensity(now = Date.now()): number {
  const trace = getNativeBoundaryTrace(100);
  const nativeBurst = trace.filter(
    (e) => e.native && now - Date.parse(e.at) < RN_BRIDGE_BURST_WINDOW_MS,
  ).length;
  return Math.min(1, nativeBurst / 8);
}
