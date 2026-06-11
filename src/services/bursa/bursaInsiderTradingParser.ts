/**
 * Phase15 — KLSE Insider / Shareholding 取引パース
 */
import { parseRecentAnnouncementsFromKlseHtml } from './bursaAnnouncementParser';
import { parseFormattedNumber, stripHtml } from './bursaKlseParser';

export type ParsedInsiderTransaction = {
  announcedDate: string | null;
  transactionDate: string | null;
  type: 'buy' | 'sell';
  shares: number | null;
  name: string;
  role: string;
  source: 'klse_shareholding_changes' | 'klse_shareholdings_page' | 'klse_announcement';
};

const DIRECTOR_ANN_PATTERN =
  /Director'?s?\s+Interest|Dealings?\s+in\s+Listed|Notification\s+of\s+Interest|Interest\s+in\s+Securities/i;
const SUBSTANTIAL_ANN_PATTERN =
  /Changes\s+in\s+Sub\.?\s*S-hldr'?s?\s+Int|Substantial\s+Shareholder/i;

const INSTITUTIONAL_NAME =
  /\b(SDN\s+BHD|BERHAD|TRUSTEES|FUND\s+BOARD|NOMINEES|KWAP|EPF|PNB|ASNB|INSURANCE)\b/i;
const DIRECTOR_NAME =
  /\b(DIRECTOR|CEO|CFO|CHAIRMAN|MANAGING\s+DIRECTOR|PRESIDENT)\b/i;

function parseDisplayDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const iso = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1]!;
  const dmy = raw.trim().match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/i);
  if (!dmy) return null;
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const mo = months[dmy[2].slice(0, 3).toLowerCase()];
  if (!mo) return null;
  return `${dmy[3]}-${mo}-${dmy[1].padStart(2, '0')}`;
}

function inferRole(name: string, announcementTitle?: string | null): string {
  if (announcementTitle && DIRECTOR_ANN_PATTERN.test(announcementTitle)) return 'Director';
  if (announcementTitle && SUBSTANTIAL_ANN_PATTERN.test(announcementTitle)) {
    return 'Substantial Shareholder';
  }
  if (DIRECTOR_NAME.test(name)) return 'Director';
  if (INSTITUTIONAL_NAME.test(name)) return 'Substantial Shareholder';
  return 'Shareholder';
}

function classifyTransactionType(cellHtml: string): 'buy' | 'sell' | null {
  const text = stripHtml(cellHtml).toLowerCase();
  if (/\bacquired\b|btn-success/.test(cellHtml.toLowerCase()) || text.includes('acquired')) {
    return 'buy';
  }
  if (/\bdisposed\b|btn-danger/.test(cellHtml.toLowerCase()) || text.includes('disposed')) {
    return 'sell';
  }
  return null;
}

function stripHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function txKey(tx: ParsedInsiderTransaction): string {
  return [
    tx.transactionDate ?? tx.announcedDate ?? '',
    tx.type,
    tx.name,
    tx.shares ?? '',
  ].join('|');
}

function dedupeTransactions(rows: ParsedInsiderTransaction[]): ParsedInsiderTransaction[] {
  const seen = new Set<string>();
  const out: ParsedInsiderTransaction[] = [];
  for (const row of rows) {
    const key = txKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function extractShareholdingChangesSection(html: string): string {
  const start = html.indexOf('id="shareholding_changes"');
  if (start < 0) return '';
  const slice = html.slice(start, start + 250_000);
  const nextTab = slice.search(/id="[^"]+"\s+class="[^"]*tab-pane"/i);
  return nextTab > 500 ? slice.slice(0, nextTab) : slice;
}

export function parseShareholdingChangesFromStockHtml(html: string): ParsedInsiderTransaction[] {
  const section = extractShareholdingChangesSection(html);
  if (!section) return [];

  const rows: ParsedInsiderTransaction[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(section)) !== null) {
    const row = stripHtmlComments(m[1]);
    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1] ?? '');
    if (tds.length < 5) continue;

    const announcedDate = parseDisplayDate(stripHtml(tds[0]));
    const transactionDate = parseDisplayDate(stripHtml(tds[1]));
    const type = classifyTransactionType(tds[2] ?? '');
    if (!type) continue;

    const sharesRaw = stripHtml(tds[3] ?? '').replace(/,/g, '');
    const shares = parseFormattedNumber(sharesRaw);
    const name = stripHtml(tds[4] ?? '').replace(/\s+/g, ' ').trim();
    if (!name) continue;

    rows.push({
      announcedDate,
      transactionDate,
      type,
      shares,
      name,
      role: inferRole(name),
      source: 'klse_shareholding_changes',
    });
  }
  return rows;
}

