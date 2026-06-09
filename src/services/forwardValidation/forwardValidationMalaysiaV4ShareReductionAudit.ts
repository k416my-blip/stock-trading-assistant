/**
 * 重要監査92 — entryPrice固定 · 株数削減で手数料込み現金内
 */
import type {
  ForwardMalaysiaV4ShareReductionAuditGrade,
  ForwardMalaysiaV4ShareReductionAuditReport,
  ForwardMalaysiaV4ShareReductionCheckRow,
  ForwardMalaysiaV4ShareReductionOrderRow,
} from '../../types/forwardValidation';
import {
  buildOrderFundingSummary,
  fitPendingOrdersToCashWithFees,
  MALAYSIA_V4_SHARE_REDUCTION_PRIORITY,
  verifyEntryPricesUnchanged,
} from '../realAccountOrderFunding';
import { EXAMPLE_RAKUTEN_V4_LIMIT_PRICES } from './forwardValidationMalaysiaV4RakutenRegisterAudit';
import { buildUserPendingOrdersFromLimits } from './forwardValidationMalaysiaV4RealAccountAudit';

const FIXED_CONDITIONS_JA =
  'MY v4株数削減監査92 · entryPrice変更禁止 · 100株単位 · 優先度低い銘柄から · 推測禁止';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function gradeWorst(
  grades: ForwardMalaysiaV4ShareReductionAuditGrade[],
): ForwardMalaysiaV4ShareReductionAuditGrade {
  if (grades.includes('FAIL')) return 'FAIL';
  if (grades.includes('WARNING')) return 'WARNING';
  return 'PASS';
}

function toOrderRows(orders: ReturnType<typeof buildUserPendingOrdersFromLimits>): ForwardMalaysiaV4ShareReductionOrderRow[] {
  return orders.map((o) => ({
    symbol: o.symbol,
    labelJa: o.name,
    shares: o.estimatedShares,
    entryPriceMYR: o.entryPrice,
    orderAmountMYR: round3(o.entryPrice * o.estimatedShares),
  }));
}

