import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SelectableText } from './ui/SelectableText';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  /** Hide capability lists and future note (e.g. concierge sheet). */
  compact?: boolean;
  /** Concierge footer: emphasize personal-use analysis assist label */
  personalAssist?: boolean;
};

export function PlatformClarificationCard({ compact = false, personalAssist = false }: Props) {
  const { t } = useTranslation('settings');

  return (
    <Card style={styles.card}>
      <SelectableText style={styles.notice}>
        {personalAssist
          ? t('platformClarification.personalAssistTitle')
          : t('platformClarification.systemNotice')}
      </SelectableText>
      <SelectableText style={styles.body}>
        {t('platformClarification.analysisDisclaimer')}
      </SelectableText>
      <SelectableText style={styles.emphasis}>
        {t('platformClarification.orderExecutionNotice')}
      </SelectableText>
      {!compact ? (
        <>
          <SelectableText style={styles.section}>
            {t('platformClarification.supportedSection')}
          </SelectableText>
          {(t('platformClarification.supportedCapabilities', {
            returnObjects: true,
          }) as string[]).map((line) => (
            <SelectableText key={line} style={styles.bullet}>
              · {line}
            </SelectableText>
          ))}
          <SelectableText style={styles.section}>
            {t('platformClarification.notSupportedSection')}
          </SelectableText>
          {(t('platformClarification.notSupportedCapabilities', {
            returnObjects: true,
          }) as string[]).map((line) => (
            <SelectableText key={line} style={styles.bulletMuted}>
              · {line}
            </SelectableText>
          ))}
          <SelectableText style={styles.future}>
            {t('platformClarification.futureLiveTradingNote')}
          </SelectableText>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  notice: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.xs,
  },
  body: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  emphasis: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
    marginBottom: 4,
  },
  bullet: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  bulletMuted: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    opacity: 0.9,
  },
  future: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
  },
});
