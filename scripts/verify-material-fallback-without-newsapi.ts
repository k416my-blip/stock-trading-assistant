/**
 * NewsAPI 停止（429）状態で材料分析が RSS / X / Reddit のみで生成されるか検証
 * npx tsx scripts/verify-material-fallback-without-newsapi.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadAuditApiKeys, probeDeviceSecureStoreKeys } from './loadAuditApiKeys.mjs';
import { fetchAllMaterialSources } from '../src/services/bursa/bursaMaterialSources';
import { formatMaterialAnalysisReport } from '../src/services/bursa/bursaMaterialAnalysisService';
import { buildBursaPhase11FromBundles } from '../src/services/bursa/bursaPhase11Analysis';
import type { BursaDisclosureBundle } from '../src/types/bursaDisclosure';
import type { AnalysisApiKeys } from '../src/services/analysisApiKeys';

const OUT_DIR = path.join('docs/review/material-fallback-audit');
const STOCK = { code: '1155', name: 'Malayan Banking Berhad' };

const RATE_LIMIT_BODY =
  '{"status":"error","code":"rateLimited","message":"Developer accounts are limited to 100 requests over a 24 hour period (50 requests available every 12 hours)."}';

function installNewsApi429Fetch() {
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('newsapi.org')) {
      return new Response(RATE_LIMIT_BODY, {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return original(input, init);
  };
  return () => {
    globalThis.fetch = original;
  };
}

function minimalBundle(): BursaDisclosureBundle {
  const now = new Date().toISOString();
  return {
    stockCode: STOCK.code,
    profile: {
      companyName: STOCK.name,
      sector: 'Financial Services',
      fetchedAt: now,
    },
    dividend: { history: [], fetchedAt: now },
    quarterly: { quarterlyHistory: [], fetchedAt: now },
    fetchedAt: now,
  } as BursaDisclosureBundle;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const audit = loadAuditApiKeys() as { newsApiKey: string; xApiKey: string };
  const secure = probeDeviceSecureStoreKeys();

  const apiKeys: AnalysisApiKeys = {
    newsApiKey: audit.newsApiKey || 'dummy-news-key-for-429-test',
    snsApiKey: audit.xApiKey,
    earningsApiKey: '',
    redditApiKey: '',
    xApiKey: audit.xApiKey,
  };

  if (!apiKeys.xApiKey) {
    console.warn('X API key missing in .env — X source may be skipped');
  }

  const restoreFetch = installNewsApi429Fetch();
  try {
    const fetched = await fetchAllMaterialSources({
      stockCode: STOCK.code,
      companyName: STOCK.name,
      stockHtml: null,
      bundle: minimalBundle(),
      apiKeys,
      fetchLiveExternal: true,
    });

    const stockAnalysis = {
      stockCode: STOCK.code,
      companyName: STOCK.name,
      materialScore: 0,
      scoreBreakdown: [],
      positiveMaterials: [],
      negativeMaterials: [],
      neutralMaterials: fetched.headlines.map((h) => ({
        id: h.idSuffix ?? h.title,
        source: h.source,
        sourceLabelJa: h.sourceLabelJa,
        sentiment: '中立' as const,
        title: h.title,
        score: 0,
        reasonJa: h.source,
        publishedAt: h.publishedAt,
        url: h.url,
      })),
      summaryLines: ['', '', ''] as [string, string, string],
      buyReasonsToday: [],
      sellReasonsToday: [],
      sourceStatus: fetched.sourceStatus,
      newsApiDiagnostics: fetched.newsApiDiagnostics,
      redditFetchDiagnostics: fetched.redditFetchDiagnostics,
      fetchedFields: [],
      missingFields: [],
    };

    const uiRow = formatMaterialAnalysisReport({
      stocks: [stockAnalysis],
      topMaterial: null,
      monitoringNotifications: [],
      snapshotCapturedAt: new Date().toISOString(),
    } as import('../src/types/bursaDisclosure').BursaPhase11Analysis).stocks[0];

    const sourceLabels = new Set<string>();
    for (const item of fetched.headlines) {
      const label =
        item.sourceLabelJa ??
        (item.source === 'rss'
          ? 'RSS'
          : item.source === 'x'
            ? 'X'
            : item.source === 'reddit'
              ? 'Reddit'
              : item.source);
      sourceLabels.add(label);
    }

    const itemCountKeys = Object.keys(uiRow?.itemCountBySource ?? {});

    const checks = {
      newsApiBlocked: fetched.newsApiDiagnostics?.errorReason === 'NEWSAPI_TEMP_RATE_LIMIT',
      newsApiItemsZero: fetched.headlines.filter((h) => h.source === 'news_api').length === 0,
      hasRss: fetched.sourceStatus.rss === 'ok',
      hasX: isSourceOk(fetched.sourceStatus.x),
      hasReddit: isSourceOk(fetched.sourceStatus.reddit),
      materialItemsGenerated: fetched.headlines.length > 0,
      showsYahooRss:
        sourceLabels.has('Yahoo Finance RSS') || itemCountKeys.some((k) => k.includes('Yahoo')),
      showsGoogleRss:
        sourceLabels.has('Google News RSS') || itemCountKeys.some((k) => k.includes('Google')),
      showsX: sourceLabels.has('X') || itemCountKeys.includes('X'),
      showsReddit:
        sourceLabels.has('Reddit RSS') ||
        sourceLabels.has('Reddit') ||
        itemCountKeys.some((k) => k.includes('Reddit')),
      uiRowGenerated: Boolean(uiRow),
    };

    let phase11Macro = false;
    let phase11Sector = false;
    try {
      const phase11 = await buildBursaPhase11FromBundles({
        bundles: [minimalBundle()],
        apiKeys,
        fetchLiveExternal: true,
        holdings: [],
      });
      const row = phase11.stocks.find((s) => s.stockCode === STOCK.code);
      phase11Macro = Boolean(row?.macroIntelligence?.hasExtractableData);
      phase11Sector = Boolean(row?.sectorRotation?.hasExtractableData);
    } catch (e) {
      console.warn('phase11 enrich warning', e);
    }

    const materialPass =
      checks.newsApiBlocked &&
      checks.materialItemsGenerated &&
      checks.hasRss &&
      (checks.hasX || !apiKeys.xApiKey) &&
      checks.showsYahooRss &&
      checks.showsGoogleRss;

    const twelveHourAllowed =
      materialPass &&
      checks.newsApiBlocked &&
      (checks.hasX || !apiKeys.xApiKey);

    const payload = {
      generatedAt: new Date().toISOString(),
      stock: STOCK,
      secureStore: secure,
      sourceStatus: fetched.sourceStatus,
      newsApiDiagnostics: fetched.newsApiDiagnostics,
      sourceLabels: [...sourceLabels],
      itemCountBySource: uiRow?.itemCountBySource ?? {},
      apiConnections: uiRow?.apiConnections ?? [],
      headlineCount: fetched.headlines.length,
      checks: { ...checks, phase11Macro, phase11Sector },
      materialPass,
      twelveHourTestVerdict: twelveHourAllowed ? '12時間テスト開始可' : '開始不可',
    };

    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(payload, null, 2));
    fs.writeFileSync(
      path.join(OUT_DIR, 'MATERIAL_FALLBACK_AUDIT.md'),
      buildMarkdown(payload),
      'utf8',
    );

    console.log(JSON.stringify(payload, null, 2));
    process.exit(twelveHourAllowed ? 0 : 1);
  } finally {
    restoreFetch();
  }
}

function isSourceOk(status: string): boolean {
  return status === 'ok' || status === 'partial';
}

function buildMarkdown(payload: Record<string, unknown>): string {
  const c = payload.checks as Record<string, boolean>;
  return [
    '# 材料分析フォールバック監査（NewsAPI 429）',
    '',
    `実行: ${payload.generatedAt}`,
    '',
    '## チェック結果',
    '',
    ...Object.entries(c).map(([k, v]) => `- ${k}: **${v ? 'PASS' : 'FAIL'}**`),
    '',
    '## 取得ソース（itemCountBySource）',
    '',
    '```json',
    JSON.stringify(payload.itemCountBySource, null, 2),
    '```',
    '',
    `## 最終判定: **${payload.twelveHourTestVerdict}**`,
  ].join('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
