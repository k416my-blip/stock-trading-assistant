import type { BursaMajorShareholder } from '../../types/bursaDisclosure';
import { parseFormattedNumber, stripHtml } from './bursaKlseParser';

function normalizeShareholderName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function extractTableSection(html: string): string {
  const start = html.indexOf('id="table-shareholdings"');
  if (start < 0) return html;
  const end = html.indexOf('id="cards-shareholdings"', start);
  return end > start ? html.slice(start, end) : html.slice(start, start + 500_000);
}

function extractTdCells(rowHtml: string): string[] {
  const cells: string[] = [];
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = tdRe.exec(rowHtml)) !== null) {
    cells.push(stripHtml(m[1].split('<br')[0] ?? m[1]));
  }
  return cells;
}

/** KLSE Shareholdings — Bursa Change in Substantial Shareholding (Direct %) */
export function parseKlseMajorShareholders(
  html: string,
  stockCode: string,
): BursaMajorShareholder[] {
  const code = stockCode.replace(/\.KL$/i, '').trim();
  const needle = `/stocks/view/${code}`;
  const section = extractTableSection(html);
  const byName = new Map<string, BursaMajorShareholder>();

  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(section)) !== null) {
    const row = trMatch[1];
    if (!row.includes(needle)) continue;

    const cells = extractTdCells(row);
    if (cells.length < 8) continue;

    const asOfDate = cells[0]?.match(/^\d{4}-\d{2}-\d{2}$/) ? cells[0] : null;
    const nameRaw = cells[2]?.trim();
    if (!nameRaw) continue;

    const pctMatch = row.match(/<td[^>]*>\s*([\d,]+(?:\.\d+)?)\s*%<\/td>/i);
    const holdingPct = pctMatch ? parseFormattedNumber(pctMatch[1].replace(/,/g, '')) : null;
    if (holdingPct == null) continue;

    const name = normalizeShareholderName(nameRaw);
    const existing = byName.get(name);
    if (!existing || (asOfDate && existing.asOfDate && asOfDate > existing.asOfDate)) {
      byName.set(name, {
        name,
        holdingPct,
        asOfDate,
        source: 'bursa_substantial_change',
      });
    } else if (!existing) {
      byName.set(name, { name, holdingPct, asOfDate, source: 'bursa_substantial_change' });
    }
  }

  return [...byName.values()]
    .filter((s) => s.holdingPct != null && s.holdingPct >= 3)
    .sort((a, b) => (b.holdingPct ?? 0) - (a.holdingPct ?? 0));
}

export function extractAnnualAnnouncementId(html: string): string | null {
  const sectionIdx = html.indexOf('id="annual"');
  const slice = sectionIdx >= 0 ? html.slice(sectionIdx, sectionIdx + 120_000) : html;
  const m = slice.match(/\/v2\/announcements\/view\/(\d+)/i);
  return m?.[1] ?? null;
}

export function extractLatestFinancialReportPath(html: string, stockCode: string): string | null {
  const code = stockCode.replace(/\.KL$/i, '').trim();
  const re = new RegExp(
    `/v2/stock/financial-report/${code}/(\\d{4}-\\d{2}-\\d{2})`,
    'i',
  );
  const m = html.match(re);
  return m ? `/v2/stock/financial-report/${code}/${m[1]}` : null;
}

export function quarterEndDateFromRecord(date: string | null): string | null {
  if (!date) return null;
  const iso = date.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dmy = date.match(/(\d{1,2})\s+(\w{3}),?\s+(\d{4})/i);
  if (!dmy) return null;
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const mo = months[dmy[2].slice(0, 3).toLowerCase()];
  if (!mo) return null;
  return `${dmy[3]}-${mo}-${dmy[1].padStart(2, '0')}`;
}
