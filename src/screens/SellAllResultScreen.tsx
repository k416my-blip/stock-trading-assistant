import { StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../constants/rakutenTrade';
import { TermHint } from '../components/TermHint';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { SELL_ALL_MANUAL_WARNING } from '../services/sellAllHoldings';
import type { RootStackParamList } from '../navigation/types';
import { stockListKey } from '../utils/reactKeys';
import { formatFixed, safeNumber } from '../utils/safeNumeric';
import { theme } from '../theme';

export function SellAllResultScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SellAllResult'>>();
  const { result } = route.params;
  const isPractice = result.mode === 'practice';

  return (
    <Screen
      title={isPractice ? '仮想売却完了' : '手動売却リスト作成'}
      subtitle="すべて売却の結果"
    >
      <Card>
        <TermHint term="sellAll" />
        {isPractice ? <TermHint term="realizedPnL" /> : null}
      </Card>

      {!isPractice ? (
        <Card>
          <Text style={styles.warn}>{SELL_ALL_MANUAL_WARNING}</Text>
        </Card>
      ) : null}

      <Text style={styles.section}>売却予定一覧</Text>
      {result.items.map((item, index) => (
        <Card key={stockListKey(item.market, item.symbol, index)}>
          {item.skipped ? (
            <Text style={styles.skipped}>スキップ: {item.name}</Text>
          ) : (
            <>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.row}>銘柄: {item.name}</Text>
              <Text style={styles.row}>保有株数: {item.shares}株</Text>
              <Text style={styles.row}>
                現在株価: {CURRENCY_SYMBOL[item.currency]}
                {formatFixed(item.currentPrice, 2)}
              </Text>
              <Text style={styles.row}>
                目安売却金額: RM{item.estimatedProceedsMYR.toLocaleString('ja-JP', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
              {!isPractice ? (
                <Text style={styles.row}>注文方法: Rakuten Tradeで手動売却</Text>
              ) : null}
              {item.realizedPnLMYR != null ? (
                <Text
                  style={[
                    styles.pnl,
                    item.realizedPnLMYR >= 0 ? styles.profit : styles.loss,
                  ]}
                >
                  実現損益: {item.realizedPnLMYR >= 0 ? '+' : ''}RM
                  {formatFixed(item.realizedPnLMYR, 2)}
                </Text>
              ) : null}
            </>
          )}
          {item.skipReason ? <Text style={styles.muted}>{item.skipReason}</Text> : null}
        </Card>
      ))}

      <Card>
        <Text style={styles.summaryLabel}>合計売却予定額</Text>
        <Text style={styles.summaryValue}>
          RM
          {result.totalProceedsMYR.toLocaleString('ja-JP', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        {isPractice ? (
          <>
            <Text style={[styles.summaryLabel, styles.summaryGap]}>実現損益（合計）</Text>
            <Text
              style={[
                styles.summaryValue,
                result.totalRealizedPnLMYR >= 0 ? styles.profit : styles.loss,
              ]}
            >
              {result.totalRealizedPnLMYR >= 0 ? '+' : ''}RM
              {formatFixed(result.totalRealizedPnLMYR, 2)}
            </Text>
          </>
        ) : null}
        {result.skippedCount > 0 ? (
          <Text style={styles.muted}>スキップ: {result.skippedCount}件</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.done}>
          {isPractice ? '売却完了' : '手動売却リストを作成しました'}
        </Text>
        <Text style={styles.muted}>
          {isPractice
            ? `${result.soldCount}銘柄の仮想売却を記録し、保有をクリアしました。`
            : `${result.soldCount}件を手動注文リストに追加しました。`}
        </Text>
      </Card>

      <Button label="保有銘柄に戻る" onPress={() => navigation.navigate('MainTabs', { screen: 'Portfolio' })} />
      {!isPractice ? (
        <Button
          label="手動注文リストを開く"
          onPress={() => navigation.navigate('ManualOrderList')}
          variant="ghost"
        />
      ) : (
        <Button
          label="売買履歴を見る"
          onPress={() => navigation.navigate('MainTabs', { screen: 'History' })}
          variant="ghost"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  name: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  row: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 20 },
  skipped: { color: theme.colors.textMuted, fontWeight: '600' },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  pnl: { marginTop: theme.spacing.sm, fontWeight: '600' },
  profit: { color: theme.colors.success },
  loss: { color: theme.colors.danger },
  summaryLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  summaryGap: { marginTop: theme.spacing.md },
  summaryValue: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.xl, marginTop: 4 },
  done: { color: theme.colors.success, fontWeight: '700', fontSize: theme.fontSize.lg },
});
