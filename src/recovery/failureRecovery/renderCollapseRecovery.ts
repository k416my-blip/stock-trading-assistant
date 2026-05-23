let degraded = false;

export function resetRenderCollapseRecoveryForTest(): void {
  degraded = false;
}

export function runRenderCollapseRecovery(renderFps: number, renderStormRisk: number): boolean {
  if (renderFps >= 14 && renderStormRisk < 0.55) {
    degraded = false;
    return false;
  }
  degraded = true;
  return true;
}

export function isRenderDegraded(): boolean {
  return degraded;
}
