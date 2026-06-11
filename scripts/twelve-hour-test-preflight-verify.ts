/**
 * 12時間テスト開始前プリフライト検証
 * npx tsx scripts/twelve-hour-test-preflight-verify.ts
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  TWELVE_HOUR_HEARTBEAT_MS,
  TWELVE_HOUR_SLEEP_DETECT_GAP_MS,
  TWELVE_HOUR_STALL_WARNING_MS,
  TWELVE_HOUR_TEST_MONITOR_ENABLED,
} from '../src/constants/twelveHourTestMonitor';
import {
  formatTwelveHourTestReportMarkdown,
  isTwelveHourBackgroundOpsAllowed,
  noteTwelveHourAiResponse,
  noteTwelveHourNewsFetch,
  noteTwelveHourPriceUpdate,
  resetTwelveHourTestMonitorCoreForTest,
  startTwelveHourTestMonitorCore,
  stopTwelveHourTestMonitorCore,
} from '../src/services/twelveHourTestMonitorCore';

const ROOT = process.cwd();
const REPORT_PATH = join(ROOT, 'docs/review/TWELVE_HOUR_TEST_PREFLIGHT_REPORT.md');
const PKG = 'com.assistant.stocktrading';

type CheckRow = {
  id: number;
  label: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
};

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function fileContains(path: string, needle: string): boolean {
  if (!existsSync(path)) return false;
  return readFileSync(path, 'utf8').includes(needle);
}

function runUnitTests(): { ok: boolean; output: string } {
  try {
    const out = execSync('npx vitest run tests/unit/twelveHourTestMonitor.test.ts', {
      encoding: 'utf8',
      cwd: ROOT,
    });
    return { ok: true, output: out.slice(-400) };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, output: `${err.stdout ?? ''}\n${err.stderr ?? ''}`.slice(-600) };
  }
}

function simulateMonitor(): CheckRow[] {
  resetTwelveHourTestMonitorCoreForTest();
  const rows: CheckRow[] = [];

  startTwelveHourTestMonitorCore({ allowBackground: true, targetHours: 12 });
  rows.push({
    id: 2,
    label: 'バックグラウンドAPI継続フラグ',
    status: isTwelveHourBackgroundOpsAllowed() ? 'PASS' : 'FAIL',
    detail: isTwelveHourBackgroundOpsAllowed()
      ? 'allowBackground=true — shouldPauseApiRequests をバイパス'
      : 'バックグラウンド継続が無効',
  });

  noteTwelveHourPriceUpdate({ preflight: true });
  noteTwelveHourNewsFetch({ preflight: true });
  noteTwelveHourAiResponse({ preflight: true });

  const report = stopTwelveHourTestMonitorCore();
  rows.push({
    id: 3,
    label: '株価/ニュース/AIタイムスタンプ記録',
    status:
      report.lastPriceUpdateAt && report.lastNewsFetchAt && report.lastAiResponseAt
        ? 'PASS'
        : 'FAIL',
    detail: `price=${report.lastPriceUpdateAt} news=${report.lastNewsFetchAt} ai=${report.lastAiResponseAt}`,
  });

  rows.push({
    id: 6,
    label: '終了レポート出力',
    status: formatTwelveHourTestReportMarkdown(report).includes('最終更新時刻') ? 'PASS' : 'FAIL',
    detail: REPORT_PATH,
  });

  resetTwelveHourTestMonitorCoreForTest();
  return rows;
}

function main(): void {
  const startedAt = new Date().toISOString();
  const checks: CheckRow[] = [];

  const monitorFile = join(ROOT, 'src/services/twelveHourTestMonitorCore.ts');
  const hooksOk =
    fileContains(join(ROOT, 'src/context/app/useAppApiKeys.ts'), 'noteTwelveHourPriceUpdate') &&
    fileContains(join(ROOT, 'src/context/BursaMaterialContext.tsx'), 'noteTwelveHourNewsFetch') &&
    fileContains(join(ROOT, 'src/context/ProactiveConciergeContext.tsx'), 'noteTwelveHourAiResponse') &&
    fileContains(join(ROOT, 'src/services/performanceCostRuntime.ts'), 'isTwelveHourBackgroundOpsAllowed');

  checks.push({
    id: 1,
    label: 'OSスリープ検出（ウォールクロックギャップ）',
    status: fileContains(monitorFile, 'detectSleep') ? 'PASS' : 'FAIL',
    detail: `閾値 ${TWELVE_HOUR_SLEEP_DETECT_GAP_MS / 60_000}分ギャップで検出`,
  });

  checks.push(...simulateMonitor());

  checks.push({
    id: 4,
    label: '15分ごと最終更新ログ',
    status: fileContains(monitorFile, 'TWELVE_HOUR_HEARTBEAT_MS') ? 'PASS' : 'FAIL',
    detail: `間隔 ${TWELVE_HOUR_HEARTBEAT_MS / 60_000}分 · タグ [12H-MONITOR]`,
  });

  checks.push({
    id: 5,
    label: '30分以上停止でWARNING',
    status: fileContains(monitorFile, 'TWELVE_HOUR_STALL_WARNING_MS') ? 'PASS' : 'FAIL',
    detail: `閾値 ${TWELVE_HOUR_STALL_WARNING_MS / 60_000}分`,
  });

  const unit = runUnitTests();
  checks.push({
    id: 7,
    label: 'ユニットテスト',
    status: unit.ok ? 'PASS' : 'FAIL',
    detail: unit.ok ? 'twelveHourTestMonitor.test.ts OK' : unit.output,
  });

  const adb = sh('adb devices').includes('device');
  const pid = adb ? sh(`adb shell pidof ${PKG}`) : '';
  checks.push({
    id: 8,
    label: '実機接続（任意）',
    status: adb && pid ? 'PASS' : adb ? 'WARN' : 'WARN',
    detail: adb ? (pid ? `PID ${pid}` : 'アプリ未起動 — テスト前に起動してください') : 'adb未接続',
  });

  const envEnabled = TWELVE_HOUR_TEST_MONITOR_ENABLED;
  checks.push({
    id: 9,
    label: 'EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR',
    status: envEnabled ? 'PASS' : 'WARN',
    detail: envEnabled
      ? '有効 — アプリ起動時に監視自動開始'
      : '未設定 — テスト前に EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR=1 を設定してビルド',
  });

  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const warnCount = checks.filter((c) => c.status === 'WARN').length;
  const pass = failCount === 0;

  const report = [
    '# 12時間テスト プリフライト検証レポート',
    '',
    `実行日時: ${startedAt}`,
    `結果: **${pass ? 'PASS' : 'FAIL'}** (FAIL ${failCount} / WARN ${warnCount})`,
    '',
    '## チェック項目',
    '',
    '| # | 項目 | 結果 | 詳細 |',
    '|---|------|------|------|',
    ...checks.map((c) => `| ${c.id} | ${c.label} | ${c.status} | ${c.detail} |`),
    '',
    '## テスト開始手順',
    '',
    '```powershell',
    '# 1. 監視有効ビルド（推奨）',
    '$env:EXPO_PUBLIC_TWELVE_HOUR_TEST_MONITOR="1"',
    'npx expo run:android',
    '',
    '# 2. 12時間テスト実行',
    '$env:PHASE12_5_HOURS="12"',
    'npm run verify:phase12-5',
    '',
    '# 3. logcat監視（別ターミナル）',
    'adb logcat -s ReactNativeJS:* | findstr 12H-MONITOR',
    '```',
    '',
    '## 監視仕様',
    '',
    '- **スリープ検出**: ハートビート間隔が3分以上空くと OSスリープとして記録',
    '- **バックグラウンド**: 監視有効時は API/AI ポーズをバイパス（画面OFFでも処理継続可能）',
    '- **株価タイマー**: 保有銘柄画面の interval はフォアグラウンド依存 — phase12-5 が15分毎に画面起動+更新',
    '- **15分ログ**: `[12H-MONITOR] heartbeat` に最終株価/ニュース/AI時刻',
    '- **30分WARNING**: 各チャネルまたは全更新が30分停止',
    '- **終了レポート**: logcat `test_ended` または本スクリプトのシミュレーション',
    '',
    `## 判定: ${pass ? 'PASS — 12時間テスト開始可能' : 'FAIL — 修正後に再実行'}`,
  ].join('\n');

  mkdirSync(join(ROOT, 'docs/review'), { recursive: true });
  writeFileSync(REPORT_PATH, report, 'utf8');

  console.log(JSON.stringify({ pass, failCount, warnCount, reportPath: REPORT_PATH, checks }, null, 2));
  if (!pass) process.exit(1);
}

main();
