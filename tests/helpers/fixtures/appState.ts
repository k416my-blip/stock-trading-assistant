import { createDefaultAppState } from '../../../src/services/storage';
import { createTestPosition } from './portfolio';
import type { AppState } from '../../../src/types';

export function createTestAppState(overrides: Partial<AppState> = {}): AppState {
  const base = createDefaultAppState();
  return {
    ...base,
    portfolio: [createTestPosition()],
    ...overrides,
  };
}

export function createEmptyTestAppState(): AppState {
  return createDefaultAppState();
}
