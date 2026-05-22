import { StyleSheet, Text, View } from 'react-native';
import type { XSentimentLabel, XSentimentSnapshot } from '../types/xSentiment';
import { Card } from './ui/Card';
import { theme } from '../theme';

const LABEL_JA: Record<XSentimentLabel, string> = {
  bullish: 'Bullish',
  bearish: 'Bearish',
  neutral: 'Neutral',
  panic: 'Panic',
  hype: 'Hype',
};

const BASIS_JA: Record<XSentimentSnapshot['analysisBasis'], string> = {
  fetched_posts: 'X投稿データ（ルールベース）',
  news_fallback: 'ニュースRSSフォールバック',
  estimated: '推定',
};

type Props = {
  snapshot: XSentimentSnapshot;
};

export function XSentimentPanel({ snapshot }: Props) {
  const s = snapshot;
  return (
    <Card>
      <Text style={styles.title}>X センチメント分析</Text>
      <Text style={styles.meta}>{BASIS_JA[s.analysisBasis]}</Text>
      {s.fromCache ? <Text style={styles.cache}>15分キャッシュ</Text> : null}

      <View style={styles.row}>
        <Stat label="投稿数" value={String(s.postCount)} />
        <Stat
          label="投稿急増率"
          value={
            s.postSurgeRatePct != null ? `${s.postSurgeRatePct > 0 ? '+' : ''}${s.postSurgeRatePct}%` : '—'
          }
        />
        <Stat label="残りAPI目安" value={`${s.quotaRemainingToday}回`} />
      </View>

      <Text style={styles.section}>Sentiment 割合</Text>
      {(Object.keys(LABEL_JA) as XSentimentLabel[]).map((key) => (
        <View key={key} style={styles.barRow}>
          <Text style={styles.barLabel}>{LABEL_JA[key]}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${s.sentimentPct[key]}%` }]} />
          </View>
          <Text style={styles.barPct}>{s.sentimentPct[key]}%</Text>
        </View>
      ))}

      <Text style={styles.section}>トレンドワード</Text>
      {s.trendWords.length > 0 ? (
        <Text style={styles.words}>{s.trendWords.join(' · ')}</Text>
      ) : (
        <Text style={styles.muted}>—</Text>
      )}

      {s.anomalies.length > 0 ? (
        <>
          <Text style={styles.section}>異常検知</Text>
          {s.anomalies.map((a) => (
            <Text key={a.id} style={styles.alert}>
              · {a.labelJa}
            </Text>
          ))}
        </>
      ) : null}

      <Text style={styles.summary}>{s.summaryJa}</Text>
      <Text style={styles.query}>検索: {s.searchQuery}</Text>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: { color: theme.colors.primary, fontSize: 13, marginBottom: 2 },
  cache: { color: theme.colors.textMuted, fontSize: 12, marginBottom: theme.spacing.sm },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  stat: { minWidth: 90 },
  statLabel: { color: theme.colors.textMuted, fontSize: 12 },
  statValue: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
    marginBottom: 6,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  barLabel: { width: 56, color: theme.colors.textMuted, fontSize: 12 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  barPct: { width: 36, textAlign: 'right', color: theme.colors.text, fontSize: 12 },
  words: { color: theme.colors.text, fontSize: 14, lineHeight: 20 },
  muted: { color: theme.colors.textMuted, fontSize: 13 },
  alert: { color: theme.colors.warning, fontSize: 13, lineHeight: 18 },
  summary: { color: theme.colors.text, fontSize: 14, lineHeight: 20, marginTop: theme.spacing.sm },
  query: { color: theme.colors.textMuted, fontSize: 11, marginTop: 6 },
});
