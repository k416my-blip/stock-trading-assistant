import { StyleSheet, View, type ViewProps } from 'react-native';
import { AI_CONCIERGE_RISK_NOTICE_BODY_JA, AI_CONCIERGE_RISK_NOTICE_TITLE_JA } from '../constants/aiConciergeLayout';
import {
  ANALYSIS_SUPPORT_DISCLAIMER_JA,
  ORDER_EXECUTION_NOTICE_JA,
} from '../constants/platformClarification';
import { SelectableText } from './ui/SelectableText';
import { theme } from '../theme';

type Props = ViewProps;

/** Orange risk disclosure — Settings → 詳細設定 */
export function RiskNoticeOrangeBox({ style, ...props }: Props) {
  return (
    <View style={[styles.box, style]} {...props}>
      <SelectableText style={styles.title}>{AI_CONCIERGE_RISK_NOTICE_TITLE_JA}</SelectableText>
      <SelectableText style={styles.body}>{AI_CONCIERGE_RISK_NOTICE_BODY_JA}</SelectableText>
      <SelectableText style={styles.body}>{ANALYSIS_SUPPORT_DISCLAIMER_JA}</SelectableText>
      <SelectableText style={styles.emphasis}>{ORDER_EXECUTION_NOTICE_JA}</SelectableText>
      <SelectableText style={styles.body}>
        投資判断は自己責任です。利益を保証するものではありません。
      </SelectableText>
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
