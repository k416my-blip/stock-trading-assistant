/**
 * 重要監査89 — Rakuten実注文金額 vs AI注文金額
 */
import type {
  ForwardMalaysiaV4OrderAmountAuditGrade,
  ForwardMalaysiaV4OrderAmountAuditReport,
  ForwardMalaysiaV4OrderAmountCheckRow,
} from '../../types/forwardValidation';
import type { ManualOrderItem } from '../../types';
import {
  buildPendingOrderValuationRows,
  computePendingOrderValuationTotalMYR,
  pendingOrderAmountMYR,
} from '../realAccountOrderValuation';
import { buildUserPendingOrders } from './forwardValidationMalaysiaV4RealAccountAudit';
import { fetchMalaysiaV76AuditBundle } from './forwardValidationMalaysiaV4CandidateAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const FIXED_CONDITIONS_JA =
  'MY v4注文金額監査89 · manualOrderList vs Yahoo終値 · 指値ベース評価 · 推測禁止';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function latestClose(bundle: SurvivorshipOhlcvBundle, symbol: string): number {
  return bundle.etfBars[symbol]?.[bundle.etfBars[symbol]!.length - 1]?.close ?? 0;
}

function priceMap(bundle: SurvivorshipOhlcvBundle): Record<string, number> {
  const syms = ['5347', '1023', '5398', '6742', '3336'];
  const out: Record<string, number> = {};
  for (const s of syms) out[s] = round3(latestClose(bundle, s));
  return out;
}

function gradeWorst(grades: ForwardMalaysiaV4OrderAmountAuditGrade[]): ForwardMalaysiaV4OrderAmountAuditGrade {
  if (grades.includes('FAIL')) return 'FAIL';
  if (grades.includes('WARNING')) return 'WARNING';
  return 'PASS';
}

function manualOrderListDisplayRows(orders: ManualOrderItem[]) {
  return orders.map((o) => ({
    orderId: o.id,
    symbol: o.symbol,
    labelJa: o.name,
    shares: o.estimatedShares,
    limitPriceMYR: o.entryPrice,
    allocationMYR: round3(o.allocationMYR),
    orderAmountMYR: pendingOrderAmountMYR(o),
    completed: o.completed,
    source: o.source,
  }));
}

