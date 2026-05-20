import { StyleSheet } from 'react-native';
import { SelectableText } from './ui/SelectableText';
import { AI_CONCIERGE_PERSONAL_USE_TITLE_JA } from '../constants/aiConciergeLayout';
import {
  AI_ANALYSIS_SYSTEM_NOTICE_JA,
  ANALYSIS_SUPPORT_DISCLAIMER_JA,
  FUTURE_LIVE_TRADING_NOTE_JA,
  NOT_SUPPORTED_CAPABILITIES_JA,
  ORDER_EXECUTION_NOTICE_JA,
  SUPPORTED_CAPABILITIES_JA,
} from '../constants/platformClarification';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  /** Hide capability lists and future note (e.g. concierge sheet). */
  compact?: boolean;
  /** Concierge footer: emphasize personal-use analysis assist label */
  personalAssist?: boolean;
};

export function PlatformClarificationCard({ compact = false, personalAssist = false }: Props) {
  return (
    <Card style={styles.card}>
      <SelectableText style={styles.notice}>
        {personalAssist ? AI_CONCIERGE_PERSONAL_USE_TITLE_JA : AI_ANALYSIS_SYSTEM_NOTICE_JA}
      </SelectableText>
      <SelectableText style={styles.body}>{ANALYSIS_SUPPORT_DISCLAIMER_JA}</SelectableText>
      <SelectableText style={styles.emphasis}>{ORDER_EXECUTION_NOTICE_JA}</SelectableText>
      {!compact ? (
        <>
          <SelectableText style={styles.section}>対応（現バージョン）</SelectableText>
          {SUPPORTED_CAPABILITIES_JA.map((line) => (
            <SelectableText key={line} style={styles.bullet}>
              · {line}
            </SelectableText>
          ))}
          <SelectableText style={styles.section}>非対応</SelectableText>
          {NOT_SUPPORTED_CAPABILITIES_JA.map((line) => (
            <SelectableText key={line} style={styles.bulletMuted}>
              · {line}
            </SelectableText>
          ))}
          <SelectableText style={styles.future}>{FUTURE_LIVE_TRADING_NOTE_JA}</SelectableText>
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
