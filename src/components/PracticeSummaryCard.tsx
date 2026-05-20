import { StyleSheet, Text } from 'react-native';
import { LabeledValue } from './TermHint';
import type { PracticeStats } from '../types';
import { theme } from '../theme';
import { Card } from './ui/Card';

type Props = { stats: PracticeStats };

import { safeNumber } from '../utils/safeNumeric';

function fmt(n: number, digits = 0) {
  const v = safeNumber(n, 0);
  return v.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function PracticeSummaryCard({ stats }: Props) {
  const retColor = stats.totalReturnPct >= 0 ? styles.profit : styles.loss;

  return (
    <Card style={styles.card}>
      <Text style={styles.section}>現金・評価</Text>
      <LabeledValue term="cashBalance" value={`RM${fmt(stats.cashBalanceMYR)}`} />
      <LabeledValue term="holdingsValue" value={`RM${fmt(stats.holdingsValueMYR)}`} />
      <LabeledValue term="portfolio" value={`RM${fmt(stats.portfolioValueMYR)}`} />

      <Text style={styles.section}>損益・成績</Text>
      <LabeledValue
        term="unrealizedPnL"
        value={`${stats.unrealizedPnLMYR >= 0 ? '+' : ''}RM${fmt(stats.unrealizedPnLMYR, 2)}`}
        valueStyle={stats.unrealizedPnLMYR >= 0 ? styles.profit : styles.loss}
      />
      <LabeledValue
        term="realizedPnL"
        value={`${stats.realizedPnLMYR >= 0 ? '+' : ''}RM${fmt(stats.realizedPnLMYR, 2)}`}
        valueStyle={stats.realizedPnLMYR >= 0 ? styles.profit : styles.loss}
      />
      <LabeledValue
        term="winRate"
        value={`${fmt(stats.winRatePct, 1)}%（${stats.winCount}勝 ${stats.lossCount}敗）`}
      />
      <LabeledValue
        term="returnPct"
        value={`${stats.totalReturnPct >= 0 ? '+' : ''}${fmt(stats.totalReturnPct, 2)}%`}
        valueStyle={retColor}
      />
      <LabeledValue term="virtualCapital" value={`RM${fmt(stats.virtualCapitalMYR)}`} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: '#7c3aed' },
  section: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    fontWeight: '600',
  },
  profit: { color: theme.colors.success },
  loss: { color: theme.colors.danger },
});
