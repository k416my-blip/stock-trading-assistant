import { StyleSheet, Text, View } from 'react-native';
import { CONCIERGE_RISK_COLOR_HEX } from '../../constants/conciergeUx';
import type { ConciergeAiSummaryCard as SummaryModel } from '../../types/conciergeUx';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  summary: SummaryModel;
};

export function ConciergeAiSummaryCard({ summary }: Props) {
  const accent = CONCIERGE_RISK_COLOR_HEX[summary.riskColor];
  return (
    <View
      style={[styles.card, { borderLeftColor: accent }]}
      testID="concierge-ux-summary-card"
    >
      <View style={styles.riskRow}>
        <View style={[styles.riskDot, { backgroundColor: accent }]} />
        <Text style={[styles.riskLabel, { color: accent }]}>{summary.riskLabelJa}</Text>
      </View>
      <SelectableText style={styles.line}>{summary.situationLineJa}</SelectableText>
      <SelectableText style={styles.line}>{summary.dangerLineJa}</SelectableText>
      <SelectableText style={[styles.line, styles.judgment]}>{summary.judgmentLineJa}</SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    borderLeftWidth: 4,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: 6,
  },
  riskDot: { width: 10, height: 10, borderRadius: 5 },
  riskLabel: { fontSize: theme.fontSize.sm, fontWeight: '700' },
  line: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
    marginBottom: 4,
  },
  judgment: { fontWeight: '600', marginBottom: 0 },
});
