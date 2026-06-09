import { StyleSheet, Text, View } from 'react-native';
import type { AllocationCandidate } from '../types';
import { INVESTMENT_BEGINNER_FINAL_DISCLAIMER_JA } from '../constants/investmentDisplay';
import { buildBeginnerRecommendationSummary } from '../services/beginnerRecommendationSummary';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  candidate: AllocationCandidate;
  onOpenDetail: () => void;
  onConfirm: () => void;
  showDisclaimer?: boolean;
};

function recommendationColor(label: string): string {
  if (label === '買う') return theme.colors.success;
  if (label === '保留') return theme.colors.warning;
  return theme.colors.danger;
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <Text key={`item-${i}`} style={styles.listItem}>
          {i + 1}. {item}
        </Text>
      ))}
    </>
  );
}

export function BeginnerAllocationCandidateCard({
  candidate,
  onOpenDetail,
  onConfirm,
  showDisclaimer = false,
}: Props) {
  const meta = candidate.recommendationMeta;
  if (!meta) return null;

  const summary = buildBeginnerRecommendationSummary(candidate, meta);

  return (
    <Card>
      <Text style={styles.label}>銘柄名：</Text>
      <Text style={styles.name}>{summary.name}</Text>

      <Text style={styles.label}>推奨：</Text>
      <Text style={[styles.valueStrong, { color: recommendationColor(summary.recommendationLabel) }]}>
        {summary.recommendationLabel}
      </Text>

      <Text style={styles.label}>おすすめ度：</Text>
      <Text style={styles.grade}>{summary.gradeLabel}</Text>

      <Text style={styles.label}>確かさ：</Text>
      <Text style={styles.value}>{summary.certaintyLabel}</Text>

      <Text style={styles.label}>買う金額の目安：</Text>
      <Text style={styles.value}>{summary.maxAmountLabel}</Text>

      <Text style={styles.label}>買う株数の目安：</Text>
      <Text style={styles.value}>{summary.maxSharesLabel}</Text>

      <Text style={styles.label}>理由：</Text>
      <NumberedList items={summary.reasons} />

      <Text style={styles.label}>注意点：</Text>
      <NumberedList items={summary.cautions} />

      <View style={styles.actions}>
        <Button label="詳しく見る" onPress={onOpenDetail} variant="ghost" />
        <Button label="この内容で進める" onPress={onConfirm} />
      </View>

      {showDisclaimer ? (
        <Text style={styles.disclaimer}>{INVESTMENT_BEGINNER_FINAL_DISCLAIMER_JA}</Text>
      ) : null}
    </Card>
  );
}

export function BeginnerFinalDisclaimer() {
  return <Text style={styles.disclaimer}>{INVESTMENT_BEGINNER_FINAL_DISCLAIMER_JA}</Text>;
}

const styles = StyleSheet.create({
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  value: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    marginTop: 2,
  },
  valueStrong: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    marginTop: 2,
  },
  grade: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xxl,
    fontWeight: '800',
    marginTop: 2,
  },
  listItem: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
    marginTop: 4,
  },
  actions: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  disclaimer: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.md,
    fontStyle: 'italic',
  },
});
