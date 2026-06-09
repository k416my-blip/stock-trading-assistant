import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  TRUST_CONCIERGE_BADGE_JA,
  TRUST_HOME_SUBTITLE_JA,
  TRUST_MONTHLY_ONE_LINER_LABEL_JA,
} from '../constants/trustDisplay';
import { buildTrustHomeBriefing } from '../services/trustRecommendationSummary';
import { buildTrustMonthlyOneLinerJa } from '../services/trustMonthlyOneLiner';
import { sanitizeTrustDisplayText } from '../services/trustDisplaySanitizer';
import { loadTrustPlanSnapshot } from '../services/trustPlanPreviewStorage';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  fallbackDepositMYR?: number;
  monthlyOneLinerJa?: string;
};

const PENDING_ONE_LINER_JA =
  '今月の市場分析を進めています。配分案が完成すると、ここにお伝えします。';

export function TrustConciergeHomeCard({ fallbackDepositMYR = 1000, monthlyOneLinerJa }: Props) {
  const [briefing, setBriefing] = useState(() =>
    buildTrustHomeBriefing({ hasPlan: false, depositMYR: fallbackDepositMYR }),
  );
  const [oneLiner, setOneLiner] = useState(monthlyOneLinerJa ?? PENDING_ONE_LINER_JA);

  useEffect(() => {
    if (monthlyOneLinerJa) {
      setOneLiner(monthlyOneLinerJa);
    }
  }, [monthlyOneLinerJa]);

  useEffect(() => {
    void (async () => {
      const snapshot = await loadTrustPlanSnapshot();
      if (!snapshot) {
        setBriefing(buildTrustHomeBriefing({ hasPlan: false, depositMYR: fallbackDepositMYR }));
        if (!monthlyOneLinerJa) setOneLiner(PENDING_ONE_LINER_JA);
        return;
      }
      setBriefing(
        buildTrustHomeBriefing({
          hasPlan: true,
          profileTypeLabel: snapshot.profileTypeLabel,
          committeeApproved: snapshot.committeeApproved,
          depositMYR: snapshot.depositMYR,
        }),
      );
      setOneLiner(
        sanitizeTrustDisplayText(
          monthlyOneLinerJa ??
            snapshot.monthlyOneLinerJa ??
            buildTrustMonthlyOneLinerJa({
              approvalReasonsJa: [],
              profileTypeLabel: snapshot.profileTypeLabel,
              expectedRiskLevel: snapshot.expectedRiskLevel,
            }),
        ),
      );
    })();
  }, [fallbackDepositMYR, monthlyOneLinerJa]);

  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <Text style={styles.badge}>{TRUST_CONCIERGE_BADGE_JA}</Text>
        <Text style={styles.subtitle}>{TRUST_HOME_SUBTITLE_JA}</Text>
        {briefing.lines.map((line, index) => (
          <Text key={`brief-${index}`} style={styles.line}>
            {line}
          </Text>
        ))}
        <View style={styles.oneLinerBox}>
          <Text style={styles.oneLinerLabel}>{TRUST_MONTHLY_ONE_LINER_LABEL_JA}</Text>
          <Text style={styles.oneLinerText}>{oneLiner}</Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.md,
  },
  card: {
    borderColor: theme.colors.primary,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceElevated,
  },
  badge: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  line: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    lineHeight: 28,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  oneLinerBox: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  oneLinerLabel: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  oneLinerText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 24,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
});
