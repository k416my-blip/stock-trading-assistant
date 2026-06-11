/**
 * Metro / Cursor OOM 対策: 診断プレフィックス以外の console.log/warn を既定で抑制。
 * EXPO_PUBLIC_VERBOSE_DEV_LOGS=1 で全ログを復元。
 */
import { VERBOSE_DEV_LOGS } from './devLog';

const ALLOWED_LOG_SUBSTRINGS = [
  '[device-smoke-test]',
  '[device-smoke-test-summary]',
  '[DEVICE-LIVE-AUDIT]',
  '[News API テスト]',
  '[X API テスト]',
  '[12H-MONITOR]',
  '[Reddit]',
  '[Phase11 MaterialAnalysisService]',
  '[execution-journal]',
  '[network]',
  '[GLOBAL ERROR HANDLER]',
  '[secure]',
  '[tamper]',
];

function firstArgString(args: unknown[]): string {
  const first = args[0];
  return typeof first === 'string' ? first : '';
}

function isAllowed(args: unknown[]): boolean {
  const head = firstArgString(args);
  return ALLOWED_LOG_SUBSTRINGS.some((prefix) => head.includes(prefix));
}

let installed = false;

export function installDevConsoleLogFilter(): void {
  if (installed) return;
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  if (VERBOSE_DEV_LOGS) return;

  installed = true;
  const origLog = console.log.bind(console);

  console.log = (...args: unknown[]) => {
    if (isAllowed(args)) origLog(...args);
  };
}
