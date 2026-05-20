import { Pressable, StyleSheet, Text } from 'react-native';
import { beginnerRecommendStars, formatStockPrice } from '../services/stockSearch';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../constants/rakutenTrade';
import type { RankedStock } from '../types';
import { theme } from '../theme';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

function formatRiskLevel(score: number): string {
  if (score >= 65) return '低め';
  if (score >= 45) return '中';
  return '高め';
}

type Props = {
  stock: RankedStock;
  onPress: () => void;
  onAddCandidate: () => void;
  candidateAdded?: boolean;
};

export function ScreenerStockCard({ stock, onPress, onAddCandidate, candidateAdded }: Props) {
  const sym = CURRENCY_SYMBOL[stock.currency];
  const price = formatStockPrice(stock.price, sym);
  const rec = stock.recommendation;

  return (
    <Card style={styles.card}>
      <Pressable onPress={onPress}>
        <Text style={styles.name}>{stock.name}</Text>
        <Text style={styles.ticker}>
          {stock.symbol} · {MARKET_LABEL[stock.market]}
        </Text>
        <Text style={[styles.price, price.unavailable && styles.priceMissing]}>現在株価: {price.text}</Text>
        <Text style={styles.score}>総合おすすめ度 {rec.totalScore}/100</Text>
        <Text style={styles.risk}>
          リスク: {formatRiskLevel(rec.risk.score)}（{rec.risk.score}/100）
        </Text>
        <Text style={styles.beginner}>初心者おすすめ度 {beginnerRecommendStars(stock)}</Text>
        <Text style={styles.whyLabel}>なぜおすすめ？</Text>
        <Text style={styles.why} numberOfLines={3}>
          {rec.whyThisStock}
        </Text>
      </Pressable>
      <Button
        label={candidateAdded ? '候補に追加済み' : 'この銘柄を候補に追加'}
        onPress={onAddCandidate}
        variant="ghost"
        disabled={candidateAdded}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  name: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  ticker: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  price: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600', marginTop: theme.spacing.sm },
  priceMissing: { color: theme.colors.warning },
  score: { color: theme.colors.primary, fontWeight: '700', marginTop: theme.spacing.xs, fontSize: theme.fontSize.md },
  risk: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  beginner: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginTop: 4 },
  whyLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600', marginTop: theme.spacing.sm },
  why: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
