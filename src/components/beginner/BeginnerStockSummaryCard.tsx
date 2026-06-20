import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../ui/Card';
import type { BeginnerStockSummary } from '../../services/beginner/beginnerMaterialSummaryBuilder';
import { theme } from '../../theme';

type Props = {
  summary: BeginnerStockSummary;
};

function trustBarColor(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return theme.colors.success;
  if (level === 'medium') return theme.colors.warning;
  return theme.colors.textMuted;
}

export function BeginnerStockSummaryCard({ summary }: Props) {
  return (
    <Card style={styles.card} testID={`beginner-stock-summary-${summary.symbol}`}>
      <Text style={styles.symbol}>
        {summary.symbol}  {summary.nameJa}
      </Text>

      <View style={styles.judgmentRow}>
        <Text style={styles.judgmentLabel}>AI判定: {summary.judgmentLabelJa}</Text>
        <Text style={styles.judgmentLabel}>AI信頼度: {summary.trustLabelJa}</Text>
      </View>

      <Text style={styles.trustExplain}>{summary.trustExplainJa}</Text>

      <View style={styles.trustBarTrack}>
        <View
          style={[
            styles.trustBarFill,
            {
              width: `${Math.round(summary.trustBarFillRatio * 100)}%`,
              backgroundColor: trustBarColor(summary.trustLevel),
            },
          ]}
        />
      </View>

      <Text style={styles.sectionTitle}>─ なぜそう判断したか ─</Text>
      {summary.reasonsJa.map((line, i) => (
        <Text key={`reason-${i}`} style={styles.reasonLine}>
          {i + 1}. {line}
        </Text>
      ))}

      <Text style={styles.sectionTitle}>─ 気をつける点 ─</Text>
      {summary.watchpointsJa.map((line, i) => (
        <Text key={`watch-${i}`} style={styles.watchLine}>
          ・{line}
        </Text>
      ))}

      <Text style={styles.sectionTitle}>─ 次にすること ─</Text>
      <Text style={styles.nextAction}>{summary.nextActionJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  symbol: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  judgmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  judgmentLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  trustExplain: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  trustBarTrack: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  trustBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
  reasonLine: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
    paddingLeft: theme.spacing.xs,
  },
  watchLine: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
    paddingLeft: theme.spacing.xs,
  },
  nextAction: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
    paddingLeft: theme.spacing.xs,
  },
});
