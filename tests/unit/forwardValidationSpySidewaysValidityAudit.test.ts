/**
 * npx vitest run tests/unit/forwardValidationSpySidewaysValidityAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  isSidewaysAtSpy63Threshold,
  rateDirectionAt,
  rateDirectionJa,
} from '../../src/services/forwardValidation/forwardValidationSpySidewaysValidityAudit';

describe('forwardValidationSpySidewaysValidityAudit', () => {
  it('classifies SPY63 sideways band by threshold', () => {
    expect(isSidewaysAtSpy63Threshold(2, 3)).toBe(true);
    expect(isSidewaysAtSpy63Threshold(4, 3)).toBe(false);
    expect(isSidewaysAtSpy63Threshold(-4.9, 5)).toBe(true);
    expect(isSidewaysAtSpy63Threshold(6, 5)).toBe(false);
  });

  it('maps rate hike window', () => {
    expect(rateDirectionAt('2022-06-01')).toBe('hike');
    expect(rateDirectionJa('hike')).toBe('金利上昇');
  });
});
