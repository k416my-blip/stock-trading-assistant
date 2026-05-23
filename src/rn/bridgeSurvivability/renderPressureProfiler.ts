export function profileRenderPressure(renderFps: number, renderBurstRate: number): number {
  const fpsPressure = renderFps < 12 ? 0.9 : renderFps < 16 ? 0.5 : 0.15;
  const burstPressure = Math.min(1, renderBurstRate / 24);
  return Math.round(Math.min(1, fpsPressure * 0.6 + burstPressure * 0.4) * 1000) / 1000;
}
