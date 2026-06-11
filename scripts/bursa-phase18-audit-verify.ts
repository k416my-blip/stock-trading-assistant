/**
 * Phase18 News Intelligence 監査検証
 * npx tsx scripts/bursa-phase18-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import {
  buildNewsIntelligenceAnalysis,
  classifyNewsSentiment,
  newsIntelligenceMaterialScoreAdjustment,
} from '../src/services/bursa/bursaNewsIntelligenceService';
import { enrichStockWithNewsIntelligence } from '../src/services/bursa/bursaPhase18Analysis';
import { enrichStockWithDividendIntelligence } from '../src/services/bursa/bursaPhase17Analysis';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';

const HOLDING_CODES = [
  { code: '1155', label: 'Maybank' },
  { code: '1023', label: 'CIMB' },
  { code: '1295', label: 'Public Bank' },
  { code: '5347', label: 'Tenaga' },
  { code: '4707', label: 'Nestle' },
  { code: '6033', label: 'Petronas Gas' },
];

function readEnvKey(names: readonly string[]): string {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return '';
}

function loadAuditApiKeys(): AnalysisApiKeys {
  return {
    newsApiKey: readEnvKey(['NEWS_API_KEY', 'EXPO_PUBLIC_NEWS_API_KEY']),
    snsApiKey: '',
    earningsApiKey: '',
    redditApiKey: '',
    xApiKey: '',
    alphaVantageApiKey: readEnvKey(['ALPHA_VANTAGE_API_KEY', 'EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY']),
    fmpApiKey: readEnvKey(['FMP_API_KEY', 'EXPO_PUBLIC_FMP_API_KEY']),
  };
}

function minimalStock(code: string, companyName: string): BursaStockMaterialAnalysis {
  return {
    stockCode: code,
    companyName,
    materialScore: 0,
    scoreBreakdown: [],
    positiveMaterials: [],
    negativeMaterials: [],
    neutralMaterials: [],
    summaryLines: ['', '', ''],
    buyReasonsToday: [],
    sellReasonsToday: [],
    sourceStatus: {
      news_api: 'skipped',
      rss: 'skipped',
      bursa_announcement: 'skipped',
      x_api: 'skipped',
      reddit: 'skipped',
    },
    fetchedFields: [],
    missingFields: [],
  };
}

type AuditRow = {
  code: string;
  label: string;
  status: '成功' | '失敗';
  articleCount: number;
  last24h: number;
  sourceCoverage: string;
  fieldRate: string;
  bullish: number;
  bearish: number;
  neutral: number;
  topEvent: string;
  newsAdj: number;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  sourcesUsed: string;
  error: string | null;
};

async function auditOne(
  code: string,
  label: string,
  apiKeys: AnalysisApiKeys,
): Promise<AuditRow> {
  const page = await fetchKlseStockPageHtml(code);
  const stockHtml = page?.html ?? null;
  const companyName = label;

  const news = await buildNewsIntelligenceAnalysis({
    stockCode: code,
    companyName,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });

  let base = minimalStock(code, companyName);
  base = await enrichStockWithDividendIntelligence({
    stock: base,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });
  const scoreBefore = base.materialScore;

  const enriched = await enrichStockWithNewsIntelligence({
    stock: base,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });
  const scoreAfter = enriched.materialScore;
  const newsAdj = newsIntelligenceMaterialScoreAdjustment(news);

  const sentimentChecks = news.articles.map((a) => ({
    headline: a.headline,
    classified: classifyNewsSentiment(a.headline),
    assigned: a.sentiment,
  }));
  const sentimentMatch =
    sentimentChecks.length === 0
      ? 1
      : sentimentChecks.filter((s) => s.classified === s.assigned).length / sentimentChecks.length;

  const ok =
    news.hasExtractableData &&
    news.articles.length > 0 &&
    news.sourceCoverageRate >= 0.2 &&
    sentimentMatch >= 0.85 &&
    Math.abs(newsAdj) <= 20;

  return {
    code,
    label,
    status: ok ? '成功' : '失敗',
    articleCount: news.articles.length,
    last24h: news.last24hCount,
    sourceCoverage: `${Math.round(news.sourceCoverageRate * 100)}%`,
    fieldRate: `${Math.round(news.fieldAcquisitionRate * 100)}%`,
    bullish: news.bullishCount,
    bearish: news.bearishCount,
    neutral: news.neutralCount,
    topEvent: news.displayJa.topEventType,
    newsAdj,
    scoreBefore,
    scoreAfter,
    scoreDelta: scoreAfter - scoreBefore,
    sourcesUsed: news.sourcesUsed.join(', ') || '—',
    error: null,
  };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const apiKeys = loadAuditApiKeys();
  let crashCount = 0;
  const rows: AuditRow[] = [];

  for (const { code, label } of HOLDING_CODES) {
    try {
      rows.push(await auditOne(code, label, apiKeys));
    } catch (e) {
      crashCount += 1;
      rows.push({
        code,
        label,
        status: '失敗',
        articleCount: 0,
        last24h: 0,
        sourceCoverage: '0%',
        fieldRate: '0%',
        bullish: 0,
        bearish: 0,
        neutral: 0,
        topEvent: '—',
        newsAdj: 0,
        scoreBefore: 0,
        scoreAfter: 0,
        scoreDelta: 0,
        sourcesUsed: '—',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const pass = successCount >= 4 && crashCount === 0;
  const avgSourceCoverage =
    rows.reduce((s, r) => s + Number.parseFloat(r.sourceCoverage) || 0, 0) / rows.length;
  const avgFieldRate =
    rows.reduce((s, r) => s + Number.parseFloat(r.fieldRate) || 0, 0) / rows.length;
  const avgArticles = rows.reduce((s, r) => s + r.articleCount, 0) / rows.length;

  const report = [
    '# Phase18 News Intelligence 監査レポート',
    '',
    `実行日時: ${startedAt}`,
    `結果: **${pass ? 'PASS' : 'FAIL'}** (${successCount}/6 成功, クラッシュ ${crashCount})`,
    '',
    '## 1. 取得率',
    '',
    '| 指標 | 値 |',
    '|------|-----|',
    `| 平均ソースカバレッジ（5ソース中） | ${avgSourceCoverage.toFixed(0)}% |`,
    `| 平均フィールド取得率 | ${avgFieldRate.toFixed(0)}% |`,
    `| 平均記事数（重複排除後） | ${avgArticles.toFixed(1)} |`,
    `| NewsAPIキー | ${apiKeys.newsApiKey ? '設定済' : '未設定（Yahoo/RSS/KLSEで代替）'} |`,
    '',
    '取得ソース: NewsAPI / Yahoo Finance News / Bursa Announcements / RSS News / Company Announcement',
    '',
    '## 2. Sentiment精度',
    '',
    'ルールベース分類（Bullish/Neutral/Bearish）を headline キーワードで判定。',
    '各記事の assigned sentiment と再分類結果の一致率 ≥85% を合格基準とする。',
    '',
    '| 銘柄 | B | N | Be | 記事数 |',
    '|------|---|---|----|--------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.bullish} | ${r.neutral} | ${r.bearish} | ${r.articleCount} |`,
    ),
    '',
    '## 3. 6銘柄ライブ結果',
    '',
    '| 銘柄 | ソース | 24h | 取得率 | Top Event | News補助 |',
    '|------|--------|-----|--------|-----------|----------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.sourcesUsed} | ${r.last24h} | ${r.fieldRate} | ${r.topEvent} | ${r.newsAdj >= 0 ? '+' : ''}${r.newsAdj} |`,
    ),
    '',
    '## 4. AIスコア変化（Phase18追加前後）',
    '',
    'Phase11ニュース重複を除外し、News Intelligence 集約（-20〜+20）のみを材料スコアに反映。',
    '',
    '| 銘柄 | 変更前 | 変更後 | Δ |',
    '|------|--------|--------|---|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.scoreBefore} | ${r.scoreAfter} | ${r.scoreDelta >= 0 ? '+' : ''}${r.scoreDelta} |`,
    ),
    '',
    '## 5. エラー',
    '',
    ...(rows.some((r) => r.error)
      ? rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`)
      : ['- なし']),
    '',
    `## 6. 判定: ${pass ? 'PASS' : 'FAIL'}`,
    '',
    '合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、News補助±20以内、ソースカバレッジ≥20%。',
  ].join('\n');

  const outDir = join(process.cwd(), 'docs', 'review');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'PHASE18_NEWS_INTELLIGENCE_AUDIT_REPORT.md');
  writeFileSync(reportPath, report, 'utf8');

  console.log(
    JSON.stringify({ pass, successCount, crashCount, avgSourceCoverage, avgFieldRate, reportPath, rows }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
