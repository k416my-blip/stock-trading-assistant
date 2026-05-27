import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';
import { EXISTENTIAL_CONSTRAINT_SIGNALS } from '../constants/runtimeUnifiedUtility';
import { detectExistentialConstraintSignals } from './runtimeExistentialConstraintModel';

export function resetExistentialConstraintSignalRegistryForTest(): void {
  /* stateless */
}

export function registerExistentialSignals(input: RuntimeUnifiedUtilityObserveInput): string[] {
  return detectExistentialConstraintSignals(input).filter((s) =>
    EXISTENTIAL_CONSTRAINT_SIGNALS.includes(s as (typeof EXISTENTIAL_CONSTRAINT_SIGNALS)[number]),
  );
}
