import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ConciergeEvidenceBundle } from '../../types/conciergeEvidence';
import { listKey, logDuplicateReactKeys } from '../../utils/reactKeyDiagnostics';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  evidence: ConciergeEvidenceBundle;
};

function ConciergeEvidencePanelInner({ evidence }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (evidence.symbols.length === 0) return null;

  const noteKeys = evidence.cacheNotesJa.map((note, i) => listKey('cache-note', i, note));
  const symbolKeys = evidence.symbols.map((sym, i) =>
    listKey('symbol', i, `${sym.market}:${sym.symbol}`),
  );
  logDuplicateReactKeys('ConciergeEvidencePanel/notes', 'ConciergeEvidencePanel', noteKeys);
  logDuplicateReactKeys('ConciergeEvidencePanel/symbols', 'ConciergeEvidencePanel', symbolKeys);

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
          {evidence.cacheNotesJa.map((note, index) => (
            <Text key={noteKeys[index]} style={styles.cacheNote}>
              {note}
            </Text>
          ))}
          {evidence.symbols.map((sym, index) => (
            <View key={symbolKeys[index]} style={styles.symbolBlock}>
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
                <>
                  <Text style={styles.sectionInline}>ニュース一覧</Text>
                  {sym.latestFinancialNews.slice(0, 5).map((h, hi) => (
                    <SelectableText key={listKey('news', hi, h.title)} style={styles.line}>
                      · {h.title}
                      {h.sentiment ? ` (${h.sentiment})` : ''}
                    </SelectableText>
                  ))}
                </>
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
  sectionInline: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 4,
    marginBottom: 2,
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
