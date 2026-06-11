/**
 * Phase18.8 Multi-Article Event Aggregation 監査検証
 * npx tsx scripts/bursa-phase18-8-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import {
  buildNewsIntelligenceAnalysis,
  newsIntelligenceArticleMaterialScoreAdjustment,
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
  clusterCount: number;
  adj187: number;
  adj188: number;
  delta: number;
  topCluster: string;
  topScore: number;
  error: string | null;
};

async function auditOne(
  code: string,
  label: string,
  apiKeys: AnalysisApiKeys,
): Promise<{ row: AuditRow; news: Awaited<ReturnType<typeof buildNewsIntelligenceAnalysis>> }> {
  const page = await fetchKlseStockPageHtml(code);
  const stockHtml = page?.html ?? null;

  const news = await buildNewsIntelligenceAnalysis({
    stockCode: code,
    companyName: label,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });

  let base = minimalStock(code, label);
  base = await enrichStockWithDividendIntelligence({
    stock: base,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });
  const scoreBefore = base.materialScore;
  await enrichStockWithNewsIntelligence({
    stock: base,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });

  const adj187 = newsIntelligenceArticleMaterialScoreAdjustment(news);
  const adj188 = newsIntelligenceMaterialScoreAdjustment(news);
  const top = news.topEventClusters[0];

  const ok =
    news.hasExtractableData &&
    news.eventClusters.length >= 2 &&
    Math.abs(adj188) <= 20 &&
    Math.abs(adj187) <= 20;

  return {
    news,
    row: {
      code,
      label,
      status: ok ? '成功' : '失敗',
      clusterCount: news.eventClusters.length,
      adj187,
      adj188,
      delta: adj188 - adj187,
      topCluster: top?.clusterLabel ?? '—',
      topScore: top?.eventScore ?? 0,
      error: null,
    },
  };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const apiKeys = loadAuditApiKeys();
  let crashCount = 0;
  const rows: AuditRow[] = [];
  const globalTopClusters: Array<{
    stock: string;
    eventType: string;
    score: number;
    articles: number;
    sources: number;
  }> = [];

  for (const { code, label } of HOLDING_CODES) {
    try {
      const { row, news } = await auditOne(code, label, apiKeys);
      rows.push(row);
      for (const c of news.topEventClusters) {
        globalTopClusters.push({
          stock: label,
          eventType: c.eventType,
          score: c.eventScore,
          articles: c.articleCount,
          sources: c.sourceDiversity,
        });
      }
    } catch (e) {
      crashCount += 1;
      rows.push({
        code,
        label,
        status: '失敗',
        clusterCount: 0,
        adj187: 0,
        adj188: 0,
        delta: 0,
        topCluster: '—',
        topScore: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const totalClusters = rows.reduce((s, r) => s + r.clusterCount, 0);
  const pass = successCount >= 4 && crashCount === 0;

  globalTopClusters.sort((a, b) => b.score - a.score);
  const top10 = globalTopClusters.slice(0, 10);

  const report = [
    '# Phase18.8 Multi-Article Event Aggregation 監査レポート',
    '',
    `実行日時: ${startedAt}`,
    `結果: **${pass ? 'PASS' : 'FAIL'}** (${successCount}/6 成功, クラッシュ ${crashCount})`,
    '',
    '## 1. Event Cluster数',
    '',
    `全銘柄合計クラスタ数: **${totalClusters}**`,
    '',
    '| 銘柄 | Cluster数 |',
    '|------|-----------|',
    ...rows.map((r) => `| ${r.label} (${r.code}) | ${r.clusterCount} |`),
    '',
    '## 2. 上位10イベント（EventScore順）',
    '',
    'EventScore = Impact × FrequencyWeight × SourceWeight × TimeWeight',
    '',
    '| 順位 | 銘柄 | Event Cluster | Score | 記事数 | ソース数 |',
    '|------|------|---------------|-------|--------|----------|',
    ...top10.map(
      (c, i) =>
        `| ${i + 1} | ${c.stock} | ${c.eventType} | ${c.score} | ${c.articles} | ${c.sources} |`,
    ),
    '',
    '## 3. 6銘柄ライブ結果',
    '',
    '| 銘柄 | Clusters | Top Cluster | Top Score |',
    '|------|----------|-------------|-----------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.clusterCount} | ${r.topCluster} | ${r.topScore} |`,
    ),
    '',
    '## 4. News補助比較（18.7 vs 18.8）',
    '',
    '| 銘柄 | 18.7記事単位 | 18.8クラスタ | Δ |',
    '|------|-------------|-------------|---|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.adj187 >= 0 ? '+' : ''}${r.adj187} | ${r.adj188 >= 0 ? '+' : ''}${r.adj188} | ${r.delta >= 0 ? '+' : ''}${r.delta} |`,
    ),
    '',
    '18.8は同一Eventの記事頻度・ソース多様性・時間減衰でEventScoreを増幅。',
    '',
    '## 5. エラー',
    '',
    ...(rows.some((r) => r.error)
      ? rows.filter((r) => r.error).map((r) => `- ${r.code}: ${r.error}`)
      : ['- なし']),
    '',
    `## 6. 判定: ${pass ? 'PASS' : 'FAIL'}`,
    '',
    '合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、Cluster≥2、News補助±20以内。',
  ].join('\n');

  const outDir = join(process.cwd(), 'docs', 'review');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'PHASE18_8_EVENT_CLUSTER_AUDIT_REPORT.md');
  writeFileSync(reportPath, report, 'utf8');

  console.log(
    JSON.stringify(
      { pass, successCount, crashCount, totalClusters, reportPath, rows, top10 },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
