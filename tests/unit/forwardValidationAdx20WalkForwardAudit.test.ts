/**
 * npx vitest run tests/unit/forwardValidationAdx20WalkForwardAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  evaluateAdx20WalkForward,
  pickThresholdWinner,
} from '../../src/services/forwardValidation/forwardValidationAdx20WalkForwardAudit';
import type { ForwardAdx20WalkForwardPhaseMetrics } from '../../src/types/forwardValidation';

function metrics(cumulative: number): ForwardAdx20WalkForwardPhaseMetrics {
  return {
    tradeCount: 10,
    winRatePct: 90,
    avgReturnPct: 3,
    cumulativeReturnPct: cumulative,
    maxDrawdownPct: -5,
  };
}

describe('forwardValidationAdx20WalkForwardAudit', () => {
  it('picks threshold winner by cumulative return', () => {
    expect(pickThresholdWinner(metrics(30), metrics(20))).toBe('adx20');
    expect(pickThresholdWinner(metrics(20), metrics(30))).toBe('adx25');
    expect(pickThresholdWinner(metrics(20), metrics(20))).toBe('tie');
  });

  it('evaluates adx20_adoption_valid', () => {
    const r = evaluateAdx20WalkForward({
      phase1Winner: 'adx20',
      testSuperior: 'adx20',
      trainAdx20: metrics(70),
      trainAdx25: metrics(50),
      testAdx20: metrics(40),
      testAdx25: metrics(30),
    });
    expect(r.verdict).toBe('adx20_adoption_valid');
    expect(r.adoptionValid).toBe(true);
    expect(r.recommendedAdxThreshold).toBe(20);
  });

  it('evaluates overfit_suspected', () => {
    const r = evaluateAdx20WalkForward({
      phase1Winner: 'adx20',
      testSuperior: 'adx25',
      trainAdx20: metrics(70),
      trainAdx25: metrics(50),
      testAdx20: metrics(20),
      testAdx25: metrics(35),
    });
    expect(r.verdict).toBe('overfit_suspected');
    expect(r.adoptionValid).toBe(false);
    expect(r.recommendedAdxThreshold).toBe(25);
  });
});
