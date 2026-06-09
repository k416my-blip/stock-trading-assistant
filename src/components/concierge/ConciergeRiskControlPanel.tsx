import type { ConciergeAnalysisDiagnostics } from '../../types/conciergeEvidence';
import type { ConciergeRiskControlBundle } from '../../types/conciergeRiskControl';
import { listKey } from '../../utils/reactKeyDiagnostics';
import { ANALYSIS_BLOCKED_LABEL_JA } from '../../constants/aiRiskControl';
import { StyleSheet, Text, View } from 'react-native';
import { ConciergeAnalysisDiagnosticsView } from './ConciergeAnalysisDiagnosticsView';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  risk: ConciergeRiskControlBundle;
  diagnostics?: ConciergeAnalysisDiagnostics;
};

export function ConciergeRiskControlPanel({ risk, diagnostics }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>リスク統制・データ品質</Text>

      <View style={styles.scoreRow}>
        <Text style={styles.chip}>データ品質 {risk.overallDataQualityScore}</Text>
        <Text style={styles.chip}>確信度 {risk.overallConfidencePct}%</Text>
      </View>

      {!risk.allowSpeculativeAi && risk.analysisBlockedJa ? (
        <Text style={styles.blocked}>{risk.analysisBlockedJa}</Text>
      ) : null}

      {diagnostics ? <ConciergeAnalysisDiagnosticsView diagnostics={diagnostics} /> : null}

      {!risk.allowActionRecommendations ? (
        <Text style={styles.warn}>行動提案は抑制中（確信度ゲート / クロス検証不足）</Text>
      ) : null}

      {risk.globalStaleWarningJa ? (
        <Text style={styles.stale}>{risk.globalStaleWarningJa}</Text>
      ) : null}

      {risk.apiIsolation.isolationNoteJa ? (
        <Text style={styles.muted}>{risk.apiIsolation.isolationNoteJa}</Text>
      ) : null}

      {risk.burstSuppressActive ? (
        <Text style={styles.muted}>短時間の通知が多いため、一部の通知を抑制しています</Text>
      ) : null}

      <Text style={styles.muted}>{risk.deterministicModeHintJa}</Text>

      {risk.symbols[0] ? (
        <>
          <Text style={styles.section}>ソース信頼度</Text>
          {risk.symbols[0].sourceBreakdown.map((s, index) => (
            <Text key={listKey('source-tier', index, `${s.tier}-${s.labelJa}`)} style={styles.line}>
              {s.labelJa}（重み {s.weight}）
            </Text>
          ))}

          {risk.symbols[0].rumorLabelsJa.length > 0 ? (
            <>
              <Text style={styles.section}>未確認情報</Text>
              {risk.symbols[0].rumorLabelsJa.map((r, index) => (
                <Text key={listKey('rumor', index, r)} style={styles.rumor}>
                  {r}
                </Text>
              ))}
            </>
          ) : null}

          <Text style={styles.section}>クロス検証</Text>
          <SelectableText style={styles.line}>
            {risk.symbols[0].crossValidation.summaryJa}
          </SelectableText>

          {risk.symbols[0].freshness.quote ? (
            <Text style={styles.line}>
              株価: {risk.symbols[0].freshness.quote.ageSeconds}s前
              {risk.symbols[0].freshness.quote.staleWarningJa
                ? ` — ${risk.symbols[0].freshness.quote.staleWarningJa}`
                : ''}
            </Text>
          ) : null}
          {risk.symbols[0].freshness.news ? (
            <Text style={styles.line}>
              ニュース: {risk.symbols[0].freshness.news.ageSeconds}s前
              {risk.symbols[0].freshness.news.staleWarningJa
                ? ` — ${risk.symbols[0].freshness.news.staleWarningJa}`
                : ''}
            </Text>
          ) : null}
        </>
      ) : null}

      <Text style={styles.footer}>
        推測禁止閾値未満の場合は「{ANALYSIS_BLOCKED_LABEL_JA}」のみ許可
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  title: { fontSize: 12, fontWeight: '700', color: theme.colors.warning },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    fontSize: 11,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  blocked: { color: theme.colors.warning, fontSize: 12, marginTop: 6, fontWeight: '600' },
  warn: { color: theme.colors.warning, fontSize: 11, marginTop: 4 },
  stale: { color: theme.colors.warning, fontSize: 11, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 4 },
  section: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 8 },
  line: { color: theme.colors.text, fontSize: 11, marginTop: 2 },
  rumor: { color: theme.colors.warning, fontSize: 11, marginTop: 2 },
  footer: { color: theme.colors.textMuted, fontSize: 10, marginTop: 8 },
});
