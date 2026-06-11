/**
 * Phase13 — Earnings Call 解析（transcript/summary 保存・トーンスコア・安全表示）
 */
import type { AnalysisApiKeys } from '../analysisApiKeys';
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type {
  BursaEarningsCallAnalysis,
  EarningsCallFallbackSource,
  EarningsCallStoredRecord,
  EarningsCallToneScores,
} from '../../types/bursaEarningsCall';
import {
  EARNINGS_CALL_API_NOT_CONFIGURED_JA,
  EARNINGS_CALL_NOT_APPLICABLE_JA,
  EARNINGS_CALL_UNAVAILABLE_JA,
} from '../../types/bursaEarningsCall';
import { parseRecentAnnouncementsFromKlseHtml } from './bursaAnnouncementParser';
import { analyzeFinancialReportHtml, extractFinancialReportPlainText } from './bursaFinancialReportAnalysis';
import { generateEarningsCallAiSummary, hasGeneratedSummary } from './earningsCallAiSummary';
import { parseCompanyGuidanceFromFinancialReportHtml } from './bursaForecastService';
import { fetchKlseFinancialReportHtml } from './bursaKlseHtmlClient';
import {
  classifyMaterialSentiment,
  type RawMaterialInput,
} from './bursaMaterialSentiment';

const FINNHUB_TIMEOUT_MS = 10_000;

const EARNINGS_ANN_PATTERN =
  /\b(quarterly|financial|interim|annual)\s+(results|report|statements)|unaudited|4q|1q|2q|3q|fy20\d{2}/i;

const CEO_PATTERN = /\b(chief executive|ceo|group ceo|managing director|president)\b/i;
const CFO_PATTERN = /\b(chief financial|cfo|group cfo|finance director)\b/i;

const BULLISH_WORDS =
  /\b(confident|strong|growth|record|beat|raise|upgrade|optimistic|robust|momentum|expansion|outperform)\b|好調|増益|上方|堅調|改善/gi;
const BEARISH_WORDS =
  /\b(cautious|weak|decline|miss|cut|downgrade|headwind|pressure|slowdown|uncertain|challenge|volatile)\b|減益|下方|低迷|不透明|課題/gi;

const QA_RISK_PATTERN =
  /\b(analyst|question|q&a|concern|uncertain|caution|headwind|margin pressure|competition|regulatory)\b|懸念|質問|課題/gi;

const GUIDANCE_RAISE = /\b(raise|upgrade|increase|higher|above|exceed|upward)\b|上方|引き上げ|増加/i;
const GUIDANCE_CUT = /\b(cut|lower|reduce|below|downward|weak)\b|下方|引き下げ|減少/i;

function clampScore(n: number): number {
  return Math.max(-100, Math.min(100, Math.round(n)));
}

function countMatches(text: string, pattern: RegExp): number {
  const flags = pattern.flags.replace('g', '');
  const re = new RegExp(pattern.source, `${flags}g`);
  return (text.match(re) ?? []).length;
}

function extractRoleSection(text: string, rolePattern: RegExp, maxLen = 400): string {
  const idx = text.search(rolePattern);
  if (idx < 0) return '';
  return text.slice(idx, idx + maxLen).trim();
}

export function scoreTextTone(text: string): EarningsCallToneScores {
  const safe = text.trim();
  if (!safe) {
    return {
      ceoToneScore: 0,
      cfoToneScore: 0,
      managementToneScore: 0,
      bullishWordCount: 0,
      bearishWordCount: 0,
    };
  }

  const bullishWordCount = countMatches(safe, BULLISH_WORDS);
  const bearishWordCount = countMatches(safe, BEARISH_WORDS);
  const net = bullishWordCount - bearishWordCount;

  const ceoText = extractRoleSection(safe, CEO_PATTERN);
  const cfoText = extractRoleSection(safe, CFO_PATTERN);

  const toneFromNet = (n: number) => clampScore(n * 12);
  const ceoToneScore = ceoText ? toneFromNet(countMatches(ceoText, BULLISH_WORDS) - countMatches(ceoText, BEARISH_WORDS)) : toneFromNet(net);
  const cfoToneScore = cfoText ? toneFromNet(countMatches(cfoText, BULLISH_WORDS) - countMatches(cfoText, BEARISH_WORDS)) : toneFromNet(net);
  const managementToneScore = toneFromNet(net);

  return {
    ceoToneScore,
    cfoToneScore,
    managementToneScore,
    bullishWordCount,
    bearishWordCount,
  };
}

