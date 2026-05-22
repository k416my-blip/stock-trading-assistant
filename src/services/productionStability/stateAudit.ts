import type { StateAuditFinding } from '../../types/productionStability';

let duplicateStateWarnings = 0;

export function notePossibleDuplicateStateUpdate(label: string): void {
  duplicateStateWarnings += 1;
  verboseFinding(label);
}

function verboseFinding(label: string): void {
  /* counted in buildStateAuditFindings */
  void label;
}

export function buildStateAuditFindings(input: {
  proactiveRefreshCount?: number;
  contextProviderCount?: number;
}): StateAuditFinding[] {
  const findings: StateAuditFinding[] = [];

  if (duplicateStateWarnings > 3) {
    findings.push({
      id: 'dup-state',
      severity: 'warning',
      labelJa: 'state更新の連打',
      detailJa: `短時間に ${duplicateStateWarnings} 回の重複更新疑い — useMemo / 依存配列を確認`,
    });
  }

  if ((input.proactiveRefreshCount ?? 0) > 8) {
    findings.push({
      id: 'proactive-churn',
      severity: 'warning',
      labelJa: '自発刷新の頻度',
      detailJa: 'ProactiveConcierge の refresh が多い — 価格同期とバッチ化を検討',
    });
  }

  if ((input.contextProviderCount ?? 0) > 6) {
    findings.push({
      id: 'provider-depth',
      severity: 'info',
      labelJa: 'Providerネスト',
      detailJa: `${input.contextProviderCount} 層 — 不要な再レンダー源になり得ます`,
    });
  }

  return findings;
}

export function resetStateAuditForTest(): void {
  duplicateStateWarnings = 0;
}
