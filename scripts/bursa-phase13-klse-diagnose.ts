import { fetchKlseStockPageHtml, fetchKlseFinancialReportHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import { parseRecentAnnouncementsFromKlseHtml } from '../src/services/bursa/bursaAnnouncementParser';
import { parseCompanyGuidanceFromFinancialReportHtml } from '../src/services/bursa/bursaForecastService';
import { parseBursaQuarterlyFromHtml } from '../src/services/bursa/bursaQuarterlyService';

const codes = ['1155', '1023', '1295', '5347', '4707', '6033'];
const EARN =
  /\b(quarterly|financial|interim|annual)\s+(results|report|statements)|unaudited|4q|1q|2q|3q|fy20\d{2}/i;

async function main() {
  for (const code of codes) {
    const page = await fetchKlseStockPageHtml(code);
    const html = page?.html ?? '';
    const anns = parseRecentAnnouncementsFromKlseHtml(html, code);
    const earningsAnns = anns.filter((a) => EARN.test(a.title));
    const q = parseBursaQuarterlyFromHtml(html, code, false);
    const qEnd = q.quarterlyHistory?.[0]?.quarterEndDate ?? q.latestQuarter?.quarterEndDate ?? null;
    let frGuidance = 0;
    let frOk = false;
    if (qEnd) {
      const fr = await fetchKlseFinancialReportHtml(code, qEnd);
      frOk = Boolean(fr?.html);
      if (fr?.html) {
        const g = parseCompanyGuidanceFromFinancialReportHtml(fr.html);
        frGuidance = g.current.length + g.next.length;
      }
    }
    console.log(
      JSON.stringify({
        code,
        htmlOk: html.length > 1000,
        annCount: anns.length,
        earningsAnnCount: earningsAnns.length,
        earningsTitles: earningsAnns.slice(0, 2).map((a) => a.title),
        qEnd,
        frOk,
        frGuidance,
        annSamples: anns.slice(0, 3).map((a) => a.title),
      }),
    );
  }
}

main().catch(console.error);
