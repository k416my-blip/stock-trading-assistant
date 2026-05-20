import { APP_STATE_PERSISTENCE_VERSION } from './appStatePersistence';
import { loadExecutionJournal } from './executionJournalStorage';
import { marketDataRequestQueue } from './marketDataRequestQueue';
import {
  isPortfolioStructurallyCorrupt,
  loadHealthyPortfolioSnapshot,
  verifyPortfolioChecksum,
} from './portfolioSnapshot';
import { countDiagnosticsBySeverity } from './structuredDiagnostics';
import type { AppState } from '../types';

export type HealthLevel = 'ok' | 'warning' | 'critical';

export type HealthCheckItem = {
  id: string;
  labelJa: string;
  status: HealthLevel;
  messageJa: string;
};

export type HealthCheckReport = {
  overall: HealthLevel;
  checkedAt: string;
  items: HealthCheckItem[];
};

function maxLevel(a: HealthLevel, b: HealthLevel): HealthLevel {
  if (a === 'critical' || b === 'critical') return 'critical';
  if (a === 'warning' || b === 'warning') return 'warning';
  return 'ok';
}

function quoteAgeSeconds(position: { lastSuccessfulFetchAt?: string }): number | null {
  if (!position.lastSuccessfulFetchAt) return null;
  const t = Date.parse(position.lastSuccessfulFetchAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

export async function runDailyHealthCheck(input: {
  state: AppState;
  hasApiKey: boolean;
  killSwitchReadOnly?: boolean;
}): Promise<HealthCheckReport> {
  const items: HealthCheckItem[] = [];
  let overall: HealthLevel = 'ok';

  const push = (item: HealthCheckItem) => {
    items.push(item);
    overall = maxLevel(overall, item.status);
  };

  push({
    id: 'api_key',
    labelJa: 'APIキー',
    status: input.hasApiKey ? 'ok' : 'warning',
    messageJa: input.hasApiKey ? 'Twelve Data キーが設定されています' : 'APIキー未設定 — 自動株価更新は利用できません',
  });

  const active = [...input.state.portfolio, ...input.state.practice.portfolio].filter(
    (p) => (p.shares ?? 0) > 0,
  );
  let maxAge: number | null = null;
  for (const p of active) {
    const age = quoteAgeSeconds(p);
    if (age != null) maxAge = maxAge == null ? age : Math.max(maxAge, age);
  }
  if (active.length === 0) {
    push({
      id: 'quote_age',
      labelJa: '最新株価',
      status: 'ok',
      messageJa: '保有銘柄なし',
    });
  } else if (maxAge == null) {
    push({
      id: 'quote_age',
      labelJa: '最新株価',
      status: 'warning',
      messageJa: '取得成功時刻がありません — 手動価格または STALE の可能性',
    });
  } else if (maxAge > 3600) {
    push({
      id: 'quote_age',
      labelJa: '最新株価',
      status: 'warning',
      messageJa: `最古の取得成功から ${Math.floor(maxAge / 60)} 分以上 — 更新を推奨`,
    });
  } else {
    push({
      id: 'quote_age',
      labelJa: '最新株価',
      status: 'ok',
      messageJa: `最新取得成功は約 ${maxAge} 秒前`,
    });
  }

  const queue = marketDataRequestQueue.getSnapshot();
  const queueBusy = queue.inFlight > 0 || queue.pending > 5;
  const rateLimited = queue.rateLimitUntil > Date.now();
  push({
    id: 'queue',
    labelJa: 'リクエストキュー',
    status: rateLimited ? 'warning' : queueBusy ? 'warning' : 'ok',
    messageJa: rateLimited
      ? `レート制限バックオフ中（${queue.backoffMs}ms）`
      : `待機 ${queue.pending} · 実行中 ${queue.inFlight}`,
  });

  const manualBad = isPortfolioStructurallyCorrupt(input.state.portfolio);
  const practiceBad = isPortfolioStructurallyCorrupt(input.state.practice.portfolio);
  push({
    id: 'portfolio_integrity',
    labelJa: 'ポートフォリオ整合性',
    status: manualBad || practiceBad ? 'critical' : 'ok',
    messageJa:
      manualBad || practiceBad
        ? '構造破損を検出 — 復旧または健全スナップショット復元を検討'
        : '構造上問題なし',
  });

  const journal = await loadExecutionJournal();
  push({
    id: 'execution_journal',
    labelJa: '執行ジャーナル',
    status: 'ok',
    messageJa: `${journal.entries.length} 件のエントリ`,
  });

  const diag = countDiagnosticsBySeverity();
  push({
    id: 'diagnostics',
    labelJa: '診断ログ',
    status: diag.critical > 0 ? 'critical' : diag.error > 0 ? 'warning' : 'ok',
    messageJa:
      diag.critical > 0
        ? `重大 ${diag.critical} · エラー ${diag.error}`
        : diag.warning > 0
          ? `警告 ${diag.warning} 件`
          : '重大な診断イベントなし',
  });

  push({
    id: 'storage_schema',
    labelJa: 'ストレージスキーマ',
    status: 'ok',
    messageJa: `アプリ状態 v${APP_STATE_PERSISTENCE_VERSION}`,
  });

  const snap = await loadHealthyPortfolioSnapshot();
  if (snap && snap.portfolio.length > 0) {
    const snapOk = verifyPortfolioChecksum(snap.portfolio, snap.manualChecksum);
    push({
      id: 'healthy_snapshot',
      labelJa: '健全スナップショット',
      status: snapOk ? 'ok' : 'warning',
      messageJa: snapOk
        ? `${snap.savedAt.slice(0, 10)} 保存`
        : 'スナップショットのチェックサムに注意',
    });
  }

  if (input.killSwitchReadOnly) {
    push({
      id: 'read_only',
      labelJa: '読み取り専用',
      status: 'warning',
      messageJa: '読み取り専用モードが有効です',
    });
  }

  return { overall, checkedAt: new Date().toISOString(), items };
}