export function extractQaRiskPoints(text: string, max = 3): string[] {
  const safe = text.trim();
  if (!safe) return [];

  const sentences = safe.split(/(?<=[.!?。])\s+/).filter((s) => QA_RISK_PATTERN.test(s));
  const unique: string[] = [];
  for (const s of sentences) {
    const t = s.trim().slice(0, 120);
    if (t && !unique.includes(t)) unique.push(t);
    if (unique.length >= max) break;
  }

  if (unique.length === 0 && QA_RISK_PATTERN.test(safe)) {
    unique.push('Q&A・懸念キーワードを検出（詳細 transcript 未取得）');
  }
  return unique;
}

export function summarizeGuidance(text: string): string {
  const safe = text.trim();
  if (!safe) return EARNINGS_CALL_UNAVAILABLE_JA;
  if (GUIDANCE_RAISE.test(safe) && !GUIDANCE_CUT.test(safe)) return 'ガイダンス: 上方・改善トーン';
  if (GUIDANCE_CUT.test(safe) && !GUIDANCE_RAISE.test(safe)) return 'ガイダンス: 下方・慎重トーン';
  if (GUIDANCE_RAISE.test(safe) && GUIDANCE_CUT.test(safe)) return 'ガイダンス: 混合（上方と下方の記述）';
  if (/\b(guidance|outlook|expects?|forecast)\b/i.test(safe)) return 'ガイダンス: 言及あり（方向性は中立）';
  return EARNINGS_CALL_UNAVAILABLE_JA;
}

function toneLabel(score: number): string {
  if (score >= 25) return '強気';
  if (score >= 8) return 'やや強気';
  if (score <= -25) return '弱気';
  if (score <= -8) return 'やや弱気';
  return '中立';
}

function buildDisplayFields(
  tone: EarningsCallToneScores | null,
  guidanceSummaryJa: string,
  qaRiskPointsJa: string[],
): BursaEarningsCallAnalysis['displayJa'] {
  const mgmtScore = tone?.managementToneScore ?? 0;
  const ceoScore = tone?.ceoToneScore ?? 0;
  const cfoScore = tone?.cfoToneScore ?? 0;

  const managementTone =
    tone && (tone.bullishWordCount > 0 || tone.bearishWordCount > 0)
      ? `経営陣トーン: ${toneLabel(mgmtScore)}（CEO ${toneLabel(ceoScore)} / CFO ${toneLabel(cfoScore)} · 強気語${tone.bullishWordCount} / 弱気語${tone.bearishWordCount}）`
      : EARNINGS_CALL_UNAVAILABLE_JA;

  const guidance =
    guidanceSummaryJa !== EARNINGS_CALL_UNAVAILABLE_JA
      ? guidanceSummaryJa
      : EARNINGS_CALL_UNAVAILABLE_JA;

  const qaWatchpoints =
    qaRiskPointsJa.length > 0
      ? qaRiskPointsJa.join(' / ')
      : EARNINGS_CALL_UNAVAILABLE_JA;

  return { managementTone, guidance, qaWatchpoints };
}

function emptyAnalysis(
  availability: BursaEarningsCallAnalysis['availability'],
  labelJa: string,
): BursaEarningsCallAnalysis {
  return {
    availability,
    availabilityLabelJa: labelJa,
    record: null,
    tone: null,
    guidanceSummaryJa: EARNINGS_CALL_UNAVAILABLE_JA,
    qaRiskPointsJa: [],
    displayJa: {
      managementTone: labelJa,
      guidance: labelJa,
      qaWatchpoints: labelJa,
    },
    evaluationJa: labelJa,
    overallScore: 0,
    financialReportAnalysis: null,
    aiSummary: null,
    fallbackSource: 'none',
    summaryGenerated: false,
  };
}

