import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CHARTER_WHY_BUTTON_LABEL_JA } from '../constants/investmentCharter';
import { RED_TEAM_ANALYST_LABEL_JA } from '../constants/investmentCommitteeNarrative';
import type { AllocationRecommendationMeta } from '../services/recommendationProvenance';
import { InvestmentCharterDetailModal } from './InvestmentCharterDetailModal';
import { Button } from './ui/Button';
import { theme } from '../theme';

type Props = {
  meta: AllocationRecommendationMeta;
  symbol: string;
  name?: string;
  showAdvanced?: boolean;
  beginnerMode?: boolean;
};

function confidenceColor(level: AllocationRecommendationMeta['confidenceLevel']): string {
  if (level === 'high') return theme.colors.success;
  if (level === 'medium') return theme.colors.warning;
  return theme.colors.danger;
}

function adoptionColor(verdict: AllocationRecommendationMeta['adoptionVerdict']): string {
  if (verdict === 'adopt') return theme.colors.success;
  if (verdict === 'hold') return theme.colors.warning;
  return theme.colors.danger;
}

function ReasonList({ items }: { items: string[] }) {
  if (items.length === 0) return <Text style={styles.value}>—</Text>;
  return (
    <>
      {items.map((item, i) => (
        <Text key={`reason-${i}`} style={styles.reasonItem}>
          · {item}
        </Text>
      ))}
    </>
  );
}

export function RecommendationProvenanceBlock({ meta, symbol, name, showAdvanced = false }: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>投資憲章審議</Text>
      <Text style={styles.hierarchy}>{meta.decisionHierarchyJa}</Text>
      <Text style={styles.charterVersion}>憲章 v{meta.charterVersion}</Text>

      <Text style={styles.label}>推薦者</Text>
      <Text style={styles.valueStrong}>{meta.recommenderJa}</Text>

      <Text style={styles.label}>投資哲学</Text>
      <Text style={styles.value}>{meta.investmentPhilosophyJa}</Text>

      <Text style={styles.label}>賛成理由（憲章）</Text>
      <ReasonList items={meta.approvalReasonsJa} />

      <Text style={styles.label}>反対理由（憲章）</Text>
      <ReasonList items={meta.oppositionReasonsJa} />

      <Text style={styles.sectionSubtitle}>投資委員会レビュー</Text>

      <Text style={styles.label}>【賛成意見】</Text>
      <ReasonList items={meta.bullCaseJa} />

      <Text style={styles.label}>【反対意見】</Text>
      <ReasonList items={meta.bearCaseJa} />

      <Text style={styles.label}>【リスク】</Text>
      <ReasonList items={meta.riskFactorsJa} />

      <Text style={styles.label}>AI委員会信頼度</Text>
      <Text style={styles.metricValue}>{meta.committeeTrustPct}%</Text>

      <Text style={styles.label}>委員会一致率</Text>
      <Text style={styles.metricValue}>{meta.committeeConsensusPct}%</Text>

      <Text style={styles.label}>強い反対意見</Text>
      <Text style={styles.metricValue}>{meta.strongOppositionLabelJa}</Text>

      <Text style={styles.label}>【{RED_TEAM_ANALYST_LABEL_JA} — 反証】</Text>
      <ReasonList items={meta.counterArgumentsJa} />

      <Text style={styles.label}>信頼度</Text>
      <Text style={[styles.confidence, { color: confidenceColor(meta.confidenceLevel) }]}>
        {meta.confidencePct}%
      </Text>

      <Text style={styles.label}>総合スコア</Text>
      <Text style={styles.score}>{meta.recommendationScore}/100</Text>

      <Text style={styles.label}>Malaysia v4一致率</Text>
      <Text style={styles.alignment}>
        {meta.malaysiaV4AlignmentPct > 0
          ? `${meta.malaysiaV4AlignmentPct.toFixed(1)}%`
          : '対象外（参考モデル外銘柄）'}
      </Text>

      <Text style={styles.label}>採用可否</Text>
      <Text style={[styles.adoption, { color: adoptionColor(meta.adoptionVerdict) }]}>
        {meta.adoptionLabelJa}
      </Text>

      {!meta.buyAllowed ? (
        <Text style={styles.noBuy}>BUY表示禁止 — 投資憲章により推奨不可</Text>
      ) : null}

      <Button
        label={CHARTER_WHY_BUTTON_LABEL_JA}
        onPress={() => setModalVisible(true)}
        variant="ghost"
      />

      <Text style={styles.approval}>{meta.userApprovalNoteJa}</Text>

      <InvestmentCharterDetailModal
        visible={modalVisible}
        symbol={symbol}
        name={name}
        meta={meta}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.md,
    marginBottom: 2,
  },
  hierarchy: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    lineHeight: 16,
  },
  charterVersion: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    marginTop: 6,
  },
  value: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  valueStrong: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    lineHeight: 18,
  },
  reasonItem: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: 2,
  },
  score: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  alignment: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  confidence: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  adoption: {
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  noBuy: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: 4,
  },
  approval: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    lineHeight: 16,
    marginTop: 4,
    fontStyle: 'italic',
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
});
