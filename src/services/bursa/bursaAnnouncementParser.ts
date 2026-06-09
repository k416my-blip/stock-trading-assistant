/**
 * KLSE Screener — Recent Announcements パース（Bursa 開示ミラー）
 */
import { klseAnnouncementUrl } from './bursaKlseHtmlClient';

export type ParsedBursaAnnouncement = {
  id: string;
  title: string;
  publishedAt: string | null;
  url: string;
};

export function parseRecentAnnouncementsFromKlseHtml(
  html: string,
  stockCode: string,
): ParsedBursaAnnouncement[] {
  const sectionMatch = html.match(/Recent Announcements[\s\S]*?<ul class="list-group">([\s\S]*?)<\/ul>/i);
  if (!sectionMatch) return [];

  const block = sectionMatch[1];
  const items: ParsedBursaAnnouncement[] = [];
  const itemRe =
    /<li[^>]*>[\s\S]*?<h6><a[^>]*href="([^"]*\/announcements\/view\/(\d+))"[^>]*>([\s\S]*?)<\/a><\/h6>[\s\S]*?(?:<time datetime="([^"]*)">[^<]*<\/time>)?/gi;

  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(block)) !== null && items.length < 8) {
    const id = m[2]?.trim();
    const title = m[3]?.replace(/<[^>]+>/g, '').trim();
    if (!id || !title) continue;
    items.push({
      id,
      title,
      publishedAt: m[4]?.trim() || null,
      url: klseAnnouncementUrl(id),
    });
  }

  if (items.length > 0) return items;

  const fallbackRe = /\/v2\/announcements\/view\/(\d+)[^>]*>([^<]{8,200})</gi;
  while ((m = fallbackRe.exec(block)) !== null && items.length < 8) {
    const id = m[1]?.trim();
    const title = m[2]?.trim();
    if (!id || !title || items.some((x) => x.id === id)) continue;
    items.push({
      id,
      title,
      publishedAt: null,
      url: klseAnnouncementUrl(id),
    });
  }

  void stockCode;
  return items;
}
