import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AiDailyCommentBundle } from '../../services/aiDailyCommentBuilder';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  comment: AiDailyCommentBundle;
  compact?: boolean;
};

export function AiDailyCommentPanel({ comment, compact = false }: Props) {
  const { t, i18n } = useTranslation('concierge');

  const compactBody =
    i18n.language !== 'ja' && comment.portfolioScore != null
      ? t('dailyComment.portfolioScoreLine', {
          score: comment.portfolioScore,
          count: comment.holdingCount ?? 0,
        })
      : comment.headlineJa;

  if (compact) {
    return (
      <View style={styles.compactWrap} testID="ai-daily-comment-compact">
        <Text style={styles.compactTitle}>{t('dailyCommentTitle')}</Text>
        <SelectableText style={styles.compactBody} numberOfLines={3}>
          {compactBody}
        </SelectableText>
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="ai-daily-comment-panel">
      {comment.todaySummaryJa ? (
        <>
          <Text style={styles.title}>{t('dailyComment.title')}</Text>
          <SelectableText style={styles.summary}>{comment.todaySummaryJa}</SelectableText>
        </>
      ) : null}

      {comment.topProfitLines.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t('dailyComment.topProfit')}</Text>
          {comment.topProfitLines.map((line, i) => (
            <SelectableText key={`profit-${i}`} style={styles.line}>
              · {line}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {comment.cautionLines.length > 0 ? (
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { color: theme.colors.danger }]}>
            {t('dailyComment.caution')}
          </Text>
          {comment.cautionLines.map((line, i) => (
            <SelectableText key={`caution-${i}`} style={styles.line}>
              · {line}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {comment.recommendedActions.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t('dailyComment.recommendedActions')}</Text>
          {comment.recommendedActions.map((line, i) => (
            <SelectableText key={`action-${i}`} style={styles.line}>
              · {line}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {comment.sections
        .filter((s) => s.kind !== 'daily_comment')
        .map((s, i) => (
          <View key={`sec-${s.kind}-${i}`} style={styles.block}>
            <Text style={styles.blockTitle}>{s.titleJa}</Text>
            <SelectableText style={styles.line}>{s.bodyJa}</SelectableText>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  compactWrap: {
    maxWidth: 220,
    marginRight: theme.spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  title: { fontWeight: '700', fontSize: theme.fontSize.md, color: theme.colors.primary, marginBottom: 6 },
  compactTitle: { fontSize: 10, fontWeight: '800', color: theme.colors.primary },
  compactBody: { fontSize: 11, color: theme.colors.text, marginTop: 2, lineHeight: 15 },
  summary: { fontSize: theme.fontSize.sm, color: theme.colors.text, lineHeight: 20, marginBottom: 8 },
  block: { marginTop: theme.spacing.xs },
  blockTitle: { fontWeight: '600', fontSize: theme.fontSize.sm, color: theme.colors.text, marginBottom: 4 },
  line: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, lineHeight: 18, marginBottom: 2 },
});
