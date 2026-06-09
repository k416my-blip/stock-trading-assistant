import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  TRUST_MONTHLY_REPORT_MARKET_LABEL_JA,
  TRUST_OPERATING_CUMULATIVE_LABEL_JA,
  TRUST_OPERATING_MARKET_DIFF_LABEL_JA,
  TRUST_OPERATING_MAX_DRAWDOWN_LABEL_JA,
  TRUST_OPERATING_PERFORMANCE_TITLE_JA,
  TRUST_OPERATING_RATING_LABEL_JA,
  TRUST_OPERATING_START_LABEL_JA,
  TRUST_OPERATING_WIN_RATE_HINT_JA,
  TRUST_OPERATING_WIN_RATE_LABEL_JA,
} from '../constants/trustDisplay';
import type { PerformancePoint } from '../types';
import { toTrustOperatingPerformanceDisplay } from '../services/trustOperatingPerformance';
import {
  ensureTrustOperatingPerformanceSaved,
  loadTrustOperatingPerformanceState,
  recordTrustOperationStartIfNeeded,
} from '../services/trustOperatingPerformanceStorage';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  performanceHistory: PerformancePoint[];
  /** 配分承認時に運用開始日を記録する */
  trackOperation?: boolean;
};

function returnColor(label: string): string {
  if (label.startsWith('+')) return theme.colors.success;
  if (label.startsWith('-')) return theme.colors.danger;
  return theme.colors.text;
}

export function TrustOperatingPerformanceCard({
  performanceHistory,
  trackOperation = true,
}: Props) {
  const [display, setDisplay] = useState(() =>
    toTrustOperatingPerformanceDisplay(null, null),
  );

  useEffect(() => {
    void (async () => {
      if (trackOperation && performanceHistory.length > 0) {
        await recordTrustOperationStartIfNeeded();
      }
      const state = await loadTrustOperatingPerformanceState();
      const record = await ensureTrustOperatingPerformanceSaved({
        performanceHistory,
        operationStartedAt: state.operationStartedAt,
      });
      setDisplay(
        toTrustOperatingPerformanceDisplay(
          record,
          state.operationStartedAt ?? record?.operationStartedAt ?? null,
        ),
      );
    })();
  }, [performanceHistory, trackOperation]);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{TRUST_OPERATING_PERFORMANCE_TITLE_JA}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>{TRUST_OPERATING_START_LABEL_JA}</Text>
        <Text style={styles.valuePlain}>{display.operationStartedLabel}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{TRUST_OPERATING_CUMULATIVE_LABEL_JA}</Text>
        <Text style={[styles.value, { color: returnColor(display.cumulativeReturnLabel) }]}>
          {display.cumulativeReturnLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{TRUST_MONTHLY_REPORT_MARKET_LABEL_JA}</Text>
        <Text
          style={[
            styles.value,
            display.ready ? { color: returnColor(display.marketAverageLabel) } : null,
          ]}
        >
          {display.marketAverageLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{TRUST_OPERATING_MARKET_DIFF_LABEL_JA}</Text>
        <Text
          style={[
            styles.value,
            display.ready ? { color: returnColor(display.marketDiffLabel) } : null,
          ]}
        >
          {display.marketDiffLabel}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={styles.winRateLabelWrap}>
          <Text style={styles.label}>{TRUST_OPERATING_WIN_RATE_LABEL_JA}</Text>
          <Text style={styles.hint}>{TRUST_OPERATING_WIN_RATE_HINT_JA}</Text>
        </View>
        <Text style={styles.valuePlain}>{display.monthlyWinRateLabel}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{TRUST_OPERATING_MAX_DRAWDOWN_LABEL_JA}</Text>
        <Text style={styles.valuePlain}>{display.maxDrawdownLabel}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{TRUST_OPERATING_RATING_LABEL_JA}</Text>
        <Text style={styles.stars}>{display.starRatingLabel}</Text>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summary}>{display.summaryJa}</Text>
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
  hint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  winRateLabelWrap: {
    flexShrink: 1,
  },
  value: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  valuePlain: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  stars: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.lg,
    letterSpacing: 1,
  },
  summaryBox: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  summary: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
});
