import { getNativeBoundaryTrace } from '../../native/runtime/nativeBoundaryTrace';
import { RN_BRIDGE_TRAFFIC_MAX_PER_SEC } from '../../constants/rnBridgeSurvivability';

let trafficPerSec = 0;
let windowStart = Date.now();

export function resetBridgeTrafficProfilerForTest(): void {
  trafficPerSec = 0;
  windowStart = Date.now();
}

export function profileBridgeTraffic(now = Date.now()): number {
  const trace = getNativeBoundaryTrace(200);
  const recent = trace.filter((e) => {
    const t = Date.parse(e.at);
    return now - t < 1_000;
  });
  if (now - windowStart >= 1_000) {
    trafficPerSec = recent.length;
    windowStart = now;
  }
  return Math.min(1, trafficPerSec / RN_BRIDGE_TRAFFIC_MAX_PER_SEC);
}

export function getBridgeTrafficRate(): number {
  return trafficPerSec;
}
