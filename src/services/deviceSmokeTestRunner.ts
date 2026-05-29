import { DEVICE_SMOKE_TEST_CHECKLIST } from '../constants/deviceSmokeTestChecklist';
import type { PersonalKillSwitches } from './personalKillSwitches';
import { loadAllApiKeys, hasUsableKey } from './apiKeys';
import { detectStaleQuote } from './dataIntegrityEngine';
import { buildIdempotencyKey, findDuplicateIdempotencyEntry } from './executionIdempotency';
import { loadExecutionJournal } from './executionJournalStorage';
import { marketDataRequestQueue } from './marketDataRequestQueue';
import {
  applyTradeToPortfolio,
  removePortfolioPosition,
  updatePositionCurrentPrice,
} from './portfolio';
import { loadHealthyPortfolioSnapshot, isPortfolioStructurallyCorrupt } from './portfolioSnapshot';
import { readRecoveryAttemptCount, shouldEnterSafeBootMode } from './safeBoot';
import { canUseNativeSecureStore } from './secretStorage';
import { loadAppStateTrusted } from './storage';
import { probeNetworkReachable } from './networkReachability';
import { getPerformanceCostSnapshot } from './performanceCostRuntime';
import { isExpoGo } from '../utils/runtimeEnvironment';
import type { AppState, PortfolioPosition, TradeRecord } from '../types';
import type { ExecutionJournalEntry } from '../types/execution';

export const EXPO_GO_COLD_OFFLINE_NOTE =
  '開発環境の制約により完全オフライン起動は判定対象外';
export const EXPO_GO_OFFLINE_DETAIL =
  'Expo Goでは完全オフライン起動はMetro bundle取得が必要なため失敗する場合があります。本番ビルドで確認してください。';

function smokeTestPosition(overrides: Partial<PortfolioPosition> = {}): PortfolioPosition {
  const now = new Date().toISOString();
  return {
    id: 'smoke-test-pos',
    symbol: 'AAPL',
    market: 'us',
    currency: 'USD',
    shares: 10,
    averageBuyPrice: 100,
    currentPrice: 105,
    priceSource: 'api',
    priceFetchStatus: 'ok',
    openedAt: now,
    ...overrides,
  };
}

export type SmokeTestResultStatus = 'pass' | 'fail' | 'warning';

export type SmokeTestRunLog = {
  testId: string;
  titleJa: string;
  startedAt: string;
  finishedAt: string;
  result: SmokeTestResultStatus;
  message: string;
  error: string | null;
  durationMs: number;
};

export type DeviceSmokeTestContext = {
  state: AppState;
  degradedMode: boolean;
  killSwitches: PersonalKillSwitches;
  hasTwelveDataKey: boolean;
  securityWarnings: string[];
};

type RunnerOutcome = Pick<SmokeTestRunLog, 'result' | 'message' | 'error'>;

function pass(message: string): RunnerOutcome {
  return { result: 'pass', message, error: null };
}

function fail(message: string, error?: string): RunnerOutcome {
  return { result: 'fail', message, error: error ?? message };
}

function warn(message: string, error?: string | null): RunnerOutcome {
  return { result: 'warning', message, error: error ?? null };
}

async function runFreshInstall(ctx: DeviceSmokeTestContext): Promise<RunnerOutcome> {
  const { state } = ctx;
  if (!Array.isArray(state.portfolio) || !Array.isArray(state.practice.portfolio)) {
    return fail('ポートフォリオ構造が不正', 'portfolio_not_array');
  }
  if (!state.settings || typeof state.settings.selectedMarket !== 'string') {
    return fail('設定オブジェクトが読み込めません', 'settings_missing');
  }
  return pass(
    `起動状態OK — 手動 ${state.portfolio.length}件 · 練習 ${state.practice.portfolio.length}件`,
  );
}

async function runAppRestart(): Promise<RunnerOutcome> {
  const loaded = await loadAppStateTrusted();
  if (!loaded.trusted) {
    return fail('永続化データの信頼性検証に失敗', loaded.warnings.join(', ') || 'untrusted');
  }
  if (loaded.warnings.length > 0) {
    return warn(`データ復元OK（警告: ${loaded.warnings.join(', ')}）`);
  }
  return pass('AsyncStorage から状態を復元できました');
}

function activeHoldingsCount(state: AppState): number {
  return [...state.portfolio, ...state.practice.portfolio].filter((p) => (p.shares ?? 0) > 0).length;
}

function hasPortfolioDataEvidence(state: AppState): boolean {
  const active = [...state.portfolio, ...state.practice.portfolio].filter((p) => (p.shares ?? 0) > 0);
  if (active.length === 0) return true;
  return active.some(
    (p) =>
      (p.currentPrice ?? 0) > 0 ||
      p.priceFetchStatus === 'ok' ||
      Boolean(p.lastSuccessfulFetchAt),
  );
}

