import { describe, expect, it } from 'vitest';
import {
  buildConciergeTodayProposals,
  CONCIERGE_PROPOSAL_LABEL_JA,
  mapSuggestedActionToProposalKind,
} from '../../src/services/concierge/conciergeTodayProposalsBuilder';
import type { QueueItemWithAck } from '../../src/services/urgencySignalAggregator';

function item(
  overrides: Partial<QueueItemWithAck> & Pick<QueueItemWithAck, 'id' | 'suggestedAction'>,
): QueueItemWithAck {
  return {
    ticker: '1155',
    name: 'マレーシア銀行',
    market: 'my',
    urgency: 'medium',
    confidence: 70,
    rationaleSummary: 'テスト要約',
    explanation: {
      technicalReasons: [],
      macroReasons: [],
      riskReasons: [],
      dataFreshnessNote: '',
    },
    occurredAt: new Date().toISOString(),
    ackStatus: 'unacknowledged',
    ...overrides,
  };
}

describe('conciergeTodayProposalsBuilder', () => {
  it('maps suggested actions to proposal kinds', () => {
    expect(mapSuggestedActionToProposalKind('suggested_buy')).toBe('buy_candidate');
    expect(mapSuggestedActionToProposalKind('suggested_hold')).toBe('hold_continue');
    expect(mapSuggestedActionToProposalKind('watch_closely')).toBe('monitor');
    expect(mapSuggestedActionToProposalKind('suggested_reduce')).toBe('pass');
  });

  it('returns at most three active proposals with Japanese labels', () => {
    const items = [
      item({ id: 'a', suggestedAction: 'suggested_buy' }),
      item({ id: 'b', suggestedAction: 'watch_closely' }),
      item({ id: 'c', suggestedAction: 'suggested_hold' }),
      item({ id: 'd', suggestedAction: 'suggested_reduce' }),
    ];
    const proposals = buildConciergeTodayProposals(items, 3);
    expect(proposals).toHaveLength(3);
    expect(proposals[0]?.labelJa).toBe(CONCIERGE_PROPOSAL_LABEL_JA.buy_candidate);
    expect(proposals[1]?.labelJa).toBe(CONCIERGE_PROPOSAL_LABEL_JA.monitor);
    expect(proposals[2]?.labelJa).toBe(CONCIERGE_PROPOSAL_LABEL_JA.hold_continue);
  });

  it('skips acknowledged items', () => {
    const items = [
      item({ id: 'a', suggestedAction: 'suggested_buy', ackStatus: 'acknowledged' }),
      item({ id: 'b', suggestedAction: 'watch_closely' }),
    ];
    const proposals = buildConciergeTodayProposals(items, 3);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.id).toBe('b');
  });
});
