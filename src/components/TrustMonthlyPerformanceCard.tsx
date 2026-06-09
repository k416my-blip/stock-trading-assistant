import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  TRUST_MONTHLY_REPORT_MARKET_LABEL_JA,
  TRUST_MONTHLY_REPORT_OUTCOME_LABEL_JA,
  TRUST_MONTHLY_REPORT_PORTFOLIO_LABEL_JA,
  TRUST_MONTHLY_REPORT_REASON_LABEL_JA,
  TRUST_MONTHLY_REPORT_TITLE_JA,
} from '../constants/trustDisplay';
import type { AllocationPlan, PerformancePoint } from '../types';
import {
  getPreviousYearMonth,
  toTrustMonthlyPerformanceDisplay,
} from '../services/trustMonthlyPerformanceReport';
import {
  ensureTrustMonthlyReportSaved,
  loadTrustMonthlyReportForMonth,
} from '../services/trustMonthlyReportStorage';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  performanceHistory: PerformancePoint[];
  plan?: AllocationPlan | null;
};

function returnColor(label: string): string {
  if (label.startsWith('+')) return theme.colors.success;
  if (label.startsWith('-')) return theme.colors.danger;
  return theme.colors.text;
}

export function TrustMonthlyPerformanceCard({ performanceHistory, plan }: Props) {
  const [display, setDisplay] = useState(() =>
    toTrustMonthlyPerformanceDisplay(null, getPreviousYearMonth()),
  );

  useEffect(() => {
    void (async () => {
      const yearMonth = getPreviousYearMonth();
      let record = await loadTrustMonthlyReportForMonth(yearMonth);
      if (!record) {
        record = await ensureTrustMonthlyReportSaved({
          performanceHistory,
          plan,
          yearMonth,
        });
      }
      setDisplay(toTrustMonthlyPerformanceDisplay(record, yearMonth));
    })();
  }, [performanceHistory, plan]);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>
        {TRUST_MONTHLY_REPORT_TITLE_JA}（{display.monthLabelJa}）
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>{TRUST_MONTHLY_REPORT_PORTFOLIO_LABEL_JA}</Text>
        <Text style={[styles.value, { color: returnColor(display.portfolioReturnLabel) }]}>
          {display.portfolioReturnLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{TRUST_MONTHLY_REPORT_MARKET_LABEL_JA}</Text>
        <Text style={[styles.value, display.ready ? { color: returnColor(display.marketAverageLabel) } : null]}>
          {display.marketAverageLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{TRUST_MONTHLY_REPORT_OUTCOME_LABEL_JA}</Text>
        <Text style={styles.outcome}>{display.outcomeLabelJa}</Text>
      </View>

      <View style={styles.reasonBox}>
        <Text style={styles.label}>{TRUST_MONTHLY_REPORT_REASON_LABEL_JA}</Text>
        <Text style={styles.reason}>{display.reasonJa}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  value: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  outcome: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: theme.spacing.md,
  },
  reasonBox: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  reason: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: 4,
  },
});
