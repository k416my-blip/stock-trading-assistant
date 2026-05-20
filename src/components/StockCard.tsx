import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TermHintIcon } from './TermHint';
import { STOCK_CATEGORY_LABEL } from '../constants/stockCatalog';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../constants/rakutenTrade';
import type { GlossaryTerm } from '../constants/glossary';
import type { RankedStock } from '../types';
import { theme } from '../theme';
import { Card } from './ui/Card';

type Props = {
  stock: RankedStock;
  onPress: () => void;
};

export function StockCard({ stock, onPress }: Props) {
  const sym = CURRENCY_SYMBOL[stock.currency];
  const rec = stock.recommendation;
  return (
    <Pressable onPress={onPress}>
      <Card>
        <Text style={styles.symbol}>
          #{stock.rank} {stock.symbol} · {MARKET_LABEL[stock.market]}
        </Text>
        <Text style={styles.name}>{stock.name}</Text>
        <Text style={styles.category}>{STOCK_CATEGORY_LABEL[stock.category]}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {sym}
            {stock.price}
          </Text>
          <TermHintIcon term="stockPrice" />
        </View>
        <View style={styles.scoreRow}>
          <TermHintIcon term="recommendationScore" />
          <Text style={styles.totalScore}>総合 {rec.totalScore}/100</Text>
        </View>
        <View style={styles.miniScores}>
          <Text style={styles.mini}>テク {rec.technical.score}</Text>
          <Text style={styles.mini}>ファン {rec.fundamental.score}</Text>
          <Text style={styles.mini}>ニュース {rec.news.unavailable ? '—' : rec.news.score}</Text>
          <Text style={styles.mini}>決算 {rec.earnings.unavailable ? '—' : rec.earnings.score}</Text>
        </View>
        <View style={styles.tags}>
          <MetaTag label="配当利回り" value={`${stock.dividendYield}%`} hint="dividendYield" />
          <MetaTag label="PER" value={String(stock.per)} hint="per" />
          <MetaTag label="出来高" value={`${(stock.volume / 1_000_000).toFixed(1)}M`} hint="volume" />
        </View>
      </Card>
    </Pressable>
  );
}

function MetaTag({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: GlossaryTerm;
}) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>
        {label} {value}
      </Text>
      <TermHintIcon term={hint} />
    </View>
  );
}

const styles = StyleSheet.create({
  symbol: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  name: { color: theme.colors.textMuted, marginTop: 2 },
  category: { color: theme.colors.primary, fontSize: theme.fontSize.sm, fontWeight: '600', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, gap: 4 },
  meta: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: theme.spacing.sm },
  totalScore: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.md },
  miniScores: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  mini: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.sm, alignItems: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tagText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
});
