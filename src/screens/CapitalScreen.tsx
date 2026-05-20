import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AccountTypePicker } from '../components/AccountTypePicker';
import { BuyingPowerCard } from '../components/BuyingPowerCard';
import { PracticeModeBadge } from '../components/PracticeModeBadge';
import { PracticeSummaryCard } from '../components/PracticeSummaryCard';
import { PositionSizingCard } from '../components/PositionSizingCard';
import { MarketPicker } from '../components/MarketPicker';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { TermHint } from '../components/TermHint';
import { DEFAULT_VIRTUAL_CAPITAL_MYR } from '../constants/practice';
import { getStocksByMarket } from '../data/sampleStocks';
import { useApp } from '../context/AppContext';
import { suggestPositionSize } from '../services/positionSizing';
import type { RootStackParamList } from '../navigation/types';
import type { Market } from '../types';
import { theme } from '../theme';

export function CapitalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    state,
    isPractice,
    practiceStats,
    buyingPower,
    updateSettings,
    addDeposit,
    toggleDepositCompleted,
    setPracticeVirtualCapital,
    addPracticeDeposit,
    resetPracticeAccount,
  } = useApp();

  const [capitalInput, setCapitalInput] = useState(
    String(isPractice ? state.practice.virtualCapitalMYR : state.settings.totalCapitalMYR || ''),
  );
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [market, setMarket] = useState<Market>(state.settings.selectedMarket);

  const capital = Number(capitalInput) || 0;
  const sample = getStocksByMarket(market)[0];
  const buyingPowerMYR = isPractice ? practiceStats.cashBalanceMYR : buyingPower.buyingPowerMYR;
  const sizing = sample
    ? suggestPositionSize(
        buyingPowerMYR,
        sample.price,
        sample.currency,
        'cash_upfront',
        state.settings.riskPerTradePct,
      )
    : null;

  if (isPractice) {
    return (
      <Screen title="仮想資金" subtitle="シミュレーション用 — 実際の入金は不要です">
        <PracticeModeBadge />
        <PracticeSummaryCard stats={practiceStats} />

        <TermHint term="virtualCapital" />
        <Text style={styles.section}>仮想資金（MYR）</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder={`例: ${DEFAULT_VIRTUAL_CAPITAL_MYR}`}
          placeholderTextColor={theme.colors.textMuted}
          value={capitalInput}
          onChangeText={setCapitalInput}
        />
        <Button label="仮想資金を設定" onPress={() => setPracticeVirtualCapital(capital)} />

        <Text style={styles.section}>仮想入金（練習用にお金を足す）</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="入金額 RM"
          placeholderTextColor={theme.colors.textMuted}
          value={depositAmount}
          onChangeText={setDepositAmount}
        />
        <Button
          label="仮想入金を追加"
          onPress={() => {
            const amt = Number(depositAmount);
            if (amt > 0) {
              addPracticeDeposit(amt);
              setDepositAmount('');
            }
          }}
          variant="ghost"
        />

        <Button label="練習口座をリセット（RM10,000）" onPress={resetPracticeAccount} variant="ghost" />

        <Button
          label="おすすめ配分プラン"
          onPress={() => navigation.navigate('MainTabs', { screen: 'AllocationPlan' })}
          variant="ghost"
        />

        <Text style={styles.section}>ポジション試算</Text>
        <MarketPicker selected={market} onSelect={setMarket} />
        {sizing ? <PositionSizingCard result={sizing} /> : null}
      </Screen>
    );
  }

  return (
    <Screen title="投資金額" subtitle="MYR建て — Rakuten Tradeで手動入金後に記録">
      <Text style={styles.section}>口座タイプ</Text>
      <AccountTypePicker
        selected={state.settings.accountType}
        onSelect={(accountType) => updateSettings({ accountType })}
      />

      <Text style={styles.section}>投資資金（MYR）</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="例: 50000"
        placeholderTextColor={theme.colors.textMuted}
        value={capitalInput}
        onChangeText={setCapitalInput}
      />
      <Button label="投資資金を保存" onPress={() => updateSettings({ totalCapitalMYR: capital })} />

      <BuyingPowerCard result={buyingPower} />

      <Button
        label="おすすめ配分プラン"
        onPress={() => navigation.navigate('MainTabs', { screen: 'AllocationPlan' })}
      />

      <Text style={styles.section}>入金計画（手動入金の記録）</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="入金予定額 RM"
        placeholderTextColor={theme.colors.textMuted}
        value={depositAmount}
        onChangeText={setDepositAmount}
      />
      <TextInput
        style={styles.input}
        placeholder="メモ（任意）"
        placeholderTextColor={theme.colors.textMuted}
        value={depositNote}
        onChangeText={setDepositNote}
      />
      <Button
        label="入金予定を追加"
        onPress={() => {
          const amountMYR = Number(depositAmount);
          if (amountMYR <= 0) return;
          addDeposit({
            amountMYR,
            plannedDate: new Date().toISOString().slice(0, 10),
            completed: false,
            note: depositNote || undefined,
          });
          setDepositAmount('');
          setDepositNote('');
        }}
      />

      {state.deposits.map((d, index) => (
        <Pressable key={`deposit-${d.id}-${index}`} onPress={() => toggleDepositCompleted(d.id)}>
          <Card style={d.completed ? styles.depositDone : undefined}>
            <Text style={styles.depositText}>
              RM{d.amountMYR.toLocaleString('ja-JP')} · {d.plannedDate}
              {d.completed ? ' ✓ 入金済' : ' · 未入金（タップで完了）'}
            </Text>
            {d.note ? <Text style={styles.depositNote}>{d.note}</Text> : null}
          </Card>
        </Pressable>
      ))}

      <Text style={styles.section}>ポジション試算用の市場</Text>
      <MarketPicker selected={market} onSelect={setMarket} />
      {sizing ? <PositionSizingCard result={sizing} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
  },
  depositDone: { borderColor: theme.colors.success },
  depositText: { color: theme.colors.text },
  depositNote: { color: theme.colors.textMuted, marginTop: 4, fontSize: theme.fontSize.sm },
});
