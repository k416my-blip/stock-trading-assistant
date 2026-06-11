/**
 * Phase16 — KLSE Institutional Ownership パース
 */
import type { BursaMajorShareholder } from '../../types/bursaDisclosure';
import { parseFormattedNumber, stripHtml } from './bursaKlseParser';
import { parseKlseMajorShareholders } from './bursaShareholdersService';

export type ParsedInstitutionalSnapshot = {
  announcedDate: string | null;
  transactionDate: string | null;
  type: 'buy' | 'sell' | null;
  transactionShares: number | null;
  directUnit: number | null;
  directPct: number | null;
  name: string;
  source: 'klse_shareholdings_page' | 'klse_shareholding_changes' | 'klse_major_shareholders';
};

const KNOWN_INSTITUTIONS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'EPF', pattern: /EMPLOYEES\s+PROVIDENT\s+FUND|\bEPF\b/i },
  { label: 'KWAP', pattern: /KUMPULAN\s+WANG\s+PERSARAAN|\bKWAP\b/i },
  { label: 'PNB', pattern: /PERMODALAN\s+NASIONAL|\bPNB\b/i },
  { label: 'Khazanah', pattern: /\bKHAZANAH\b/i },
  { label: 'BlackRock', pattern: /\bBLACKROCK\b/i },
  { label: 'Vanguard', pattern: /\bVANGUARD\b/i },
  { label: 'Norges Bank', pattern: /NORGES\s+BANK/i },
  { label: 'ASNB', pattern: /AMANAH\s+SAHAM\s+(NASIONAL|BUMIPUTERA)|\bASNB\b/i },
  { label: 'State Street', pattern: /\bSTATE\s+STREET\b/i },
  { label: 'Fidelity', pattern: /\bFIDELITY\b/i },
  { label: 'Capital Group', pattern: /\bCAPITAL\s+(GROUP|RESEARCH)\b/i },
  { label: 'JP Morgan', pattern: /\bJ\.?\s*P\.?\s*MORGAN\b|\bJPMORGAN\b/i },
  { label: 'Goldman Sachs', pattern: /\bGOLDMAN\s+SACHS\b/i },
  { label: 'UBS', pattern: /\bUBS\b/i },
  { label: 'Nomura', pattern: /\bNOMURA\b/i },
  { label: 'Mitsubishi UFJ', pattern: /\bMITSUBISHI\s+UFJ\b|\bMUFG\b/i },
  { label: 'Citigroup Nominees', pattern: /\bCITIGROUP\s+NOMINEES\b/i },
  { label: 'HSBC Nominees', pattern: /\bHSBC\s+NOMINEES\b/i },
  { label: 'DBS Nominees', pattern: /\bDBS\s+NOMINEES\b/i },
  { label: 'Maybank Nominees', pattern: /\bMAYBANK\s+NOMINEES\b/i },
  { label: 'RHB Nominees', pattern: /\bRHB\s+NOMINEES\b/i },
  { label: 'CIMB Nominees', pattern: /\bCIMB\s+NOMINEES\b/i },
  { label: 'Nominees', pattern: /\bNOMINEES\b/i },
];

/** Phase16.7 — 固定8機関（レガシー比較用） */
export const FIXED_BASKET_INSTITUTION_LABELS = [
  'EPF',
  'KWAP',
  'PNB',
  'Khazanah',
  'ASNB',
  'BlackRock',
  'Vanguard',
  'Norges Bank',
] as const;

/** Phase16.8 — TOP30 Institution Basket */
export const TOP30_BASKET_MAX = 30;

export function isFixedBasketInstitution(name: string): boolean {
  const label = normalizeInstitutionLabel(name);
  return (FIXED_BASKET_INSTITUTION_LABELS as readonly string[]).includes(label);
}

export function isTop30BasketCandidate(name: string): boolean {
  if (!name?.trim()) return false;
  if (KNOWN_INSTITUTIONS.some((i) => i.pattern.test(name))) return true;
  return INSTITUTIONAL_PATTERN.test(name);
}

function snapshotDateKey(s: ParsedInstitutionalSnapshot): string {
  return s.transactionDate ?? s.announcedDate ?? '';
}

export function latestPctByInstitution(
  snapshots: ParsedInstitutionalSnapshot[],
): Map<string, number> {
  const latest = new Map<string, { date: string; pct: number }>();
  for (const snap of snapshots) {
    if (snap.directPct == null) continue;
    const label = normalizeInstitutionLabel(snap.name);
    const date = snapshotDateKey(snap);
    if (!date) continue;
    const cur = latest.get(label);
    if (!cur || date > cur.date) {
      latest.set(label, { date, pct: snap.directPct });
    }
  }
  return new Map([...latest.entries()].map(([k, v]) => [k, v.pct]));
}

