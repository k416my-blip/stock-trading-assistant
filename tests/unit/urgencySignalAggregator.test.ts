import { describe, expect, it } from 'vitest';
import { getMockAiTradeQueue } from '../../src/data/mockAiStrategyBriefing';
import {
  aggregateUrgencySignals,
  pickActiveUrgencySignal,
} from '../../src/services/urgencySignalAggregator';
import { resolveEffectiveQueueAckStatus } from '../../src/services/tradeQueueStatusResolver';
import { formatUrgencySignalSummary } from '../../src/types/urgencySignal';
import { buildHeaderSignalDisplay } from '../../src/services/urgencySignalDisplay';

describe('urgencySignalAggregator', () => {
  it('picks highest-priority unacknowledged trade queue signal', () => {
    const queue = getMockAiTradeQueue().map((item) => ({
      ...item,
      ackStatus: 'unacknowledged' as const,
    }));
    const signals = aggregateUrgencySignals({
      queueItems: queue,
      staleHoldingsCount: 0,
      degradedMode: false,
      degradedReasonsJa: [],
      diagnosticsCriticalCount: 0,
      diagnosticsErrorCount: 0,
      executionBlocked: false,
      systemAckMap: {},
    });
    const active = pickActiveUrgencySignal(signals);
    expect(active?.ticker).toBe('NVDA');
    expect(active?.level).toBe('critical');
    expect(active?.displayName).toBe('NVIDIA');
    expect(formatUrgencySignalSummary(active!)).toMatch(/NVDA.*買い検討.*緊急/);
    const header = buildHeaderSignalDisplay(active!);
    expect(header.levelLabel).toBe('[緊急]');
    expect(header.titleLine).toContain('NVDA');
    expect(header.actionLine).toBe('買い検討');
  });

  it('hides acknowledged queue items from header', () => {
    const queue = getMockAiTradeQueue().map((item) => ({
      ...item,
      ackStatus:
        item.id === 'ai-q-nvda'
          ? ('acknowledged' as const)
          : ('unacknowledged' as const),
    }));
    const signals = aggregateUrgencySignals({
      queueItems: queue,
      staleHoldingsCount: 0,
      degradedMode: false,
      degradedReasonsJa: [],
      diagnosticsCriticalCount: 0,
      diagnosticsErrorCount: 0,
      executionBlocked: false,
      systemAckMap: {},
    });
    expect(signals.some((s) => s.id === 'ai-q-nvda')).toBe(false);
    expect(signals[0]?.id).not.toBe('ai-q-nvda');
  });

  it('excludes expired items from active header signals', () => {
    const nvda = getMockAiTradeQueue().find((q) => q.id === 'ai-q-nvda')!;
    const expired = getMockAiTradeQueue().find((q) => q.id === 'ai-q-5183')!;
    const queue = [
      { ...nvda, ackStatus: 'unacknowledged' as const },
      {
        ...expired,
        ackStatus: resolveEffectiveQueueAckStatus(expired, {}, Date.now()),
      },
    ];
    expect(queue[1]?.ackStatus).toBe('expired');
    const signals = aggregateUrgencySignals({
      queueItems: queue,
      staleHoldingsCount: 0,
      degradedMode: false,
      degradedReasonsJa: [],
      diagnosticsCriticalCount: 0,
      diagnosticsErrorCount: 0,
      executionBlocked: false,
      systemAckMap: {},
    });
    expect(signals.some((s) => s.id === 'ai-q-5183')).toBe(false);
    expect(signals[0]?.id).toBe('ai-q-nvda');
  });

  it('includes stale quote system signal when not acknowledged', () => {
    const signals = aggregateUrgencySignals({
      queueItems: [],
      staleHoldingsCount: 2,
      degradedMode: false,
      degradedReasonsJa: [],
      diagnosticsCriticalCount: 0,
      diagnosticsErrorCount: 0,
      executionBlocked: false,
      systemAckMap: {},
    });
    expect(signals[0]?.id).toBe('sys-stale-quotes');
  });

  it('promotes next signal when highest is acknowledged', () => {
    const queue = getMockAiTradeQueue().map((item) => ({
      ...item,
      ackStatus:
        item.id === 'ai-q-nvda'
          ? ('acknowledged' as const)
          : resolveEffectiveQueueAckStatus(item, {}, Date.now()),
    }));
    const signals = aggregateUrgencySignals({
      queueItems: queue,
      staleHoldingsCount: 0,
      degradedMode: false,
      degradedReasonsJa: [],
      diagnosticsCriticalCount: 0,
      diagnosticsErrorCount: 0,
      executionBlocked: false,
      systemAckMap: {},
    });
    const active = pickActiveUrgencySignal(signals);
    expect(active?.ticker).not.toBe('NVDA');
    expect(active?.level).not.toBe('critical');
  });
});
