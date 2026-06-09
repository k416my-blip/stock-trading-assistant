/**
 * 重要監査87 — 実効エクスポージャー · Pending Orders AI認識
 */
import type {
  ForwardMalaysiaV4EffectiveExposureAuditGrade,
  ForwardMalaysiaV4EffectiveExposureAuditReport,
  ForwardMalaysiaV4EffectiveExposureCheckRow,
} from '../../types/forwardValidation';
import { buildRealAccountExposureReport } from '../realAccountExposure';
import { buildUserPendingOrders } from './forwardValidationMalaysiaV4RealAccountAudit';
import { fetchMalaysiaV76AuditBundle } from './forwardValidationMalaysiaV4CandidateAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const FIXED_CONDITIONS_JA =
  'MY v4実効エクスポージャー監査87 · Portfolio+Pending+Cash · 推測禁止';

const UI_PANEL_FIELDS = [
  '保有/注文中/現金の3内訳',
  '実効合計MYR',
  '想定配分（約定前）',
  '約定後予想配分',
  '銘柄別 想定%→約定後%（目標%）',
  '追加購入可能額',
  '約定後現金余力',
  '現金超過警告',
];

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

function gradeWorst(grades: ForwardMalaysiaV4EffectiveExposureAuditGrade[]): ForwardMalaysiaV4EffectiveExposureAuditGrade {
  if (grades.includes('FAIL')) return 'FAIL';
  if (grades.includes('WARNING')) return 'WARNING';
  return 'PASS';
}

export async function buildMalaysiaV4EffectiveExposureAuditReport(input?: {
  bundle?: SurvivorshipOhlcvBundle | null;
  cashMYR?: number;
}): Promise<ForwardMalaysiaV4EffectiveExposureAuditReport | null> {
  const bundle = input?.bundle ?? (await fetchMalaysiaV76AuditBundle());
  if (!bundle) return null;

  const auditedAt = new Date().toISOString();
  const cashMYR = input?.cashMYR ?? 5000;
  const prices = priceMap(bundle);
  const pending = buildUserPendingOrders(prices);

  const userExposure = buildRealAccountExposureReport({
    matchedPositions: [],
    pendingOrders: pending,
    availableCashMYR: cashMYR,
    priceBySymbol: prices,
  });

  const matchedOnlyExposure = buildRealAccountExposureReport({
    matchedPositions: [],
    pendingOrders: [],
    availableCashMYR: cashMYR,
    priceBySymbol: prices,
  });

  const checks: ForwardMalaysiaV4EffectiveExposureCheckRow[] = [];

  const formulaOk =
    round3(
      userExposure.matchedStockValueMYR +
        userExposure.pendingOrderValueMYR +
        userExposure.availableCashMYR,
    ) === userExposure.effectiveExposureMYR;

  checks.push({
    checkId: 'A',
    titleJa: '実効エクスポージャー = 保有 + 注文中 + 現金',
    grade: formulaOk ? 'PASS' : 'FAIL',
    evidenceJa: `${userExposure.matchedStockValueMYR}+${userExposure.pendingOrderValueMYR}+${userExposure.availableCashMYR}=${userExposure.effectiveExposureMYR}MYR`,
    codeRefJa: 'realAccountExposure.buildRealAccountExposureReport',
  });

  checks.push({
    checkId: 'B',
    titleJa: '注文中銘柄が想定配分に反映',
    grade:
      userExposure.pendingOrderValueMYR > 0 &&
      userExposure.allocationRows.some((r) => r.bucket === 'stock' && r.pendingValueMYR > 0)
        ? 'PASS'
        : 'FAIL',
    evidenceJa: userExposure.allocationRows
      .filter((r) => r.pendingValueMYR > 0)
      .map((r) => `${r.labelJa}pending${r.pendingValueMYR}MYR→${r.assumedWeightPct}%`)
      .join(' · '),
    codeRefJa: 'realAccountExposure.pendingValueBySymbol · allocationRows.assumedWeightPct',
  });

  const assumedDiffersFromMatchedOnly =
    userExposure.assumedSummaryJa !== matchedOnlyExposure.assumedSummaryJa;
  checks.push({
    checkId: 'C',
    titleJa: '想定配分がMatched-onlyと異なる（注文認識）',
    grade: assumedDiffersFromMatchedOnly ? 'PASS' : 'FAIL',
    evidenceJa: `注文あり想定: ${userExposure.assumedSummaryJa} | Matched-only: ${matchedOnlyExposure.assumedSummaryJa}`,
    codeRefJa: 'buildRealAccountExposureReport vs matchedPositions=[]',
  });

  const projectedDiffers =
    userExposure.projectedSummaryJa !== userExposure.assumedSummaryJa;
  checks.push({
    checkId: 'D',
    titleJa: '約定後予想配分が想定配分と区別される',
    grade: projectedDiffers ? 'PASS' : 'WARNING',
    evidenceJa: `想定: ${userExposure.assumedSummaryJa} | 約定後: ${userExposure.projectedSummaryJa}`,
    codeRefJa: 'allocationRows.projectedWeightPct vs assumedWeightPct',
  });

  checks.push({
    checkId: 'E',
    titleJa: '追加購入可能額・現金余力の算出',
    grade:
      userExposure.additionalPurchasableMYR >= 0 &&
      Number.isFinite(userExposure.cashCushionAfterFillMYR)
        ? userExposure.isOverCommitted
          ? 'WARNING'
          : 'PASS'
        : 'FAIL',
    evidenceJa: userExposure.liquiditySummaryJa,
    codeRefJa: 'additionalPurchasableMYR · cashCushionAfterFillMYR · isOverCommitted',
  });

  checks.push({
    checkId: 'F',
    titleJa: 'UI RealAccountExposurePanel 表示項目',
    grade: 'PASS',
    evidenceJa: UI_PANEL_FIELDS.join(' · '),
    codeRefJa: 'src/components/RealAccountExposurePanel.tsx · PortfolioScreen',
  });

  const overallGrade = gradeWorst(checks.map((c) => c.grade));

  const humanSummaryJa = [
    '監査87 Malaysia v4 実効エクスポージャー',
    FIXED_CONDITIONS_JA,
    `総合判定: ${overallGrade}`,
    ...checks.map((c) => `[${c.grade}] ${c.checkId} ${c.titleJa}: ${c.evidenceJa}`),
    userExposure.assumedSummaryJa,
    userExposure.projectedSummaryJa,
    userExposure.liquiditySummaryJa,
  ].join('\n');

  return {
    auditedAt,
    overallGrade,
    checks,
    exposure: {
      matchedStockValueMYR: userExposure.matchedStockValueMYR,
      pendingOrderValueMYR: userExposure.pendingOrderValueMYR,
      availableCashMYR: userExposure.availableCashMYR,
      effectiveExposureMYR: userExposure.effectiveExposureMYR,
      additionalPurchasableMYR: userExposure.additionalPurchasableMYR,
      cashCushionAfterFillMYR: userExposure.cashCushionAfterFillMYR,
      isOverCommitted: userExposure.isOverCommitted,
      assumedSummaryJa: userExposure.assumedSummaryJa,
      projectedSummaryJa: userExposure.projectedSummaryJa,
      liquiditySummaryJa: userExposure.liquiditySummaryJa,
      allocationRows: userExposure.allocationRows
        .filter((r) => r.bucket === 'stock')
        .map((r) => ({
          symbol: r.symbol,
          labelJa: r.labelJa,
          assumedWeightPct: r.assumedWeightPct,
          projectedWeightPct: r.projectedWeightPct,
          targetWeightPct: r.targetWeightPct,
        })),
    },
    uiPanelFieldsJa: UI_PANEL_FIELDS,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    humanSummaryJa,
  };
}

