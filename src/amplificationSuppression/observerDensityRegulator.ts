import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

const densityEvolution: { at: string; density: number }[] = [];

export function resetObserverDensityRegulatorForTest(): void {
  densityEvolution.length = 0;
}

export function scoreObserverDensity(input: AmplificationSuppressionObserveInput): number {
  let density = input.observerOverheadRatio;
  density += input.interventionDensity * 0.2;
  density += input.runtimeTradingSuppression * 0.1;
  return Math.round(Math.min(1, density) * 1000) / 1000;
}

export function noteObserverDensity(density: number): void {
  densityEvolution.push({ at: new Date().toISOString(), density });
  if (densityEvolution.length > 64) densityEvolution.shift();
}

export function getObserverDensityEvolution(): { at: string; density: number }[] {
  return [...densityEvolution];
}

export function shouldReduceTelemetrySampling(density: number): boolean {
  return density > 0.52;
}
