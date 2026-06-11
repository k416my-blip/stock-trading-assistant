/**
 * Phase18.7 Event Expansion Engine 監査検証
 * npx tsx scripts/bursa-phase18-7-audit-verify.ts
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

const PHASE186_OTHER_BASELINE = 132;

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
  otherBefore: number;
  otherAfter: number;
  reductionPct: string;
  expanded: number;
  newsAdj: number;
  scoreDelta: number;
  topEvent: string;
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

  const enriched = await enrichStockWithNewsIntelligence({
    stock: base,
    stockHtml,
    apiKeys,
    fetchLiveExternal: true,
  });
  const newsAdj = newsIntelligenceMaterialScoreAdjustment(news);

  const expanded = news.articles.filter(
    (a) => a.preExpansionEventType === 'Other' && a.eventType !== 'Other',
  ).length;

  const ok =
    news.hasExtractableData &&
    news.otherReductionRate >= 0.05 &&
    Math.abs(newsAdj) <= 20;

  return {
    news,
    row: {
      code,
      label,
      status: ok ? '成功' : '失敗',
      otherBefore: news.otherCountBeforeExpansion,
      otherAfter: news.otherCountAfterExpansion,
      reductionPct: `${Math.round(news.otherReductionRate * 100)}%`,
      expanded,
      newsAdj,
      scoreDelta: enriched.materialScore - scoreBefore,
      topEvent: news.displayJa.topEventType,
      error: null,
    },
  };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const apiKeys = loadAuditApiKeys();
  let crashCount = 0;
  const rows: AuditRow[] = [];
  const eventDistAfter: Partial<Record<NewsEventType, number>> = {};
  const eventDistBefore: Partial<Record<NewsEventType, number>> = {};
  const expansionSamples: string[] = [];

  for (const { code, label } of HOLDING_CODES) {
    try {
      const { row, news } = await auditOne(code, label, apiKeys);
      rows.push(row);
      for (const [k, v] of Object.entries(news.eventTypeDistribution)) {
        const key = k as NewsEventType;
        eventDistAfter[key] = (eventDistAfter[key] ?? 0) + (v ?? 0);
      }
      for (const a of news.articles) {
        eventDistBefore[a.preExpansionEventType] =
          (eventDistBefore[a.preExpansionEventType] ?? 0) + 1;
        if (a.preExpansionEventType === 'Other' && a.eventType !== 'Other') {
          expansionSamples.push(`[${label}] Other→${a.eventType}: ${a.headline.slice(0, 80)}`);
        }
      }
    } catch (e) {
      crashCount += 1;
      rows.push({
        code,
        label,
        status: '失敗',
        otherBefore: 0,
        otherAfter: 0,
        reductionPct: '0%',
        expanded: 0,
        newsAdj: 0,
        scoreDelta: 0,
        topEvent: '—',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const totalOtherBefore = rows.reduce((s, r) => s + r.otherBefore, 0);
  const totalOtherAfter = rows.reduce((s, r) => s + r.otherAfter, 0);
  const totalExpanded = rows.reduce((s, r) => s + r.expanded, 0);
  const reductionRate =
    totalOtherBefore > 0 ? (totalOtherBefore - totalOtherAfter) / totalOtherBefore : 0;
  const pass =
    successCount >= 4 &&
    crashCount === 0 &&
    totalOtherAfter < totalOtherBefore &&
    reductionRate >= 0.05;

  const report = [
    '# Phase18.7 Event Expansion Engine 監査レポート',
    '',
    `実行日時: ${startedAt}`,
    `結果: **${pass ? 'PASS' : 'FAIL'}** (${successCount}/6 成功, クラッシュ ${crashCount})`,
    '',
    '## 1. Event別件数（拡張後）',
    '',
    '| Event | 件数 |',
    '|-------|------|',
    ...Object.entries(eventDistAfter)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '## 2. Other削減率',
    '',
    `| 指標 | Phase18.6 | Phase18.7 |`,
    `|------|-----------|-----------|`,
    `| Other合計 | ${PHASE186_OTHER_BASELINE}（監査基準） | ${totalOtherAfter}（event分布: ${eventDistAfter.Other ?? 0}） |`,
    `| 拡張前Other（再計測） | — | ${totalOtherBefore} |`,
    `| 削減件数 | — | ${totalOtherBefore - totalOtherAfter} |`,
    `| **削減率** | — | **${Math.round(reductionRate * 100)}%** |`,
    `| 新規分類件数 | — | ${totalExpanded} |`,
    '',
    '## 3. 分類前後比較',
    '',
    '| Event | 拡張前 | 拡張後 | Δ |',
    '|-------|--------|--------|---|',
    ...[...new Set([...Object.keys(eventDistBefore), ...Object.keys(eventDistAfter)])]
      .sort()
      .map((k) => {
        const before = eventDistBefore[k as NewsEventType] ?? 0;
        const after = eventDistAfter[k as NewsEventType] ?? 0;
        const delta = after - before;
        return `| ${k} | ${before} | ${after} | ${delta >= 0 ? '+' : ''}${delta} |`;
      }),
    '',
    '### 拡張サンプル（Other→新Event）',
    '',
    ...(expansionSamples.length > 0
      ? expansionSamples.slice(0, 12).map((s) => `- ${s}`)
      : ['- なし']),
    '',
    '## 4. 6銘柄ライブ結果',
    '',
    '| 銘柄 | Other前 | Other後 | 削減率 | 拡張件数 | Top Event | News補助 | Δ |',
    '|------|---------|---------|--------|----------|-----------|----------|---|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.otherBefore} | ${r.otherAfter} | ${r.reductionPct} | ${r.expanded} | ${r.topEvent} | ${r.newsAdj >= 0 ? '+' : ''}${r.newsAdj} | ${r.scoreDelta >= 0 ? '+' : ''}${r.scoreDelta} |`,
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
    '合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、Other合計が削減、削減率≥5%。',
  ].join('\n');

  const outDir = join(process.cwd(), 'docs', 'review');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'PHASE18_7_EVENT_EXPANSION_AUDIT_REPORT.md');
  writeFileSync(reportPath, report, 'utf8');

  console.log(
    JSON.stringify(
      {
        pass,
        successCount,
        crashCount,
        totalOtherBefore,
        totalOtherAfter,
        reductionRate,
        totalExpanded,
        reportPath,
        rows,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
