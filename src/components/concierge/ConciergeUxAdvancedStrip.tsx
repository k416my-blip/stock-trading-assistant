import { StyleSheet, Text, View } from 'react-native';
import type { ApiCostDashboard } from '../../types/performanceCost';
import type { ConciergeEvidenceBundle } from '../../types/conciergeEvidence';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  evidence: ConciergeEvidenceBundle | null;
  costDashboard: ApiCostDashboard;
};

export function ConciergeUxAdvancedStrip({ evidence, costDashboard }: Props) {
  const sym = evidence?.symbols[0];
  const x = sym?.xSentiment;
  return (
    <View style={styles.wrap} testID="concierge-ux-advanced-strip">
      <Text style={styles.title}>上級者向けメトリクス</Text>
      {sym ? (
        <>
          <SelectableText style={styles.line}>
            raw sentiment — bear {x?.bearishPct ?? '—'}% · bull {x?.bullishPct ?? '—'}% · panic{' '}
            {x?.panicPct ?? '—'}%
          </SelectableText>
          <SelectableText style={styles.line}>
            volatility proxy — 日中 {sym.intradayChangePct != null ? `${sym.intradayChangePct.toFixed(2)}%` : '—'}
            {sym.volumeSurgeRatio != null ? ` · 出来高 ${sym.volumeSurgeRatio.toFixed(1)}x` : ''}
          </SelectableText>
        </>
      ) : (
        <SelectableText style={styles.line}>evidence: 未取得</SelectableText>
      )}
      <SelectableText style={styles.line}>
        token cost (24h est.) — OpenAI ~${costDashboard.openAiEstimatedCostUsd.toFixed(3)} (
        {costDashboard.openAiEstimatedTokens} tok) · X {costDashboard.xApiCalls} calls · News{' '}
        {costDashboard.newsApiCalls} calls
      </SelectableText>
      <SelectableText style={styles.muted}>{costDashboard.summaryJa}</SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600', marginBottom: 4 },
  line: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginBottom: 2 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
