import { StyleSheet, Text, View } from 'react-native';
import {
  TRUST_APPROVE_BUTTON_LABEL_JA,
  TRUST_MONTHLY_AMOUNT_LABEL_JA,
} from '../constants/trustDisplay';
import type { TrustPlanPresentation } from '../services/trustRecommendationSummary';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  presentation: TrustPlanPresentation;
  onProceed: () => void;
  proceeding?: boolean;
};

function riskColor(level: TrustPlanPresentation['expectedRiskLevel']): string {
  if (level === '低') return theme.colors.success;
  if (level === '中') return theme.colors.warning;
  return theme.colors.danger;
}

/** ホーム用コンパクト承認サマリー（銘柄比率は非表示） */
export function TrustHomeApprovalCard({ presentation, onProceed, proceeding = false }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.approval}>{presentation.committeeApprovalLabel}</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>方針</Text>
          <Text style={styles.profile}>{presentation.profileTypeLabel}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>{TRUST_MONTHLY_AMOUNT_LABEL_JA}</Text>
          <Text style={styles.amount}>{presentation.totalAmountLabel}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>想定リスク</Text>
          <Text style={[styles.risk, { color: riskColor(presentation.expectedRiskLevel) }]}>
            {presentation.expectedRiskLevel}
          </Text>
        </View>
      </View>
      <View style={styles.action}>
        <Button
          label={proceeding ? '処理中…' : TRUST_APPROVE_BUTTON_LABEL_JA}
          onPress={onProceed}
          disabled={proceeding}
          size="lg"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: theme.colors.primary,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  approval: {
    color: theme.colors.success,
    fontSize: theme.fontSize.md,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  col: {
    flex: 1,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
  },
  profile: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    marginTop: 4,
  },
  amount: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    marginTop: 4,
  },
  risk: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    marginTop: 4,
  },
  action: {
    marginTop: theme.spacing.lg,
  },
});
