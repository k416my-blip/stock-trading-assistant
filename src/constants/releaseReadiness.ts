export type ReadinessCheckId =
  | 'typecheck'
  | 'lint'
  | 'unit_tests'
  | 'integration_tests'
  | 'verify_scripts'
  | 'security_verify'
  | 'secrets_not_plaintext'
  | 'integrity_metadata'
  | 'error_boundary'
  | 'safe_boot'
  | 'diagnostics_export';

export type ReadinessCheckDefinition = {
  id: ReadinessCheckId;
  labelJa: string;
  descriptionJa: string;
  required: boolean;
};

export const PRODUCTION_READINESS_CHECKLIST: ReadinessCheckDefinition[] = [
  {
    id: 'typecheck',
    labelJa: 'TypeScript 型チェック',
    descriptionJa: 'npm run typecheck が成功すること',
    required: true,
  },
  {
    id: 'lint',
    labelJa: 'Lint',
    descriptionJa: 'npm run lint が成功すること',
    required: true,
  },
  {
    id: 'unit_tests',
    labelJa: 'ユニットテスト',
    descriptionJa: 'Vitest ユニットスイートが成功すること',
    required: true,
  },
  {
    id: 'integration_tests',
    labelJa: '統合テスト',
    descriptionJa: '回復・執行・永続化の統合テストが成功すること',
    required: true,
  },
  {
    id: 'verify_scripts',
    labelJa: '検証スクリプト',
    descriptionJa: 'verify:* スクリプトが CI で実行されること',
    required: true,
  },
  {
    id: 'security_verify',
    labelJa: 'セキュリティ検証',
    descriptionJa: 'verify:security が成功すること',
    required: true,
  },
  {
    id: 'secrets_not_plaintext',
    labelJa: 'シークレット保存',
    descriptionJa: 'APIキーが SecureStore 抽象層経由であること',
    required: true,
  },
  {
    id: 'integrity_metadata',
    labelJa: '整合性メタデータ',
    descriptionJa: 'アプリ状態・ジャーナルに整合性ハッシュがあること',
    required: true,
  },
  {
    id: 'error_boundary',
    labelJa: 'エラーバウンダリ',
    descriptionJa: 'クラッシュ時のフォールバック UI があること',
    required: true,
  },
  {
    id: 'safe_boot',
    labelJa: '安全起動',
    descriptionJa: '復旧ループ上限と安全モードがあること',
    required: true,
  },
  {
    id: 'diagnostics_export',
    labelJa: '診断エクスポート',
    descriptionJa: '構造化診断レポートをエクスポートできること',
    required: false,
  },
];