export function resolveTop30InstitutionBasket(
  snapshots: ParsedInstitutionalSnapshot[],
): string[] {
  const pctMap = latestPctByInstitution(snapshots);
  const ranked = [...pctMap.entries()]
    .filter(([label]) => {
      const snap = snapshots.find((s) => normalizeInstitutionLabel(s.name) === label);
      return snap ? isTop30BasketCandidate(snap.name) : false;
    })
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);

  const core = FIXED_BASKET_INSTITUTION_LABELS.filter((label) => pctMap.has(label));
  const merged = [...new Set([...core, ...ranked])];
  return merged.slice(0, TOP30_BASKET_MAX);
}

export function isBasketInstitution(name: string, basketLabels: readonly string[]): boolean {
  const label = normalizeInstitutionLabel(name);
  return basketLabels.includes(label);
}

const INSTITUTIONAL_PATTERN =
  /\b(SDN\s+BHD|BERHAD|TRUSTEES|FUND\s+BOARD|NOMINEES|KWAP|EPF|PNB|ASNB|INSURANCE|CITIGROUP|HSBC|NOMINEES)\b/i;

function stripHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

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

export function normalizeInstitutionLabel(name: string): string {
  for (const inst of KNOWN_INSTITUTIONS) {
    if (inst.pattern.test(name)) return inst.label;
  }
  return name.replace(/\s+/g, ' ').trim().slice(0, 60);
}

export function isInstitutionalName(name: string): boolean {
  if (!name?.trim()) return false;
  if (KNOWN_INSTITUTIONS.some((i) => i.pattern.test(name))) return true;
  return INSTITUTIONAL_PATTERN.test(name);
}

function extractShareholdingChangesSection(html: string): string {
  const start = html.indexOf('id="shareholding_changes"');
  if (start < 0) return '';
  const slice = html.slice(start, start + 250_000);
  const nextTab = slice.search(/id="[^"]+"\s+class="[^"]*tab-pane"/i);
  return nextTab > 500 ? slice.slice(0, nextTab) : slice;
}

function extractShareholdingsTableSection(html: string): string {
  const start = html.indexOf('id="table-shareholdings"');
  if (start < 0) return html;
  const end = html.indexOf('id="cards-shareholdings"', start);
  return end > start ? html.slice(start, end) : html.slice(start, start + 500_000);
}

function parseShareholdingsPageSnapshots(
  html: string,
  stockCode: string,
): ParsedInstitutionalSnapshot[] {
  const code = stockCode.replace(/\.KL$/i, '').trim();
  const needle = `/stocks/view/${code}`;
  const section = extractShareholdingsTableSection(html);
  const rows: ParsedInstitutionalSnapshot[] = [];

  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = trRe.exec(section)) !== null) {
    const row = stripHtmlComments(m[1]);
    if (!row.includes(needle)) continue;

    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1] ?? '');
    if (tds.length < 7) continue;

    const announcedDate = parseDisplayDate(stripHtml(tds[0]));
    const nameBlock = tds[2] ?? '';
    const name = stripHtml(nameBlock.split('<br')[0] ?? nameBlock).replace(/\s+/g, ' ').trim();
    if (!name || !isInstitutionalName(name)) continue;

    const transactionDate = parseDisplayDate(stripHtml(tds[3]));
    const type = classifyTransactionType(tds[4] ?? '');
    const transactionShares = parseFormattedNumber(stripHtml(tds[5] ?? '').replace(/,/g, ''));
    const directUnit = parseFormattedNumber(stripHtml(tds[6] ?? '').replace(/,/g, ''));
    const pctMatch = row.match(/<td[^>]*>\s*([\d,]+(?:\.\d+)?)\s*%<\/td>/i);
    const directPct = pctMatch
      ? parseFormattedNumber(pctMatch[1].replace(/,/g, ''))
      : null;

    rows.push({
      announcedDate,
      transactionDate,
      type,
      transactionShares,
      directUnit,
      directPct,
      name: normalizeInstitutionLabel(name),
      source: 'klse_shareholdings_page',
    });
  }
  return rows;
}

