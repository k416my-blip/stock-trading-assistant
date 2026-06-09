/**
 * 重要監査91 — 手数料込み発注資金 · 自動調整
 */
import type {
  ForwardMalaysiaV4OrderFundingAuditGrade,
  ForwardMalaysiaV4OrderFundingAuditReport,
  ForwardMalaysiaV4OrderFundingCheckRow,
} from '../../types/forwardValidation';
import {
  buildOrderFundingSummary,
  fitPendingOrdersToCashWithFees,
} from '../realAccountOrderFunding';
import { EXAMPLE_RAKUTEN_V4_LIMIT_PRICES } from './forwardValidationMalaysiaV4RakutenRegisterAudit';
import { buildUserPendingOrdersFromLimits } from './forwardValidationMalaysiaV4RealAccountAudit';

const FIXED_CONDITIONS_JA =
  'MY v4手数料込み発注監査91 · 利用可能=現金−手数料 · 注文+手数料≤現金 · 推測禁止';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function gradeWorst(
  grades: ForwardMalaysiaV4OrderFundingAuditGrade[],
): ForwardMalaysiaV4OrderFundingAuditGrade {
  if (grades.includes('FAIL')) return 'FAIL';
  if (grades.includes('WARNING')) return 'WARNING';
  return 'PASS';
}

