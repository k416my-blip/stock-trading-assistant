import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ConciergeEvidenceBundle } from '../../types/conciergeEvidence';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  evidence: ConciergeEvidenceBundle;
};

function ConciergeEvidencePanelInner({ evidence }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (evidence.symbols.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="根拠データの表示切替"
      >
        <Text style={styles.title}>
          根拠データ {expanded ? '▼' : '▶'} · {evidence.globalSummaryJa}
        </Text>
      </Pressable>
      {expanded ? (
        <>
          {evidence.cacheNotesJa.map((note) => (
            <Text key={note} style={styles.cacheNote}>
              {note}
            </Text>
          ))}
          {evidence.symbols.map((sym) => (
            <View key={`${sym.market}:${sym.symbol}`} style={styles.symbolBlock}>
              <SelectableText style={styles.symbolTitle}>{sym.displayLabelJa}</SelectableText>
              <SelectableText style={styles.line}>
                現在値: {sym.currentPrice ?? '—'} · 前日終値: {sym.previousClose ?? '—'} · 日中{' '}
                {sym.intradayChangePct != null ? `${sym.intradayChangePct.toFixed(2)}%` : '—'}
              </SelectableText>
              <SelectableText style={styles.line}>
                出来高: {sym.volume ?? '—'}
                {sym.volumeSurgeRatio != null
                  ? ` · 出来高倍率 ${sym.volumeSurgeRatio.toFixed(1)}x`
                  : ''}
                {sym.quoteIsStale ? ' · 株価ステール' : ''}
              </SelectableText>
              {sym.portfolioHolding ? (
                <SelectableText style={styles.line}>
                  保有 {sym.portfolioHolding.shares}株 · 平均{' '}
                  {sym.portfolioHolding.averageBuyPrice}
                  {sym.portfolioHolding.unrealizedPnlPct != null
                    ? ` · 含み ${sym.portfolioHolding.unrealizedPnlPct.toFixed(1)}%`
                    : ''}
                </SelectableText>
              ) : null}
              {sym.latestFinancialNews.length > 0 ? (
                <SelectableText style={styles.line}>
                  ニュース: {sym.latestFinancialNews.slice(0, 2).map((h) => h.title).join(' / ')}
                </SelectableText>
              ) : (
                <SelectableText style={styles.muted}>ニュース: 未取得</SelectableText>
              )}
              {sym.xSentiment ? (
                <SelectableText style={styles.line}>
                  X: bear {sym.xSentiment.bearishPct}% · bull {sym.xSentiment.bullishPct}% · 投稿
                  {sym.xSentiment.postCount}
                  {sym.xSentiment.postSurgeRatePct != null
                    ? ` · 投稿+${sym.xSentiment.postSurgeRatePct.toFixed(0)}%`
                    : ''}
                  {sym.xSentiment.trendWords.length > 0
                    ? ` · ${sym.xSentiment.trendWords.slice(0, 3).join(', ')}`
                    : ''}
                </SelectableText>
              ) : (
                <SelectableText style={styles.muted}>X: キャッシュなし</SelectableText>
              )}
              {sym.unusualActivityFlags.length > 0 ? (
                <SelectableText style={styles.flag}>
                  異常: {sym.unusualActivityFlags.map((f) => f.labelJa).join(' · ')}
                </SelectableText>
              ) : null}
              {sym.dataGapsJa.length > 0 ? (
                <SelectableText style={styles.gap}>
                  不足: {sym.dataGapsJa.join(' · ')}
                </SelectableText>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  cacheNote: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  symbolBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  symbolTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  line: {
    fontSize: 11,
    color: theme.colors.text,
    marginBottom: 2,
  },
  muted: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  flag: {
    fontSize: 11,
    color: theme.colors.warning,
    marginTop: 2,
  },
  gap: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});

export const ConciergeEvidencePanel = memo(ConciergeEvidencePanelInner);
