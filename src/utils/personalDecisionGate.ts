import { Alert } from 'react-native';
import { PERSONAL_DECISION_GATE } from '../constants/personalUse';
import type { ExecutionMarketDataAssessment } from '../services/executionSafetyGate';

export function buildStalePriceWarningLine(assessment: ExecutionMarketDataAssessment): string {
  if (assessment.blockedByStale) {
    return `${PERSONAL_DECISION_GATE.stalePricePrefix} 古いデータのため執行不可 — 株価更新または手動価格を入力してください。`;
  }
  if (assessment.quoteAgeSeconds != null && assessment.quoteAgeSeconds > 60) {
    return `${PERSONAL_DECISION_GATE.stalePricePrefix} 最終更新から約${assessment.quoteAgeSeconds}秒経過。`;
  }
  return 'データ鮮度: この確認時点では問題なし（証券会社の画面でも必ず確認してください）。';
}

/**
 * 練習取引前の追加確認 — 自動執行なし
 */
export function confirmPersonalPracticeTrade(
  assessment: ExecutionMarketDataAssessment,
  onProceed: () => void,
): void {
  const body = [
    PERSONAL_DECISION_GATE.responsibility,
    PERSONAL_DECISION_GATE.noAutoExecution,
    '',
    buildStalePriceWarningLine(assessment),
  ].join('\n');

  Alert.alert(PERSONAL_DECISION_GATE.title, body, [
    { text: PERSONAL_DECISION_GATE.cancel, style: 'cancel' },
    { text: PERSONAL_DECISION_GATE.confirm, onPress: onProceed },
  ]);
}
