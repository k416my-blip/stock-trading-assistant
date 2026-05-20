import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioGovernanceReport } from '../types/governance';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: PortfolioGovernanceReport;
};

export function AllocationExplainPanel({ report }: Props) {
  const { explanation } = report;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>なぜこの配分？</Text>
      <Text style={styles.headline}>{explanation.headlineJa}</Text>
      <Text style={styles.why}>{explanation.whyJa}</Text>

      {explanation.perSymbol.map((row) => (
        <View key={row.symbol} style={styles.symbolBlock}>
          <Text style={styles.symbolTitle}>{row.summaryJa}</Text>
          {row.factors
            .filter((f) => Math.abs(f.contributionPct) >= 0.1)
            .map((f) => (
              <Text key={f.factorId} style={styles.factor}>
                {f.labelJa}: {f.contributionPct > 0 ? '+' : ''}
                {f.contributionPct}%
              </Text>
            ))}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  headline: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  why: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  symbolBlock: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  symbolTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  factor: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
});
