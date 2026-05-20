import { StyleSheet, Text } from 'react-native';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { CURRENCY_SYMBOL } from '../../constants/rakutenTrade';
import { theme } from '../../theme';

const MARKET_CURRENCIES = [
  { market: 'バルサ・マレーシア', currency: 'MYR', symbol: CURRENCY_SYMBOL.MYR },
  { market: '米国', currency: 'USD', symbol: CURRENCY_SYMBOL.USD },
  { market: '香港', currency: 'HKD', symbol: CURRENCY_SYMBOL.HKD },
] as const;

export function CurrencySettingsScreen() {
  return (
    <Screen title="通貨設定" subtitle="表示と取引通貨の目安">
      <Card>
        <Text style={styles.label}>基準通貨（表示）</Text>
        <Text style={styles.value}>マレーシアリンギット（MYR）</Text>
        <Text style={styles.hint}>
          資産・損益・買付余力は MYR（{CURRENCY_SYMBOL.MYR}）でまとめて表示します。
        </Text>
      </Card>

      <Card>
        <Text style={styles.label}>市場ごとの取引通貨</Text>
        {MARKET_CURRENCIES.map((row) => (
          <Text key={row.market} style={styles.row}>
            {row.market}: {row.currency}（{row.symbol}）
          </Text>
        ))}
        <Text style={styles.hint}>
          為替は参考レートで MYR に換算しています。実際の注文は Rakuten Trade の表示を確認してください。
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600' },
  value: { color: theme.colors.text, fontSize: theme.fontSize.lg, fontWeight: '700', marginTop: 4 },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.md },
  row: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
});
