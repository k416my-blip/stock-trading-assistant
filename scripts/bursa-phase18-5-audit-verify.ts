/**
 * Phase18.5 News Impact Engine 監査検証
 * npx tsx scripts/bursa-phase18-5-audit-verify.ts
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';
import {
  buildNewsIntelligenceAnalysis,
  newsIntelligenceMaterialScoreAdjustment,
} from '../src/services/bursa/bursaNewsIntelligenceService';
import { enrichStockWithNewsIntelligence } from '../src/services/bursa/bursaPhase18Analysis';
import { enrichStockWithDividendIntelligence } from '../src/services/bursa/bursaPhase17Analysis';
import { fetchKlseStockPageHtml } from '../src/services/bursa/bursaKlseHtmlClient';
import type { BursaStockMaterialAnalysis } from '../src/types/bursaDisclosure';
import type { NewsEventType } from '../src/types/bursaNewsIntelligence';

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

function formatEventDist(dist: Partial<Record<NewsEventType, number>>): string {
  return Object.entries(dist)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ') || '—';
}

type AuditRow = {
  code: string;
  label: string;
  status: '成功' | '失敗';
  eventAccuracy: string;
  impactLow: number;
  impactMid: number;
  impactHigh: number;
  impactAvg: string;
  impactMax: number;
  topEvent: string;
  topImpact: number;
  newsAdj: number;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  articleCount: number;
  error: string | null;
};

async function auditOne(
  code: string,
  label: string,
  apiKeys: AnalysisApiKeys,
): Promise<AuditRow> {
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

  const enriched = await enrichStockWithNewsIntelligence({
    stock: base,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });
  const scoreAfter = enriched.materialScore;
  const newsAdj = newsIntelligenceMaterialScoreAdjustment(news);

  const ok =
    news.hasExtractableData &&
    news.articles.length > 0 &&
    news.eventClassificationAccuracy >= 0.85 &&
    Math.abs(newsAdj) <= 20 &&
    news.impactDistribution.max >= news.impactDistribution.avg;

  return {
    code,
    label,
    status: ok ? '成功' : '失敗',
    eventAccuracy: `${Math.round(news.eventClassificationAccuracy * 100)}%`,
    impactLow: news.impactDistribution.low,
    impactMid: news.impactDistribution.mid,
    impactHigh: news.impactDistribution.high,
    impactAvg: news.impactDistribution.avg.toFixed(1),
    impactMax: news.impactDistribution.max,
    topEvent: news.displayJa.topEventType,
    topImpact: Number(news.displayJa.topImpactScore) || 0,
    newsAdj,
    scoreBefore,
    scoreAfter,
    scoreDelta: scoreAfter - scoreBefore,
    articleCount: news.articles.length,
    error: null,
  };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const apiKeys = loadAuditApiKeys();
  let crashCount = 0;
  const rows: AuditRow[] = [];
  const eventDistAll: Partial<Record<NewsEventType, number>> = {};

  for (const { code, label } of HOLDING_CODES) {
    try {
      const row = await auditOne(code, label, apiKeys);
      rows.push(row);
      const news = await buildNewsIntelligenceAnalysis({
        stockCode: code,
        companyName: label,
        stockHtml: (await fetchKlseStockPageHtml(code))?.html ?? null,
        apiKeys,
        fetchLiveExternal: true,
      });
      for (const [k, v] of Object.entries(news.eventTypeDistribution)) {
        const key = k as NewsEventType;
        eventDistAll[key] = (eventDistAll[key] ?? 0) + (v ?? 0);
      }
    } catch (e) {
      crashCount += 1;
      rows.push({
        code,
        label,
        status: '失敗',
        eventAccuracy: '0%',
        impactLow: 0,
        impactMid: 0,
        impactHigh: 0,
        impactAvg: '0',
        impactMax: 0,
        topEvent: '—',
        topImpact: 0,
        newsAdj: 0,
        scoreBefore: 0,
        scoreAfter: 0,
        scoreDelta: 0,
        articleCount: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const pass = successCount >= 4 && crashCount === 0;
  const avgAccuracy =
    rows.reduce((s, r) => s + Number.parseFloat(r.eventAccuracy) || 0, 0) / rows.length;
  const totalImpact =
    rows.reduce((s, r) => s + r.impactLow + r.impactMid + r.impactHigh, 0) || 1;
  const impactLowPct = (rows.reduce((s, r) => s + r.impactLow, 0) / totalImpact) * 100;
  const impactMidPct = (rows.reduce((s, r) => s + r.impactMid, 0) / totalImpact) * 100;
  const impactHighPct = (rows.reduce((s, r) => s + r.impactHigh, 0) / totalImpact) * 100;

  const report = [
    '# Phase18.5 News Impact Engine 監査レポート',
    '',
    `実行日時: ${startedAt}`,
    `結果: **${pass ? 'PASS' : 'FAIL'}** (${successCount}/6 成功, クラッシュ ${crashCount})`,
    '',
    '## 1. Event分類精度',
    '',
    '16種Event（Guidance Raise/Cut, Contract Award, Dividend Increase/Cut 等）を優先パターンマッチで分類。',
  `平均再分類一致率: **${avgAccuracy.toFixed(0)}%**（合格基準 ≥85%）`,
    '',
    '| 銘柄 | 分類精度 | Top Event | Top Impact | 記事数 |',
    '|------|---------|-----------|------------|--------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.eventAccuracy} | ${r.topEvent} | ${r.topImpact} | ${r.articleCount} |`,
    ),
    '',
    '### 全銘柄 Event分布（上位）',
    '',
    Object.entries(eventDistAll)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n'),
    '',
    '## 2. Impact分布',
    '',
    'Event種別レンジに基づく0〜100スコア。low<40 / mid 40-69 / high≥70。',
    '',
    `| 帯域 | 構成比 |`,
    `|------|--------|`,
    `| Low (<40) | ${impactLowPct.toFixed(0)}% |`,
    `| Mid (40-69) | ${impactMidPct.toFixed(0)}% |`,
    `| High (≥70) | ${impactHighPct.toFixed(0)}% |`,
    '',
    '| 銘柄 | Low | Mid | High | 平均 | Max |',
    '|------|-----|-----|------|------|-----|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.impactLow} | ${r.impactMid} | ${r.impactHigh} | ${r.impactAvg} | ${r.impactMax} |`,
    ),
    '',
    '## 3. 6銘柄ライブ結果',
    '',
    'Impact × Sentiment × 時間減衰（24h=1.0 / 3d=0.7 / 7d=0.4 / 30d=0.1）',
    '',
    '| 銘柄 | News補助 | 評価 |',
    '|------|----------|------|',
    ...rows.map(
      (r) => `| ${r.label} (${r.code}) | ${r.newsAdj >= 0 ? '+' : ''}${r.newsAdj} | ${r.status} |`,
    ),
    '',
    '## 4. AIスコア変化',
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
    '合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、Event分類≥85%、News補助±20以内。',
  ].join('\n');

  const outDir = join(process.cwd(), 'docs', 'review');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'PHASE18_5_NEWS_IMPACT_ENGINE_AUDIT_REPORT.md');
  writeFileSync(reportPath, report, 'utf8');

  console.log(
    JSON.stringify(
      { pass, successCount, crashCount, avgAccuracy, impactLowPct, impactMidPct, impactHighPct, reportPath, rows },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
