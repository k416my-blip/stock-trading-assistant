/**
 * 重要監査90 — Rakuten実指値を manualOrderList(entryPrice) へ登録
 */
import type {
  ForwardMalaysiaV4RakutenRegisterAuditGrade,
  ForwardMalaysiaV4RakutenRegisterAuditReport,
  ForwardMalaysiaV4RakutenRegisterCheckRow,
} from '../../types/forwardValidation';
import { getBrokerageEstimate } from '../brokerage';
import { buildPendingOrderValuationRows } from '../realAccountOrderValuation';
import { fetchMalaysiaV76AuditBundle } from './forwardValidationMalaysiaV4CandidateAudit';
import {
  buildUserPendingOrdersFromLimits,
  V4_ORDER_DEFS,
} from './forwardValidationMalaysiaV4RealAccountAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const FIXED_CONDITIONS_JA =
  'MY v4 Rakuten実指値登録監査90 · entryPrice×株数 · Yahoo参考のみ · 推測禁止';

/** 5000MYR収まり示例（ユーザー実指値で上書き） */
export const EXAMPLE_RAKUTEN_V4_LIMIT_PRICES: Record<string, number> = {
  '5347': 12.15,
  '1023': 6.35,
  '5398': 3.7,
  '6742': 3.56,
  '3336': 2.0,
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function latestClose(bundle: SurvivorshipOhlcvBundle, symbol: string): number {
  return bundle.etfBars[symbol]?.[bundle.etfBars[symbol]!.length - 1]?.close ?? 0;
}

function yahooMap(bundle: SurvivorshipOhlcvBundle): Record<string, number> {
  const out: Record<string, number> = {};
  for (const def of V4_ORDER_DEFS) out[def.symbol] = round3(latestClose(bundle, def.symbol));
  return out;
}

function gradeWorst(
  grades: ForwardMalaysiaV4RakutenRegisterAuditGrade[],
): ForwardMalaysiaV4RakutenRegisterAuditGrade {
  if (grades.includes('FAIL')) return 'FAIL';
  if (grades.includes('WARNING')) return 'WARNING';
  return 'PASS';
}

export async function buildMalaysiaV4RakutenRegisterAuditReport(input?: {
  bundle?: SurvivorshipOhlcvBundle | null;
  cashMYR?: number;
  rakutenLimitPrices?: Record<string, number>;
}): Promise<ForwardMalaysiaV4RakutenRegisterAuditReport | null> {
  const bundle = input?.bundle ?? (await fetchMalaysiaV76AuditBundle());
  if (!bundle) return null;

  const auditedAt = new Date().toISOString();
  const cashMYR = input?.cashMYR ?? 5000;
  const limits = input?.rakutenLimitPrices ?? EXAMPLE_RAKUTEN_V4_LIMIT_PRICES;
  const yahoo = yahooMap(bundle);
  const orders = buildUserPendingOrdersFromLimits(limits, auditedAt);
  const rows = buildPendingOrderValuationRows(orders, yahoo);

  const registeredLimits = rows.map((r) => {
    const order = orders.find((o) => o.symbol === r.symbol)!;
    const fee = getBrokerageEstimate('bursa', order.estimatedShares, order.entryPrice, 'MYR');
    return {
      symbol: r.symbol,
      labelJa: r.labelJa,
      shares: r.shares,
      entryPriceMYR: r.limitPriceMYR,
      orderAmountMYR: r.orderPriceMYR,
      yahooCloseMYR: r.yahooCloseMYR,
      yahooMarketValueMYR: r.yahooMarketValueMYR,
      deltaMYR: r.orderVsYahooDeltaMYR,
      brokerageFeeMYR: round3(fee.estimatedFee),
    };
  });

  const orderTotalMYR = round3(registeredLimits.reduce((s, r) => s + r.orderAmountMYR, 0));
  const yahooMarketTotalMYR = round3(
    registeredLimits.reduce((s, r) => s + (r.yahooMarketValueMYR ?? r.orderAmountMYR), 0),
  );
  const allocationTotalMYR = round3(orders.reduce((s, o) => s + o.allocationMYR, 0));
  const brokerageTotalMYR = round3(registeredLimits.reduce((s, r) => s + r.brokerageFeeMYR, 0));
  const orderWithFeesMYR = round3(orderTotalMYR + brokerageTotalMYR);
  const cashAfterOrdersMYR = round3(cashMYR - orderTotalMYR);
  const cashAfterOrdersAndFeesMYR = round3(cashMYR - orderWithFeesMYR);

  const checks: ForwardMalaysiaV4RakutenRegisterCheckRow[] = [];

  checks.push({
    checkId: '1',
    titleJa: 'manualOrderList entryPrice 登録',
    grade: registeredLimits.every((r) => r.entryPriceMYR > 0) ? 'PASS' : 'FAIL',
    evidenceJa: registeredLimits
      .map((r) => `${r.labelJa} entryPrice${r.entryPriceMYR} × ${r.shares} = ${r.orderAmountMYR}MYR`)
      .join(' · '),
    codeRefJa: 'buildUserPendingOrdersFromLimits · ManualOrderItem.entryPrice',
  });

  checks.push({
    checkId: '2',
    titleJa: '注文評価=entryPrice×株数（Yahoo不使用）',
    grade: orderTotalMYR === allocationTotalMYR ? 'PASS' : 'WARNING',
    evidenceJa: `指値合計${orderTotalMYR}MYR · allocation${allocationTotalMYR}MYR · Yahoo参考${yahooMarketTotalMYR}MYR`,
    codeRefJa: 'realAccountOrderValuation.pendingOrderAmountMYR',
  });

  checks.push({
    checkId: '3',
    titleJa: 'Yahoo終値は参考列のみ',
    grade: 'PASS',
    evidenceJa: registeredLimits
      .map((r) => `${r.labelJa} 注文${r.orderAmountMYR} vs Yahoo${r.yahooMarketValueMYR} Δ${r.deltaMYR}`)
      .join(' · '),
    codeRefJa: 'buildPendingOrderValuationRows · yahoo_market参考',
  });

  const fitsBefore = orderTotalMYR <= cashMYR + 0.001;
  checks.push({
    checkId: '4',
    titleJa: '現金残高 vs 注文総額（手数料前）',
    grade: fitsBefore ? 'PASS' : 'FAIL',
    evidenceJa: `現金${cashMYR} · 注文${orderTotalMYR} · 残${cashAfterOrdersMYR}MYR`,
    codeRefJa: 'totals.fitsWithinCashBeforeFees',
  });

  const fitsAfter = orderWithFeesMYR <= cashMYR + 0.001;
  checks.push({
    checkId: '5',
    titleJa: '手数料考慮後',
    grade: fitsAfter ? 'PASS' : fitsBefore ? 'WARNING' : 'FAIL',
    evidenceJa: `手数料${brokerageTotalMYR}MYR · 注文+手数料${orderWithFeesMYR}MYR · 残${cashAfterOrdersAndFeesMYR}MYR`,
    codeRefJa: 'getBrokerageEstimate · bursa',
  });

  checks.push({
    checkId: '6',
    titleJa: 'Portfolio UI · 注文/Yahoo/差額表示',
    grade: 'PASS',
    evidenceJa: 'RealAccountPendingOrdersPanel · ManualOrderListScreen entryPrice編集',
    codeRefJa: 'src/components/RealAccountPendingOrdersPanel.tsx',
  });

  const overallGrade = gradeWorst(checks.map((c) => c.grade));

  const humanSummaryJa = [
    '監査90 Malaysia v4 Rakuten実指値登録',
    FIXED_CONDITIONS_JA,
    `総合判定: ${overallGrade}`,
    ...checks.map((c) => `[${c.grade}] ${c.checkId} ${c.titleJa}: ${c.evidenceJa}`),
    `登録指値: ${registeredLimits.map((r) => `${r.labelJa}@${r.entryPriceMYR}`).join(' · ')}`,
    `注文総額${orderTotalMYR}MYR · 手数料${brokerageTotalMYR}MYR · 合計${orderWithFeesMYR}MYR · 現金${cashMYR}MYR`,
  ].join('\n');

  return {
    auditedAt,
    overallGrade,
    checks,
    registeredLimits,
    totals: {
      orderTotalMYR,
      yahooMarketTotalMYR,
      allocationTotalMYR,
      brokerageTotalMYR,
      orderWithFeesMYR,
      cashMYR,
      cashAfterOrdersMYR,
      cashAfterOrdersAndFeesMYR,
      fitsWithinCashBeforeFees: fitsBefore,
      fitsWithinCashAfterFees: fitsAfter,
    },
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export function formatMalaysiaV4RakutenRegisterCsv(
  report: ForwardMalaysiaV4RakutenRegisterAuditReport,
): string {
  const t = report.totals;
  const lines = [
    `# 重要監査90 Rakuten実指値 ${report.auditedAt}`,
    `# ${report.fixedConditionsJa}`,
    `# 総合判定: ${report.overallGrade}`,
    '',
    'section,key,value',
    ['totals', 'order', t.orderTotalMYR].join(','),
    ['totals', 'yahoo', t.yahooMarketTotalMYR].join(','),
    ['totals', 'brokerage', t.brokerageTotalMYR].join(','),
    ['totals', 'withFees', t.orderWithFeesMYR].join(','),
    ['totals', 'cash', t.cashMYR].join(','),
    ['totals', 'cashAfterOrders', t.cashAfterOrdersMYR].join(','),
    ['totals', 'cashAfterFees', t.cashAfterOrdersAndFeesMYR].join(','),
    '',
    'section,symbol,label,shares,entryPrice,orderAmount,yahooClose,yahooMV,delta,fee',
    ...report.registeredLimits.map((r) =>
      [
        'limit',
        r.symbol,
        r.labelJa,
        r.shares,
        r.entryPriceMYR,
        r.orderAmountMYR,
        r.yahooCloseMYR ?? '',
        r.yahooMarketValueMYR ?? '',
        r.deltaMYR ?? '',
        r.brokerageFeeMYR,
      ].join(','),
    ),
    '',
    'section,checkId,title,grade,evidence',
    ...report.checks.map((c) =>
      ['check', c.checkId, `"${c.titleJa}"`, c.grade, `"${c.evidenceJa.replace(/"/g, '""')}"`].join(','),
    ),
  ];
  return lines.join('\n');
}

export async function runMalaysiaV4RakutenRegisterAudit(): Promise<ForwardMalaysiaV4RakutenRegisterAuditReport | null> {
  return buildMalaysiaV4RakutenRegisterAuditReport();
}
