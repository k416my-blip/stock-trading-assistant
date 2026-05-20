import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MarketPicker } from '../components/MarketPicker';
import { Button } from '../components/ui/Button';
import { Screen } from '../components/ui/Screen';
import { findStock } from '../data/sampleStocks';
import { useApp } from '../context/AppContext';
import type { Market } from '../types';
import { theme } from '../theme';

export function AddDividendScreen() {
  const navigation = useNavigation();
  const { state, addDividend } = useApp();
  const [market, setMarket] = useState<Market>(state.settings.selectedMarket);
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');

  return (
    <Screen title="配当記録" subtitle="Rakuten Tradeで受取後に手動記録">
      <MarketPicker selected={market} onSelect={setMarket} />
      <TextInput
        style={styles.input}
        value={symbol}
        onChangeText={setSymbol}
        placeholder="銘柄コード"
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="characters"
      />
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="配当額"
        placeholderTextColor={theme.colors.textMuted}
      />
      <Button
        label="配当を保存"
        onPress={() => {
          const stock = findStock(symbol);
          const amt = Number(amount);
          if (!stock || amt <= 0) return;
          addDividend({
            symbol: stock.symbol,
            market: stock.market,
            currency: stock.currency,
            amount: amt,
            receivedAt: new Date().toISOString().slice(0, 10),
          });
          navigation.goBack();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
  },
});
