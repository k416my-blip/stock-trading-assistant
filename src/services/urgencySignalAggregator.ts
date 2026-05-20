import type { AiTradeQueueItem } from '../types/aiStrategyBriefing';
import {
  actionLabelForSuggestedAction,
  mapAiUrgencyToSignalLevel,
  type UrgencySignal,
  URGENCY_SIGNAL_PRIORITY,
} from '../types/urgencySignal';
import { isActiveSignalStatus, isSystemSignalActive } from './tradeQueueStatusResolver';
import type { TradeQueueAckRecord } from './tradeQueueAckStorage';

import type { TradeQueueAckStatus } from '../types/urgencySignal';

export type QueueItemWithAck = AiTradeQueueItem & { ackStatus: TradeQueueAckStatus };

export type AggregateUrgencySignalsInput = {
  queueItems: QueueItemWithAck[];
  staleHoldingsCount: number;
  degradedMode: boolean;
  degradedReasonsJa: string[];
  diagnosticsCriticalCount: number;
  diagnosticsErrorCount: number;
  executionBlocked: boolean;
  systemAckMap: Record<string, TradeQueueAckRecord>;
  nowMs?: number;
};

export function aggregateUrgencySignals(input: AggregateUrgencySignalsInput): UrgencySignal[] {
  const signals: UrgencySignal[] = [];

  for (const item of input.queueItems) {
    if (!isActiveSignalStatus(item.ackStatus)) continue;
    signals.push({
      id: item.id,
      level: mapAiUrgencyToSignalLevel(item.urgency),
      ticker: item.ticker,
      displayName: item.name,
      actionLabel: actionLabelForSuggestedAction(item.suggestedAction),
      reason: item.rationaleSummary,
      source: 'trade_queue',
      occurredAt: item.occurredAt,
      responseDeadlineAt: item.responseDeadlineAt,
    });
  }

  const sysActive = (id: string) => isSystemSignalActive(id, input.systemAckMap);

  if (input.staleHoldingsCount > 0 && sysActive('sys-stale-quotes')) {
    signals.push({
      id: 'sys-stale-quotes',
      level: input.staleHoldingsCount >= 3 ? 'high' : 'medium',
      actionLabel: '価格更新',
      reason: `${input.staleHoldingsCount}件の古い株価 — 判断前に更新を確認`,
      source: 'stale_quotes',
    });
  }

  if (input.degradedMode && sysActive('sys-degraded-mode')) {
    signals.push({
      id: 'sys-degraded-mode',
      level: 'high',
      actionLabel: '劣化モード',
      reason:
        input.degradedReasonsJa.length > 0
          ? input.degradedReasonsJa.slice(0, 2).join(' · ')
          : 'API制限または接続問題 — 分析信頼度が低下',
      source: 'degraded_mode',
    });
  }

  if (input.diagnosticsCriticalCount > 0 && sysActive('sys-diagnostics-critical')) {
    signals.push({
      id: 'sys-diagnostics-critical',
      level: 'critical',
      actionLabel: '診断',
      reason: `重大な診断 ${input.diagnosticsCriticalCount}件 — 設定と接続を確認`,
      source: 'diagnostics',
    });
  } else if (input.diagnosticsErrorCount > 0 && sysActive('sys-diagnostics-error')) {
    signals.push({
      id: 'sys-diagnostics-error',
      level: 'high',
      actionLabel: '診断',
      reason: `エラー診断 ${input.diagnosticsErrorCount}件`,
      source: 'diagnostics',
    });
  }

  if (input.executionBlocked && sysActive('sys-execution-safety')) {
    signals.push({
      id: 'sys-execution-safety',
      level: 'high',
      actionLabel: '執行安全',
      reason: '読み取り専用または売買停止 — 手動確認が必要',
      source: 'execution_safety',
    });
  }

  return signals.sort(
    (a, b) => URGENCY_SIGNAL_PRIORITY[b.level] - URGENCY_SIGNAL_PRIORITY[a.level],
  );
}

export function pickActiveUrgencySignal(signals: UrgencySignal[]): UrgencySignal | null {
  return signals[0] ?? null;
}