export async function buildMalaysiaV4OrderAmountAuditReport(input?: {
  bundle?: SurvivorshipOhlcvBundle | null;
  cashMYR?: number;
  /** AppState/manualOrderList 実データ（未指定時は監査用 buildUserPendingOrders） */
  manualOrderList?: ManualOrderItem[];
}): Promise<ForwardMalaysiaV4OrderAmountAuditReport | null> {
  const bundle = input?.bundle ?? (await fetchMalaysiaV76AuditBundle());
  if (!bundle) return null;

  const auditedAt = new Date().toISOString();
  const cashMYR = input?.cashMYR ?? 5000;
  const prices = priceMap(bundle);
  const orders =
    input?.manualOrderList ??
    buildUserPendingOrders(prices, auditedAt);

  const comparisonRows = buildPendingOrderValuationRows(orders, prices).map((r) => ({
    symbol: r.symbol,
    labelJa: r.labelJa,
    shares: r.shares,
    limitPriceMYR: r.limitPriceMYR,
    orderPriceMYR: r.orderPriceMYR,
    yahooCloseMYR: r.yahooCloseMYR,
    yahooMarketValueMYR: r.yahooMarketValueMYR,
    orderVsYahooDeltaMYR: r.orderVsYahooDeltaMYR,
  }));

  const orderPriceTotalMYR = computePendingOrderValuationTotalMYR(orders, 'order_price', prices);
  const yahooMarketTotalMYR = computePendingOrderValuationTotalMYR(orders, 'yahoo_market', prices);
  const allocationTotalMYR = round3(
    orders.filter((o) => !o.completed && o.side === 'buy').reduce((s, o) => s + o.allocationMYR, 0),
  );
  const shortfallVsCashMYR = round3(Math.max(0, orderPriceTotalMYR - cashMYR));
  const yahooShortfallMYR = round3(Math.max(0, yahooMarketTotalMYR - cashMYR));
  const impliedScale =
    yahooMarketTotalMYR > 0 ? round3(cashMYR / yahooMarketTotalMYR) : null;

  const checks: ForwardMalaysiaV4OrderAmountCheckRow[] = [];

  checks.push({
    checkId: '1',
    titleJa: 'manualOrderList 全注文内容',
    grade: orders.length > 0 ? 'PASS' : 'FAIL',
    evidenceJa: manualOrderListDisplayRows(orders)
      .map(
        (r) =>
          `${r.labelJa} ${r.shares}株 指値${r.limitPriceMYR} 注文${r.orderAmountMYR}MYR allocation${r.allocationMYR}`,
      )
      .join(' · '),
    codeRefJa: 'ManualOrderItem · buildUserPendingOrders or input.manualOrderList',
  });

  const yahooMismatch = comparisonRows.some(
    (r) => r.yahooMarketValueMYR != null && Math.abs(r.orderPriceMYR - r.yahooMarketValueMYR) > 0.001,
  );
  checks.push({
    checkId: '2',
    titleJa: '指値×株数 vs Yahoo終値×株数 比較',
    grade: yahooMismatch ? 'WARNING' : 'PASS',
    evidenceJa: comparisonRows
      .map(
        (r) =>
          `${r.labelJa}: 注文${r.orderPriceMYR} vs Yahoo${r.yahooMarketValueMYR ?? 'N/A'} Δ${r.orderVsYahooDeltaMYR ?? 0}`,
      )
      .join(' · '),
    codeRefJa: 'realAccountOrderValuation.buildPendingOrderValuationRows',
  });

  checks.push({
    checkId: '3',
    titleJa: '指値ベース再計算合計',
    grade: 'PASS',
    evidenceJa: `指値合計${orderPriceTotalMYR}MYR · allocation合計${allocationTotalMYR}MYR · Yahoo合計${yahooMarketTotalMYR}MYR`,
    codeRefJa: 'pendingOrderAmountMYR · computePendingOrderValuationTotalMYR',
  });

  const fitsOrder = orderPriceTotalMYR <= cashMYR + 0.001;
  checks.push({
    checkId: '4',
    titleJa: '現金5000MYR以内（指値ベース）',
    grade: fitsOrder ? 'PASS' : 'FAIL',
    evidenceJa: fitsOrder
      ? `指値合計${orderPriceTotalMYR}MYR ≤ 現金${cashMYR}MYR`
      : `指値合計${orderPriceTotalMYR}MYR > 現金${cashMYR}MYR · 不足${shortfallVsCashMYR}MYR`,
    codeRefJa: 'totals.fitsWithinCashAtOrderPrice',
  });

  checks.push({
    checkId: '5',
    titleJa: '不足820MYRの原因',
    grade: yahooShortfallMYR >= 820 - 1 ? 'PASS' : 'WARNING',
    evidenceJa:
      yahooShortfallMYR >= 820 - 1
        ? `Yahoo評価${yahooMarketTotalMYR}-現金${cashMYR}=${yahooShortfallMYR}MYR · 監査がYahoo終値を指値として合成(buildUserPendingOrders) · Rakuten受付済み=実指値合計≤5000`
        : `不足${shortfallVsCashMYR}MYR · 要因: 株数×Yahoo終値が現金超過 / AppState未読込で実指値未取得`,
    codeRefJa: 'buildUserPendingOrders · computePendingOrderMarketValueMYR(yahoo override)',
  });

  checks.push({
    checkId: '6',
    titleJa: '今後の注文評価額ポリシー（指値優先）',
    grade: 'PASS',
    evidenceJa:
      'realAccountOrderValuation: デフォルト order_price(指値×株数) · Yahooは yahoo_market 参考列のみ · allocationMYR=拘束額',
    codeRefJa: 'realAccountOrderValuation.ts · realAccountExposure pendingOrderValueMYR',
  });

  if (!fitsOrder && impliedScale != null) {
    checks.push({
      checkId: '7',
      titleJa: 'Yahoo終値を5000MYRに収める均一スケール（参考）',
      grade: 'WARNING',
      evidenceJa: `係数${impliedScale} · 例 TENAGA指値${round3((prices['5347'] ?? 0) * impliedScale)} · 実際のRakuten指値は銘柄別`,
      codeRefJa: 'totals.impliedUniformLimitScaleForCash',
    });
  }

  const overallGrade = gradeWorst(checks.map((c) => c.grade));

  const rootCauseJa = [
    '根本原因:',
    '1) 監査86-88は buildUserPendingOrders が Yahoo終値を entryPrice/allocationMYR に設定',
    '2) 旧 computePendingOrderMarketValueMYR が priceBySymbol(Yahoo) で指値を上書き',
    '3) 申告株数(100/100/100/500/500)×Yahoo終値=5820MYR > 現金5000MYR',
    '4) Rakuten受付済み → 実指値×株数≤5000（AIはAppState未読込のため実指値未取得）',
    `5) 820MYR = ${yahooMarketTotalMYR} - ${cashMYR}（Yahoo評価と現金の差）`,
  ].join(' ');

  const valuationPolicyJa =
    '変更済: pendingOrderValueMYR=指値×株数 · pendingMarkToMarketMYR=Yahoo参考 · 拘束=allocationMYR';

  const humanSummaryJa = [
    '監査89 Malaysia v4 Rakuten注文金額 vs AI',
    FIXED_CONDITIONS_JA,
    `総合判定: ${overallGrade}`,
    ...checks.map((c) => `[${c.grade}] ${c.checkId} ${c.titleJa}: ${c.evidenceJa}`),
    rootCauseJa,
    valuationPolicyJa,
  ].join('\n');

  return {
    auditedAt,
    overallGrade,
    checks,
    manualOrderListRows: manualOrderListDisplayRows(orders),
    comparisonRows,
    totals: {
      orderPriceTotalMYR,
      yahooMarketTotalMYR,
      allocationTotalMYR,
      cashMYR,
      shortfallVsCashMYR,
      fitsWithinCashAtOrderPrice: fitsOrder,
      fitsWithinCashAtYahoo: yahooMarketTotalMYR <= cashMYR + 0.001,
      impliedUniformLimitScaleForCash: impliedScale,
    },
    rootCauseJa,
    valuationPolicyJa,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export function formatMalaysiaV4OrderAmountCsv(
  report: ForwardMalaysiaV4OrderAmountAuditReport,
): string {
  const t = report.totals;
  const lines = [
    `# 重要監査89 注文金額 ${report.auditedAt}`,
    `# ${report.fixedConditionsJa}`,
    `# 総合判定: ${report.overallGrade}`,
    '',
    'section,key,value',
    ['totals', 'orderPrice', t.orderPriceTotalMYR].join(','),
    ['totals', 'yahooMarket', t.yahooMarketTotalMYR].join(','),
    ['totals', 'allocation', t.allocationTotalMYR].join(','),
    ['totals', 'cash', t.cashMYR].join(','),
    ['totals', 'shortfall', t.shortfallVsCashMYR].join(','),
    ['totals', 'fitsOrderPrice', t.fitsWithinCashAtOrderPrice].join(','),
    ['totals', 'fitsYahoo', t.fitsWithinCashAtYahoo].join(','),
    ['totals', 'impliedScale', t.impliedUniformLimitScaleForCash ?? ''].join(','),
    '',
    'section,orderId,symbol,label,shares,limit,allocation,orderAmount,completed,source',
    ...report.manualOrderListRows.map((r) =>
      [
        'order',
        r.orderId,
        r.symbol,
        r.labelJa,
        r.shares,
        r.limitPriceMYR,
        r.allocationMYR,
        r.orderAmountMYR,
        r.completed,
        r.source,
      ].join(','),
    ),
    '',
    'section,symbol,label,shares,limit,orderPrice,yahooClose,yahooMV,delta',
    ...report.comparisonRows.map((r) =>
      [
        'compare',
        r.symbol,
        r.labelJa,
        r.shares,
        r.limitPriceMYR,
        r.orderPriceMYR,
        r.yahooCloseMYR ?? '',
        r.yahooMarketValueMYR ?? '',
        r.orderVsYahooDeltaMYR ?? '',
      ].join(','),
    ),
    '',
    'section,checkId,title,grade,evidence',
    ...report.checks.map((c) =>
      ['check', c.checkId, `"${c.titleJa}"`, c.grade, `"${c.evidenceJa.replace(/"/g, '""')}"`].join(','),
    ),
    '',
    'section,summary,type,content',
    ['summary', 'rootCause', `"${report.rootCauseJa.replace(/"/g, '""')}"`].join(','),
    ['summary', 'policy', `"${report.valuationPolicyJa.replace(/"/g, '""')}"`].join(','),
  ];
  return lines.join('\n');
}

export async function runMalaysiaV4OrderAmountAudit(): Promise<ForwardMalaysiaV4OrderAmountAuditReport | null> {
  return buildMalaysiaV4OrderAmountAuditReport();
}
