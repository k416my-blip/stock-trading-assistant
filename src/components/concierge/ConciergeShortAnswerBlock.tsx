import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ConciergeShortAnswer } from '../../types/conciergeUx';
import { containsJapaneseScript, isJaAppLocale } from '../../utils/localeScript';
import { listKey } from '../../utils/reactKeyDiagnostics';
import { theme } from '../../theme';

type Props = {
  answer: ConciergeShortAnswer;
};

function displayText(
  ja: string,
  fallback: string,
): string {
  if (isJaAppLocale()) return ja;
  if (containsJapaneseScript(ja)) return fallback;
  return ja;
}

export function ConciergeShortAnswerBlock({ answer }: Props) {
  const { t } = useTranslation('concierge');

  return (
    <View style={styles.wrap} testID="concierge-ux-short-answer">
      <Text selectable style={styles.conclusion}>
        <Text selectable style={styles.key}>
          {t('shortAnswer.conclusion')}:{' '}
        </Text>
        {displayText(answer.conclusionJa, t('shortAnswer.fallbackConclusion'))}
      </Text>
      {answer.factsJa?.map((fact, i) => (
        <Text key={listKey('fact', i, fact.labelJa)} selectable style={styles.fact}>
          <Text selectable style={styles.key}>
            {displayText(fact.labelJa, fact.labelJa)}:{' '}
          </Text>
          {displayText(fact.valueJa, fact.valueJa)}
        </Text>
      ))}
      {answer.reasonsJa.length > 0 ? (
        <Text selectable style={styles.sectionLabel}>
          {t('shortAnswer.reasons')}
        </Text>
      ) : null}
      {answer.reasonsJa.map((r, i) => (
        <Text key={listKey('reason', i, r)} selectable style={styles.reason}>
          {i + 1}. {displayText(r, t('shortAnswer.fallbackReason'))}
        </Text>
      ))}
      {answer.riskJa ? (
        <Text selectable style={styles.risk}>
          <Text selectable style={styles.key}>
            {t('shortAnswer.risk')}:{' '}
          </Text>
          {displayText(answer.riskJa, answer.riskJa)}
        </Text>
      ) : null}
      {answer.watchJa ? (
        <Text selectable style={styles.watch}>
          <Text selectable style={styles.key}>
            {t('shortAnswer.watch')}:{' '}
          </Text>
          {displayText(answer.watchJa, answer.watchJa)}
        </Text>
      ) : null}
      <Text selectable style={styles.action}>
        <Text selectable style={styles.key}>
          {t('shortAnswer.action')}:{' '}
        </Text>
        {displayText(answer.actionJa, t('shortAnswer.fallbackAction'))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
  },
  key: { fontWeight: '700', color: theme.colors.text },
  sectionLabel: {
    fontWeight: '700',
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 6,
    marginBottom: 2,
  },
  conclusion: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 22, marginBottom: 6 },
  fact: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20, marginBottom: 2 },
  reason: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20, marginBottom: 2 },
  risk: { color: theme.colors.danger, fontSize: theme.fontSize.sm, lineHeight: 20, marginTop: 4 },
  watch: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20, marginTop: 2 },
  action: { color: theme.colors.primary, fontSize: theme.fontSize.sm, lineHeight: 20, marginTop: 4 },
});
