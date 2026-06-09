/**
 * Bursa Phase 4 — 四季報形式（大株主・事業構成・コメント・予想）
 */
import type {
  BursaDisclosureBundle,
  BursaGeographicRevenue,
  BursaPhase3Analysis,
  BursaPhase4Analysis,
  BursaSegmentRevenue,
} from '../../types/bursaDisclosure';
import { readBursaCache, writeBursaCache } from './bursaDisclosureCache';
import {
  hasExplicitNextPeriodGuidance,
  parseCompanyGuidanceFromFinancialReportHtml,
} from './bursaForecastService';
import {
  fetchKlseFinancialReportHtml,
  fetchKlseShareholdingsHtml,
  fetchKlseStockPageHtml,
  klseAnnouncementUrl,
} from './bursaKlseHtmlClient';
import {
  extractAnnualAnnouncementId,
  extractLatestFinancialReportPath,
  parseKlseMajorShareholders,
  quarterEndDateFromRecord,
} from './bursaShareholdersService';
import { buildBursaShikihoComments } from './bursaShikihoComments';

const GEO_REGIONS: BursaGeographicRevenue['region'][] = [
  'Malaysia',
  'Singapore',
  'Indonesia',
  'Thailand',
  'Others',
];

function emptyGeographic(): BursaGeographicRevenue[] {
  return GEO_REGIONS.map((region) => ({
    region,
    revenue: null,
    revenuePct: null,
  }));
}

function parseSegmentRevenueFromHtml(_html: string): BursaSegmentRevenue[] {
  return [];
}

function parseGeographicRevenueFromHtml(_html: string): BursaGeographicRevenue[] {
  return emptyGeographic();
}

export async function buildBursaPhase4Analysis(input: {
  bundle: BursaDisclosureBundle;
  phase3: BursaPhase3Analysis | null;
  negativeNewsCount: number;
  stockPageHtml?: string | null;
}): Promise<BursaPhase4Analysis> {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];
  const stockCode = input.bundle.stockCode;

  let stockHtml = input.stockPageHtml ?? null;
  if (!stockHtml) {
    const page = await fetchKlseStockPageHtml(stockCode);
    stockHtml = page?.html ?? null;
  }

  const annId = stockHtml ? extractAnnualAnnouncementId(stockHtml) : null;
  const annualReportAnnouncementUrl = annId ? klseAnnouncementUrl(annId) : null;
  if (annualReportAnnouncementUrl) fetchedFields.push('phase4.annualReportLink');
  else missingFields.push('phase4.annualReportLink');

  let majorShareholders = await (async () => {
    const cached = await readBursaCache<ReturnType<typeof parseKlseMajorShareholders>>(
      'shareholdings',
      stockCode,
    );
    if (cached) return cached.payload;
    const sh = await fetchKlseShareholdingsHtml(stockCode);
    if (!sh) return [];
    const parsed = parseKlseMajorShareholders(sh.html, stockCode);
    if (parsed.length > 0) await writeBursaCache('shareholdings', stockCode, parsed);
    return parsed;
  })();

  const shareholderSourceNote =
    majorShareholders.length > 0
      ? 'KLSE Shareholdings · Bursa Change in Substantial Shareholding（Direct %）。Annual Report PDFは取得不可のため大量保有変更開示を使用。'
      : 'Annual Report Substantial Shareholders — PDF/HTML 未取得';

  if (majorShareholders.length > 0) fetchedFields.push('phase4.majorShareholders');
  else missingFields.push('phase4.majorShareholders');

  let segmentRevenue: BursaSegmentRevenue[] = [];
  let geographicRevenue = emptyGeographic();

  const reportPath =
    stockHtml != null ? extractLatestFinancialReportPath(stockHtml, stockCode) : null;
  const qEnd =
    quarterEndDateFromRecord(input.bundle.quarterly.latestQuarter?.quarterEndDate ?? null) ??
    (reportPath?.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null);

  let latestFinancialReportUrl: string | null = null;
  let financialHtml: string | null = null;

  if (qEnd) {
    latestFinancialReportUrl = `https://www.klsescreener.com/v2/stock/financial-report/${stockCode}/${qEnd}`;
    const cacheKey = `${stockCode}:${qEnd}`;
    const cachedFr = await readBursaCache<string>('financialReport', cacheKey);
    if (cachedFr) {
      financialHtml = cachedFr.payload;
    } else {
      const fr = await fetchKlseFinancialReportHtml(stockCode, qEnd);
      financialHtml = fr?.html ?? null;
      if (financialHtml) await writeBursaCache('financialReport', cacheKey, financialHtml);
    }
    if (financialHtml) fetchedFields.push('phase4.financialReportHtml');
    else missingFields.push('phase4.financialReportHtml');

    segmentRevenue = parseSegmentRevenueFromHtml(financialHtml ?? '');
    geographicRevenue = parseGeographicRevenueFromHtml(financialHtml ?? '');
  } else {
    missingFields.push('phase4.financialReportHtml');
  }

  if (segmentRevenue.some((s) => s.revenuePct != null)) fetchedFields.push('phase4.segmentRevenue');
  else missingFields.push('phase4.segmentRevenue');

  if (geographicRevenue.some((g) => g.revenuePct != null)) fetchedFields.push('phase4.geographicRevenue');
  else missingFields.push('phase4.geographicRevenue');

  const guidance = financialHtml
    ? parseCompanyGuidanceFromFinancialReportHtml(financialHtml)
    : { current: [], next: [] };

  let currentForecastStatus: BursaPhase4Analysis['currentForecastStatus'] = 'missing';
  let nextForecastStatus: BursaPhase4Analysis['nextForecastStatus'] = 'missing';

  if (financialHtml) {
    if (guidance.current.length > 0) {
      currentForecastStatus = 'available';
      fetchedFields.push('phase4.currentForecast');
    } else {
      currentForecastStatus = 'none';
      missingFields.push('phase4.currentForecast');
    }

    if (hasExplicitNextPeriodGuidance(financialHtml) && guidance.next.length > 0) {
      nextForecastStatus = 'available';
      fetchedFields.push('phase4.nextForecast');
    } else if (hasExplicitNextPeriodGuidance(financialHtml)) {
      nextForecastStatus = 'available';
    } else {
      nextForecastStatus = 'undisclosed';
      missingFields.push('phase4.nextForecast');
    }
  }

  const comments = buildBursaShikihoComments({
    bundle: input.bundle,
    phase3: input.phase3,
    negativeNewsCount: input.negativeNewsCount,
  });
  fetchedFields.push('phase4.shikihoComments');

  return {
    majorShareholders,
    shareholderSourceNote,
    segmentRevenue,
    geographicRevenue,
    comments,
    currentPeriodForecast: guidance.current,
    nextPeriodForecast: guidance.next,
    currentForecastStatus,
    nextForecastStatus,
    annualReportAnnouncementUrl,
    latestFinancialReportUrl,
    fetchedFields,
    missingFields,
  };
}

