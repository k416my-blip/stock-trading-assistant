/**
 * Phase18.6 Event Validation Engine 監査検証
 * npx tsx scripts/bursa-phase18-6-audit-verify.ts
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

type AuditRow = {
  code: string;
  label: string;
  status: '成功' | '失敗';
  guidanceRaise: number;
  earnings: number;
  contractAward: number;
  other: number;
  confAvg: string;
  confHigh: number;
  corrected: number;
  newsAdj: number;
  scoreDelta: number;
  topEvent: string;
  topConf: number;
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

  const guidanceRaise = news.eventTypeDistribution['Guidance Raise'] ?? 0;
  const earnings = news.eventTypeDistribution.Earnings ?? 0;
  const contractAward = news.eventTypeDistribution['Contract Award'] ?? 0;
  const other = news.eventTypeDistribution.Other ?? 0;
  const corrected = news.articles.filter((a) => a.stage1EventType !== a.eventType).length;

  const ok =
    news.hasExtractableData &&
    guidanceRaise <= 3 &&
    news.confidenceDistribution.avg >= 45 &&
    Math.abs(newsAdj) <= 20;

  return {
    news,
    row: {
      code,
      label,
      status: ok ? '成功' : '失敗',
      guidanceRaise,
      earnings,
      contractAward,
      other,
      confAvg: news.confidenceDistribution.avg.toFixed(1),
      confHigh: news.confidenceDistribution.high,
      corrected,
      newsAdj,
      scoreDelta: enriched.materialScore - scoreBefore,
      topEvent: news.displayJa.topEventType,
      topConf: news.articles[0]?.eventConfidence ?? 0,
      error: null,
    },
  };
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const apiKeys = loadAuditApiKeys();
  let crashCount = 0;
  const rows: AuditRow[] = [];
  const eventDistAll: Partial<Record<NewsEventType, number>> = {};
  const allSamples: Array<{
    stock: string;
    headline: string;
    stage1: string;
    final: string;
    conf: number;
    reason: string | null;
  }> = [];

  for (const { code, label } of HOLDING_CODES) {
    try {
      const { row, news } = await auditOne(code, label, apiKeys);
      rows.push(row);
      for (const [k, v] of Object.entries(news.eventTypeDistribution)) {
        const key = k as NewsEventType;
        eventDistAll[key] = (eventDistAll[key] ?? 0) + (v ?? 0);
      }
      for (const s of news.misclassificationSamples) {
        allSamples.push({
          stock: label,
          headline: s.headline,
          stage1: s.stage1EventType,
          final: s.eventType,
          conf: s.eventConfidence,
          reason: s.rejectionReason,
        });
      }
    } catch (e) {
      crashCount += 1;
      rows.push({
        code,
        label,
        status: '失敗',
        guidanceRaise: 0,
        earnings: 0,
        contractAward: 0,
        other: 0,
        confAvg: '0',
        confHigh: 0,
        corrected: 0,
        newsAdj: 0,
        scoreDelta: 0,
        topEvent: '—',
        topConf: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const successCount = rows.filter((r) => r.status === '成功').length;
  const totalGuidanceRaise = rows.reduce((s, r) => s + r.guidanceRaise, 0);
  const pass = successCount >= 4 && crashCount === 0 && totalGuidanceRaise <= 12;
  const avgConf =
    rows.reduce((s, r) => s + Number.parseFloat(r.confAvg) || 0, 0) / rows.length;
  const totalConf =
    rows.reduce((s, r) => s + r.confHigh, 0) +
    rows.reduce((s, r) => s + (Number.parseFloat(r.confAvg) >= 50 ? 1 : 0), 0);

  const report = [
    '# Phase18.6 Event Validation Engine 監査レポート',
    '',
    `実行日時: ${startedAt}`,
    `結果: **${pass ? 'PASS' : 'FAIL'}** (${successCount}/6 成功, クラッシュ ${crashCount})`,
    '',
    '## 1. Event別件数（全銘柄合計）',
    '',
    'Phase18.5問題: Guidance Raise 90 が大量発生 → Phase18.6で必須フレーズ検証。',
    '',
    `| Event | 件数 |`,
    `|-------|------|`,
    ...Object.entries(eventDistAll)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .map(([k, v]) => `| ${k} | ${v} |`),
    '',
    `**Guidance Raise 合計: ${totalGuidanceRaise}**（Phase18.5: 8件/銘柄級 → 抑制目標 ≤3/銘柄）`,
    '',
    '## 2. Confidence分布',
    '',
    `平均Confidence: **${avgConf.toFixed(1)}**（low<50 / mid 50-79 / high≥80）`,
    '',
    '| 銘柄 | 平均Conf | High件数 | Stage1修正件数 |',
    '|------|----------|----------|----------------|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.confAvg} | ${r.confHigh} | ${r.corrected} |`,
    ),
    '',
    '## 3. 誤分類サンプル（Stage1→Stage2修正）',
    '',
    ...(allSamples.length > 0
      ? allSamples
          .slice(0, 12)
          .map(
            (s) =>
              `- **${s.stock}**: [${s.stage1}→${s.final}] Conf${s.conf} — ${s.headline}${s.reason ? ` _(${s.reason})_` : ''}`,
          )
      : ['- 修正サンプルなし']),
    '',
    '## 4. 6銘柄ライブ結果',
    '',
    '| 銘柄 | G.Raise | Earnings | Contract | Other | Top Event | Conf | News補助 | Δ |',
    '|------|---------|----------|----------|-------|-----------|------|----------|---|',
    ...rows.map(
      (r) =>
        `| ${r.label} (${r.code}) | ${r.guidanceRaise} | ${r.earnings} | ${r.contractAward} | ${r.other} | ${r.topEvent} | ${r.topConf} | ${r.newsAdj >= 0 ? '+' : ''}${r.newsAdj} | ${r.scoreDelta >= 0 ? '+' : ''}${r.scoreDelta} |`,
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
    '合格基準: 6銘柄中4銘柄以上成功、クラッシュ0、Guidance Raise合計≤12、銘柄あたり≤3、平均Conf≥45。',
  ].join('\n');

  const outDir = join(process.cwd(), 'docs', 'review');
  mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, 'PHASE18_6_EVENT_VALIDATION_AUDIT_REPORT.md');
  writeFileSync(reportPath, report, 'utf8');

  console.log(
    JSON.stringify(
      {
        pass,
        successCount,
        crashCount,
        totalGuidanceRaise,
        avgConf,
        reportPath,
        eventDistAll,
        rows,
        sampleCount: allSamples.length,
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