function hasOfflineBannerSignal(securityWarnings: string[], isOffline: boolean): boolean {
  if (
    securityWarnings.some((w) =>
      /ネットワーク未接続|オフライン|offline|ネットワーク|到達/i.test(w),
    )
  ) {
    return true;
  }
  return isOffline && getPerformanceCostSnapshot().offlineMode;
}

function expoGoPhoneOfflineGuard(outcome: RunnerOutcome): RunnerOutcome {
  if (outcome.result !== 'fail') return outcome;
  return warn(`${outcome.message}（${EXPO_GO_COLD_OFFLINE_NOTE}）`, outcome.error ?? undefined);
}

async function runPhoneOffline(ctx: DeviceSmokeTestContext): Promise<RunnerOutcome> {
  const expoGo = isExpoGo();
  const expoSuffix = expoGo ? ` ${EXPO_GO_COLD_OFFLINE_NOTE}。${EXPO_GO_OFFLINE_DETAIL}` : '';

  const loaded = await loadAppStateTrusted();
  if (!loaded.trusted) {
    return expoGoPhoneOfflineGuard(
      fail('AsyncStorage復元に失敗', loaded.warnings.join(', ') || 'untrusted'),
    );
  }

  const online = await probeNetworkReachable();
  const offlineMode = getPerformanceCostSnapshot().offlineMode;
  const isOffline = !online || offlineMode;
  const holdings = activeHoldingsCount(ctx.state);

  if (!isOffline) {
    return warn(
      `オンライン起動済み — データ表示後に機内モードONして再実行してください（保有 ${holdings}件）${expoSuffix}`,
      'manual_airplane_mode',
    );
  }

  const missing: string[] = [];
  if (!hasPortfolioDataEvidence(ctx.state)) {
    missing.push('データ未取得（オンライン時に株価/保有を確認）');
  }
  if (!Array.isArray(ctx.state.portfolio) || !Array.isArray(ctx.state.practice.portfolio)) {
    missing.push('キャッシュ表示不可');
  }
  if (!hasOfflineBannerSignal(ctx.securityWarnings, isOffline)) {
    missing.push('オフラインバナー未検出（ホーム画面で確認）');
  }

  if (missing.length > 0) {
    return expoGoPhoneOfflineGuard(
      warn(`オフライン — ${missing.join(' · ')}${expoSuffix}`, missing.join(',')),
    );
  }

  return pass(
    `オフライン耐性OK — 保有 ${holdings}件 · キャッシュ表示 · AsyncStorage復元 · バナー表示${expoGo ? ` · ${EXPO_GO_COLD_OFFLINE_NOTE}` : ''}`,
  );
}

async function runApiKeyMissing(ctx: DeviceSmokeTestContext): Promise<RunnerOutcome> {
  const keys = await loadAllApiKeys();
  const configured = Object.values(keys).filter((k) => hasUsableKey(k)).length;
  const loaded = await loadAppStateTrusted();

  if (!loaded.trusted) {
    return fail('キー未設定シナリオでも状態読込が必要', loaded.warnings.join(', '));
  }
  if (ctx.hasTwelveDataKey) {
    return warn(
      `Twelve Data キー設定済み — 未設定時の挙動は手動確認（登録API ${configured}件）`,
      'manual_key_removal_check',
    );
  }
  return pass(`APIキー未設定でも起動OK — 登録API ${configured}件`);
}

async function runApiQuota(): Promise<RunnerOutcome> {
  const queue = marketDataRequestQueue.getSnapshot();
  const rateLimited = queue.rateLimitUntil > Date.now();
  if (rateLimited) {
    return warn(
      `429バックオフ稼働中 — ${queue.backoffMs}ms（保有データは保持される想定）`,
      'rate_limit_active',
    );
  }
  if (queue.pending > 10) {
    return warn(`キュー混雑 — 待機 ${queue.pending} · 実行中 ${queue.inFlight}`);
  }
  return pass(`キュー正常 — 待機 ${queue.pending} · 実行中 ${queue.inFlight}`);
}

async function runStalePrice(ctx: DeviceSmokeTestContext): Promise<RunnerOutcome> {
  const active = [...ctx.state.portfolio, ...ctx.state.practice.portfolio].filter(
    (p) => (p.shares ?? 0) > 0,
  );
  if (active.length === 0) {
    const mock = detectStaleQuote(undefined);
    if (mock.stale) {
      return warn('保有なし — STALE判定ロジックは動作（手動で練習買付→確認推奨）');
    }
    return warn('保有なし — STALE表示の手動確認を推奨');
  }

  const stalePositions = active.filter((p) => {
    const check = detectStaleQuote(p.lastSuccessfulFetchAt ?? p.currentPriceUpdatedAt);
    return p.isStale || p.priceFetchStatus === 'failed' || check.stale;
  });

  if (stalePositions.length > 0) {
    const symbols = stalePositions.map((p) => p.symbol).join(', ');
    return pass(`STALE検出 ${stalePositions.length}件 (${symbols}) — 執行ゲート要確認`);
  }

  const fresh = detectStaleQuote(active[0].lastSuccessfulFetchAt ?? active[0].currentPriceUpdatedAt);
  return warn(
    `全保有が新鮮 — STALEバッジの手動確認を推奨（最古: ${fresh.noteJa}）`,
    'manual_stale_scenario',
  );
}

