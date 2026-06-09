/**
 * npx vitest run tests/unit/forwardValidationVix2430BandValidityAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  classifyVixBand,
  isVix24_30,
  shouldSkipVixStopSim,
  VIX_BAND_DEFS,
} from '../../src/services/forwardValidation/forwardValidationVix2430BandValidityAudit';

describe('forwardValidationVix2430BandValidityAudit', () => {
  it('defines 8 VIX bands', () => {
    expect(VIX_BAND_DEFS.length).toBe(8);
  });

  it('classifies VIX into fine bands', () => {
    expect(classifyVixBand(25)).toBe('vix_d_24_26');
    expect(classifyVixBand(27)).toBe('vix_e_26_28');
    expect(classifyVixBand(29)).toBe('vix_f_28_30');
    expect(classifyVixBand(32)).toBe('vix_g_30_35');
    expect(isVix24_30(27)).toBe(true);
    expect(isVix24_30(30)).toBe(false);
  });

  it('stop sim F skips VIX 24-30', () => {
    expect(shouldSkipVixStopSim(25, 'stop_24_30')).toBe(true);
    expect(shouldSkipVixStopSim(31, 'stop_24_30')).toBe(false);
    expect(shouldSkipVixStopSim(31, 'stop_30_plus')).toBe(true);
  });
});
