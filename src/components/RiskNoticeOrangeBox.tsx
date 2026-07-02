import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SelectableText } from './ui/SelectableText';
import { theme } from '../theme';

type Props = ViewProps;

/** Orange risk disclosure — Settings → detailed settings */
export function RiskNoticeOrangeBox({ style, ...props }: Props) {
  const { t } = useTranslation('settings');

  return (
    <View style={[styles.box, style]} {...props}>
      <SelectableText style={styles.title}>{t('riskNotice.title')}</SelectableText>
      <SelectableText style={styles.body}>{t('riskNotice.body')}</SelectableText>
      <SelectableText style={styles.body}>
        {t('platformClarification.analysisDisclaimer')}
      </SelectableText>
      <SelectableText style={styles.emphasis}>
        {t('platformClarification.orderExecutionNotice')}
      </SelectableText>
      <SelectableText style={styles.body}>{t('riskNotice.selfResponsibility')}</SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
  },
  title: {
    color: theme.colors.warning,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.sm,
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
    marginBottom: theme.spacing.xs,
  },
});
