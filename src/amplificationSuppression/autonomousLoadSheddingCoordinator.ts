import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';
import { LOAD_SHEDDING_STAGES } from '../constants/amplificationSuppression';

const sheddingHistory: string[] = [];

export function resetAutonomousLoadSheddingCoordinatorForTest(): void {
  sheddingHistory.length = 0;
}

export function computeLoadSheddingSeverity(overload: number): number {
  return Math.round(Math.min(1, overload) * 1000) / 1000;
}

export function applyLoadShedding(overload: number): string[] {
  const shed: string[] = [];
  const stageCount = Math.min(LOAD_SHEDDING_STAGES.length, Math.ceil(overload * 5));
  for (let i = 0; i < stageCount; i += 1) {
    shed.push(LOAD_SHEDDING_STAGES[i]);
    sheddingHistory.push(LOAD_SHEDDING_STAGES[i]);
  }
  if (sheddingHistory.length > 80) sheddingHistory.splice(0, sheddingHistory.length - 80);
  return shed;
}

export function isRuntimeOverloaded(input: AmplificationSuppressionObserveInput): boolean {
  return (
    input.eventLoopLagMs > 350 ||
    input.observerOverheadRatio > 0.58 ||
    input.interventionDensity > 0.6
  );
}

export function getLoadSheddingHistory(): string[] {
  return [...sheddingHistory];
}