async function runAddHolding(): Promise<RunnerOutcome> {
  const trade: TradeRecord = {
    id: 'smoke-test-buy',
    symbol: 'TEST',
    market: 'us',
    currency: 'USD',
    side: 'buy',
    shares: 1,
    price: 100,
    executedAt: new Date().toISOString(),
    brokerageFee: 0,
    notes: 'smoke-test',
  };
  const next = applyTradeToPortfolio([], trade);
  const added = next.find((p) => p.symbol === 'TEST');
  if (!added || added.shares !== 1) {
    return fail('練習買付シミュレーション失敗', 'apply_trade_failed');
  }
  return pass('買付ロジック検証OK — 実機で練習買付→再起動を手動確認');
}

async function runEditHolding(): Promise<RunnerOutcome> {
  const base = smokeTestPosition({ id: 'smoke-edit', currentPrice: 100 });
  const edited = updatePositionCurrentPrice([base], 'smoke-edit', 123.45);
  const row = edited.find((p) => p.id === 'smoke-edit');
  if (!row || row.currentPrice !== 123.45) {
    return fail('価格編集シミュレーション失敗', 'edit_price_failed');
  }
  return pass('価格編集ロジック検証OK — 実機で手動修正→保存を確認');
}

async function runDeleteHolding(): Promise<RunnerOutcome> {
  const base = smokeTestPosition({ id: 'smoke-delete' });
  const { portfolio, removed } = removePortfolioPosition([base], 'smoke-delete');
  if (!removed || portfolio.length !== 0) {
    return fail('削除シミュレーション失敗', 'remove_failed');
  }
  return pass('削除ロジック検証OK — 確認ダイアログ・取り消しは実機で確認');
}

async function runPracticeTrade(ctx: DeviceSmokeTestContext): Promise<RunnerOutcome> {
  const journal = await loadExecutionJournal();
  const practiceTrades = ctx.state.practice.trades.length;
  const cash = ctx.state.practice.cashBalanceMYR;
  const capital = ctx.state.practice.virtualCapitalMYR;

  if (practiceTrades === 0 && journal.entries.length === 0) {
    return warn('練習取引・ジャーナルが空 — 実機で買付/売却を実行して確認');
  }

  if (cash < 0 || capital <= 0) {
    return fail('練習残高が不正', `cash=${cash} capital=${capital}`);
  }

  return pass(
    `ジャーナル ${journal.entries.length}件 · 練習取引 ${practiceTrades}件 · 残高 ${Math.round(cash)} MYR`,
  );
}