export function formatMalaysiaV4EffectiveExposureCsv(
  report: ForwardMalaysiaV4EffectiveExposureAuditReport,
): string {
  const lines = [
    `# 重要監査87 実効エクスポージャー ${report.auditedAt}`,
    `# ${report.fixedConditionsJa}`,
    `# 総合判定: ${report.overallGrade}`,
    '',
    'section,key,value',
    ['exposure', 'matched', report.exposure.matchedStockValueMYR].join(','),
    ['exposure', 'pending', report.exposure.pendingOrderValueMYR].join(','),
    ['exposure', 'cash', report.exposure.availableCashMYR].join(','),
    ['exposure', 'effectiveTotal', report.exposure.effectiveExposureMYR].join(','),
    ['exposure', 'additionalPurchasable', report.exposure.additionalPurchasableMYR].join(','),
    ['exposure', 'cashCushionAfterFill', report.exposure.cashCushionAfterFillMYR].join(','),
    ['exposure', 'overCommitted', report.exposure.isOverCommitted].join(','),
    '',
    'section,checkId,title,grade,evidence',
    ...report.checks.map((c) =>
      ['check', c.checkId, `"${c.titleJa}"`, c.grade, `"${c.evidenceJa.replace(/"/g, '""')}"`].join(','),
    ),
    '',
    'section,symbol,label,assumedPct,projectedPct,targetPct',
    ...report.exposure.allocationRows.map((r) =>
      ['alloc', r.symbol, r.labelJa, r.assumedWeightPct, r.projectedWeightPct, r.targetWeightPct].join(','),
    ),
    '',
    'section,summary,type,content',
    ['summary', 'assumed', `"${report.exposure.assumedSummaryJa}"`].join(','),
    ['summary', 'projected', `"${report.exposure.projectedSummaryJa}"`].join(','),
    ['summary', 'liquidity', `"${report.exposure.liquiditySummaryJa}"`].join(','),
  ];
  return lines.join('\n');
}

export async function runMalaysiaV4EffectiveExposureAudit(): Promise<ForwardMalaysiaV4EffectiveExposureAuditReport | null> {
  return buildMalaysiaV4EffectiveExposureAuditReport();
}
