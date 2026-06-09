import { describe, expect, it } from 'vitest';
import {
  buildUserPendingOrders,
  formatMalaysiaV4RealAccountCsv,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4RealAccountAudit';

describe('forwardValidationMalaysiaV4RealAccountAudit', () => {
  it('buildUserPendingOrders has matchedShares=0 for all', () => {
    const orders = buildUserPendingOrders({
      '5347': 14,
      '1023': 7,
      '5398': 4,
      '6742': 4,
      '3336': 2,
    });
    expect(orders).toHaveLength(5);
    expect(orders.every((o) => !o.completed)).toBe(true);
    expect(orders.reduce((s, o) => s + o.estimatedShares, 0)).toBe(1300);
  });

  it('formatMalaysiaV4RealAccountCsv includes overall grade', () => {
    const csv = formatMalaysiaV4RealAccountCsv({
      auditedAt: '2026-01-01',
      overallGrade: 'PASS',
      checks: [],
      flowSimulations: [],
      userSnapshot: {
        cashMYR: 5000,
        flowStateId: 'orders_pending',
        flowStateLabelJa: '状態②',
        matchedStockValueMYR: 0,
        matchedShareTotal: 0,
        pendingOrderCount: 5,
        orderRows: [],
      },
      currentMatchedRebalance: {
        answerAJa: 'A',
        answerBJa: 'B',
        answerCJa: 'C',
        answerDJa: 'D',
        answerEJa: 'E',
      },
      projectedAfterFullFillRebalance: {
        answerAJa: 'A2',
        answerBJa: 'B2',
        answerCJa: 'C2',
        answerDJa: 'D2',
        answerEJa: 'E2',
        answerFJa: 'F2',
        holdingsSummaryJa: 'x',
      },
      fixedConditionsJa: 'test',
      humanSummaryJa: 'summary',
    });
    expect(csv).toContain('総合判定: PASS');
  });
});
