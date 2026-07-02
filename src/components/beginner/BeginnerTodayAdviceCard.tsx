import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { BeginnerTodayAdviceLine } from '../../services/beginner/beginnerTodayAdviceBuilder';
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

function adviceLineKey(line: BeginnerTodayAdviceLine): string {
  if (line.judgment === 'hold') {
    return line.isHeld ? 'todayAiAdvice.lineHoldHeld' : 'todayAiAdvice.lineHold';
  }
  if (line.judgment === 'monitor') return 'todayAiAdvice.lineMonitor';
  if (line.judgment === 'buy_candidate') return 'todayAiAdvice.lineBuyCandidate';
  return 'todayAiAdvice.linePass';
}

export function BeginnerTodayAdviceCard({ data, onPressDetail }: Props) {
  const { t } = useTranslation('home');

  if (data.loading) {
    return (
      <Card style={styles.card} testID="beginner-today-advice-card">
        <Text style={styles.title}>{t('todayAiAdvice.title')}</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('todayAiAdvice.loading')}</Text>
        </View>
      </Card>
    );
  }

  const newPurchaseSummary = data.hasNewPurchase
    ? t('todayAiAdvice.newPurchaseAvailable')
    : t('todayAiAdvice.noNewPurchase');

  return (
    <Card style={styles.card} testID="beginner-today-advice-card">
      <Text style={styles.title}>{t('todayAiAdvice.title')}</Text>
      <Text style={styles.date}>{data.dateJa}</Text>

      {data.lines.length === 0 ? (
        <>
          <Text style={styles.emptyLine}>{t('todayAiAdvice.empty')}</Text>
          <Text style={styles.emptyHint}>{t('todayAiAdvice.emptyHint')}</Text>
        </>
      ) : (
        data.lines.map((line) => (
          <Text key={line.symbol} style={styles.line}>
            {bulletChar(line.bullet)} {t(adviceLineKey(line), { name: line.nameJa })}
          </Text>
        ))
      )}

      {data.lines.length > 0 ? (
        <Text style={styles.newPurchase}>— {newPurchaseSummary}</Text>
      ) : null}

      {data.lines.length > 0 ? (
        <Text style={styles.footer}>{t('todayAiAdvice.footer')}</Text>
      ) : null}

      {onPressDetail ? (
        <Button
          label={`${t('todayAiAdvice.cta')} →`}
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
  emptyHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
});
