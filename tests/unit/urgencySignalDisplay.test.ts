import { describe, expect, it } from 'vitest';
import { buildHeaderSignalDisplay } from '../../src/services/urgencySignalDisplay';
import type { UrgencySignal } from '../../src/types/urgencySignal';

describe('urgencySignalDisplay', () => {
  it('builds scannable header lines for trade queue signal', () => {
    const now = new Date('2026-05-19T10:00:00Z').getTime();
    const signal: UrgencySignal = {
      id: 'ai-q-nvda',
      level: 'critical',
      ticker: 'NVDA',
      displayName: 'NVIDIA',
      actionLabel: '買い検討',
      reason: 'mock',
      source: 'trade_queue',
      responseDeadlineAt: new Date(now + 4 * 60_000).toISOString(),
    };
    const display = buildHeaderSignalDisplay(signal, now);
    expect(display.levelLabel).toBe('[緊急]');
    expect(display.titleLine).toBe('NVDA NVIDIA');
    expect(display.actionLine).toBe('買い検討');
    expect(display.remainingLine).toMatch(/^残り: 4分$/);
  });

  it('uses reason when no ticker for system signal', () => {
    const signal: UrgencySignal = {
      id: 'sys-stale',
      level: 'high',
      actionLabel: '価格更新を確認',
      reason: '2銘柄の株価が古い可能性',
      source: 'stale_quotes',
    };
    const display = buildHeaderSignalDisplay(signal);
    expect(display.titleLine).toBe('価格更新を確認');
    expect(display.actionLine).toContain('古い');
  });
});
