import { describe, expect, it } from 'vitest';
import {
  parseOprFromHtml,
  pctChange,
  yoyFromMonthlyIndex,
} from '../../src/services/bursa/bursaMacroLiveProviders';

describe('bursaMacroLiveProviders helpers', () => {
  describe('pctChange', () => {
    it('computes percent change', () => {
      expect(pctChange(110, 100)).toBeCloseTo(10, 5);
      expect(pctChange(90, 100)).toBeCloseTo(-10, 5);
    });

    it('returns null for invalid inputs', () => {
      expect(pctChange(NaN, 100)).toBeNull();
      expect(pctChange(100, 0)).toBeNull();
      expect(pctChange(100, NaN)).toBeNull();
    });
  });

  describe('yoyFromMonthlyIndex', () => {
    it('computes YoY from monthly index series', () => {
      const values = Array.from({ length: 13 }, (_, i) => 100 + i);
      expect(yoyFromMonthlyIndex(values)).toBeCloseTo(12, 5);
    });

    it('returns null when fewer than 13 months', () => {
      expect(yoyFromMonthlyIndex([100, 101, 102])).toBeNull();
    });

    it('returns null when year-ago value is zero', () => {
      const values = [0, ...Array.from({ length: 12 }, () => 100)];
      expect(yoyFromMonthlyIndex(values)).toBeNull();
    });
  });

  describe('parseOprFromHtml', () => {
    it('parses Overnight Policy Rate from BNM-style HTML', () => {
      const html =
        '<div>Overnight Policy Rate</div><span>3.00%</span><p>Current OPR stands at 3.00 percent</p>';
      expect(parseOprFromHtml(html)).toBe(3);
    });

    it('parses JSON-style opr field', () => {
      expect(parseOprFromHtml('{"opr":2.75}')).toBe(2.75);
    });

    it('rejects out-of-range values', () => {
      expect(parseOprFromHtml('OPR 15.0%')).toBeNull();
      expect(parseOprFromHtml('no rate here')).toBeNull();
    });
  });
});
