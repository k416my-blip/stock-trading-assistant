import { isDev } from '../utils/isDev';

export type EnvironmentIssue = {
  code: string;
  severity: 'warning' | 'critical';
  messageJa: string;
};

export type EnvironmentValidationResult = {
  valid: boolean;
  productionBlocked: boolean;
  issues: EnvironmentIssue[];
};

export type EnvironmentValidationOptions = {
  /** 本番相当起動時に API キー必須とするか */
  requireMarketDataApiKey?: boolean;
  hasMarketDataApiKey?: boolean;
  bootMode?: 'normal' | 'safe';
  recoveryAttempts?: number;
  maxRecoveryAttempts?: number;
};

/** 起動前の環境・設定検証（本番ブロック判定） */
export function validateEnvironmentForBoot(
  options: EnvironmentValidationOptions = {},
): EnvironmentValidationResult {
  const issues: EnvironmentIssue[] = [];
  const maxAttempts = options.maxRecoveryAttempts ?? 3;
  const attempts = options.recoveryAttempts ?? 0;

  if (options.bootMode === 'safe') {
    issues.push({
      code: 'safe_boot_active',
      severity: 'warning',
      messageJa: '安全モードで起動しています。データの復旧を確認してください。',
    });
  }

  if (attempts >= maxAttempts) {
    issues.push({
      code: 'recovery_loop_exhausted',
      severity: 'critical',
      messageJa: '復旧試行の上限に達しました。安全モードでの起動を推奨します。',
    });
  }

  if (options.requireMarketDataApiKey && !options.hasMarketDataApiKey) {
    issues.push({
      code: 'missing_market_data_api_key',
      severity: isDev ? 'warning' : 'critical',
      messageJa: 'Twelve Data APIキーが未設定です。株価の自動取得は利用できません。',
    });
  }

  const hasCritical = issues.some((i) => i.severity === 'critical');
  const productionBlocked = hasCritical && !isDev;

  return {
    valid: issues.length === 0,
    productionBlocked,
    issues,
  };
}

export function getRecoveryRecommendations(
  issues: EnvironmentIssue[],
  securityWarnings: string[] = [],
): string[] {
  const recs: string[] = [];

  if (issues.some((i) => i.code === 'safe_boot_active')) {
    recs.push('設定 → セキュリティで保存データの警告を確認してください。');
    recs.push('問題が続く場合は「ローカル機密データをすべて削除」後、APIキーを再設定してください。');
  }
  if (issues.some((i) => i.code === 'recovery_loop_exhausted')) {
    recs.push('アプリを再起動し、それでも失敗する場合はデータのバックアップ復元を検討してください。');
  }
  if (issues.some((i) => i.code === 'missing_market_data_api_key')) {
    recs.push('設定 → APIキー設定で Twelve Data キーを入力してください。');
  }
  for (const w of securityWarnings) {
    if (w.includes('チェックサム') || w.includes('整合性')) {
      recs.push('保存データの整合性に問題があります。執行照合画面でジャーナルを確認してください。');
      break;
    }
  }
  if (recs.length === 0 && securityWarnings.length > 0) {
    recs.push('設定 → セキュリティで警告内容を確認してください。');
  }

  return [...new Set(recs)];
}