/** テスト用 — HTML フィクスチャから Phase4 */
export function buildBursaPhase4FromHtml(input: {
  bundle: BursaDisclosureBundle;
  phase3: BursaPhase3Analysis | null;
  negativeNewsCount: number;
  stockHtml: string;
  shareholdingsHtml: string | null;
  financialReportHtml: string | null;
}): BursaPhase4Analysis {
  const fetchedFields: string[] = ['phase4.offline'];
  const missingFields: string[] = [];
  const majorShareholders = input.shareholdingsHtml
    ? parseKlseMajorShareholders(input.shareholdingsHtml, input.bundle.stockCode)
    : [];

  const segmentRevenue = parseSegmentRevenueFromHtml(input.financialReportHtml ?? '');
  const geographicRevenue = parseGeographicRevenueFromHtml(input.financialReportHtml ?? '');

  const guidance = input.financialReportHtml
    ? parseCompanyGuidanceFromFinancialReportHtml(input.financialReportHtml)
    : { current: [], next: [] };

  const annId = extractAnnualAnnouncementId(input.stockHtml);

  return {
    majorShareholders,
    shareholderSourceNote:
      majorShareholders.length > 0
        ? 'KLSE Shareholdings · Bursa Change in Substantial Shareholding（Direct %）'
        : 'データ未取得',
    segmentRevenue,
    geographicRevenue,
    comments: buildBursaShikihoComments({
      bundle: input.bundle,
      phase3: input.phase3,
      negativeNewsCount: input.negativeNewsCount,
    }),
    currentPeriodForecast: guidance.current,
    nextPeriodForecast: guidance.next,
    currentForecastStatus: guidance.current.length > 0 ? 'available' : 'none',
    nextForecastStatus: input.financialReportHtml && hasExplicitNextPeriodGuidance(input.financialReportHtml)
      ? 'available'
      : 'undisclosed',
    annualReportAnnouncementUrl: annId ? klseAnnouncementUrl(annId) : null,
    latestFinancialReportUrl: extractLatestFinancialReportPath(input.stockHtml, input.bundle.stockCode)
      ? `https://www.klsescreener.com${extractLatestFinancialReportPath(input.stockHtml, input.bundle.stockCode)!}`
      : null,
    fetchedFields,
    missingFields,
  };
}
