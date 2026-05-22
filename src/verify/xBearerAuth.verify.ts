/**
 * X API Bearer 認証デバッグ（ターミナル）
 * npm run verify:x-bearer
 *
 * .env の X_BEARER_TOKEN / EXPO_PUBLIC_X_BEARER_TOKEN を読み込み、
 * search/recent で接続テスト。失敗しても exit 0（アプリ同様に止めない）。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { logXBearerEnvAtStartup } from '../services/xBearerToken';
import { runXApiBearerFetchTest } from '../services/xApiDebug';

function loadDotEnvFile(): void {
  const path = join(process.cwd(), '.env');
  if (!existsSync(path)) {
    console.log('[x-api] .env file not found at', path);
    return;
  }
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  console.log('[x-api] loaded .env from', path);
}

async function main(): Promise<void> {
  console.log('=== X API Bearer auth debug ===\n');
  loadDotEnvFile();
  logXBearerEnvAtStartup();

  const result = await runXApiBearerFetchTest();
  console.log('\n=== Result ===');
  console.log('configured:', result.configured);
  console.log('ok:', result.ok);
  console.log('message:', result.messageJa);
  console.log('status:', result.status);
  console.log('diagnosis:', result.diagnosisJa);
  console.log('authHeaderPreview:', result.authHeaderPreview);

  if (!result.configured) {
    console.log('\n→ X API未設定: .env に EXPO_PUBLIC_X_BEARER_TOKEN または X_BEARER_TOKEN を設定');
    process.exit(0);
  }
  if (!result.ok) {
    console.log('\n→ 認証/権限/レート制限を diagnosis と responseBody で確認');
    process.exit(0);
  }
  console.log('\n→ 接続成功');
  process.exit(0);
}

main().catch((err) => {
  console.error('[x-api] verify script error (non-fatal):', err);
  process.exit(0);
});
