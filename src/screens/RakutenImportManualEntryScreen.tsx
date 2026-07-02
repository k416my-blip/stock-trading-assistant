import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MarketPicker } from '../components/MarketPicker';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { BROKER_NAME } from '../constants/rakutenTrade';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import type { Currency, Market } from '../types';
import type { RakutenImportManualFormInput } from '../types/rakutenImport';
import { findImportCandidate } from '../services/rakutenImport/rakutenImportStagingStorage';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';

type ImportKind = RakutenImportManualFormInput['type'];

function currencyForMarket(market: Market): Currency {
  if (market === 'us') return 'USD';
  if (market === 'hk') return 'HKD';
  return 'MYR';
}

export function RakutenImportManualEntryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'RakutenImportManualEntry'>>();
  const { state, stageRakutenImportManual, readOnlyBlockedMessage } = useApp();
  const { t } = useTranslation('rakutenImport');

  const [kind, setKind] = useState<ImportKind>(params?.kind ?? 'deposit');
  const [amount, setAmount] = useState('500');
  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<Market>(state.settings.selectedMarket);
  const [quantity, setQuantity] = useState('100');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('0');
  const [executedDate, setExecutedDate] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const candidateId = params?.candidateId;
    if (!candidateId) return;
    void findImportCandidate(candidateId, { activeOnly: true }).then((found) => {
      const c = found?.candidate;
      if (!c) return;
      if (c.type === 'deposit' || c.type === 'buy' || c.type === 'sell') {
        setKind(c.type);
      }
      if (c.type === 'deposit' && c.totalMYR != null) {
        setAmount(String(c.totalMYR));
      }
      if (c.executedAt) {
        setExecutedDate(c.executedAt.slice(0, 10));
      }
      if (c.symbol) setSymbol(c.symbol);
      if (c.market) setMarket(c.market);
      if (c.quantity != null) setQuantity(String(c.quantity));
      if (c.price != null) setPrice(String(c.price));
      if (c.fee != null) setFee(String(c.fee));
      if (c.referenceNumber) setReferenceNumber(c.referenceNumber);
      if (c.userNote) setNote(c.userNote);
    });
  }, [params?.candidateId]);

  const guidance = useMemo(() => {
    switch (kind) {
      case 'deposit':
        return t('manual.guidanceDeposit');
      case 'buy':
        return t('manual.guidanceBuy');
      case 'sell':
        return t('manual.guidanceSell');
    }
  }, [kind, t]);

  const buildInput = (): RakutenImportManualFormInput | null => {
    const executedAt = `${executedDate}T12:00:00.000Z`;
    if (kind === 'deposit') {
      const amountMYR = Number(amount);
      if (!Number.isFinite(amountMYR) || amountMYR <= 0) return null;
      return {
        type: 'deposit',
        amountMYR,
        executedAt,
        referenceNumber: referenceNumber.trim() || undefined,
        note: note.trim() || undefined,
      };
    }
    const qty = Number(quantity);
    const px = Number(price);
    if (!symbol.trim() || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(px) || px <= 0) {
      return null;
    }
    const base = {
      symbol: symbol.trim(),
      market,
      currency: currencyForMarket(market),
      quantity: qty,
      price: px,
      fee: Number(fee) || 0,
      executedAt,
      referenceNumber: referenceNumber.trim() || undefined,
      note: note.trim() || undefined,
    };
    return kind === 'buy' ? { type: 'buy', ...base } : { type: 'sell', ...base };
  };

  const onContinue = async () => {
    const input = buildInput();
    if (!input) {
      Alert.alert(t('alerts.inputMissingTitle'), t('alerts.inputMissingMessage'));
      return;
    }
    setBusy(true);
    try {
      const result = await stageRakutenImportManual(input);
      if (!result.ok) {
        Alert.alert(t('alerts.errorTitle'), result.error);
        return;
      }
      navigation.navigate('RakutenImportConfirm', { candidateId: result.candidateId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={t('manual.title')}
      subtitle={t('manual.subtitle', { broker: BROKER_NAME })}
    >
      <Text style={styles.guidance}>{guidance}</Text>
      {readOnlyBlockedMessage ? <Text style={styles.warn}>{readOnlyBlockedMessage}</Text> : null}

      <View style={styles.kindRow}>
        {(['deposit', 'buy', 'sell'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setKind(k)}
            style={[styles.kindChip, kind === k && styles.kindChipActive]}
          >
            <Text style={[styles.kindChipText, kind === k && styles.kindChipTextActive]}>
              {k === 'deposit' ? t('manual.kindDeposit') : k === 'buy' ? t('manual.kindBuy') : t('manual.kindSell')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={styles.label}>{t('manual.executedDateLabel')}</Text>
        <TextInput
          style={styles.input}
          value={executedDate}
          onChangeText={setExecutedDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textMuted}
        />

        {kind === 'deposit' ? (
          <>
            <Text style={styles.label}>入金額 (MYR)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
          </>
        ) : (
          <>
            <MarketPicker selected={market} onSelect={setMarket} />
            <Text style={styles.label}>銘柄コード</Text>
            <TextInput
              style={styles.input}
              value={symbol}
              onChangeText={setSymbol}
              autoCapitalize="characters"
              placeholder="1155 / AAPL"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={styles.label}>数量</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={styles.label}>約定単価</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={styles.label}>手数料（任意）</Text>
            <TextInput
              style={styles.input}
              value={fee}
              onChangeText={setFee}
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.textMuted}
            />
          </>
        )}

        <Text style={styles.label}>参照番号（任意）</Text>
        <TextInput
          style={styles.input}
          value={referenceNumber}
          onChangeText={setReferenceNumber}
          placeholderTextColor={theme.colors.textMuted}
        />
        <Text style={styles.label}>メモ（任意）</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholderTextColor={theme.colors.textMuted}
        />
      </Card>

      <Button
        label={busy ? t('manual.processing') : t('manual.continue')}
        onPress={() => void onContinue()}
        disabled={busy || !!readOnlyBlockedMessage}
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
  warn: {
    color: theme.colors.warning,
    marginBottom: theme.spacing.sm,
  },
  kindRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  kindChip: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  kindChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}22`,
  },
  kindChipText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  kindChipTextActive: {
    color: theme.colors.primary,
  },
  label: {
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
});
