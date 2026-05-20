import { mapAiUrgencyToSignalLevel, URGENCY_SIGNAL_PRIORITY, type TradeQueueAckStatus } from '../types/urgencySignal';
import type { QueueItemWithAck } from './urgencySignalAggregator';

const STATUS_BUCKET: Record<TradeQueueAckStatus, number> = {
  unacknowledged: 0,
  expired: 1,
  acknowledged: 2,
  disabled: 3,
};

function occurredAtMs(item: QueueItemWithAck): number {
  const t = new Date(item.occurredAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function compareQueueItems(a: QueueItemWithAck, b: QueueItemWithAck): number {
  const bucketDiff = STATUS_BUCKET[a.ackStatus] - STATUS_BUCKET[b.ackStatus];
  if (bucketDiff !== 0) return bucketDiff;

  const levelA = URGENCY_SIGNAL_PRIORITY[mapAiUrgencyToSignalLevel(a.urgency)];
  const levelB = URGENCY_SIGNAL_PRIORITY[mapAiUrgencyToSignalLevel(b.urgency)];
  if (levelA !== levelB) return levelB - levelA;

  return occurredAtMs(a) - occurredAtMs(b);
}

export type SortedQueueSections = {
  /** 未確認 + active (sorted by urgency, occurred) */
  active: QueueItemWithAck[];
  /** 期限切れ — below active, no pulse */
  expired: QueueItemWithAck[];
  /** 確認済み — collapsed history at bottom */
  acknowledged: QueueItemWithAck[];
  disabled: QueueItemWithAck[];
};

export function sortQueueIntoSections(items: QueueItemWithAck[]): SortedQueueSections {
  const sorted = [...items].sort(compareQueueItems);
  const active: QueueItemWithAck[] = [];
  const expired: QueueItemWithAck[] = [];
  const acknowledged: QueueItemWithAck[] = [];
  const disabled: QueueItemWithAck[] = [];

  for (const item of sorted) {
    switch (item.ackStatus) {
      case 'unacknowledged':
        active.push(item);
        break;
      case 'expired':
        expired.push(item);
        break;
      case 'acknowledged':
        acknowledged.push(item);
        break;
      case 'disabled':
        disabled.push(item);
        break;
    }
  }

  return { active, expired, acknowledged, disabled };
}
