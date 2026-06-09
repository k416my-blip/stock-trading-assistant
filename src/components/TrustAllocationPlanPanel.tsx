import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  TRUST_APPROVE_BUTTON_LABEL_JA,
  TRUST_COLLAPSE_ALLOCATION_LABEL_JA,
  TRUST_EXPAND_ALLOCATION_LABEL_JA,
  TRUST_RECOMMENDED_AMOUNT_LABEL_JA,
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

export function TrustAllocationPlanPanel({ presentation, onProceed, proceeding = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={styles.card}>
      <Text
        style={[
          styles.approval,
          presentation.committeeApproved ? styles.approvalOk : styles.approvalPending,
        ]}
      >
        {presentation.committeeApprovalLabel}
      </Text>

      <Text style={styles.sectionLabel}>今月の方針</Text>
      <Text style={styles.profileType}>{presentation.profileTypeLabel}</Text>

      <Text style={styles.sectionLabel}>{TRUST_RECOMMENDED_AMOUNT_LABEL_JA}</Text>
      <Text style={styles.amount}>{presentation.totalAmountLabel}</Text>

      <Text style={styles.sectionLabel}>想定リスク</Text>
      <Text style={[styles.risk, { color: riskColor(presentation.expectedRiskLevel) }]}>
        {presentation.expectedRiskLevel}
      </Text>

      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.expandBtn, pressed && styles.expandPressed]}
        accessibilityRole="button"
      >
        <Text style={styles.expandLabel}>
          {expanded ? TRUST_COLLAPSE_ALLOCATION_LABEL_JA : TRUST_EXPAND_ALLOCATION_LABEL_JA}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.allocationBox}>
          <Text style={styles.sectionLabel}>銘柄配分</Text>
          {presentation.allocationLines.map((line) => (
            <Text key={line.name} style={styles.allocationLine}>
              {line.name} {line.allocationPctLabel}
            </Text>
          ))}
        </View>
      ) : null}

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
  },
  approval: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
  },
  approvalOk: {
    color: theme.colors.success,
  },
  approvalPending: {
    color: theme.colors.warning,
  },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
    letterSpacing: 0.5,
  },
  profileType: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    marginTop: 4,
  },
  amount: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: '800',
    marginTop: 4,
  },
  risk: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    marginTop: 4,
  },
  expandBtn: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  },
  expandPressed: { opacity: 0.85 },
  expandLabel: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  allocationBox: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  allocationLine: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    marginTop: 4,
    lineHeight: 22,
  },
  action: {
    marginTop: theme.spacing.lg,
  },
});
