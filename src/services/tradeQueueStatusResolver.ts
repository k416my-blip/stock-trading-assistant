import type { AiTradeQueueItem } from '../types/aiStrategyBriefing';
import type { TradeQueueAckStatus } from '../types/urgencySignal';
import type { TradeQueueAckRecord } from './tradeQueueAckStorage';

export function isActiveSignalStatus(status: TradeQueueAckStatus): boolean {
  return status === 'unacknowledged';
}

export function isSystemSignalActive(
  signalId: string,
  systemMap: Record<string, TradeQueueAckRecord>,
): boolean {
  const status = systemMap[signalId]?.status;
  return !status || status === 'unacknowledged';
}

export function resolveEffectiveQueueAckStatus(
  item: Pick<AiTradeQueueItem, 'id' | 'responseDeadlineAt'>,
  map: Record<string, TradeQueueAckRecord>,
  nowMs: number = Date.now(),
): TradeQueueAckStatus {
  const stored = map[item.id]?.status;
  if (stored === 'acknowledged' || stored === 'disabled' || stored === 'expired') {
    return stored;
  }
  if (item.responseDeadlineAt) {
    const deadlineMs = new Date(item.responseDeadlineAt).getTime();
    if (!Number.isNaN(deadlineMs) && deadlineMs < nowMs) {
      return 'expired';
    }
  }
  return 'unacknowledged';
}

export function formatSignalTimeJa(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatResponseDeadlineJa(iso: string | undefined, nowMs = Date.now()): string {
  if (!iso) return '期限なし';
  const deadlineMs = new Date(iso).getTime();
  if (Number.isNaN(deadlineMs)) return '期限なし';
  const diffMin = Math.round((deadlineMs - nowMs) / 60_000);
  if (diffMin <= 0) return '期限切れ';
  if (diffMin < 60) return `${diffMin}分以内`;
  return `${Math.round(diffMin / 60)}時間以内`;
}

/** Header-friendly countdown, e.g. 「残り: 4分」。期限なしは空文字（UIで非表示） */
export function formatRemainingMinutesJa(iso: string | undefined, nowMs = Date.now()): string {
  if (!iso) return '';
  const deadlineMs = new Date(iso).getTime();
  if (Number.isNaN(deadlineMs)) return '';
  const diffMin = Math.ceil((deadlineMs - nowMs) / 60_000);
  if (diffMin <= 0) return '期限切れ';
  if (diffMin < 60) return `残り: ${diffMin}分`;
  return `残り: ${Math.round(diffMin / 60)}時間`;
}