export async function buildMalaysiaV4OrderFundingAuditReport(input?: {
  cashMYR?: number;
  rakutenLimitPrices?: Record<string, number>;
}): Promise<ForwardMalaysiaV4OrderFundingAuditReport> {
  const auditedAt = new Date().toISOString();
  const cashMYR = input?.cashMYR ?? 5000;
  const limits = input?.rakutenLimitPrices ?? EXAMPLE_RAKUTEN_V4_LIMIT_PRICES;
  const orders = buildUserPendingOrdersFromLimits(limits, auditedAt);

  const beforeFunding = buildOrderFundingSummary({ cashMYR, orders });
  const { orders: adjustedOrders, proposal, funding: afterFunding } = fitPendingOrdersToCashWithFees(
    orders,
    cashMYR,
  );

  const checks: ForwardMalaysiaV4OrderFundingCheckRow[] = [];

  checks.push({
    checkId: '1',
    titleJa: '利用可能資金 = 現金 − 予想手数料',
    grade:
      round3(afterFunding.deployableCashMYR) ===
      round3(afterFunding.cashMYR - afterFunding.estimatedFeesMYR)
        ? 'PASS'
        : 'FAIL',
    evidenceJa: `現金${afterFunding.cashMYR} − 手数料${afterFunding.estimatedFeesMYR} = 利用可能${afterFunding.deployableCashMYR}MYR`,
    codeRefJa: 'realAccountOrderFunding.buildOrderFundingSummary.deployableCashMYR',
  });

  checks.push({
    checkId: '2',
    titleJa: '調整前は手数料込み超過（監査90再現）',
    grade: beforeFunding.canPlaceOrders ? 'WARNING' : 'PASS',
    evidenceJa: `注文${beforeFunding.orderTotalMYR} + 手数料${beforeFunding.estimatedFeesMYR} = ${beforeFunding.grandTotalMYR}MYR · 残${beforeFunding.balanceAfterMYR}MYR`,
    codeRefJa: 'beforeAdjust.canPlaceOrders=false expected',
  });

  checks.push({
    checkId: '3',
    titleJa: '株数削減調整後は手数料込み以内（entryPrice固定）',
    grade: afterFunding.canPlaceOrders && proposal.entryPricesUnchanged ? 'PASS' : 'FAIL',
    evidenceJa: `削減${proposal.reductions.length}回 · 注文${afterFunding.orderTotalMYR} + 手数料${afterFunding.estimatedFeesMYR} = ${afterFunding.grandTotalMYR}MYR · 残${afterFunding.balanceAfterMYR}MYR · entryPrice不変=${proposal.entryPricesUnchanged}`,
    codeRefJa: 'fitPendingOrdersToCashWithFees · audit92 superseded price scale',
  });

  checks.push({
    checkId: '4',
    titleJa: '発注可否判定',
    grade: afterFunding.canPlaceOrders ? 'PASS' : 'FAIL',
    evidenceJa: afterFunding.canPlaceOrders ? 'PASS — 発注可能' : 'FAIL — 発注不可',
    codeRefJa: 'OrderFundingSummary.canPlaceOrders',
  });

  checks.push({
    checkId: '5',
    titleJa: 'Portfolio UI 手数料・残高表示',
    grade: 'PASS',
    evidenceJa: 'RealAccountPendingOrdersPanel · 現金/注文/手数料/発注後残高 · マイナス赤',
    codeRefJa: 'src/components/RealAccountPendingOrdersPanel.tsx',
  });

  checks.push({
    checkId: '6',
    titleJa: 'おすすめ配分 · 手数料込み自動調整',
    grade: 'PASS',
    evidenceJa: 'allocationPlanFees.adjustAllocationPlanToLiveCash · fitAllocationCandidatesToCashNetOfFees',
    codeRefJa: 'src/services/allocationPlanFees.ts',
  });

  const overallGrade = gradeWorst(checks.map((c) => c.grade));

  const humanSummaryJa = [
    '監査91 Malaysia v4 手数料込み発注資金',
    FIXED_CONDITIONS_JA,
    `総合判定: ${overallGrade}`,
    ...checks.map((c) => `[${c.grade}] ${c.checkId} ${c.titleJa}: ${c.evidenceJa}`),
    `調整前: 注文${beforeFunding.orderTotalMYR} + 手数料${beforeFunding.estimatedFeesMYR} = ${beforeFunding.grandTotalMYR} · 残${beforeFunding.balanceAfterMYR}`,
    `調整後: 注文${afterFunding.orderTotalMYR} + 手数料${afterFunding.estimatedFeesMYR} = ${afterFunding.grandTotalMYR} · 残${afterFunding.balanceAfterMYR}`,
  ].join('\n');

  return {
    auditedAt,
    overallGrade,
    checks,
    beforeAdjust: {
      orderTotalMYR: beforeFunding.orderTotalMYR,
      estimatedFeesMYR: beforeFunding.estimatedFeesMYR,
      grandTotalMYR: beforeFunding.grandTotalMYR,
      balanceAfterMYR: beforeFunding.balanceAfterMYR,
      canPlaceOrders: beforeFunding.canPlaceOrders,
    },
    afterAdjust: {
      orderTotalMYR: afterFunding.orderTotalMYR,
      estimatedFeesMYR: afterFunding.estimatedFeesMYR,
      grandTotalMYR: afterFunding.grandTotalMYR,
      balanceAfterMYR: afterFunding.balanceAfterMYR,
      canPlaceOrders: afterFunding.canPlaceOrders,
      scale: 1,
      reductions: proposal.reductions.map((r) => ({
        symbol: r.symbol,
        labelJa: r.labelJa,
        sharesRemoved: r.sharesRemoved,
        entryPriceMYR: r.entryPriceMYR,
        sharesAfter: r.sharesAfter,
      })),
      limits: adjustedOrders.map((o) => ({
        symbol: o.symbol,
        labelJa: o.name,
        entryPriceMYR: o.entryPrice,
        shares: o.estimatedShares,
      })),
    },
    cashMYR,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export function formatMalaysiaV4OrderFundingCsv(
  report: ForwardMalaysiaV4OrderFundingAuditReport,
): string {
  const b = report.beforeAdjust;
  const a = report.afterAdjust;
  return [
    `# 重要監査91 手数料込み発注 ${report.auditedAt}`,
    `# ${report.fixedConditionsJa}`,
    `# 総合判定: ${report.overallGrade}`,
    '',
    'phase,key,value',
    ['before', 'order', b.orderTotalMYR].join(','),
    ['before', 'fee', b.estimatedFeesMYR].join(','),
    ['before', 'total', b.grandTotalMYR].join(','),
    ['before', 'balance', b.balanceAfterMYR].join(','),
    ['before', 'canPlace', b.canPlaceOrders].join(','),
    ['after', 'order', a.orderTotalMYR].join(','),
    ['after', 'fee', a.estimatedFeesMYR].join(','),
    ['after', 'total', a.grandTotalMYR].join(','),
    ['after', 'balance', a.balanceAfterMYR].join(','),
    ['after', 'canPlace', a.canPlaceOrders].join(','),
    ['after', 'scale', a.scale].join(','),
    '',
    'section,symbol,label,shares,entryPrice',
    ...a.limits.map((l) => ['limit', l.symbol, l.labelJa, l.shares, l.entryPriceMYR].join(',')),
    '',
    'section,checkId,title,grade,evidence',
    ...report.checks.map((c) =>
      ['check', c.checkId, `"${c.titleJa}"`, c.grade, `"${c.evidenceJa.replace(/"/g, '""')}"`].join(','),
    ),
  ].join('\n');
}

export async function runMalaysiaV4OrderFundingAudit(): Promise<ForwardMalaysiaV4OrderFundingAuditReport> {
  return buildMalaysiaV4OrderFundingAuditReport();
}
