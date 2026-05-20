import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../constants/rakutenTrade';
import { SELL_ALL_PRICE_MISSING } from '../services/sellAllHoldings';
import type { SellAllPriceInput } from '../services/sellAllHoldings';
import { Button } from './ui/Button';
import { theme } from '../theme';

type Props = {
  visible: boolean;
  holding: SellAllPriceInput | null;
  priceInput: string;
  onChangePrice: (text: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onCancel: () => void;
};

export function SellAllMissingPriceModal({
  visible,
  holding,
  priceInput,
  onChangePrice,
  onSubmit,
  onSkip,
  onCancel,
}: Props) {
  if (!holding) return null;

  const sym = CURRENCY_SYMBOL[holding.currency];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{SELL_ALL_PRICE_MISSING}</Text>
          <Text style={styles.name}>
            {holding.name}（{holding.symbol}）
          </Text>
          <Text style={styles.row}>市場: {MARKET_LABEL[holding.market]}</Text>
          <Text style={styles.row}>保有株数: {holding.shares}株</Text>
          <Text style={styles.hint}>売却価格を入力するか、この銘柄をスキップできます。</Text>
          <TextInput
            style={styles.input}
            value={priceInput}
            onChangeText={onChangePrice}
            keyboardType="decimal-pad"
            placeholder={`例: ${sym}12.50`}
            placeholderTextColor={theme.colors.textMuted}
          />
          <Button label="この価格で売却" onPress={onSubmit} />
          <Button label="この銘柄をスキップ" onPress={onSkip} variant="ghost" />
          <Button label="キャンセル" onPress={onCancel} variant="ghost" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  title: { color: theme.colors.warning, fontWeight: '700', fontSize: theme.fontSize.md },
  name: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg },
  row: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    marginVertical: theme.spacing.xs,
  },
});
