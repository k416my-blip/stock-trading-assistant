import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../constants/rakutenTrade';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import { tradeSideLabel } from '../i18n/ja';
import type { RootStackParamList } from '../navigation/types';
import { recordListKey } from '../utils/reactKeys';
import { theme } from '../theme';

export function TradeHistoryScreen() {
  const { state, isPractice } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const trades = isPractice ? state.practice.trades : state.trades;
  const pendingManual = state.manualOrderList.filter((i) => !i.completed).length;

  return (
    <Screen
      title="売買履歴"
      subtitle={isPractice ? '仮想取引の記録' : 'Rakuten Tradeでの手動約定の記録'}
    >
      {isPractice ? <PracticeModeBadge /> : null}
      <Button
        label={isPractice ? '仮想買付・仮想売却' : '新しい売買を記録'}
        onPress={() => navigation.navigate('AddTrade')}
      />
      {!isPractice ? (
        <Button
          label={`手動注文リスト${pendingManual > 0 ? `（未完了${pendingManual}件）` : ''}`}
          onPress={() => navigation.navigate('ManualOrderList')}
          variant="ghost"
        />
      ) : null}

      {trades.length === 0 ? (
        <Card>
          <Text style={styles.muted}>売買履歴はまだありません。</Text>
        </Card>
      ) : (
        trades.map((t, index) => (
          <Card key={recordListKey(t.id, index)}>
            <Text style={styles.symbol}>
              {isPractice && t.side === 'buy' ? '仮想買付' : isPractice && t.side === 'sell' ? '仮想売却' : tradeSideLabel[t.side]}{' '}
              {t.symbol} · {MARKET_LABEL[t.market]}
            </Text>
            <Text style={styles.muted}>
              {t.shares}株 @ {CURRENCY_SYMBOL[t.currency]}
              {t.price} · 手数料 {CURRENCY_SYMBOL[t.currency]}
              {t.brokerageFee.toFixed(2)}
            </Text>
            {t.realizedPnLMYR != null ? (
              <Text style={[styles.pnl, t.realizedPnLMYR >= 0 ? styles.profit : styles.loss]}>
                実現損益: {t.realizedPnLMYR >= 0 ? '+' : ''}RM{t.realizedPnLMYR.toFixed(2)}
              </Text>
            ) : null}
            <Text style={styles.muted}>{new Date(t.executedAt).toLocaleDateString('ja-JP')}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  symbol: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.lg },
  muted: { color: theme.colors.textMuted, marginTop: 4, fontSize: theme.fontSize.sm },
  pnl: { marginTop: 6, fontWeight: '600' },
  profit: { color: theme.colors.success },
  loss: { color: theme.colors.danger },
});
