import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GlobalMarketAnalysisBundle } from '../../types/globalMarketAnalysis';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  analysis: GlobalMarketAnalysisBundle;
};

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreChip}>
      <Text style={styles.scoreChipLabel}>{label}</Text>
      <Text style={styles.scoreChipValue}>{value}</Text>
    </View>
  );
}

function MarketSituationCardInner({ analysis }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="市場状況の表示切替"
      >
        <Text style={styles.title}>
          市場状況 {expanded ? '▼' : '▶'} · {analysis.regimeLabelJa}
        </Text>
      </Pressable>

      <Text style={styles.summary}>{analysis.regimeSummaryJa}</Text>
      <Text style={styles.confidence}>レジーム信頼度 {analysis.regimeConfidencePct}%</Text>

      <View style={styles.scoreRow}>
        <ScoreRow label="Market Risk" value={analysis.marketScores.marketRiskScore} />
        <ScoreRow label="Fear" value={analysis.marketScores.fearScore} />
        <ScoreRow label="Momentum" value={analysis.marketScores.momentumScore} />
        <ScoreRow label="Liquidity" value={analysis.marketScores.liquidityScore} />
      </View>

      {analysis.vix?.value != null ? (
        <Text style={styles.line}>
          VIX {analysis.vix.value.toFixed(2)} pt
          {analysis.vix.changePct != null ? `（${analysis.vix.changePct >= 0 ? '+' : ''}${analysis.vix.changePct.toFixed(2)}%）` : ''}
        </Text>
      ) : null}

      {expanded ? (
        <>
          <Text style={styles.section}>主要指数</Text>
          {analysis.indices.map((idx) => (
            <Text key={idx.id} style={styles.line}>
              {idx.labelJa}:{' '}
              {idx.changePct != null
                ? `${idx.changePct >= 0 ? '+' : ''}${idx.changePct.toFixed(2)}%`
                : '—'}
              {idx.price != null ? ` · ${idx.price.toFixed(2)}` : ''}
              {!idx.fromLive && idx.staleNoteJa ? ` (${idx.staleNoteJa})` : ''}
            </Text>
          ))}

          <Text style={styles.section}>セクター（ETF）</Text>
          {analysis.sectors.slice(0, 5).map((s) => (
            <Text key={s.id} style={styles.line}>
              #{s.leadershipRank} {s.labelJa}:{' '}
              {s.changePct != null ? `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%` : '—'}
            </Text>
          ))}

          <Text style={styles.section}>為替</Text>
          {analysis.forex.map((f) => (
            <Text key={f.id} style={styles.line}>
              {f.labelJa}: {f.value != null ? f.value.toFixed(4) : '—'}
              {f.changePct != null ? ` (${f.changePct >= 0 ? '+' : ''}${f.changePct.toFixed(2)}%)` : ''}
            </Text>
          ))}

          <Text style={styles.section}>金利</Text>
          {analysis.rates.map((r) => (
            <Text key={r.id} style={styles.line}>
              {r.labelJa}: {r.value != null ? `${r.value.toFixed(2)}${r.unitJa}` : '—'}
            </Text>
          ))}

          {analysis.correlations.length > 0 ? (
            <>
              <Text style={styles.section}>相関（参考）</Text>
              {analysis.correlations.map((c) => (
                <Text key={c.pairLabelJa} style={styles.line}>
                  {c.pairLabelJa}: {c.correlationHintJa}
                </Text>
              ))}
            </>
          ) : null}

          <Text style={styles.section}>市場全体要因</Text>
          {analysis.marketWideFactorsJa.map((f) => (
            <Text key={f} style={styles.bullet}>
              · {f}
            </Text>
          ))}

          {analysis.insufficientData ? (
            <Text style={styles.warn}>判断材料不足 — 市場データの一部が未取得です</Text>
          ) : null}
          <SelectableText style={styles.note}>{analysis.sourceNoteJa}</SelectableText>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  summary: {
    color: theme.colors.text,
    fontSize: 12,
    marginTop: 4,
  },
  confidence: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  scoreChip: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  scoreChipLabel: { color: theme.colors.textMuted, fontSize: 10 },
  scoreChipValue: { color: theme.colors.text, fontSize: 12, fontWeight: '600' },
  section: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  line: { color: theme.colors.text, fontSize: 11, marginTop: 2 },
  bullet: { color: theme.colors.text, fontSize: 11, marginTop: 2 },
  warn: { color: theme.colors.warning, fontSize: 11, marginTop: theme.spacing.xs },
  note: { color: theme.colors.textMuted, fontSize: 10, marginTop: theme.spacing.xs },
});

export const MarketSituationCard = memo(MarketSituationCardInner);