export function parseShareholdingsPageForStock(
  html: string,
  stockCode: string,
): ParsedInsiderTransaction[] {
  const code = stockCode.replace(/\.KL$/i, '').trim();
  const needle = `/stocks/view/${code}`;
  const sectionStart = html.indexOf('id="table-shareholdings"');
  const section = sectionStart >= 0 ? html.slice(sectionStart, sectionStart + 500_000) : html;

  const rows: ParsedInsiderTransaction[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(section)) !== null) {
    const row = stripHtmlComments(m[1]);
    if (!row.includes(needle)) continue;

    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1] ?? '');
    if (tds.length < 6) continue;

    const announcedDate = parseDisplayDate(stripHtml(tds[0]));
    const transactionDate = parseDisplayDate(stripHtml(tds[3]));
    const type = classifyTransactionType(tds[4] ?? '');
    if (!type) continue;

    const nameBlock = tds[2] ?? '';
    const name = stripHtml(nameBlock.split('<br')[0] ?? nameBlock).replace(/\s+/g, ' ').trim();
    if (!name) continue;

    const shares = parseFormattedNumber(stripHtml(tds[5] ?? '').replace(/,/g, ''));

    rows.push({
      announcedDate,
      transactionDate,
      type,
      shares,
      name,
      role: inferRole(name),
      source: 'klse_shareholdings_page',
    });
  }
  return rows;
}

export function parseInsiderAnnouncementsFromStockHtml(html: string): ParsedInsiderTransaction[] {
  const anns = parseRecentAnnouncementsFromKlseHtml(html, '');
  const rows: ParsedInsiderTransaction[] = [];

  for (const ann of anns) {
    const isDirector = DIRECTOR_ANN_PATTERN.test(ann.title);
    const isSubstantial = SUBSTANTIAL_ANN_PATTERN.test(ann.title);
    if (!isDirector && !isSubstantial) continue;

    const nameMatch = ann.title.match(/-\s*(.+)$/);
    const name = nameMatch?.[1]?.trim() ?? ann.title.slice(0, 80);
    const announcedDate = parseDisplayDate(ann.publishedAt);

    rows.push({
      announcedDate,
      transactionDate: announcedDate,
      type: 'buy',
      shares: null,
      name,
      role: inferRole(name, ann.title),
      source: 'klse_announcement',
    });
  }
  return rows;
}

export function mergeInsiderTransactions(
  parts: ParsedInsiderTransaction[],
): ParsedInsiderTransaction[] {
  return dedupeTransactions(parts);
}

export function filterTransactionsWithinDays(
  rows: ParsedInsiderTransaction[],
  days: number,
  referenceDate = new Date(),
): ParsedInsiderTransaction[] {
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - days);

  return rows.filter((row) => {
    const d = row.transactionDate ?? row.announcedDate;
    if (!d) return false;
    const parsed = new Date(`${d}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed >= cutoff;
  });
}

export function sortTransactionsByDateDesc(
  rows: ParsedInsiderTransaction[],
): ParsedInsiderTransaction[] {
  return [...rows].sort((a, b) => {
    const da = a.transactionDate ?? a.announcedDate ?? '';
    const db = b.transactionDate ?? b.announcedDate ?? '';
    return db.localeCompare(da);
  });
}
