import { describe, expect, it } from 'vitest';
import { parseYahooChartBars } from '../../src/utils/yahooChartParser';

describe('parseYahooChartBars', () => {
  it('builds OHLCV bars from chart timestamps', () => {
    const json = {
      chart: {
        result: [
          {
            timestamp: [1_700_000_000, 1_700_086_400],
            indicators: {
              quote: [
                {
                  open: [10, 11],
                  high: [10.5, 11.5],
                  low: [9.5, 10.5],
                  close: [10.2, 11.1],
                  volume: [1000, 1200],
                },
              ],
            },
          },
        ],
      },
    };
    const bars = parseYahooChartBars(json);
    expect(bars).toHaveLength(2);
    expect(bars[0]?.close).toBe(10.2);
    expect(bars[1]?.volume).toBe(1200);
  });
});