function buildFromText(input: {
  stockCode: string;
  companyName: string | null;
  text: string;
  source: EarningsCallStoredRecord['source'];
  eventDate?: string | null;
  fallbackSource?: EarningsCallFallbackSource;
  financialReportAnalysis?: BursaEarningsCallAnalysis['financialReportAnalysis'];
  aiSummary?: BursaEarningsCallAnalysis['aiSummary'];
  guidanceSummaryOverrideJa?: string;
}): BursaEarningsCallAnalysis {
  const text = input.text.trim();
  const tone = scoreTextTone(text);
  const guidanceFromForecast = parseCompanyGuidanceFromFinancialReportHtml(
    `<div class="bursa-ann">${text}</div>`,
  );
  const guidanceText =
    guidanceFromForecast.current.map((g) => g.value).join(' ') || text;
  const guidanceSummaryJa = input.guidanceSummaryOverrideJa ?? summarizeGuidance(guidanceText);
  const qaRiskPointsJa = extractQaRiskPoints(text);
  const displayJa = buildDisplayFields(tone, guidanceSummaryJa, qaRiskPointsJa);

  const sentiment = classifyMaterialSentiment(text.slice(0, 500));
  const sentimentBonus = sentiment === '好材料' ? 15 : sentiment === '悪材料' ? -15 : 0;
  const overallScore = clampScore(tone.managementToneScore + sentimentBonus);

  const record: EarningsCallStoredRecord = {
    stockCode: input.stockCode,
    companyName: input.companyName,
    eventDate: input.eventDate ?? null,
    transcriptExcerpt: text.slice(0, 2000),
    summaryExcerpt: text.slice(0, 400),
    source: input.source,
    fetchedAt: new Date().toISOString(),
  };

  const evaluationJa = input.aiSummary?.executiveSummaryJa?.trim()
    ? input.aiSummary.executiveSummaryJa
    : `Earnings Call — ${toneLabel(tone.managementToneScore)} · ${guidanceSummaryJa.replace('ガイダンス: ', '')}`;

  return {
    availability: 'available',
    availabilityLabelJa: '取得済',
    record,
    tone,
    guidanceSummaryJa,
    qaRiskPointsJa,
    displayJa: {
      managementTone: input.aiSummary?.managementToneJa ?? displayJa.managementTone,
      guidance: displayJa.guidance,
      qaWatchpoints: displayJa.qaWatchpoints,
    },
    evaluationJa,
    overallScore: input.aiSummary?.confidenceScore ?? overallScore,
    financialReportAnalysis: input.financialReportAnalysis ?? null,
    aiSummary: input.aiSummary ?? null,
    fallbackSource: input.fallbackSource ?? 'transcript',
    summaryGenerated: hasGeneratedSummary(input.aiSummary ?? null),
  };
}

async function buildFromFinancialReport(input: {
  stockCode: string;
  companyName: string | null;
  html: string;
  quarterEndDate: string | null;
}): Promise<BursaEarningsCallAnalysis | null> {
  const frAnalysis = analyzeFinancialReportHtml({
    stockCode: input.stockCode,
    html: input.html,
    quarterEndDate: input.quarterEndDate,
  });
  if (!frAnalysis.hasExtractableData) return null;

  const plain = extractFinancialReportPlainText(input.html);
  const tone = scoreTextTone(plain);
  const aiSummary = await generateEarningsCallAiSummary({ report: frAnalysis, tone });

  const guidanceParts = [
    ...(frAnalysis.extracted.guidance ?? []),
    ...(frAnalysis.extracted.outlook ?? []),
  ];
  const guidanceSummaryJa =
    guidanceParts.length > 0
      ? `ガイダンス/Outlook: ${guidanceParts[0]!.slice(0, 120)}`
      : frAnalysis.extracted.revenueGrowth?.growthLabelJa !== EARNINGS_CALL_UNAVAILABLE_JA
        ? `売上成長 ${frAnalysis.extracted.revenueGrowth!.growthLabelJa}`
        : EARNINGS_CALL_UNAVAILABLE_JA;

  return buildFromText({
    stockCode: input.stockCode,
    companyName: input.companyName,
    text: frAnalysis.analysisContextJa,
    source: 'financial_report_analysis',
    eventDate: input.quarterEndDate,
    fallbackSource: 'financial_report',
    financialReportAnalysis: frAnalysis,
    aiSummary,
    guidanceSummaryOverrideJa: guidanceSummaryJa,
  });
}

async function fetchFinnhubEarningsText(
  stockCode: string,
  apiKey: string,
): Promise<{ text: string | null; eventDate: string | null; error: string | null }> {
  const symbols = [`${stockCode}.KL`, stockCode];
  for (const symbol of symbols) {
    const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey.trim())}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FINNHUB_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const body = await res.text();
      if (!res.ok) {
        return { text: null, eventDate: null, error: `HTTP ${res.status}` };
      }
      let rows: Array<{ period?: string; actual?: number; estimate?: number; surprise?: number }>;
      try {
        rows = JSON.parse(body) as typeof rows;
      } catch {
        return { text: null, eventDate: null, error: 'JSONパース失敗' };
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        continue;
      }
      const latest = rows[0];
      const parts: string[] = [];
      if (latest.period) parts.push(`Period ${latest.period}`);
      if (latest.actual != null && latest.estimate != null) {
        const beat = latest.actual >= latest.estimate;
        parts.push(
          `EPS actual ${latest.actual} vs estimate ${latest.estimate} (${beat ? 'beat' : 'miss'})`,
        );
      } else if (latest.actual != null) {
        parts.push(`EPS actual ${latest.actual}`);
      }
      if (latest.surprise != null) {
        parts.push(`surprise ${latest.surprise}%`);
      }
      if (parts.length === 0) return { text: null, eventDate: null, error: '空レスポンス' };
      return {
        text: parts.join('. '),
        eventDate: latest.period ?? null,
        error: null,
      };
    } catch (e) {
      return {
        text: null,
        eventDate: null,
        error: e instanceof Error ? e.message : 'fetch failed',
      };
    } finally {
      clearTimeout(timer);
    }
  }
  return { text: null, eventDate: null, error: 'earnings data empty' };
}

