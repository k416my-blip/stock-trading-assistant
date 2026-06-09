import type { BursaDividendBundle, BursaDividendRecord } from '../../types/bursaDisclosure';
import { parseFormattedNumber, stripHtml } from './bursaKlseParser';

function extractDividendTable(html: string): string | null {
  const idx = html.indexOf('id="dividends"');
  if (idx < 0) return null;
  const slice = html.slice(idx, idx + 200_000);
  return slice.match(/<table class="table table-hover table-theme">[\s\S]*?<\/table>/i)?.[0] ?? null;
}

function parseDividendRows(tableHtml: string): BursaDividendRecord[] {
  const records: BursaDividendRecord[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  let isHeader = true;
  while ((trMatch = trRe.exec(tableHtml)) !== null) {
    const rowHtml = trMatch[1];
    if (isHeader) {
      isHeader = false;
      continue;
    }
    if (/colspan/i.test(rowHtml)) continue;

    const cells: string[] = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRe.exec(rowHtml)) !== null) {
      cells.push(stripHtml(tdMatch[1]));
    }
    if (cells.length < 6) continue;

    records.push({
      announcedDate: cells[0]?.trim() || null,
      financialYear: cells[1]?.trim() || null,
      dividendType: cells[2]?.trim() || null,
      exDate: cells[3]?.trim() || null,
      paymentDate: cells[4]?.trim() || null,
      amountPerShare: parseFormattedNumber(cells[5]),
    });
  }
  return records;
}

export function parseBursaDividendFromHtml(
  html: string,
  stockCode: string,
  fromCache = false,
): BursaDividendBundle {
  const fetchedFields: string[] = [];
  const missingFields: string[] = [];

  const tableHtml = extractDividendTable(html);
  const history = tableHtml ? parseDividendRows(tableHtml) : [];

  if (history.length > 0) {
    fetchedFields.push('dividendHistory');
    if (history.some((d) => d.amountPerShare != null)) fetchedFields.push('dividendHistory.amount');
    else missingFields.push('dividendHistory.amount');
  } else {
    missingFields.push('dividendHistory');
  }

  const hasAny = history.length > 0;
  const status = fromCache
    ? 'cached'
    : hasAny
      ? 'ok'
      : 'failed';

  return {
    stockCode,
    history,
    fetchedFields,
    missingFields,
    status,
    source: hasAny ? 'klse_screener' : 'none',
    fetchedAt: new Date().toISOString(),
  };
}
