import { StyleSheet, Text, View } from 'react-native';
import { SECTOR_THEME_LABEL } from '../constants/marketRegime';
import type { MarketRegimeResult } from '../types/marketRegime';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  regime: MarketRegimeResult;
  compact?: boolean;
};

function formatSectors(ids: MarketRegimeResult['preferredSectors']): string {
  if (ids.length === 0) return '—';
  return ids.map((id) => SECTOR_THEME_LABEL[id]).join(' · ');
}

export function MarketRegimeCard({ regime, compact = false }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>マーケットレジーム</Text>
      <Text style={styles.regime}>{regime.labelJa}</Text>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>信頼度</Text>
        <Text style={styles.scoreValue}>{regime.confidenceScore}</Text>
        <Text style={styles.scoreLabel}>リスク</Text>
        <Text style={[styles.scoreValue, regime.riskScore >= 60 && styles.riskHigh]}>
          {regime.riskScore}
        </Text>
      </View>
      {!compact ? (
        <>
          <Text style={styles.summary}>{regime.summaryJa}</Text>
          <Text style={styles.meta}>優先: {formatSectors(regime.preferredSectors)}</Text>
          {regime.avoidSectors.length > 0 ? (
            <Text style={styles.metaAvoid}>回避: {formatSectors(regime.avoidSectors)}</Text>
          ) : null}
          <Text style={styles.disclaimer}>
            サンプル価格・代理指標によるルールベース分類（AI予測ではありません）
          </Text>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: theme.colors.primary, borderWidth: 1 },
  title: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  regime: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  scoreLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  scoreValue: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.md },
  riskHigh: { color: theme.colors.warning },
  summary: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.xs },
  metaAvoid: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 2 },
  disclaimer: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
});
