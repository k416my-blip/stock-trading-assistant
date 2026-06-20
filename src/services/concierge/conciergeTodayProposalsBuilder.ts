import type { AiSuggestedAction } from '../../types/aiStrategyBriefing';
import type { AiTradeQueueItem } from '../../types/aiStrategyBriefing';
import type { QueueItemWithAck } from '../urgencySignalAggregator';

export type ConciergeProposalKind = 'hold_continue' | 'monitor' | 'buy_candidate' | 'pass';

export const CONCIERGE_PROPOSAL_LABEL_JA: Record<ConciergeProposalKind, string> = {
  hold_continue: '保有継続',
  monitor: '監視',
  buy_candidate: '買い候補',
  pass: '見送り',
};

export type ConciergeTodayProposal = {
  id: string;
  symbol: string;
  nameJa: string;
  kind: ConciergeProposalKind;
  labelJa: string;
  summaryJa: string;
};

export function mapSuggestedActionToProposalKind(
  action: AiSuggestedAction,
): ConciergeProposalKind {
  switch (action) {
    case 'suggested_buy':
      return 'buy_candidate';
    case 'suggested_hold':
      return 'hold_continue';
    case 'watch_closely':
      return 'monitor';
    case 'suggested_reduce':
    default:
      return 'pass';
  }
}

export function buildConciergeTodayProposals(
  items: readonly QueueItemWithAck[],
  max = 3,
): ConciergeTodayProposal[] {
  const active = items.filter(
    (item) => item.ackStatus === 'unacknowledged' || item.ackStatus === 'expired',
  );
  return active.slice(0, max).map((item) => toProposal(item));
}

function toProposal(item: AiTradeQueueItem): ConciergeTodayProposal {
  const kind = mapSuggestedActionToProposalKind(item.suggestedAction);
  return {
    id: item.id,
    symbol: item.ticker,
    nameJa: item.name,
    kind,
    labelJa: CONCIERGE_PROPOSAL_LABEL_JA[kind],
    summaryJa: item.rationaleSummary,
  };
}
