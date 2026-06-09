/**
 * 重要監査88 — 実口座資産 · 二重計上修正
 * 総資産 = 保有評価額 + 利用可能現金 + 拘束現金
 */
import type {
  ForwardMalaysiaV4RealAssetsAuditGrade,
  ForwardMalaysiaV4RealAssetsAuditReport,
  ForwardMalaysiaV4RealAssetsCheckRow,
} from '../../types/forwardValidation';
import { calculateBuyingPower } from '../buyingPower';
import {
  buildRealAccountExposureReport,
  buildOrderCompareRows,
} from '../realAccountExposure';
import { buildUserPendingOrders } from './forwardValidationMalaysiaV4RealAccountAudit';
import { fetchMalaysiaV76AuditBundle } from './forwardValidationMalaysiaV4CandidateAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const FIXED_CONDITIONS_JA =
  'MY v4実口座資産監査88 · 総資産=保有+現金(利用可能+拘束) · 注文中は資産外 · 推測禁止';

const V4_ORDER_DEFS = [
  { symbol: '5347', name: 'TENAGA', shares: 100 },
  { symbol: '1023', name: 'CIMB', shares: 100 },
  { symbol: '5398', name: 'GAMUDA', shares: 100 },
  { symbol: '6742', name: 'YTL', shares: 500 },
  { symbol: '3336', name: 'IJM', shares: 500 },
] as const;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function latestClose(bundle: SurvivorshipOhlcvBundle, symbol: string): number {
  return bundle.etfBars[symbol]?.[bundle.etfBars[symbol]!.length - 1]?.close ?? 0;
}

function priceMap(bundle: SurvivorshipOhlcvBundle): Record<string, number> {
  const out: Record<string, number> = {};
  for (const def of V4_ORDER_DEFS) out[def.symbol] = round3(latestClose(bundle, def.symbol));
  return out;
}

function gradeWorst(grades: ForwardMalaysiaV4RealAssetsAuditGrade[]): ForwardMalaysiaV4RealAssetsAuditGrade {
  if (grades.includes('FAIL')) return 'FAIL';
  if (grades.includes('WARNING')) return 'WARNING';
  return 'PASS';
}

function build5820DerivationJa(prices: Record<string, number>): string {
  const lines = V4_ORDER_DEFS.map((def) => {
    const px = prices[def.symbol] ?? 0;
    const mv = round3(px * def.shares);
    return `${def.name} ${def.shares}×${px}=${mv}`;
  });
  const sum = round3(lines.reduce((s, _, i) => s + round3((prices[V4_ORDER_DEFS[i]!.symbol] ?? 0) * V4_ORDER_DEFS[i]!.shares), 0));
  return `監査87注文中5820MYR根拠: ${lines.join(' + ')} = ${sum}MYR (Yahoo終値×株数 · buildUserPendingOrders)`;
}

