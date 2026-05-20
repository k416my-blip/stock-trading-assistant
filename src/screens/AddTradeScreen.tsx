import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MarketPicker } from '../components/MarketPicker';
import { MarketSessionPanel } from '../components/MarketSessionPanel';
import { useMarketSession } from '../hooks/useMarketSession';
import { CLOSED_TRADE_WARNING } from '../constants/marketSession';
import { EXECUTION_SAFETY_MESSAGES } from '../constants/executionSafety';
import { BrokerageFeeCard } from '../components/BrokerageFeeCard';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { TermHint } from '../components/TermHint';
import { Button } from '../components/ui/Button';
import { Screen } from '../components/ui/Screen';
import { findStock, getStocksByMarket } from '../data/sampleStocks';
import { useApp } from '../context/AppContext';
import { getBrokerageEstimate } from '../services/brokerage';
import { enrichInstitutionalRiskWithBehavioral } from '../services/behavioralRiskOrchestratorService';
import { enrichInstitutionalRiskWithMetaCapital } from '../services/metaCapitalOrchestratorService';
import { enrichInstitutionalRiskWithModelStability } from '../services/modelStabilityOrchestratorService';
import { appendManualOverride } from '../services/behavioralRiskStorage';
import { buildInstitutionalRiskInputFromApp } from '../services/institutionalRiskControlEngine';
import { assessExecutionMarketData } from '../services/executionSafetyGate';
import { toMYR } from '../services/fx';
import { validateTradeIntent } from '../services/tradeExecutionGate';
import { confirmPersonalPracticeTrade } from '../utils/personalDecisionGate';
import { PERSONAL_DECISION_GATE } from '../constants/personalUse';
import {
  HOLDING_ERRORS,
  LIVE_ANALYSIS_BUY_GUIDANCE_JA,
} from '../constants/holdingErrors';
import {
  liveAnalysisBuyBlockedMessage,
  shouldBlockLiveAnalysisBuy,
} from '../services/holdingFlow';
import type { Currency, Market, TradeRecord } from '../types';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

function currencyForMarket(market: Market): Currency {
  if (market === 'us') return 'USD';
  if (market === 'hk') return 'HKD';
  return 'MYR';
}