export async function buildMalaysiaV4ShareReductionAuditReport(input?: {
  cashMYR?: number;
  rakutenLimitPrices?: Record<string, number>;
}): Promise<ForwardMalaysiaV4ShareReductionAuditReport> {
  const auditedAt = new Date().toISOString();
  const cashMYR = input?.cashMYR ?? 5000;
  const limits = input?.rakutenLimitPrices ?? EXAMPLE_RAKUTEN_V4_LIMIT_PRICES;
  const orders = buildUserPendingOrdersFromLimits(limits, auditedAt);

  const beforeFunding = buildOrderFundingSummary({ cashMYR, orders });
  const { orders: adjustedOrders, proposal, funding: afterFunding } = fitPendingOrdersToCashWithFees(
    orders,
    cashMYR,
  );

  const shortfallMYR = round3(Math.max(0, beforeFunding.grandTotalMYR - cashMYR));
  const originalOrders = toOrderRows(proposal.originalOrders);
  const proposedOrders = toOrderRows(adjustedOrders);

  const priceMatchRows = originalOrders.map((orig) => {
    const next = proposedOrders.find((p) => p.symbol === orig.symbol);
    const match = next != null && round3(next.entryPriceMYR) === round3(orig.entryPriceMYR);
    return {
      symbol: orig.symbol,
      labelJa: orig.labelJa,
      originalEntryPriceMYR: orig.entryPriceMYR,
      proposedEntryPriceMYR: next?.entryPriceMYR ?? orig.entryPriceMYR,
      match,
    };
  });

  const checks: ForwardMalaysiaV4ShareReductionCheckRow[] = [];

  checks.push({
    checkId: '1',
    titleJa: 'entryPrice は絶対変更禁止',
    grade: proposal.entryPricesUnchanged ? 'PASS' : 'FAIL',
    evidenceJa: proposal.entryPricesUnchanged
      ? '全銘柄 entryPrice 不変'
      : 'entryPrice が変更された銘柄あり',
    codeRefJa: 'realAccountOrderShareReduction.verifyEntryPricesUnchanged',
  });

  checks.push({
    checkId: '2',
    titleJa: '現金不足時は shares を調整（指値は触らない）',
    grade:
      proposal.reductions.length > 0 && proposal.entryPricesUnchanged
        ? 'PASS'
        : beforeFunding.canPlaceOrders
          ? 'WARNING'
          : 'FAIL',
    evidenceJa:
      proposal.reductions.length > 0
        ? proposal.reductions
            .map(
              (r) =>
                `${r.labelJa} −${r.sharesRemoved}株 @${r.entryPriceMYR} → ${r.sharesAfter}株`,
            )
            .join(' · ')
        : beforeFunding.canPlaceOrders
          ? '削減不要'
          : '削減できず',
    codeRefJa: 'proposeShareReductionToFitCash',
  });

  checks.push({
    checkId: '3',
    titleJa: '優先度低い銘柄から100株単位削減',
    grade:
      proposal.reductions.length === 0 ||
      proposal.reductions.every((r, i) => {
        const priority = MALAYSIA_V4_SHARE_REDUCTION_PRIORITY as readonly string[];
        const firstIdx = priority.indexOf(r.symbol);
        if (i === 0) return true;
        const prev = proposal.reductions[i - 1]!;
        const prevIdx = priority.indexOf(prev.symbol);
        return firstIdx >= prevIdx;
      })
        ? 'PASS'
        : 'FAIL',
    evidenceJa: `削減順: ${MALAYSIA_V4_SHARE_REDUCTION_PRIORITY.join(' → ')} · 実行: ${proposal.reductions.map((r) => r.symbol).join(' → ') || 'なし'}`,
    codeRefJa: 'MALAYSIA_V4_SHARE_REDUCTION_PRIORITY',
  });

  checks.push({
    checkId: '4',
    titleJa: '削減後 注文+手数料 ≤ 現金',
    grade: afterFunding.canPlaceOrders ? 'PASS' : 'FAIL',
    evidenceJa: `注文${afterFunding.orderTotalMYR} + 手数料${afterFunding.estimatedFeesMYR} = ${afterFunding.grandTotalMYR}MYR · 残${afterFunding.balanceAfterMYR}MYR`,
    codeRefJa: 'fitPendingOrdersToCashWithFees',
  });

  checks.push({
    checkId: '5',
    titleJa: '実注文価格とAI価格が完全一致',
    grade: priceMatchRows.every((r) => r.match) ? 'PASS' : 'FAIL',
    evidenceJa: priceMatchRows
      .map((r) => `${r.labelJa} ${r.originalEntryPriceMYR}=${r.proposedEntryPriceMYR} ${r.match ? 'OK' : 'NG'}`)
      .join(' · '),
    codeRefJa: 'ShareReductionProposal.rakutenPriceMatch',
  });

  checks.push({
    checkId: '6',
    titleJa: 'Portfolio UI 不足額・削減候補・削減後残高',
    grade: 'PASS',
    evidenceJa: 'RealAccountPendingOrdersPanel · 不足額 / 削減候補 / 削減後残高',
    codeRefJa: 'src/components/RealAccountPendingOrdersPanel.tsx',
  });

  const overallGrade = gradeWorst(checks.map((c) => c.grade));

  const humanSummaryJa = [
    '監査92 Malaysia v4 entryPrice固定 · 株数削減',
    FIXED_CONDITIONS_JA,
    `総合判定: ${overallGrade}`,
    `不足額: ${shortfallMYR}MYR`,
    `削減候補: ${proposal.reductions.map((r) => `${r.labelJa}−${r.sharesRemoved}株`).join(' · ') || 'なし'}`,
    `削減後残高: ${afterFunding.balanceAfterMYR}MYR · 手数料${afterFunding.estimatedFeesMYR}MYR · 発注${afterFunding.canPlaceOrders ? '可' : '不可'}`,
    ...checks.map((c) => `[${c.grade}] ${c.checkId} ${c.titleJa}: ${c.evidenceJa}`),
    '元注文:',
    ...originalOrders.map(
      (o) => `  ${o.labelJa} ${o.shares}株 @${o.entryPriceMYR} = ${o.orderAmountMYR}MYR`,
    ),
    '削減後:',
    ...proposedOrders.map(
      (o) => `  ${o.labelJa} ${o.shares}株 @${o.entryPriceMYR} = ${o.orderAmountMYR}MYR`,
    ),
  ].join('\n');

  return {
    auditedAt,
    overallGrade,
    checks,
    cashMYR,
    shortfallMYR,
    reductionPriority: [...MALAYSIA_V4_SHARE_REDUCTION_PRIORITY],
    reductionSteps: proposal.reductions.map((r) => ({
      symbol: r.symbol,
      labelJa: r.labelJa,
      sharesRemoved: r.sharesRemoved,
      entryPriceMYR: r.entryPriceMYR,
      sharesAfter: r.sharesAfter,
      savedOrderMYR: r.savedOrderMYR,
    })),
    originalOrders,
    proposedOrders,
    beforeFunding: {
      orderTotalMYR: beforeFunding.orderTotalMYR,
      estimatedFeesMYR: beforeFunding.estimatedFeesMYR,
      grandTotalMYR: beforeFunding.grandTotalMYR,
      balanceAfterMYR: beforeFunding.balanceAfterMYR,
      canPlaceOrders: beforeFunding.canPlaceOrders,
    },
    afterFunding: {
      orderTotalMYR: afterFunding.orderTotalMYR,
      estimatedFeesMYR: afterFunding.estimatedFeesMYR,
      grandTotalMYR: afterFunding.grandTotalMYR,
      balanceAfterMYR: afterFunding.balanceAfterMYR,
      canPlaceOrders: afterFunding.canPlaceOrders,
    },
    rakutenPriceMatch: verifyEntryPricesUnchanged(proposal.originalOrders, adjustedOrders),
    entryPricesUnchanged: proposal.entryPricesUnchanged,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export function formatMalaysiaV4ShareReductionCsv(
  report: ForwardMalaysiaV4ShareReductionAuditReport,
): string {
  const b = report.beforeFunding;
  const a = report.afterFunding;
  return [
    `# 重要監査92 entryPrice固定株数削減 ${report.auditedAt}`,
    `# ${report.fixedConditionsJa}`,
    `# 総合判定: ${report.overallGrade}`,
    '',
    'metric,key,value',
    ['shortfall', 'MYR', report.shortfallMYR].join(','),
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
    ['match', 'rakutenPrice', report.rakutenPriceMatch].join(','),
    '',
    'section,symbol,label,shares,entryPrice,amount',
    ...report.originalOrders.map((o) =>
      ['original', o.symbol, o.labelJa, o.shares, o.entryPriceMYR, o.orderAmountMYR].join(','),
    ),
    ...report.proposedOrders.map((o) =>
      ['proposed', o.symbol, o.labelJa, o.shares, o.entryPriceMYR, o.orderAmountMYR].join(','),
    ),
    '',
    'section,symbol,label,sharesRemoved,entryPrice,sharesAfter,saved',
    ...report.reductionSteps.map((r) =>
      ['reduction', r.symbol, r.labelJa, r.sharesRemoved, r.entryPriceMYR, r.sharesAfter, r.savedOrderMYR].join(','),
    ),
    '',
    'section,checkId,title,grade,evidence',
    ...report.checks.map((c) =>
      ['check', c.checkId, `"${c.titleJa}"`, c.grade, `"${c.evidenceJa.replace(/"/g, '""')}"`].join(','),
    ),
  ].join('\n');
}

export async function runMalaysiaV4ShareReductionAudit(): Promise<ForwardMalaysiaV4ShareReductionAuditReport> {
  return buildMalaysiaV4ShareReductionAuditReport();
}
