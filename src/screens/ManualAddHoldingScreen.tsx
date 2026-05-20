import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MarketPicker } from '../components/MarketPicker';
import { LIVE_ANALYSIS_BUY_GUIDANCE_JA, MANUAL_HOLDING_SUCCESS_JA } from '../constants/holdingErrors';
import { Button } from '../components/ui/Button';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import type { Currency, Market } from '../types';

function currencyForMarket(market: Market): Currency {
  if (market === 'us') return 'USD';
  if (market === 'hk') return 'HKD';
  return 'MYR';
}
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function ManualAddHoldingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { state, addManualHolding, readOnlyBlockedMessage } = useApp();
  const [market, setMarket] = useState<Market>(state.settings.selectedMarket);
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('100');
  const [avgPrice, setAvgPrice] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const shareNum = Number(shares) || 0;
  const priceNum = Number(avgPrice) || 0;

  const onSave = async () => {
    setSaving(true);
    try {
      const result = await addManualHolding({
        symbol,
        market,
        currency: currencyForMarket(market),
        shares: shareNum,
        averageBuyPrice: priceNum,
        memo: memo.trim() || undefined,
      });
      if (!result.ok) {
        Alert.alert('追加できません', result.error ?? '不明なエラー');
        return;
      }
      Alert.alert('完了', MANUAL_HOLDING_SUCCESS_JA, [
        { text: '保有銘柄を見る', onPress: () => navigation.navigate('MainTabs', { screen: 'Portfolio' }) },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="手動で保有銘柄に追加"
      subtitle="証券会社で約定した買付を記録 — 注文送信は行いません"
    >
      <Text style={styles.guidance}>{LIVE_ANALYSIS_BUY_GUIDANCE_JA}</Text>
      {readOnlyBlockedMessage ? (
        <Text style={styles.warn}>{readOnlyBlockedMessage}</Text>
      ) : null}

      <MarketPicker selected={market} onSelect={setMarket} />

      <Text style={styles.label}>銘柄</Text>
      <TextInput
        style={styles.input}
        value={symbol}
        onChangeText={setSymbol}
        placeholder="1155 / AAPL / 0700"
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="characters"
        editable={!saving}
      />

      <Text style={styles.label}>数量</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={shares}
        onChangeText={setShares}
        placeholder="株数"
        placeholderTextColor={theme.colors.textMuted}
        editable={!saving}
      />

      <Text style={styles.label}>平均取得価格</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={avgPrice}
        onChangeText={setAvgPrice}
        placeholder="約定単価"
        placeholderTextColor={theme.colors.textMuted}
        editable={!saving}
      />

      <Text style={styles.label}>通貨</Text>
      <Text style={styles.currency}>{currencyForMarket(market)}</Text>

      <Text style={styles.label}>メモ（任意）</Text>
      <TextInput
        style={[styles.input, styles.memo]}
        value={memo}
        onChangeText={setMemo}
        placeholder="例: Rakuten Tradeで約定"
        placeholderTextColor={theme.colors.textMuted}
        multiline
        editable={!saving}
      />

      <Button
        label={saving ? '保存中…' : '保有銘柄に追加'}
        onPress={() => void onSave()}
        disabled={saving || !symbol.trim() || shareNum <= 0 || priceNum <= 0}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  guidance: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  label: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    marginTop: theme.spacing.xs,
  },
  memo: { minHeight: 72, textAlignVertical: 'top' },
  currency: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
});
