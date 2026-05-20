import { describe, expect, it } from 'vitest';
import { getMockAiTradeQueue } from '../../src/data/mockAiStrategyBriefing';
import { sortQueueIntoSections } from '../../src/services/queueSortService';
import type { QueueItemWithAck } from '../../src/services/urgencySignalAggregator';

function withAck(
  status: QueueItemWithAck['ackStatus'],
  id: string,
): QueueItemWithAck {
  const item = getMockAiTradeQueue().find((q) => q.id === id)!;
  return { ...item, ackStatus: status };
}

describe('queueSortService', () => {
  it('places unacknowledged before expired and acknowledged', () => {
    const items: QueueItemWithAck[] = [
      withAck('acknowledged', 'ai-q-1155'),
      withAck('unacknowledged', 'ai-q-5183'),
      withAck('unacknowledged', 'ai-q-nvda'),
      withAck('expired', 'ai-q-5347'),
    ];
    const { active, expired, acknowledged } = sortQueueIntoSections(items);
    expect(active.map((i) => i.id)).toEqual(['ai-q-nvda', 'ai-q-5183']);
    expect(expired.map((i) => i.id)).toEqual(['ai-q-5347']);
    expect(acknowledged.map((i) => i.id)).toEqual(['ai-q-1155']);
  });

  it('sorts active by urgency then occurred time', () => {
    const nvda = withAck('unacknowledged', 'ai-q-nvda');
    const petronas = withAck('unacknowledged', 'ai-q-5183');
    const { active } = sortQueueIntoSections([petronas, nvda]);
    expect(active[0]?.id).toBe('ai-q-nvda');
    expect(active[1]?.id).toBe('ai-q-5183');
  });
});
