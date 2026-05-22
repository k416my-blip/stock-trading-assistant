import { describe, expect, it } from 'vitest';
import {
  getLastValidNumber,
  parseYahooPrice,
} from '../../src/utils/yahooChartParser';

describe('yahooChartParser', () => {
  it('getLastValidNumber returns last finite number with nulls', () => {
    expect(getLastValidNumber([null, 2.5, 2.52])).toBe(2.52);
    expect(getLastValidNumber([1, null, undefined])).toBe(1);
    expect(getLastValidNumber([null, null])).toBeNull();
    expect(getLastValidNumber(null)).toBeNull();
  });

  it('parseYahooPrice prefers regularMarketPrice when finite', () => {
    const json = {
      chart: {
        result: [
          {
            meta: { regularMarketPrice: 95.1 },
            indicators: { quote: [{ close: [2.52] }] },
          },
        ],
      },
    };
    expect(parseYahooPrice(json)).toBe(95.1);
  });

  it('parseYahooPrice uses close when regularMarketPrice is null (4707.KL)', () => {
    const json = {
      chart: {
        result: [
          {
            meta: { regularMarketPrice: null },
            indicators: {
              quote: [
                {
                  timestamp: [1, 2, 3],
                  close: [null, null, 2.51, null, 2.52],
                  volume: [100, 200, 300, 400, 500],
                  open: [2.5, 2.5, 2.5, 2.5, 2.5],
                },
              ],
            },
          },
        ],
      },
    };
    expect(parseYahooPrice(json)).toBe(2.52);
  });

  it('parseYahooPrice uses close when regularMarketPrice is zero', () => {
    const json = {
      chart: {
        result: [
          {
            meta: { regularMarketPrice: 0 },
            indicators: { quote: [{ close: [null, 2.52] }] },
          },
        ],
      },
    };
    expect(parseYahooPrice(json)).toBe(2.52);
  });

  it('parseYahooPrice uses close when regularMarketPrice missing', () => {
    const json = {
      chart: {
        result: [
          {
            meta: {},
            indicators: { quote: [{ close: [null, 2.52] }] },
          },
        ],
      },
    };
    expect(parseYahooPrice(json)).toBe(2.52);
  });

  it('parseYahooPrice returns null only when no valid price', () => {
    expect(parseYahooPrice({ chart: { result: [{}] } })).toBeNull();
    expect(parseYahooPrice({})).toBeNull();
    expect(
      parseYahooPrice({
        chart: { result: [{ meta: { regularMarketPrice: null }, indicators: { quote: [{ close: [null, null] }] } }] },
      }),
    ).toBeNull();
  });
});
