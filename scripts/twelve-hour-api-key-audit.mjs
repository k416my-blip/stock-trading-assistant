/**
 * 12時間テスト前 API監査 — Node / 実機 分離
 * node scripts/twelve-hour-api-key-audit.mjs
 *
 * Node FAIL + 実機PASS → 「監査スクリプト制限」— 12時間テストはブロックしない
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('node', ['scripts/device-live-api-audit.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
