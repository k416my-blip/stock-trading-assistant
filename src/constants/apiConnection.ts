import type { ApiConnectionStatus } from '../types/apiConnection';

export const API_CONNECTION_STATUS_LABELS_JA: Record<ApiConnectionStatus, string> = {
  not_configured: '未設定',
  key_saved_unverified: 'APIキー保存済み・未確認',
  checking: '接続確認中',
  connected: '実API接続成功',
  auth_error: '認証エラー',
  rate_limited: '利用制限',
  timeout: 'タイムアウト',
  network_error: '通信エラー',
  parse_error: '応答形式エラー',
  mock_fallback: 'モック応答中',
  disabled: '無効化中',
  test_not_implemented: '接続テスト未実装',
};

export const API_CONNECTION_DIAGNOSTICS = {
  screenTitle: 'API接続診断',
  screenSubtitle: 'キー保存と実接続を分けて確認します',
  testOne: '接続テスト',
  testAll: 'すべてテスト',
  checking: '接続確認中',
  editKey: 'キーを編集',
  deleteKey: 'キーを削除',
  lastChecked: '最終確認',
  lastSuccess: '最終成功',
  mockInUse: 'モック使用中',
  quota: 'quota',
  neverChecked: '未確認',
} as const;
