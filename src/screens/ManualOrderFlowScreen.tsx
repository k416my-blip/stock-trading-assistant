import { useMemo, useState, useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MarketPicker } from '../components/MarketPicker';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { MANUAL_ORDER_WARNING } from '../services/allocationActions';
import {
  DEVICE_VERIFY_TEST_IDS,
  formatCreateBlockedProbe,
  formatCreateErrorProbe,
  formatCreateSuccessProbe,
  DEVICE_VERIFY_CREATE_READY_LABEL,
  formatManualOrderFormProbe,
} from '../constants/deviceVerifyTestIds';
import { consumeE2eManualOrderFormSeed } from '../services/e2eManualOrderFormSeed';
import { writePendingManualOrderProbe } from '../services/manualOrderVerification';
import { useApp } from '../context/AppContext';
import {
  buildManualOrderFlowItems,
  manualOrderFlowModeTitleKey,
  type ManualOrderFlowMode,
} from '../services/manualOrderFlow';
import { resolveLatestInvestableDepositMYR } from '../services/resolveLatestInvestableDepositMYR';
import type { Market } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';

type FlowRoute = RouteProp<RootStackParamList, 'ManualOrderFlow'>;

export function ManualOrderFlowScreen() {
  const { t } = useTranslation('home');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<FlowRoute>();
  const mode = route.params.mode;
  const { state, isPractice, addManualBuyOrders, readOnlyBlockedMessage } = useApp();

  const [market, setMarket] = useState<Market>(state.settings.selectedMarket);
  const [deposit, setDeposit] = useState(() =>
    String(Math.max(100, resolveLatestInvestableDepositMYR(state, isPractice))),
  );
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('100');
  const [entryPrice, setEntryPrice] = useState('');
  const [inputMode, setInputMode] = useState<'amount' | 'shares'>('amount');
  const [busy, setBusy] = useState(false);
  const [createVerifyProbe, setCreateVerifyProbe] = useState(DEVICE_VERIFY_CREATE_READY_LABEL);

  const logCreate = (phase: string, detail: string) => {
    console.warn(`[ManualOrderFlow/${mode}] ${phase}: ${detail}`);
  };

  useEffect(() => {
    void (async () => {
      const seed = await consumeE2eManualOrderFormSeed(mode);
      if (!seed) return;
      logCreate('e2e-seed-applied', JSON.stringify(seed));
      if (seed.symbol != null) setSymbol(String(seed.symbol));
      if (seed.shares != null) setShares(String(seed.shares));
      if (seed.deposit != null) setDeposit(String(seed.deposit));
      if (seed.inputMode) setInputMode(seed.inputMode);
      if (seed.market) setMarket(seed.market);
    })();
  }, [mode]);

  const title = t(manualOrderFlowModeTitleKey(mode));
  const subtitle = t(`manualOrderFlow.${modeToKey(mode)}.subtitle`);

  const showDeposit = mode === 'concierge_full' || mode === 'concierge_quantity' || (mode === 'concierge_symbol' && inputMode === 'amount');
  const showShares = mode === 'manual_full' || (mode === 'concierge_symbol' && inputMode === 'shares');
  const showSymbol = mode === 'manual_full' || mode === 'concierge_quantity';
  const showEntryPrice = mode === 'manual_full';
  const showInputToggle = mode === 'concierge_symbol';

  const formValidation = useMemo(() => {
    const preview = buildManualOrderFlowItems({
      mode,
      market,
      depositMYR: showDeposit ? Number(deposit) || 0 : inputMode === 'amount' ? Number(deposit) || 0 : 0,
      symbol,
      shares: showShares || (mode === 'concierge_symbol' && inputMode === 'shares') ? Number(shares) || 0 : 0,
      entryPrice: entryPrice ? Number(entryPrice) : undefined,
    });
    return preview.ok ? 'ok' : preview.error;
  }, [mode, market, deposit, symbol, shares, entryPrice, inputMode, showDeposit, showShares]);

  const formProbeLabel = useMemo(
    () =>
      formatManualOrderFormProbe({
        mode,
        symbol: symbol.trim() || '(empty)',
        shares: shares.trim() || '(empty)',
        side: 'buy',
        market,
        amount: deposit,
        inputMode,
        createEnabled: !busy && !readOnlyBlockedMessage,
        validation: formValidation,
      }),
    [mode, symbol, shares, market, deposit, inputMode, busy, readOnlyBlockedMessage, formValidation],
  );

  const logPreSubmitState = (showDep: boolean, showShr: boolean) => {
    const preview = buildManualOrderFlowItems({
      mode,
      market,
      depositMYR: showDep ? Number(deposit) || 0 : inputMode === 'amount' ? Number(deposit) || 0 : 0,
      symbol,
      shares: showShr || (mode === 'concierge_symbol' && inputMode === 'shares') ? Number(shares) || 0 : 0,
      entryPrice: entryPrice ? Number(entryPrice) : undefined,
    });
    logCreate(
      'pre-submit',
      JSON.stringify({
        mode,
        symbol: symbol.trim(),
        shares: Number(shares) || 0,
        side: 'buy',
        market,
        amount: Number(deposit) || 0,
        createEnabled: !busy && !readOnlyBlockedMessage,
        validation: preview.ok ? 'ok' : preview.error,
        submitHandler: 'about-to-call',
      }),
    );
  };

  const onCreate = () => {
    logCreate('submit-called', 'onPressCreateManualOrder');
    logPreSubmitState(showDeposit, showShares);

    if (readOnlyBlockedMessage) {
      logCreate('blocked-readonly', readOnlyBlockedMessage);
      setCreateVerifyProbe(formatCreateErrorProbe(`readonly:${readOnlyBlockedMessage}`));
      Alert.alert(t('manualOrderFlow.cannotCreateTitle'), readOnlyBlockedMessage);
      return;
    }

    setBusy(true);
    try {
      const built = buildManualOrderFlowItems({
        mode,
        market,
        depositMYR: showDeposit ? Number(deposit) || 0 : inputMode === 'amount' ? Number(deposit) || 0 : 0,
        symbol,
        shares: showShares || (mode === 'concierge_symbol' && inputMode === 'shares') ? Number(shares) || 0 : 0,
        entryPrice: entryPrice ? Number(entryPrice) : undefined,
      });
    if (!built.ok) {
      logCreate('build-fail', built.error);
      setCreateVerifyProbe(formatCreateErrorProbe(built.error));
      setBusy(false);
      Alert.alert(t('manualOrderFlow.cannotCreateTitle'), built.error);
      return;
    }
    const added = addManualBuyOrders(built.items);
    if (!added.ok) {
      const err = added.error ?? t('manualOrderFlow.createFailed');
      logCreate('add-fail', err);
      setCreateVerifyProbe(formatCreateErrorProbe(err));
      setBusy(false);
      Alert.alert(t('manualOrderFlow.cannotCreateTitle'), err);
      return;
    }
      logCreate('ok', `added=${added.addedCount ?? built.items.length} practice=${isPractice}`);
      setCreateVerifyProbe(formatCreateSuccessProbe(added.addedCount ?? built.items.length));
      void writePendingManualOrderProbe([
        ...built.items,
        ...state.manualOrderList,
      ]);
      Alert.alert(
        t('manualOrderFlow.createdTitle'),
        t('manualOrderFlow.createdBody', { count: added.addedCount ?? built.items.length }),
        [
          { text: t('trust.viewList'), onPress: () => navigation.navigate('ManualOrderList') },
          { text: t('trust.ok'), onPress: () => navigation.goBack() },
        ],
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logCreate('unexpected-fail', msg);
      setCreateVerifyProbe(formatCreateErrorProbe(msg));
      Alert.alert(t('manualOrderFlow.cannotCreateTitle'), msg);
    } finally {
      setBusy(false);
    }
  };

  const applyE2eSeed = () => {
    if (mode === 'manual_full') {
      logCreate('e2e-seed-tap', JSON.stringify({ symbol: '1155', shares: '100', market: 'bursa' }));
      setSymbol('1155');
      setShares('100');
      setMarket('bursa');
      return;
    }
    if (mode === 'concierge_symbol') {
      logCreate('e2e-seed-tap', JSON.stringify({ deposit: '2000', market: 'bursa', inputMode: 'amount' }));
      setInputMode('amount');
      setDeposit('2000');
      setMarket('bursa');
    }
  };

  const hint = useMemo(() => t(`manualOrderFlow.${modeToKey(mode)}.hint`), [mode, t]);

  return (
    <Screen title={title} subtitle={subtitle}>
      <Card>
        <Text style={styles.disclaimer}>{MANUAL_ORDER_WARNING}</Text>
      </Card>

      {readOnlyBlockedMessage ? <Text style={styles.warn}>{readOnlyBlockedMessage}</Text> : null}

      {mode === 'manual_full' ? (
        <View
          testID={DEVICE_VERIFY_TEST_IDS.manualOrderSideBuy}
          accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderSideBuy}
          accessible
          importantForAccessibility="yes"
          style={styles.createReadyProbe}
        />
      ) : null}

      {mode === 'manual_full' || mode === 'concierge_symbol' ? (
        <Pressable
          testID="manual-order-e2e-apply-seed"
          accessibilityLabel="manual-order-e2e-apply-seed"
          onPress={applyE2eSeed}
          style={styles.createReadyProbe}
        />
      ) : null}

      <MarketPicker selected={market} onSelect={setMarket} />

      {showInputToggle ? (
        <View style={styles.toggleRow}>
          <Button
            label={t('manualOrderFlow.inputAmount')}
            variant={inputMode === 'amount' ? 'primary' : 'ghost'}
            onPress={() => setInputMode('amount')}
          />
          <Button
            label={t('manualOrderFlow.inputShares')}
            variant={inputMode === 'shares' ? 'primary' : 'ghost'}
            onPress={() => setInputMode('shares')}
          />
        </View>
      ) : null}

      {showDeposit ? (
        <>
          <Text style={styles.label}>{t('manualOrderFlow.depositLabel')}</Text>
          <TextInput
            style={styles.input}
            value={deposit}
            onChangeText={setDeposit}
            keyboardType="numeric"
            placeholder="1000"
            placeholderTextColor={theme.colors.textMuted}
            editable={!busy}
            testID={DEVICE_VERIFY_TEST_IDS.manualOrderInputDeposit}
            accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderDepositInput}
          />
        </>
      ) : null}

      {showSymbol ? (
        <>
          <Text style={styles.label}>{t('manualOrderFlow.symbolLabel')}</Text>
          <TextInput
            style={styles.input}
            value={symbol}
            onChangeText={setSymbol}
            placeholder="1155"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
            editable={!busy}
            testID={DEVICE_VERIFY_TEST_IDS.manualOrderInputSymbol}
            accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderSymbolInput}
          />
        </>
      ) : null}

      {showShares ? (
        <>
          <Text style={styles.label}>{t('manualOrderFlow.sharesLabel')}</Text>
          <TextInput
            style={styles.input}
            value={shares}
            onChangeText={setShares}
            keyboardType="numeric"
            placeholder="100"
            placeholderTextColor={theme.colors.textMuted}
            editable={!busy}
            testID={DEVICE_VERIFY_TEST_IDS.manualOrderInputShares}
            accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderSharesInput}
          />
        </>
      ) : null}

      {showEntryPrice ? (
        <>
          <Text style={styles.label}>{t('manualOrderFlow.entryPriceLabel')}</Text>
          <TextInput
            style={styles.input}
            value={entryPrice}
            onChangeText={setEntryPrice}
            keyboardType="decimal-pad"
            placeholder={t('manualOrderFlow.entryPriceOptional')}
            placeholderTextColor={theme.colors.textMuted}
            editable={!busy}
          />
        </>
      ) : null}

      <Text style={styles.hint}>{hint}</Text>

      <View
        testID="manual-order-form-state"
        accessibilityLabel={formProbeLabel}
        accessible
        importantForAccessibility="yes"
        style={styles.createReadyProbe}
      />

      <View
        testID={DEVICE_VERIFY_TEST_IDS.manualOrderCreateReady}
        accessibilityLabel={
          readOnlyBlockedMessage
            ? formatCreateBlockedProbe('readonly')
            : createVerifyProbe
        }
        accessible
        importantForAccessibility="yes"
        style={styles.createReadyProbe}
      />

      <Button
        label={busy ? t('manualOrderFlow.creating') : t('manualOrderFlow.createList')}
        onPress={onCreate}
        disabled={busy}
        testID={DEVICE_VERIFY_TEST_IDS.manualOrderCreate(mode)}
        accessibilityLabel={`${DEVICE_VERIFY_TEST_IDS.manualOrderCreate(mode)}:${busy ? 'disabled' : 'enabled'}`}
      />
      <Button label={t('manualOrderFlow.backHome')} onPress={() => navigation.goBack()} variant="ghost" />
    </Screen>
  );
}

function modeToKey(mode: ManualOrderFlowMode): string {
  switch (mode) {
    case 'concierge_full':
      return 'conciergeFull';
    case 'manual_full':
      return 'manualFull';
    case 'concierge_symbol':
      return 'conciergeSymbol';
    case 'concierge_quantity':
      return 'conciergeQuantity';
    default:
      return 'conciergeFull';
  }
}

const styles = StyleSheet.create({
  disclaimer: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  warn: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginVertical: theme.spacing.md,
  },
  createReadyProbe: {
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});
