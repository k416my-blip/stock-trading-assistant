import { ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { INVESTMENT_BEGINNER_FINAL_DISCLAIMER_JA } from '../constants/investmentDisplay';
import { RecommendationProvenanceBlock } from '../components/RecommendationProvenanceBlock';
import { BeginnerFinalDisclaimer } from '../components/BeginnerAllocationCandidateCard';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { useApp } from '../context/AppContext';
import { isBeginnerDisplayMode } from '../services/beginnerDisplayMapper';
import { buildBeginnerRecommendationSummary } from '../services/beginnerRecommendationSummary';
import { theme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AllocationCommitteeDetail'>;

export function AllocationCommitteeDetailScreen({ route }: Props) {
  const { candidate } = route.params;
  const { aiPreferences } = useApp();
  const meta = candidate.recommendationMeta;
  const beginnerMode = isBeginnerDisplayMode(aiPreferences);

  if (!meta) {
    return (
      <Screen title="詳しく見る" subtitle={candidate.name}>
        <Text style={styles.body}>おすすめ情報を準備中です。</Text>
      </Screen>
    );
  }

  if (beginnerMode) {
    const summary = buildBeginnerRecommendationSummary(candidate, meta);
    return (
      <Screen title="詳しく見る" subtitle={`${summary.name}（${summary.symbol}）`}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card>
            <Text style={styles.natural}>{summary.naturalExplanationJa}</Text>
            <Text style={styles.section}>推奨：{summary.recommendationLabel}</Text>
            <Text style={styles.section}>おすすめ度：{summary.gradeLabel}</Text>
            <Text style={styles.section}>確かさ：{summary.certaintyLabel}</Text>
            <Text style={styles.section}>買う金額の目安：{summary.maxAmountLabel}</Text>
            <Text style={styles.section}>買う株数の目安：{summary.maxSharesLabel}</Text>
          </Card>
          <Card>
            <Text style={styles.label}>いま買ってよい理由</Text>
            {summary.reasons.map((r, i) => (
              <Text key={`r-${i}`} style={styles.body}>
                {i + 1}. {r}
              </Text>
            ))}
            <Text style={styles.label}>注意点</Text>
            {summary.cautions.map((c, i) => (
              <Text key={`c-${i}`} style={styles.body}>
                {i + 1}. {c}
              </Text>
            ))}
          </Card>
          <BeginnerFinalDisclaimer />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen title="プロモード — 詳細分析" subtitle={`${candidate.name}（${candidate.symbol}）`}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.title}>AI委員会メトリクス</Text>
          <Text style={styles.metric}>AI委員会信頼度: {meta.committeeTrustPct}%</Text>
          <Text style={styles.metric}>委員会一致率: {meta.committeeConsensusPct}%</Text>
          <Text style={styles.metric}>Red Team スコア: {meta.redTeamScore}</Text>
          <Text style={styles.metric}>強い反対意見: {meta.strongOppositionLabelJa}</Text>
          <Text style={styles.metric}>decisionHash: {meta.decisionHash.slice(0, 16)}…</Text>
        </Card>

        <RecommendationProvenanceBlock
          meta={meta}
          symbol={candidate.symbol}
          name={candidate.name}
          showAdvanced
        />

        {meta.committeeMinutesJa ? (
          <Card>
            <Text style={styles.title}>投資委員会議事録</Text>
            <Text style={styles.body}>{meta.committeeMinutesJa}</Text>
          </Card>
        ) : null}

        <Text style={styles.proNote}>{INVESTMENT_BEGINNER_FINAL_DISCLAIMER_JA}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  section: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    marginTop: 6,
  },
  natural: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 24,
  },
  metric: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
  },
  body: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
    marginTop: 4,
  },
  proNote: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.md,
    fontStyle: 'italic',
  },
});
