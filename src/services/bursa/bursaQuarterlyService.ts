import type { BursaQuarterlyBundle, BursaQuarterlyRecord } from '../../types/bursaDisclosure';
import { parseFormattedNumber, stripHtml } from './bursaKlseParser';

function extractTableAfterSection(html: string, sectionId: string, tableClassHint: string): string | null {
  const idx = html.indexOf(`id="${sectionId}"`);
  if (idx < 0) return null;
  const slice = html.slice(idx, idx + 250_000);
  const re = new RegExp(`<table[^>]*class=['"][^'"]*${tableClassHint}[^'"]*['"][^>]*>([\\s\\S]*?)<\\/table>`, 'i');
  return slice.match(re)?.[0] ?? null;
}

function parseQuarterlyRows(tableHtml: string): BursaQuarterlyRecord[] {
  const records: BursaQuarterlyRecord[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(tableHtml)) !== null) {
    const rowHtml = trMatch[1];
    if (/colspan/i.test(rowHtml)) continue;
    const cells: string[] = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRe.exec(rowHtml)) !== null) {
      cells.push(stripHtml(tdMatch[1]));
    }
    if (cells.length < 9) continue;

    const eps = parseFormattedNumber(cells[0]);
    const revenue = parseFormattedNumber(cells[3]);
    const netProfit = parseFormattedNumber(cells[4]);
    const quarter = cells[5]?.trim() || null;
    const quarterEndDate = cells[6]?.trim() || null;
    const financialYear = cells[7]?.trim() || null;
    const announcedDate = cells[8]?.trim() || null;
    const roeRaw = cells[9]?.replace(/%/g, '').trim();
    const roePct = parseFormattedNumber(roeRaw);

    if (!quarterEndDate && !financialYear && revenue == null && netProfit == null) continue;

    records.push({
      financialYear,
      quarter,
      quarterEndDate,
      announcedDate,
      revenue,
      operatingProfit: null,
      netProfit,
      eps,
      roePct,
      netMarginPct: null,
      dividendPayoutPct: null,
    });
  }
  return records;
}

function parseAnnualRows(html: string): BursaQuarterlyRecord[] {
  const tableHtml = extractTableAfterSection(html, 'annual', 'table-hover');
  if (!tableHtml) return [];

  const records: BursaQuarterlyRecord[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  let isHeader = true;
  while ((trMatch = trRe.exec(tableHtml)) !== null) {
    const rowHtml = trMatch[1];
    if (isHeader) {
      isHeader = false;
      continue;
    }
    const cells: string[] = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
      cells.push(stripHtml(cellMatch[1]));
    }
    if (cells.length < 4) continue;

    const financialYear = cells[0]?.trim() || null;
    const revenueThousands = parseFormattedNumber(cells[1]?.replace(/,/g, ''));
    const netThousands = parseFormattedNumber(cells[2]?.replace(/,/g, ''));
    const eps = parseFormattedNumber(cells[3]);
    const dpRaw = cells[4]?.replace(/%/g, '').trim();
    const netPctRaw = cells[5]?.replace(/%/g, '').trim();
    const dividendPayoutPct = parseFormattedNumber(dpRaw);
    const netMarginPct = parseFormattedNumber(netPctRaw);

    records.push({
      financialYear,
      quarter: 'FY',
      quarterEndDate: null,
      announcedDate: null,
      revenue: revenueThousands != null ? revenueThousands * 1000 : null,
      operatingProfit: null,
      netProfit: netThousands != null ? netThousands * 1000 : null,
      eps,
      roePct: null,
      netMarginPct,
      dividendPayoutPct,
    });
  }
  return records;
}

export function parseBursaQuarterlyFromHtml(
  html: string,
  stockCode: string,
  fromCache = false,
): BursaQuarterlyBundle {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];

  const tableHtml = extractTableAfterSection(html, 'quarter_reports', 'financial_reports');
  const quarterlyRows = tableHtml ? parseQuarterlyRows(tableHtml) : [];
  const annualRecords = parseAnnualRows(html);
  const latestQuarter = quarterlyRows[0] ?? null;

  if (latestQuarter?.quarterEndDate) fetchedFields.push('latestQuarter.quarterEndDate');
  else missingFields.push('latestQuarter.quarterEndDate');

  if (latestQuarter?.announcedDate) fetchedFields.push('latestQuarter.announcedDate');
  else missingFields.push('latestQuarter.announcedDate');

  if (latestQuarter?.revenue != null) fetchedFields.push('financials.revenue');
  else missingFields.push('financials.revenue');

  missingFields.push('financials.operatingProfit');

  if (latestQuarter?.netProfit != null) fetchedFields.push('financials.netProfit');
  else missingFields.push('financials.netProfit');

  if (latestQuarter?.eps != null) fetchedFields.push('financials.eps');
  else missingFields.push('financials.eps');

  if (quarterlyRows.length > 0) fetchedFields.push('quarterlyHistory');
  else missingFields.push('quarterlyHistory');

  const hasAny = fetchedFields.some((f) => !f.startsWith('financials.operatingProfit'));
  const status = fromCache
    ? 'cached'
    : hasAny && missingFields.filter((m) => m !== 'financials.operatingProfit').length <= 2
      ? 'ok'
      : hasAny
        ? 'partial'
        : 'failed';

  return {
    stockCode,
    latestQuarter,
    quarterlyHistory: quarterlyRows,
    annualRecords,
    fetchedFields,
    missingFields,
    status,
    source: hasAny ? 'klse_screener' : 'none',
    fetchedAt: new Date().toISOString(),
  };
}
