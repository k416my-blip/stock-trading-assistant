import { DEV_LIGHTWEIGHT_MODE } from '../constants/aiConciergeDevFlags';
import type { BootMode } from './safeBoot';
import { hasDegradedDiagnostics } from './structuredDiagnostics';

export type DegradedBannerTone = 'info' | 'warning';

export type DegradedBannerContent = {
  visible: boolean;
  tone: DegradedBannerTone;
  headline: string;
  hint: string;
  reasons: string[];
  showDiagnosticsLink: boolean;
};

type Input = {
  bootMode: BootMode;
  securityWarnings: string[];
  recoveryRecommendations: string[];
  readOnlyMode: boolean;
  operationalDegraded: boolean;
};

export type OperationalDegradedInput = Omit<Input, 'operationalDegraded'> & {
  /** critical のみ劣化モードにする（warning のみでは入らない） */
  tamperSeverity?: 'none' | 'warning' | 'critical';
};

/** 本番相当の劣化（安全モード・read-only・重大診断・重大タンパーなど） */
export function isOperationalDegradedMode(input: OperationalDegradedInput): boolean {
  return (
    input.bootMode === 'safe' ||
    input.tamperSeverity === 'critical' ||
    input.readOnlyMode ||
    (!(typeof __DEV__ !== 'undefined' && __DEV__) && hasDegradedDiagnostics())
  );
}

export function buildDegradedModeLogPayload(input: OperationalDegradedInput & { operationalDegraded: boolean }): {
  operationalDegraded: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (input.bootMode === 'safe') reasons.push('safe_boot');
  if (input.tamperSeverity === 'critical') reasons.push('tamper_critical');
  if (input.readOnlyMode) reasons.push('read_only');
  if (input.securityWarnings.length > 0) {
    reasons.push(`security_warnings:${input.securityWarnings.length}`);
  }
  if (input.recoveryRecommendations.length > 0) {
    reasons.push(`recovery_recommendations:${input.recoveryRecommendations.length}`);
  }
  if (!(typeof __DEV__ !== 'undefined' && __DEV__) && hasDegradedDiagnostics()) {
    reasons.push('degraded_diagnostics');
  }
  return { operationalDegraded: input.operationalDegraded, reasons };
}

export function isDevLightweightNotice(input: {
  operationalDegraded: boolean;
}): boolean {
  return (
    DEV_LIGHTWEIGHT_MODE &&
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    !input.operationalDegraded &&
    hasDegradedDiagnostics()
  );
}

export function buildDegradedBannerContent(input: Input): DegradedBannerContent {
  const devNotice = isDevLightweightNotice({ operationalDegraded: input.operationalDegraded });

  if (devNotice) {
    return {
      visible: true,
      tone: 'info',
      headline: '開発モードのため一部機能を軽量化中',
      hint: '本番ビルドでは表示されません。株価更新・保有管理は利用できます。',
      reasons: ['診断ログに開発用のエラーが記録されています（動作制限ではありません）'],
      showDiagnosticsLink: true,
    };
  }

  if (!input.operationalDegraded) {
    if (input.securityWarnings.length > 0) {
      return {
        visible: true,
        tone: 'info',
        headline: '起動時の注意',
        hint: 'オフラインまたはデータ保護の警告があります。タップして詳細を確認できます。',
        reasons: input.securityWarnings.slice(0, 3),
        showDiagnosticsLink: true,
      };
    }
    return {
      visible: false,
      tone: 'warning',
      headline: '',
      hint: '',
      reasons: [],
      showDiagnosticsLink: false,
    };
  }

  const reasons: string[] = [];
  if (input.readOnlyMode) {
    reasons.push('読み取り専用モード — 編集・売買・インポートは無効です');
  }
  if (input.bootMode === 'safe') {
    reasons.push('安全起動モード — 一部の AI・自動更新を制限しています');
  }
  for (const w of input.securityWarnings.slice(0, 2)) {
    reasons.push(w);
  }
  if (reasons.length === 0 && input.recoveryRecommendations[0]) {
    reasons.push(input.recoveryRecommendations[0]);
  }
  if (reasons.length === 0) {
    reasons.push('診断ログに警告またはエラーがあります');
  }

  const headline =
    input.readOnlyMode
      ? '読み取り専用モード'
      : input.bootMode === 'safe'
        ? '安全モード — 一部機能が制限されています'
        : input.securityWarnings.length > 0
          ? 'データ保護の警告があります'
          : 'システムの注意が必要です';

  return {
    visible: true,
    tone: 'warning',
    headline,
    hint: 'タップして起動診断の詳細を確認できます',
    reasons,
    showDiagnosticsLink: true,
  };
}