export function AddTradeScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'AddTrade'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    state,
    isPractice,
    addPracticeTrade,
    submitTradeWithExecutionSafety,
    buyingPower,
    practiceStats,
    marketRegime,
    aiLearningState,
    killSwitches,
    readOnlyBlockedMessage,
  } = useApp();

  const [market, setMarket] = useState<Market>(params?.market ?? state.settings.selectedMarket);
  const [symbol, setSymbol] = useState(params?.symbol ?? '');
  const [side, setSide] = useState<TradeRecord['side']>('buy');
  const [shares, setShares] = useState('100');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stock = symbol ? findStock(symbol) : undefined;
  const shareNum = Number(shares) || 0;
  const priceNum = Number(price) || stock?.price || 0;
  const fee =
    shareNum > 0 && priceNum > 0
      ? getBrokerageEstimate(market, shareNum, priceNum, stock?.currency ?? (market === 'bursa' ? 'MYR' : market === 'hk' ? 'HKD' : 'USD'))
      : null;

  const symbols = getStocksByMarket(market).map((s) => s.symbol).join(', ');
  const marketSession = useMarketSession(market);

  const activePosition = useMemo(() => {
    const list = isPractice ? state.practice.portfolio : state.portfolio;
    return list.find((p) => p.market === market && p.symbol.toUpperCase() === symbol.toUpperCase());
  }, [isPractice, state.practice.portfolio, state.portfolio, market, symbol]);

  const executionPreview = useMemo(
    () => assessExecutionMarketData(priceNum, activePosition),
    [priceNum, activePosition],
  );

  const runInstitutionalGate = (payload: {
    symbol: string;
    market: Market;
    currency: import('../types').Currency;
    side: 'buy' | 'sell';
    shares: number;
    price: number;
    brokerageFee: number;
  }) => {
    const baseInput = buildInstitutionalRiskInputFromApp({
      state,
      isPractice,
      practiceStats,
      buyingPower,
      regime: marketRegime,
    });
    const totalCap = isPractice ? practiceStats.virtualCapitalMYR : state.settings.totalCapitalMYR;
    const cash = isPractice ? practiceStats.cashBalanceMYR : buyingPower.buyingPowerMYR;
    const dd =
      isPractice && practiceStats.virtualCapitalMYR > 0
        ? Math.max(
            0,
            ((practiceStats.virtualCapitalMYR - practiceStats.portfolioValueMYR) /
              practiceStats.virtualCapitalMYR) *
              100,
          )
        : 0;
    const riskInput = enrichInstitutionalRiskWithMetaCapital(
      enrichInstitutionalRiskWithModelStability(
        enrichInstitutionalRiskWithBehavioral(baseInput, {
          winCount: isPractice ? practiceStats.winCount : undefined,
          lossCount: isPractice ? practiceStats.lossCount : undefined,
          lastTradeIntent: {
            symbol: payload.symbol,
            side: payload.side,
            shares: payload.shares,
            priceMYR: toMYR(payload.price, payload.currency),
          },
        }),
        {
          aiLearning: aiLearningState,
          liveReturnEwmaPct: isPractice ? practiceStats.totalReturnPct : undefined,
        },
      ),
      {
        totalCapitalMYR: totalCap,
        cashBalanceMYR: cash,
        practiceStats: isPractice ? practiceStats : undefined,
        portfolioDrawdownPct: dd,
      },
    );
    return validateTradeIntent(
      {
        symbol: payload.symbol,
        market: payload.market,
        currency: payload.currency,
        side: payload.side,
        shares: payload.shares,
        price: payload.price,
        brokerageFee: payload.brokerageFee,
      },
      riskInput,
    );
  };

  const executePayload = async (payload: {
    symbol: string;
    market: Market;
    currency: import('../types').Currency;
    side: 'buy' | 'sell';
    shares: number;
    price: number;
    brokerageFee: number;
    executedAt: string;
  }) => {
    setIsSubmitting(true);
    try {
      const result = isPractice
        ? await addPracticeTrade(payload)
        : await submitTradeWithExecutionSafety(payload, 'manual');
      if (!result.ok) {
        const uncertain =
          'uncertain' in result && Boolean((result as { uncertain?: boolean }).uncertain);
        Alert.alert(uncertain ? '約定不明' : '執行できません', result.error ?? '不明なエラー');
        return;
      }
      Alert.alert('完了', isPractice ? '仮想取引を記録しました' : '売買を記録しました');
      navigation.goBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTrade = () => {
    if (!symbol.trim()) {
      Alert.alert('入力エラー', HOLDING_ERRORS.invalidSymbol);
      return;
    }
    if (shareNum <= 0) {
      Alert.alert('入力エラー', HOLDING_ERRORS.invalidQuantity);
      return;
    }
    if (priceNum <= 0) {
      Alert.alert('入力エラー', HOLDING_ERRORS.noPrice);
      return;
    }

    const resolvedSymbol = symbol.trim().toUpperCase();
    const stockMeta = findStock(symbol);
    const tradeSymbol = stockMeta?.symbol ?? resolvedSymbol;
    const tradeMarket = stockMeta?.market ?? market;
    const tradeCurrency = stockMeta?.currency ?? currencyForMarket(market);

    const marketData = assessExecutionMarketData(priceNum, activePosition);
    if (!marketData.allowed) {
      Alert.alert('執行ブロック', marketData.reasonJa ?? EXECUTION_SAFETY_MESSAGES.quoteUnavailable);
      return;
    }

    let qty = shareNum;
    const payload = {
      symbol: tradeSymbol,
      market: tradeMarket,
      currency: tradeCurrency,
      side,
      shares: qty,
      price: priceNum,
      brokerageFee: fee?.estimatedFee ?? 0,
      executedAt: new Date().toISOString(),
    };

    const gate = runInstitutionalGate(payload);
    if (!gate.allowed) {
      Alert.alert('リスク統制', gate.violations.map((v) => v.messageJa).join('\n'));
      return;
    }
    if (gate.adjustedShares != null) {
      qty = gate.adjustedShares;
    }

    const finalPayload = { ...payload, shares: qty };
    const staleNote = marketData.quoteAgeSeconds
      ? `\n価格経過: 約${marketData.quoteAgeSeconds}秒`
      : '';

    const confirmBody = [
      `${side === 'buy' ? '買付' : '売却'} ${finalPayload.symbol} · ${finalPayload.shares}株 @ ${finalPayload.price}`,
      staleNote,
      '',
      isPractice
        ? EXECUTION_SAFETY_MESSAGES.confirmationPractice
        : EXECUTION_SAFETY_MESSAGES.confirmationManual,
      isPractice ? PERSONAL_DECISION_GATE.responsibility : EXECUTION_SAFETY_MESSAGES.riskWarning,
    ].join('\n');

    const proceed = () => {
      if (gate.warnings.length > 0) {
        Alert.alert('注意', gate.warnings.join('\n'), [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '続行',
            onPress: () => {
              void appendManualOverride({
                timestamp: new Date().toISOString(),
                ruleId: 'gate-warning',
                labelJa: '警告オーバーライド',
                symbol: finalPayload.symbol,
                noteJa: gate.warnings.join(' · '),
              });
              void executePayload(finalPayload);
            },
          },
        ]);
        return;
      }
      void executePayload(finalPayload);
    };

    Alert.alert(EXECUTION_SAFETY_MESSAGES.confirmationTitle, confirmBody, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '確認して実行', onPress: proceed },
    ]);
  };

  const runPracticePreflight = () => {
    if (side === 'buy' && marketSession.blockVirtualBuy) {
      Alert.alert('取引時間外', CLOSED_TRADE_WARNING);
      return;
    }
    const afterSessionCheck = () => {
      confirmPersonalPracticeTrade(executionPreview, submitTrade);
    };
    if (side === 'buy' && marketSession.showExtendedHoursWarning) {
      Alert.alert('時間外取引の注意', marketSession.beginnerTip, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '続ける', onPress: afterSessionCheck },
      ]);
      return;
    }
    afterSessionCheck();
  };

  const onSubmit = () => {
    if (shouldBlockLiveAnalysisBuy(isPractice, side)) {
      Alert.alert('実運用分析モード', LIVE_ANALYSIS_BUY_GUIDANCE_JA, [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '手動で保有銘柄に追加',
          onPress: () =>
            navigation.navigate('ManualAddHolding', { symbol: symbol.trim(), market }),
        },
      ]);
      return;
    }
    if (isPractice) {
      runPracticePreflight();
      return;
    }
    submitTrade();
  };

  const submitDisabled =
    isSubmitting ||
    killSwitches.readOnlyMode ||
    killSwitches.disableTradeSubmission ||
    shareNum <= 0 ||
    priceNum <= 0 ||
    !executionPreview.allowed ||
    (isPractice && side === 'buy' && marketSession.blockVirtualBuy);

  return (
    <Screen
      title={isPractice ? (side === 'buy' ? '仮想買付' : '仮想売却') : '売買記録'}
      subtitle={isPractice ? 'シミュレーション — 実際の取引ではありません' : 'Rakuten Tradeで約定後に手動で記録'}
    >
      {isPractice ? <PracticeModeBadge /> : null}
      {readOnlyBlockedMessage ? (
        <Text style={styles.readOnlyHint}>{readOnlyBlockedMessage}</Text>
      ) : null}
      <View style={styles.termRow}>
        <TermHint term="buy" showDescription={false} />
        <TermHint term="sell" showDescription={false} />
      </View>
      {isPractice ? (
        <Text style={styles.practiceNote}>仮想買付・仮想売却は、本当のお金は使いません。</Text>
      ) : side === 'buy' ? (
        <Text style={styles.practiceNote}>{liveAnalysisBuyBlockedMessage()}</Text>
      ) : (
        <Text style={styles.practiceNote}>売却の記録のみ可能です（約定後に入力）。</Text>
      )}

      <MarketPicker selected={market} onSelect={setMarket} />
      {isPractice ? <MarketSessionPanel mode="single" market={market} showTradeWarning /> : null}

      <Text style={styles.hint}>銘柄コード（例: {symbols}）</Text>
      <TextInput
        style={styles.input}
        value={symbol}
        onChangeText={setSymbol}
        placeholder="1155 / AAPL / 0700"
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="characters"
        editable={!isSubmitting}
      />

      <View style={styles.row}>
        <Button
          label={isPractice ? '仮想買付' : '買い'}
          onPress={() => setSide('buy')}
          variant={side === 'buy' ? 'primary' : 'ghost'}
          disabled={isSubmitting}
        />
        <Button
          label={isPractice ? '仮想売却' : '売り'}
          onPress={() => setSide('sell')}
          variant={side === 'sell' ? 'primary' : 'ghost'}
          disabled={isSubmitting}
        />
      </View>

      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={shares}
        onChangeText={setShares}
        placeholder="株数"
        placeholderTextColor={theme.colors.textMuted}
        editable={!isSubmitting}
      />
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={price}
        onChangeText={setPrice}
        placeholder={stock ? `約定価格（参考 ${stock.price}）` : '約定価格'}
        placeholderTextColor={theme.colors.textMuted}
        editable={!isSubmitting}
      />

      {fee ? <BrokerageFeeCard estimate={fee} /> : null}

      {!executionPreview.allowed ? (
        <Text style={styles.blockWarn}>
          {executionPreview.reasonJa ?? EXECUTION_SAFETY_MESSAGES.quoteUnavailable}
        </Text>
      ) : null}
      {executionPreview.blockedByStale ? (
        <Text style={styles.blockWarn}>{EXECUTION_SAFETY_MESSAGES.staleExecutionBlocked}</Text>
      ) : null}

      {isPractice && side === 'buy' && marketSession.blockVirtualBuy ? (
        <Text style={styles.closedWarn}>{CLOSED_TRADE_WARNING}</Text>
      ) : null}

      <Button
        label={
          isSubmitting
            ? '処理中…'
            : isPractice
              ? '仮想取引を実行'
              : side === 'buy'
                ? '買付は手動追加へ'
                : '売却を記録'
        }
        onPress={onSubmit}
        disabled={
          submitDisabled ||
          (!isPractice && side === 'buy')
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
  },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  practiceNote: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  termRow: { flexDirection: 'row', gap: theme.spacing.md, flexWrap: 'wrap' },
  closedWarn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm, fontWeight: '600' },
  blockWarn: { color: theme.colors.danger, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm, lineHeight: 18 },
  readOnlyHint: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
});
