import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import {
  usePortfolioHoldingsListModel,
  type PortfolioHoldingActionsRef,
} from './PortfolioHoldingsList';
import type { HoldingDetail, PortfolioPosition } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type Props = {
  holdings: HoldingDetail[];
  portfolio: PortfolioPosition[];
  portfolioById: Map<string, PortfolioPosition>;
  portfolioStateLength: number;
  isPractice: boolean;
  readOnly?: boolean;
  actionsRef: React.MutableRefObject<PortfolioHoldingActionsRef>;
  onNavigateScreener?: () => void;
};

/** FlatList ヘッダー内で保有銘柄カードを全件表示（ListHeader 過大で items が描画されない問題を回避） */
export function PortfolioHoldingsCardsSection({
  holdings,
  portfolio,
  portfolioById,
  portfolioStateLength,
  isPractice,
  readOnly,
  actionsRef,
  onNavigateScreener,
}: Props) {
  const { renderItem } = usePortfolioHoldingsListModel({
    holdings,
    portfolioById,
    isPractice,
    readOnly,
    actionsRef,
  });

  useEffect(() => {
    const payload = {
      displayCount: holdings.length,
      activePortfolioCount: portfolio.length,
      statePortfolioLength: portfolioStateLength,
    };
    console.warn('[PortfolioHoldings]', JSON.stringify(payload));
  }, [holdings.length, portfolio.length, portfolioStateLength]);

  if (holdings.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.sectionTitle}>保有銘柄一覧</Text>
        <Text style={styles.emptyTitle}>現在保有銘柄はありません</Text>
        <Text style={styles.muted}>
          {isPractice
            ? '「おすすめ配分」または「仮想買付」から取引してください。'
            : '銘柄検索から追加するか、候補銘柄から「購入」で記録してください。'}
        </Text>
        {!isPractice && onNavigateScreener ? (
          <Button label="銘柄検索へ" onPress={onNavigateScreener} />
        ) : null}
      </Card>
    );
  }

  return (
    <View style={styles.section} accessibilityLabel="保有銘柄一覧">
      <Text style={styles.sectionTitle} accessibilityRole="header" accessibilityLabel="保有銘柄一覧">
        保有銘柄一覧（{holdings.length}件）
      </Text>
      {holdings.map((h, index) => (
        <View key={h.positionId} style={styles.cardWrap}>
          {renderItem({
            item: h,
            index,
            separators: {
              highlight: () => {},
              unhighlight: () => {},
              updateProps: () => {},
            },
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.md },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.fontSize.lg,
  },
  cardWrap: { gap: theme.spacing.sm },
  emptyCard: { gap: theme.spacing.sm },
  emptyTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  muted: { color: theme.colors.textMuted, lineHeight: 20, fontSize: theme.fontSize.sm },
});
