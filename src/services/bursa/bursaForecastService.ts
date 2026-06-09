import type { BursaForecastItem } from '../../types/bursaDisclosure';
import { stripHtml } from './bursaKlseParser';

const GUIDANCE_PATTERNS = [
  /\b(?:the group|the company|we|our group)\s+(?:expects?|anticipates?|forecasts?|projects?)\s+(?:to\s+)?[^.!?]{10,180}[.!?]/gi,
  /\boutlook\s+for\s+(?:the\s+)?(?:financial\s+year|fy|period|year)[^.!?]{5,180}[.!?]/gi,
  /\b(?:earnings|profit|revenue|dividend|pat)\s+(?:guidance|forecast|outlook)\s*[^.!?]{5,180}[.!?]/gi,
  /\bguidance\s*[:—-]\s*[^.!?]{10,180}[.!?]/gi,
  /\bprofit\s+(?:is\s+)?(?:expected|forecast|projected)\s+[^.!?]{10,180}[.!?]/gi,
];

function extractAnnouncementText(html: string): string {
  const start = html.indexOf('class="bursa-ann"');
  const slice = start >= 0 ? html.slice(start, start + 150_000) : html;
  const noScript = slice.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  return stripHtml(noScript).replace(/\s+/g, ' ').trim();
}

function uniqueNonEmpty(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
    if (out.length >= max) break;
  }
  return out;
}

function isLikelyReportedFigure(text: string): boolean {
  const digits = (text.match(/\d/g) ?? []).length;
  if (digits / text.length > 0.35) return true;
  return /^(?:revenue|profit|eps|pat|net profit)\s[\d,]/i.test(text.trim());
}

function isValidGuidanceSentence(text: string): boolean {
  if (text.length < 25 || text.length > 260) return false;
  if (/projectid|databaseurl|storagebucket|data-target|target="_blank"/i.test(text)) return false;
  if (isLikelyReportedFigure(text)) return false;
  return /\b(?:expects?|anticipates?|forecasts?|projects?|guidance|outlook)\b/i.test(text);
}

export function parseCompanyGuidanceFromFinancialReportHtml(
  html: string,
): { current: BursaForecastItem[]; next: BursaForecastItem[] } {
  const body = extractAnnouncementText(html);
  const hits: string[] = [];

  for (const pattern of GUIDANCE_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = body.match(pattern) ?? [];
    hits.push(...matches.filter(isValidGuidanceSentence));
  }

  const combined = uniqueNonEmpty(hits, 4);
  if (combined.length === 0) {
    return { current: [], next: [] };
  }

  const current: BursaForecastItem[] = combined.slice(0, 2).map((text, i) => ({
    label: i === 0 ? '会社ガイダンス' : '補足',
    value: text.slice(0, 200),
    source: 'KLSE Financial Report (Bursa quarterly announcement HTML)',
  }));

  return { current, next: [] };
}

export function hasExplicitNextPeriodGuidance(html: string): boolean {
  const body = extractAnnouncementText(html).toLowerCase();
  return (
    /next financial year|next year|following year|fy20\d{2}/i.test(body) &&
    /\b(?:guidance|forecast|expects?|outlook)\b/i.test(body)
  );
}
