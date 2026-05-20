import { StyleSheet, Text } from 'react-native';
import { MarketPicker } from '../../components/MarketPicker';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { MARKET_LABEL } from '../../constants/rakutenTrade';
import { useApp } from '../../context/AppContext';
import type { Market } from '../../types';
import { theme } from '../../theme';

export function MarketSettingsScreen() {
  const { state, updateSettings } = useApp();
  const market = state.settings.selectedMarket;

  const onSelect = (m: Market) => {
    updateSettings({ selectedMarket: m });
  };

  return (
    <Screen title="市場設定" subtitle="銘柄検索・配分プランの初期市場">
      <Card>
        <Text style={styles.hint}>よく使う市場を選んでください。各画面でも変更できます。</Text>
        <MarketPicker selected={market} onSelect={onSelect} />
        <Text style={styles.current}>現在: {MARKET_LABEL[market]}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginBottom: theme.spacing.md },
  current: { color: theme.colors.text, fontWeight: '600', marginTop: theme.spacing.md, fontSize: theme.fontSize.sm },
});