function extractEarningsAnnouncementText(stockHtml: string | null): string | null {
  if (!stockHtml?.trim()) return null;
  const anns = parseRecentAnnouncementsFromKlseHtml(stockHtml, '');
  const hits = anns.filter((a) => EARNINGS_ANN_PATTERN.test(a.title));
  if (hits.length === 0) return null;
  return hits
    .slice(0, 4)
    .map((a) => `${a.title}${a.publishedAt ? ` (${a.publishedAt})` : ''}`)
    .join('. ');
}

export async function buildEarningsCallAnalysis(input: {
  stockCode: string;
  companyName: string | null;
  bundle: BursaDisclosureBundle;
  stockHtml: string | null;
  apiKeys: AnalysisApiKeys;
  fetchLiveExternal: boolean;
}): Promise<BursaEarningsCallAnalysis> {
  const { stockCode, companyName, bundle, stockHtml, apiKeys, fetchLiveExternal } = input;

  if (bundle.dataSource === 'none' && !stockHtml?.trim()) {
    return emptyAnalysis('not_applicable', EARNINGS_CALL_NOT_APPLICABLE_JA);
  }

  const hasApiKey = Boolean(apiKeys.earningsApiKey?.trim());

  if (hasApiKey) {
    const finnhub = await fetchFinnhubEarningsText(stockCode, apiKeys.earningsApiKey);
    if (finnhub.text) {
      const built = buildFromText({
        stockCode,
        companyName,
        text: finnhub.text,
        source: 'finnhub_api',
        eventDate: finnhub.eventDate,
        fallbackSource: 'transcript',
      });
      if (built.summaryGenerated) return built;
      // Phase13.2 — transcript 不足時 Financial Report へフォールバック
    }
  }

  if (fetchLiveExternal) {
    const qEnd =
      bundle.quarterly?.quarterlyHistory?.[0]?.quarterEndDate ??
      bundle.quarterly?.latestQuarter?.quarterEndDate ??
      null;
    if (qEnd) {
      try {
        const fr = await fetchKlseFinancialReportHtml(stockCode, qEnd);
        if (fr?.html) {
          const fromFr = await buildFromFinancialReport({
            stockCode,
            companyName,
            html: fr.html,
            quarterEndDate: qEnd,
          });
          if (fromFr) return fromFr;

          const guidance = parseCompanyGuidanceFromFinancialReportHtml(fr.html);
          const combined = [...guidance.current, ...guidance.next].map((g) => g.value).join(' ');
          if (combined.trim()) {
            return buildFromText({
              stockCode,
              companyName,
              text: combined,
              source: 'klse_financial_report',
              eventDate: qEnd,
              fallbackSource: 'financial_report',
            });
          }
        }
      } catch {
        /* fall through */
      }
    }
  }

  const annText = extractEarningsAnnouncementText(stockHtml);
  if (annText) {
    return buildFromText({
      stockCode,
      companyName,
      text: annText,
      source: 'klse_announcement',
      eventDate: null,
    });
  }

  const klseAttempted = Boolean(stockHtml?.trim()) || fetchLiveExternal;
  if (!hasApiKey) {
    if (klseAttempted) {
      return emptyAnalysis('unavailable', EARNINGS_CALL_UNAVAILABLE_JA);
    }
    return emptyAnalysis('api_not_configured', EARNINGS_CALL_API_NOT_CONFIGURED_JA);
  }

  return emptyAnalysis('unavailable', EARNINGS_CALL_UNAVAILABLE_JA);
}

/** Phase11 material pipeline 用 — earnings 関連見出しを RawMaterialInput に変換 */
export function earningsCallToMaterialInputs(
  analysis: BursaEarningsCallAnalysis | null | undefined,
): RawMaterialInput[] {
  if (!analysis || analysis.availability !== 'available' || !analysis.record?.summaryExcerpt) {
    return [];
  }
  return [
    {
      source: 'bursa_announcement',
      title: `Earnings Call — ${analysis.record.summaryExcerpt.slice(0, 160)}`,
      url: null,
      publishedAt: analysis.record.eventDate,
      idSuffix: 'earnings-call',
      sourceLabelJa: 'Earnings Call (Phase13)',
    },
  ];
}
