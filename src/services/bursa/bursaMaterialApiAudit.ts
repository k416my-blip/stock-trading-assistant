/**
 * Phase 11.5/11.6 — 材料分析 API 統合監査（アプリ内）
 */
import type { AnalysisApiKeys } from '../analysisApiKeys';
import { loadAnalysisApiKeys } from '../analysisApiKeys';
import { formatPaidApiConnection } from './bursaMaterialDataQuality';
import type { BursaMaterialSourceStatus } from '../../types/bursaDisclosure';

const TIMEOUT_MS = 12_000;

export type MaterialApiAuditRow = {
  api: string;
  connectionJa: '接続済み' | '未接続';
  configured: boolean;
  connectionSuccess: boolean;
  failureReason: string | null;
  fetchCount: number;
};

export type MaterialApiAuditReport = {
  auditedAt: string;
  rows: MaterialApiAuditRow[];
  summaryJa: string;
};

function normalizeBearer(raw: string): string {
  let t = raw.trim();
  if (/^bearer\s+/i.test(t)) t = t.replace(/^bearer\s+/i, '').trim();
  return t;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function auditNews(apiKey: string): Promise<MaterialApiAuditRow> {
  if (!apiKey.trim()) {
    return {
      api: 'News API',
      connectionJa: '未接続',
      configured: false,
      connectionSuccess: false,
      failureReason: 'API未設定',
      fetchCount: 0,
    };
  }
  try {
    const q = encodeURIComponent('Maybank 1155 Malaysia');
    const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=6&apiKey=${encodeURIComponent(apiKey)}`;
    const res = await fetchWithTimeout(url, { method: 'GET' });
    const json = (await res.json()) as { articles?: unknown[]; message?: string };
    const count = Array.isArray(json.articles) ? json.articles.length : 0;
    const ok = res.ok && count > 0;
    return {
      api: 'News API',
      connectionJa: ok ? '接続済み' : '未接続',
      configured: true,
      connectionSuccess: ok,
      failureReason: ok ? null : (json.message ?? `HTTP ${res.status}`),
      fetchCount: count,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      api: 'News API',
      connectionJa: '未接続',
      configured: true,
      connectionSuccess: false,
      failureReason: msg.includes('abort') ? 'タイムアウト' : msg,
      fetchCount: 0,
    };
  }
}

async function auditX(apiKey: string): Promise<MaterialApiAuditRow> {
  const token = normalizeBearer(apiKey);
  if (!token) {
    return {
      api: 'X API',
      connectionJa: '未接続',
      configured: false,
      connectionSuccess: false,
      failureReason: 'API未設定',
      fetchCount: 0,
    };
  }
  try {
    const query = encodeURIComponent('Maybank OR 1155 Bursa -is:retweet lang:en');
    const url = `https://api.x.com/2/tweets/search/recent?query=${query}&max_results=10`;
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.text();
    let count = 0;
    try {
      const json = JSON.parse(body) as { data?: unknown[] };
      count = Array.isArray(json.data) ? json.data.length : 0;
    } catch {
      /* ignore */
    }
    const ok = res.ok && count > 0;
    return {
      api: 'X API',
      connectionJa: ok ? '接続済み' : '未接続',
      configured: true,
      connectionSuccess: ok,
      failureReason: ok ? null : `HTTP ${res.status}`,
      fetchCount: count,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      api: 'X API',
      connectionJa: '未接続',
      configured: true,
      connectionSuccess: false,
      failureReason: msg.includes('abort') ? 'タイムアウト' : msg,
      fetchCount: 0,
    };
  }
}

async function auditReddit(apiKey: string): Promise<MaterialApiAuditRow> {
  const token = normalizeBearer(apiKey);
  if (!token) {
    return {
      api: 'Reddit API',
      connectionJa: '未接続',
      configured: false,
      connectionSuccess: false,
      failureReason: 'API未設定',
      fetchCount: 0,
    };
  }
  try {
    const meRes = await fetchWithTimeout('https://oauth.reddit.com/api/v1/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'stock-trading-assistant/1.0',
      },
    });
    if (!meRes.ok) {
      return {
        api: 'Reddit API',
        connectionJa: '未接続',
        configured: true,
        connectionSuccess: false,
        failureReason: `OAuth失敗 HTTP ${meRes.status}`,
        fetchCount: 0,
      };
    }
    const q = encodeURIComponent('Maybank Bursa Malaysia');
    const searchRes = await fetchWithTimeout(
      `https://oauth.reddit.com/search?q=${q}&sort=new&limit=5`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'stock-trading-assistant/1.0',
        },
      },
    );
    const json = (await searchRes.json()) as {
      data?: { children?: Array<{ data?: { title?: string } }> };
    };
    const count = (json.data?.children ?? []).filter((c) => c.data?.title?.trim()).length;
    const ok = searchRes.ok && count > 0;
    return {
      api: 'Reddit API',
      connectionJa: ok ? '接続済み' : '未接続',
      configured: true,
      connectionSuccess: ok,
      failureReason: ok ? null : `検索 HTTP ${searchRes.status}`,
      fetchCount: count,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      api: 'Reddit API',
      connectionJa: '未接続',
      configured: true,
      connectionSuccess: false,
      failureReason: msg.includes('abort') ? 'タイムアウト' : msg,
      fetchCount: 0,
    };
  }
}

export function paidApiStatusFromPhase11(
  sourceStatus: Record<string, BursaMaterialSourceStatus>,
): Array<{ api: string; connectionJa: '接続済み' | '未接続' }> {
  return [
    {
      api: 'News API',
      connectionJa: formatPaidApiConnection(sourceStatus.news_api ?? 'skipped'),
    },
    {
      api: 'X API',
      connectionJa: formatPaidApiConnection(sourceStatus.x ?? 'skipped'),
    },
    {
      api: 'Reddit API',
      connectionJa: formatPaidApiConnection(sourceStatus.reddit ?? 'skipped'),
    },
  ];
}

export async function runMaterialApiAudit(
  apiKeys?: AnalysisApiKeys,
): Promise<MaterialApiAuditReport> {
  const keys = apiKeys ?? (await loadAnalysisApiKeys());
  const [news, x, reddit] = await Promise.all([
    auditNews(keys.newsApiKey),
    auditX(keys.xApiKey),
    auditReddit(keys.redditApiKey),
  ]);
  const rows = [news, x, reddit];
  const connected = rows.filter((r) => r.connectionSuccess).length;
  return {
    auditedAt: new Date().toISOString(),
    rows,
    summaryJa: `接続成功 ${connected}/3 · News ${news.fetchCount}件 · X ${x.fetchCount}件 · Reddit ${reddit.fetchCount}件`,
  };
}
