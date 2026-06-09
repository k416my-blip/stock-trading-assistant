import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Card } from './ui/Card';
import { useBursaMaterial } from '../context/BursaMaterialContext';
import type { MainTabParamList } from '../navigation/types';
import { theme } from '../theme';

export function BursaMaterialHomeCard() {
  const { report, loading } = useBursaMaterial();
  const tabNav = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  if (loading && !report) return null;

  const top = report?.topMaterial;
  if (!top) return null;

  const scoreColor =
    top.scoreSign === 'positive'
      ? theme.colors.success
      : top.scoreSign === 'negative'
        ? theme.colors.danger
        : theme.colors.text;

  const quality = top.dataQuality;

  return (
    <Card>
      <Text style={styles.heading}>最重要材料 — リアルタイム分析</Text>

      <Text style={styles.qualityStars}>{quality.stars}</Text>
      <Text style={styles.qualityLabel}>{quality.labelJa}</Text>

      <View style={styles.headerRow}>
        <Text style={styles.stockName}>{top.companyNameJa}</Text>
        <Text style={[styles.score, { color: scoreColor }]}>{top.scoreJa}</Text>
      </View>

      {top.sourceScoreBreakdown.map((b) => (
        <Text key={`bd-${b.sourceJa}`} style={styles.breakdown}>
          {b.sourceJa} {b.scoreJa}
        </Text>
      ))}

      {top.apiConnections.map((r) => (
        <Text key={`api-${r.apiJa}`} style={styles.breakdown}>
          {r.apiJa}: {r.connectionJa}
        </Text>
      ))}

      {top.summaryLines.map((line, i) => (
        <Text key={`sum-${i}`} style={styles.summary}>
          {line}
        </Text>
      ))}

      <Pressable style={styles.link} onPress={() => tabNav.navigate('MaterialAnalysis')}>
        <Text style={styles.linkText}>材料分析を見る</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontWeight: '800',
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    marginBottom: 6,
  },
  qualityStars: { fontSize: 16, color: theme.colors.warning, fontWeight: '700', marginBottom: 2 },
  qualityLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stockName: { fontWeight: '700', fontSize: theme.fontSize.md, color: theme.colors.text },
  score: { fontWeight: '800', fontSize: theme.fontSize.lg },
  breakdown: { fontSize: theme.fontSize.sm, color: theme.colors.text, marginBottom: 2 },
  summary: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 4, lineHeight: 18 },
  link: { marginTop: 10 },
  linkText: { color: theme.colors.primary, fontWeight: '600', fontSize: theme.fontSize.sm },
});