function parseShareholdingChangesSnapshots(html: string): ParsedInstitutionalSnapshot[] {
  const section = extractShareholdingChangesSection(html);
  if (!section) return [];

  const rows: ParsedInstitutionalSnapshot[] = [];
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

    const transactionShares = parseFormattedNumber(stripHtml(tds[3] ?? '').replace(/,/g, ''));
    const name = stripHtml(tds[4] ?? '').replace(/\s+/g, ' ').trim();
    if (!name || !isInstitutionalName(name)) continue;

    rows.push({
      announcedDate,
      transactionDate,
      type,
      transactionShares,
      directUnit: null,
      directPct: null,
      name: normalizeInstitutionLabel(name),
      source: 'klse_shareholding_changes',
    });
  }
  return rows;
}

function majorShareholdersToSnapshots(
  majors: BursaMajorShareholder[],
): ParsedInstitutionalSnapshot[] {
  return majors
    .filter((m) => m.name && isInstitutionalName(m.name))
    .map((m) => ({
      announcedDate: m.asOfDate,
      transactionDate: m.asOfDate,
      type: null,
      transactionShares: null,
      directUnit: null,
      directPct: m.holdingPct,
      name: normalizeInstitutionLabel(m.name),
      source: 'klse_major_shareholders' as const,
    }));
}

function snapshotSortKey(s: ParsedInstitutionalSnapshot): string {
  return s.transactionDate ?? s.announcedDate ?? '';
}

export function mergeInstitutionalSnapshots(
  parts: ParsedInstitutionalSnapshot[],
): ParsedInstitutionalSnapshot[] {
  return [...parts].sort((a, b) => snapshotSortKey(b).localeCompare(snapshotSortKey(a)));
}

export function buildInstitutionalHolderRecords(
  snapshots: ParsedInstitutionalSnapshot[],
): import('../../types/bursaInstitutionalOwnership').InstitutionalHolderRecord[] {
  const byName = new Map<string, ParsedInstitutionalSnapshot[]>();
  for (const snap of snapshots) {
    const list = byName.get(snap.name) ?? [];
    list.push(snap);
    byName.set(snap.name, list);
  }

  const holders: import('../../types/bursaInstitutionalOwnership').InstitutionalHolderRecord[] = [];

  for (const [name, list] of byName) {
    const sorted = [...list].sort((a, b) => snapshotSortKey(b).localeCompare(snapshotSortKey(a)));
    const latest = sorted.find((s) => s.directPct != null || s.directUnit != null) ?? sorted[0];
    const previous = sorted.find(
      (s, i) =>
        i > 0 &&
        s !== latest &&
        (s.directPct != null || s.directUnit != null) &&
        snapshotSortKey(s) < snapshotSortKey(latest),
    );

    const holdingShares = latest?.directUnit ?? null;
    const holdingPct = latest?.directPct ?? null;
    const latestReportDate = latest?.transactionDate ?? latest?.announcedDate ?? null;

    let shareDiff: number | null = null;
    let pctDiff: number | null = null;
    let increaseRatePct: number | null = null;
    let decreaseRatePct: number | null = null;

    if (previous && latest) {
      if (latest.directUnit != null && previous.directUnit != null) {
        shareDiff = latest.directUnit - previous.directUnit;
        if (previous.directUnit > 0) {
          const rate = (shareDiff / previous.directUnit) * 100;
          if (rate > 0) increaseRatePct = rate;
          else if (rate < 0) decreaseRatePct = Math.abs(rate);
        }
      }
      if (latest.directPct != null && previous.directPct != null) {
        pctDiff = latest.directPct - previous.directPct;
      }
    }

    holders.push({
      name,
      holdingShares,
      holdingPct,
      shareDiff,
      pctDiff,
      increaseRatePct,
      decreaseRatePct,
      latestReportDate,
    });
  }

  return holders.sort((a, b) => (b.holdingPct ?? 0) - (a.holdingPct ?? 0));
}

export function filterSnapshotsWithinDays(
  rows: ParsedInstitutionalSnapshot[],
  days: number,
  referenceDate = new Date(),
): ParsedInstitutionalSnapshot[] {
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

export function parseInstitutionalOwnershipFromHtml(input: {
  stockCode: string;
  stockHtml: string | null;
  shareholdingsHtml: string | null;
}): ParsedInstitutionalSnapshot[] {
  const parts: ParsedInstitutionalSnapshot[] = [];

  if (input.shareholdingsHtml) {
    parts.push(...parseShareholdingsPageSnapshots(input.shareholdingsHtml, input.stockCode));
    parts.push(
      ...majorShareholdersToSnapshots(
        parseKlseMajorShareholders(input.shareholdingsHtml, input.stockCode),
      ),
    );
  }

  if (input.stockHtml) {
    parts.push(...parseShareholdingChangesSnapshots(input.stockHtml));
  }

  return mergeInstitutionalSnapshots(parts);
}