async function runDuplicateTap(): Promise<RunnerOutcome> {
  const request = {
    ledgerMode: 'practice' as const,
    market: 'us' as const,
    symbol: 'AAPL',
    side: 'buy' as const,
    quantity: 1,
  };
  const key = buildIdempotencyKey(request, 1_700_000_000_000);
  const existing: ExecutionJournalEntry = {
    orderId: 'ord_smoke',
    idempotencyKey: key,
    ledgerMode: 'practice',
    market: 'us',
    currency: 'USD',
    symbol: 'AAPL',
    side: 'buy',
    quantity: 1,
    requestedPrice: 100,
    status: 'submitted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const dup = findDuplicateIdempotencyEntry([existing], key);
  if (!dup) {
    return fail('重複検出ロジックが動作しません', 'idempotency_miss');
  }
  return pass('同一 idempotency キーの重複送信をブロック可能');
}

async function runCorruptRecovery(): Promise<RunnerOutcome> {
  const loaded = await loadAppStateTrusted();
  const manualBad = isPortfolioStructurallyCorrupt(loaded.state.portfolio);
  const practiceBad = isPortfolioStructurallyCorrupt(loaded.state.practice.portfolio);
  const snap = await loadHealthyPortfolioSnapshot();

  if (manualBad || practiceBad) {
    return fail('構造破損を検出 — 復旧が必要', 'structural_corrupt');
  }
  if (!loaded.trusted) {
    return warn('永続化データ非信頼 — デフォルト復旧が作動', loaded.warnings.join(', '));
  }
  if (snap) {
    return pass(`整合性OK · 健全スナップショット ${snap.savedAt.slice(0, 10)}`);
  }
  return pass('整合性OK — 健全スナップショット未作成（空ポートフォリオ可）');
}

async function runClearSensitive(): Promise<RunnerOutcome> {
  const secure = canUseNativeSecureStore();
  const keys = await loadAllApiKeys();
  const configured = Object.entries(keys).filter(([, v]) => hasUsableKey(v)).length;

  if (!secure) {
    return warn('SecureStore 非利用環境 — 実機(iOS/Android)で削除動作を確認');
  }
  return warn(
    `SecureStore 利用可 · 登録キー ${configured}件 — 設定画面から削除→再設定を手動確認`,
    'manual_clear_sensitive',
  );
}

async function runSafeBoot(ctx: DeviceSmokeTestContext): Promise<RunnerOutcome> {
  const attempts = await readRecoveryAttemptCount();
  const safeBoot = await shouldEnterSafeBootMode();

  if (safeBoot || ctx.degradedMode) {
    return pass(
      `安全/劣化モード検出 — 復旧 ${attempts}回 · 診断画面で復旧手順を確認`,
    );
  }
  if (attempts > 0) {
    return warn(`復旧試行 ${attempts}回 — 上限未到達（安全モード未発動）`);
  }
  return pass('通常起動 — 安全モード未発動');
}

const RUNNERS: Record<string, (ctx: DeviceSmokeTestContext) => Promise<RunnerOutcome>> = {
  fresh_install: runFreshInstall,
  app_restart: () => runAppRestart(),
  phone_offline: runPhoneOffline,
  api_key_missing: runApiKeyMissing,
  api_quota: () => runApiQuota(),
  stale_price: runStalePrice,
  add_holding: () => runAddHolding(),
  edit_holding: () => runEditHolding(),
  delete_holding: () => runDeleteHolding(),
  practice_trade: runPracticeTrade,
  duplicate_tap: () => runDuplicateTap(),
  corrupt_recovery: () => runCorruptRecovery(),
  clear_sensitive: () => runClearSensitive(),
  safe_boot: runSafeBoot,
};

export function smokeResultLabelJa(result: SmokeTestResultStatus): string {
  if (result === 'pass') return 'PASS';
  if (result === 'fail') return 'FAIL';
  return 'WARNING';
}

export function computeSmokeTestStats(logs: SmokeTestRunLog[]): {
  total: number;
  pass: number;
  fail: number;
  warning: number;
  passRatePct: number;
} {
  const latestById = new Map<string, SmokeTestRunLog>();
  for (const log of logs) {
    latestById.set(log.testId, log);
  }
  const latest = [...latestById.values()];
  const pass = latest.filter((l) => l.result === 'pass').length;
  const fail = latest.filter((l) => l.result === 'fail').length;
  const warning = latest.filter((l) => l.result === 'warning').length;
  const total = DEVICE_SMOKE_TEST_CHECKLIST.length;
  const decisive = pass + fail;
  return {
    total,
    pass,
    fail,
    warning,
    passRatePct: decisive > 0 ? Math.round((pass / decisive) * 100) : pass > 0 ? 100 : 0,
  };
}

export async function runDeviceSmokeTest(
  testId: string,
  ctx: DeviceSmokeTestContext,
): Promise<SmokeTestRunLog> {
  const item = DEVICE_SMOKE_TEST_CHECKLIST.find((t) => t.id === testId);
  const titleJa = item?.titleJa ?? testId;
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  const runner = RUNNERS[testId];
  if (!runner) {
    const finishedAt = new Date().toISOString();
    const log: SmokeTestRunLog = {
      testId,
      titleJa,
      startedAt,
      finishedAt,
      result: 'fail',
      message: '未知のテストID',
      error: 'unknown_test_id',
      durationMs: Date.now() - startedMs,
    };
    console.log('[device-smoke-test]', JSON.stringify(log));
    return log;
  }

  let outcome: RunnerOutcome;
  try {
    outcome = await runner(ctx);
  } catch (e) {
    outcome = fail('実行中に例外', e instanceof Error ? e.message : String(e));
  }

  const log: SmokeTestRunLog = {
    testId,
    titleJa,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedMs,
    ...outcome,
  };
  console.log('[device-smoke-test]', JSON.stringify(log));
  return log;
}

export async function runAllDeviceSmokeTests(
  ctx: DeviceSmokeTestContext,
  onProgress?: (log: SmokeTestRunLog) => void,
): Promise<SmokeTestRunLog[]> {
  const logs: SmokeTestRunLog[] = [];
  for (const item of DEVICE_SMOKE_TEST_CHECKLIST) {
    const log = await runDeviceSmokeTest(item.id, ctx);
    logs.push(log);
    onProgress?.(log);
  }
  const stats = computeSmokeTestStats(logs);
  console.log('[device-smoke-test-summary]', JSON.stringify({ ...stats, finishedAt: new Date().toISOString() }));
  return logs;
}