export async function buildMalaysiaV4RealAssetsAuditReport(input?: {
  bundle?: SurvivorshipOhlcvBundle | null;
  cashMYR?: number;
}): Promise<ForwardMalaysiaV4RealAssetsAuditReport | null> {
  const bundle = input?.bundle ?? (await fetchMalaysiaV76AuditBundle());
  if (!bundle) return null;

  const auditedAt = new Date().toISOString();
  const cashMYR = input?.cashMYR ?? 5000;
  const prices = priceMap(bundle);
  const pending = buildUserPendingOrders(prices);

  const report = buildRealAccountExposureReport({
    matchedPositions: [],
    pendingOrders: pending,
    availableCashMYR: cashMYR,
    priceBySymbol: prices,
  });

  const buyingPowerNote = calculateBuyingPower({
    portfolio: [],
    manualOrderList: pending,
    deposits: [{ id: 'd1', amountMYR: cashMYR, completed: true, createdAt: auditedAt }],
    settings: {
      totalCapitalMYR: cashMYR,
      accountType: 'cash_upfront',
      market: 'bursa',
      currency: 'MYR',
    },
  } as never);

  const checks: ForwardMalaysiaV4RealAssetsCheckRow[] = [];

  checks.push({
    checkId: '1',
    titleJa: 'buyingPowerは注文中資金を控除しない',
    grade: report.cash.buyingPowerDeductsPending === false ? 'PASS' : 'FAIL',
    evidenceJa: `buyingPower=${buyingPowerNote.buyingPowerMYR}MYR · invested=${buyingPowerNote.investedMYR}(portfolioのみ) · 注文${report.pendingCommittedMYR}MYRは未控除`,
    codeRefJa: 'buyingPower.calculateBuyingPower · investedMYR=portfolio cost basis only',
  });

  const formulaOk =
    round3(report.matchedStockValueMYR + report.cash.totalCashMYR) === report.totalAssetsMYR;
  checks.push({
    checkId: '2',
    titleJa: '注文中評価額+現金の二重計上を排除',
    grade: report.isDoubleCounting ? 'PASS' : formulaOk ? 'PASS' : 'FAIL',
    evidenceJa: `監査87式${report.audit87EffectiveExposureMYR}MYR → 修正後${report.totalAssetsMYR}MYR · 過剰計上${report.doubleCountExcessMYR}MYR`,
    codeRefJa: 'realAccountExposure.buildRealAccountExposureReport · totalAssetsMYR',
  });

  const cashSplitOk =
    round3(report.cash.availableCashMYR + report.cash.reservedCashMYR) === report.cash.totalCashMYR;
  checks.push({
    checkId: '3',
    titleJa: '総資産 = 保有 + 利用可能 + 拘束',
    grade: formulaOk && cashSplitOk ? 'PASS' : 'FAIL',
    evidenceJa: `${report.matchedStockValueMYR}+${report.cash.availableCashMYR}+${report.cash.reservedCashMYR}=${report.totalAssetsMYR}MYR · 注文中${report.pendingOrderValueMYR}MYR(資産外)`,
    codeRefJa: 'computeCashBreakdown · totalAssetsMYR',
  });

  const orderRows = buildOrderCompareRows(pending, prices);
  const aiTotal = round3(orderRows.reduce((s, r) => s + r.aiOrderAmountMYR, 0));
  checks.push({
    checkId: '4',
    titleJa: 'Rakuten注文金額 vs AI計算（株数・Yahoo終値ベース）',
    grade: 'WARNING',
    evidenceJa: orderRows
      .map((r) => `${r.labelJa} ${r.shares}株 AI${r.aiOrderAmountMYR}MYR`)
      .join(' · ') + ` · 合計${aiTotal}MYR · Rakuten実額はAPI未接続`,
    codeRefJa: 'buildOrderCompareRows · ManualOrderItem.allocationMYR',
  });

  checks.push({
    checkId: '5',
    titleJa: '監査87注文中5820MYRの根拠',
    grade: Math.abs(report.pendingOrderValueMYR - 5820) < 50 ? 'PASS' : 'WARNING',
    evidenceJa: build5820DerivationJa(prices),
    codeRefJa: 'buildUserPendingOrders · fetchMalaysiaV76AuditBundle Yahoo終値',
  });

  checks.push({
    checkId: '6',
    titleJa: '口座内訳（現金・拘束・保有・注文中）',
    grade: 'PASS',
    evidenceJa: `現金${report.cash.totalCashMYR} · 拘束${report.cash.reservedCashMYR} · 利用可能${report.cash.availableCashMYR} · 保有${report.matchedStockValueMYR} · 注文中評価${report.pendingOrderValueMYR}`,
    codeRefJa: 'RealAccountExposurePanel · accountBreakdown',
  });

  if (report.isOverCommitted) {
    checks.push({
      checkId: '7',
      titleJa: '注文超過（確定額>現金）',
      grade: 'WARNING',
      evidenceJa: `確定${report.pendingCommittedMYR}MYR > 現金${report.cash.totalCashMYR}MYR · 約定後余力${report.cashCushionAfterFillMYR}MYR`,
      codeRefJa: 'isOverCommitted · cashCushionAfterFillMYR',
    });
  }

  const overallGrade = gradeWorst(checks.map((c) => c.grade));

  const humanSummaryJa = [
    '監査88 Malaysia v4 実口座資産（二重計上修正）',
    FIXED_CONDITIONS_JA,
    `総合判定: ${overallGrade}`,
    ...checks.map((c) => `[${c.grade}] ${c.checkId} ${c.titleJa}: ${c.evidenceJa}`),
    report.assetsSummaryJa,
    report.assumedSummaryJa,
    report.projectedSummaryJa,
    report.liquiditySummaryJa,
  ].join('\n');

  return {
    auditedAt,
    overallGrade,
    checks,
    accountBreakdown: {
      matchedStockValueMYR: report.matchedStockValueMYR,
      pendingOrderMarketValueMYR: report.pendingOrderValueMYR,
      pendingCommittedMYR: report.pendingCommittedMYR,
      totalCashMYR: report.cash.totalCashMYR,
      reservedCashMYR: report.cash.reservedCashMYR,
      availableCashMYR: report.cash.availableCashMYR,
      totalAssetsMYR: report.totalAssetsMYR,
      audit87EffectiveExposureMYR: report.audit87EffectiveExposureMYR,
      doubleCountExcessMYR: report.doubleCountExcessMYR,
      isDoubleCounting: report.isDoubleCounting,
      isOverCommitted: report.isOverCommitted,
      buyingPowerDeductsPending: report.cash.buyingPowerDeductsPending,
    },
    audit87Pending5820DerivationJa: build5820DerivationJa(prices),
    orderCompareRows: orderRows.map((r) => ({
      symbol: r.symbol,
      labelJa: r.labelJa,
      shares: r.shares,
      entryPriceMYR: r.entryPriceMYR,
      aiOrderAmountMYR: r.aiOrderAmountMYR,
      aiMarketValueMYR: r.aiMarketValueMYR,
      rakutenOrderAmountMYR: r.rakutenOrderAmountMYR,
      noteJa: r.noteJa,
    })),
    allocationRows: report.allocationRows
      .filter((r) => r.bucket === 'stock')
      .map((r) => ({
        symbol: r.symbol,
        labelJa: r.labelJa,
        proFormaWeightPct: r.assumedWeightPct,
        projectedWeightPct: r.projectedWeightPct,
        targetWeightPct: r.targetWeightPct,
      })),
    assetsSummaryJa: report.assetsSummaryJa,
    proFormaSummaryJa: report.assumedSummaryJa,
    projectedSummaryJa: report.projectedSummaryJa,
    liquiditySummaryJa: report.liquiditySummaryJa,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export function formatMalaysiaV4RealAssetsCsv(
  report: ForwardMalaysiaV4RealAssetsAuditReport,
): string {
  const b = report.accountBreakdown;
  const lines = [
    `# 重要監査88 実口座資産 ${report.auditedAt}`,
    `# ${report.fixedConditionsJa}`,
    `# 総合判定: ${report.overallGrade}`,
    '',
    'section,key,value',
    ['assets', 'matched', b.matchedStockValueMYR].join(','),
    ['assets', 'pendingMarketValue', b.pendingOrderMarketValueMYR].join(','),
    ['assets', 'pendingCommitted', b.pendingCommittedMYR].join(','),
    ['assets', 'totalCash', b.totalCashMYR].join(','),
    ['assets', 'reservedCash', b.reservedCashMYR].join(','),
    ['assets', 'availableCash', b.availableCashMYR].join(','),
    ['assets', 'totalAssets', b.totalAssetsMYR].join(','),
    ['assets', 'audit87Effective', b.audit87EffectiveExposureMYR].join(','),
    ['assets', 'doubleCountExcess', b.doubleCountExcessMYR].join(','),
    ['assets', 'buyingPowerDeductsPending', b.buyingPowerDeductsPending].join(','),
    ['assets', 'overCommitted', b.isOverCommitted].join(','),
    '',
    'section,checkId,title,grade,evidence',
    ...report.checks.map((c) =>
      ['check', c.checkId, `"${c.titleJa}"`, c.grade, `"${c.evidenceJa.replace(/"/g, '""')}"`].join(','),
    ),
    '',
    'section,symbol,label,shares,entryPrice,aiOrder,aiMarket,rakuten,note',
    ...report.orderCompareRows.map((r) =>
      [
        'order',
        r.symbol,
        r.labelJa,
        r.shares,
        r.entryPriceMYR,
        r.aiOrderAmountMYR,
        r.aiMarketValueMYR,
        r.rakutenOrderAmountMYR ?? '',
        `"${r.noteJa.replace(/"/g, '""')}"`,
      ].join(','),
    ),
    '',
    'section,symbol,label,proFormaPct,projectedPct,targetPct',
    ...report.allocationRows.map((r) =>
      ['alloc', r.symbol, r.labelJa, r.proFormaWeightPct, r.projectedWeightPct, r.targetWeightPct].join(','),
    ),
    '',
    'section,summary,type,content',
    ['summary', '5820derivation', `"${report.audit87Pending5820DerivationJa.replace(/"/g, '""')}"`].join(','),
    ['summary', 'assets', `"${report.assetsSummaryJa.replace(/"/g, '""')}"`].join(','),
    ['summary', 'proForma', `"${report.proFormaSummaryJa.replace(/"/g, '""')}"`].join(','),
    ['summary', 'projected', `"${report.projectedSummaryJa.replace(/"/g, '""')}"`].join(','),
    ['summary', 'liquidity', `"${report.liquiditySummaryJa.replace(/"/g, '""')}"`].join(','),
  ];
  return lines.join('\n');
}

export async function runMalaysiaV4RealAssetsAudit(): Promise<ForwardMalaysiaV4RealAssetsAuditReport | null> {
  return buildMalaysiaV4RealAssetsAuditReport();
}
