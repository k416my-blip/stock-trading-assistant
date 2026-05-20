import { describe, expect, it } from 'vitest';
import { assessExecutionMarketData } from '../../src/services/executionSafetyGate';
import { createStalePosition } from '../helpers/fixtures/portfolio';

describe('integration: stale quotes', () => {
  it('blocks execution when quote is stale', () => {
    const gate = assessExecutionMarketData(100, createStalePosition());
    expect(gate.allowed).toBe(false);
    expect(gate.blockedByStale).toBe(true);
  });
});
