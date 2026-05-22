import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePerformanceCost } from '../context/PerformanceCostContext';
import { SelectableText } from './ui/SelectableText';
import { theme } from '../theme';

function ApiCostDashboardPanelInner() {
  const { costDashboard, cacheSummaryJa, refreshCostDashboard } = usePerformanceCost();
  const onRefresh = useCallback(() => refreshCostDashboard(), [refreshCostDashboard]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>APIコスト（推定・24h）</Text>
        <Pressable onPress={onRefresh} hitSlop={8}>
          <Text style={styles.link}>更新</Text>
        </Pressable>
      </View>
      <SelectableText style={styles.line}>
        OpenAI: ~{costDashboard.openAiEstimatedTokens.toLocaleString()} tokens · $
        {costDashboard.openAiEstimatedCostUsd.toFixed(3)}
      </SelectableText>
      <SelectableText style={styles.line}>X API: {costDashboard.xApiCalls} 回</SelectableText>
      <SelectableText style={styles.line}>News API: {costDashboard.newsApiCalls} 回</SelectableText>
      <SelectableText style={styles.line}>
        Market data: {costDashboard.marketDataCalls} 回
      </SelectableText>
      <SelectableText style={styles.muted}>{costDashboard.summaryJa}</SelectableText>
      <SelectableText style={styles.muted}>{cacheSummaryJa}</SelectableText>
    </View>
  );
}

export const ApiCostDashboardPanel = memo(ApiCostDashboardPanelInner);

const styles = StyleSheet.create({
  wrap: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  link: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
  },
  line: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  muted: {
    marginTop: theme.spacing.xs,
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
});
