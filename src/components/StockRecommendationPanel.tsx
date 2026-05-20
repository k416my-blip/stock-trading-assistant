import { StyleSheet, Text, View } from 'react-native';
import { DATA_SOURCE_LABELS, DATA_UNAVAILABLE_LABEL } from '../constants/recommendation';
import type { StockRecommendation } from '../types/recommendation';
import { TermHint } from './TermHint';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  recommendation: StockRecommendation;
  compact?: boolean;
};

function scoreColor(score: number): { color: string } {
  if (score >= 70) return { color: theme.colors.success };
  if (score >= 45) return { color: theme.colors.text };
  return { color: theme.colors.danger };
}

function FactorRow({
  label,
  score,
  unavailable,
}: {
  label: string;
  score: number;
  unavailable?: boolean;
}) {
  return (
    <View style={styles.factorRow}>
      <Text style={styles.factorLabel}>{label}</Text>
      <Text style={[styles.factorScore, unavailable ? styles.unavailable : scoreColor(score)]}>
        {unavailable ? DATA_UNAVAILABLE_LABEL : `${score}点`}
      </Text>
    </View>
  );
}

function DataStatusRow({ label, state }: { label: string; state: string }) {
  const color =
    state === 'available'
      ? theme.colors.success
      : state === 'estimated'
        ? theme.colors.warning
        : theme.colors.textMuted;
  return (
    <Text style={styles.dataRow}>
      {label}: <Text style={{ color }}>{DATA_SOURCE_LABELS[state as keyof typeof DATA_SOURCE_LABELS] ?? state}</Text>
    </Text>
  );
}

export function StockRecommendationPanel({ recommendation: rec, compact = false }: Props) {
  return (
    <Card>
      <Text style={styles.title}>総合おすすめ度</Text>
      <Text style={[styles.total, scoreColor(rec.totalScore)]}>{rec.totalScore}/100</Text>
      <Text style={styles.disclaimer}>{rec.disclaimer}</Text>

      <FactorRow label="テクニカル分析" score={rec.technical.score} unavailable={rec.technical.unavailable} />
      <FactorRow label="ファンダメンタル分析" score={rec.fundamental.score} />
      <FactorRow label="ニュース評価" score={rec.news.score} unavailable={rec.news.unavailable} />
      <FactorRow label="決算評価" score={rec.earnings.score} unavailable={rec.earnings.unavailable} />
      <FactorRow label="SNS評価" score={rec.sns.score} unavailable={rec.sns.unavailable} />
      <FactorRow label="リスク管理" score={rec.risk.score} />

      {!compact ? (
        <>
          <Text style={styles.section}>データ取得状況</Text>
          <DataStatusRow label="株価データ" state={rec.dataSource.price} />
          <DataStatusRow label="ニュース" state={rec.dataSource.news} />
          <DataStatusRow label="決算" state={rec.dataSource.earnings} />
          <DataStatusRow label="SNS" state={rec.dataSource.sns} />

          <TermHint term="newsScore" />
          <Text style={styles.detail}>{rec.newsDetail.summary}</Text>
          {rec.newsDetail.headlines.slice(0, 2).map((h, i) => (
            <Text key={`${h.title}-${i}`} style={styles.headline}>
              · [{h.sentiment}] {h.title}
            </Text>
          ))}

          <TermHint term="earningsScore" />
          <Text style={styles.detail}>{rec.earningsDetail.summary}</Text>

          <TermHint term="snsScore" />
          <Text style={styles.detail}>{rec.snsDetail.summary}</Text>
          <Text style={styles.warn}>{rec.snsDetail.warning}</Text>

          <TermHint term="historicalScore" />
          <Text style={styles.detail}>{rec.historicalDetail.summary}</Text>
          <Text style={styles.muted}>{rec.historicalDetail.disclaimer}</Text>

          <Text style={styles.section}>ファンダメンタル（参考）</Text>
          <Text style={styles.detail}>{rec.fundamentalDetail.summary}</Text>
        </>
      ) : null}

      <Text style={styles.section}>なぜこの銘柄？</Text>
      <Text style={styles.body}>{rec.whyThisStock}</Text>

      <Text style={styles.section}>注意点</Text>
      {rec.cautions.map((c, i) => (
        <Text key={`caution-${i}`} style={styles.caution}>
          · {c}
        </Text>
      ))}

      <Text style={styles.section}>初心者向けコメント</Text>
      <Text style={styles.note}>{rec.beginnerComment}</Text>

      <Text style={styles.aiNote}>{rec.aiNote}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600' },
  total: { fontSize: 32, fontWeight: '800', marginTop: 4, marginBottom: theme.spacing.sm },
  disclaimer: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 16, marginBottom: theme.spacing.md },
  factorRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  factorLabel: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  factorScore: { fontWeight: '700', fontSize: theme.fontSize.sm },
  unavailable: { color: theme.colors.textMuted, fontWeight: '600' },
  section: { color: theme.colors.text, fontWeight: '700', marginTop: theme.spacing.md, marginBottom: 4 },
  dataRow: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  detail: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 4 },
  headline: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 16, marginTop: 2 },
  body: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20 },
  caution: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 2 },
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20, fontStyle: 'italic' },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 4, lineHeight: 18 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 16, marginTop: 4 },
  aiNote: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.md, lineHeight: 16 },
});
