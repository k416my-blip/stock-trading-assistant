let telemetryCostUnits = 0;
let telemetrySamples = 0;

export function resetTelemetryCostProfilerForTest(): void {
  telemetryCostUnits = 0;
  telemetrySamples = 0;
}

export function noteTelemetrySample(costUnits: number): void {
  telemetryCostUnits += costUnits;
  telemetrySamples += 1;
}

export function averageTelemetryCost(): number {
  if (telemetrySamples === 0) return 0;
  return Math.round((telemetryCostUnits / telemetrySamples) * 100) / 100;
}
