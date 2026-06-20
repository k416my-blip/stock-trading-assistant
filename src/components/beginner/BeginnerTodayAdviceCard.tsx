import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MATERIAL_CTA_FROM_HOME_JA } from '../../constants/beginnerTabLabelsJa';
import type { BeginnerTodayAdviceCardData } from '../../services/beginner/beginnerTodayAdviceBuilder';
import { theme } from '../../theme';

type Props = {
  data: BeginnerTodayAdviceCardData;
  onPressDetail?: () => void;
};

function bulletChar(bullet: 'filled' | 'open' | 'dash'): string {
  if (bullet === 'filled') return '●';
  if (bullet === 'open') return '○';
  return '—';
}

export function BeginnerTodayAdviceCard({ data, onPressDetail }: Props) {
  if (data.loading) {
    return (
      <Card style={styles.card} testID="beginner-today-advice-card">
        <Text style={styles.title}>今日のAIアドバイス</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>AIアドバイスを取得中…</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card} testID="beginner-today-advice-card">
      <Text style={styles.title}>今日のAIアドバイス</Text>
      <Text style={styles.date}>{data.dateJa}</Text>

      {data.lines.length === 0 ? (
        <Text style={styles.emptyLine}>保有銘柄や材料データがまだありません</Text>
      ) : (
        data.lines.map((line) => (
          <Text key={line.symbol} style={styles.line}>
            {bulletChar(line.bullet)} {line.lineJa}
          </Text>
        ))
      )}

      <Text style={styles.newPurchase}>
        — {data.newPurchaseSummaryJa}
      </Text>

      <Text style={styles.footer}>{data.footerJa}</Text>

      {onPressDetail ? (
        <Button
          label={`${MATERIAL_CTA_FROM_HOME_JA} →`}
          onPress={onPressDetail}
          variant="ghost"
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  date: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  line: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 24,
  },
  newPurchase: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.xs,
  },
  footer: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
  },
  emptyLine: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
});
