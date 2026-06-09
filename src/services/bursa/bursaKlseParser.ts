/** KLSE Screener HTML パース共通ユーティリティ */

export function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseFormattedNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  let v = value.trim().toLowerCase().replace(/,/g, '');
  if (!v || v === '-' || v === 'n/a') return null;

  let negative = false;
  if (v.startsWith('(') && v.endsWith(')')) {
    negative = true;
    v = v.slice(1, -1);
  }
  v = v.replace(/%/g, '');

  let mult = 1;
  if (v.endsWith('b')) {
    mult = 1_000_000_000;
    v = v.slice(0, -1);
  } else if (v.endsWith('m')) {
    mult = 1_000_000;
    v = v.slice(0, -1);
  } else if (v.endsWith('k')) {
    mult = 1_000;
    v = v.slice(0, -1);
  }

  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return (negative ? -n : n) * mult;
}

export function extractTableRows(html: string, sectionId: string): string[][] {
  const sectionRe = new RegExp(
    `id="${sectionId}"[\\s\\S]*?</div>\\s*</div>`,
    'i',
  );
  const section = html.match(sectionRe)?.[0];
  if (!section) return [];

  const rows: string[][] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(section)) !== null) {
    const cells: string[] = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRe.exec(trMatch[1])) !== null) {
      cells.push(stripHtml(tdMatch[1]));
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

export function extractMetric(html: string, label: string): string | null {
  const re = new RegExp(
    `<td[^>]*>\\s*${label}\\s*</td>\\s*<td[^>]*>\\s*([^<]+)\\s*</td>`,
    'i',
  );
  return html.match(re)?.[1]?.trim() ?? null;
}
