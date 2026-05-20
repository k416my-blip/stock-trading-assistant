import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CURRENCY_SYMBOL, MARKET_LABEL } from '../constants/rakutenTrade';
import { MANUAL_HOLDING_SUCCESS_JA } from '../constants/holdingErrors';
import { MANUAL_ORDER_WARNING } from '../services/allocationActions';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import type { ManualOrderItem } from '../types';
import { theme } from '../theme';

export function ManualOrderListScreen() {
  const {
    state,
    confirmManualOrderAsExecuted,
    clearCompletedManualOrders,
    readOnlyBlockedMessage,
  } = useApp();
  const pending = state.manualOrderList.filter((i) => !i.completed);
  const done = state.manualOrderList.filter((i) => i.completed);

  const [selected, setSelected] = useState<ManualOrderItem | null>(null);
  const [shares, setShares] = useState('');
  const [executedPrice, setExecutedPrice] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const openConfirm = (item: ManualOrderItem) => {
    setSelected(item);
    setShares(String(item.estimatedShares));
    setExecutedPrice(String(item.entryPrice));
    setMemo('');
  };

  const closeConfirm = () => {
    if (saving) return;
    setSelected(null);
  };

  const onConfirmSave = async () => {
    if (!selected) return;
    const shareNum = Number(shares) || 0;
    const priceNum = Number(executedPrice) || 0;

    setSaving(true);
    try {
      const result = await confirmManualOrderAsExecuted(selected.id, {
        shares: shareNum,
        executedPrice: priceNum,
        memo: memo.trim() || undefined,
      });
      if (!result.ok) {
        Alert.alert('追加できません', result.error ?? '不明なエラー');
        return;
      }
      Alert.alert('完了', MANUAL_HOLDING_SUCCESS_JA);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="手動注文リスト" subtitle="Rakuten Tradeで入力するチェックリスト">
      <Card>
        <Text style={styles.warn}>{MANUAL_ORDER_WARNING}</Text>
        <Text style={styles.hint}>
          Rakuten Tradeで実際に注文を完了したあと、「タップして実行済みとして記録」から保有銘柄に反映します。
        </Text>
      </Card>

      {readOnlyBlockedMessage ? (
        <Text style={styles.warn}>{readOnlyBlockedMessage}</Text>
      ) : null}

      {pending.length === 0 ? (
        <Card>
          <Text style={styles.muted}>未完了の注文はありません。</Text>
        </Card>
      ) : (
        <>
          <Text style={styles.section}>未完了（{pending.length}件）</Text>
          {pending.map((item, index) => (
            <Pressable
              key={`manual-pending-${item.id}-${index}`}
              onPress={() => openConfirm(item)}
            >
              <Card>
                <Text style={styles.side}>{item.side === 'buy' ? '買い' : '売り'}</Text>
                <Text style={styles.name}>
                  {item.name}（{item.symbol}）
                </Text>
                <Text style={styles.row}>市場: {MARKET_LABEL[item.market]}</Text>
                <Text style={styles.row}>
                  {item.side === 'buy' ? '参考買値' : '現在株価'}: {CURRENCY_SYMBOL[item.currency]}
                  {item.entryPrice.toFixed(2)}
                </Text>
                <Text style={styles.row}>
                  {item.side === 'buy' ? '目安購入株数' : '保有株数'}: {item.estimatedShares}株
                </Text>
                {item.side === 'buy' ? (
                  <Text style={styles.row}>推奨配分額: RM{item.allocationMYR.toLocaleString('ja-JP')}</Text>
                ) : (
                  <Text style={styles.row}>
                    目安売却金額: RM
                    {item.allocationMYR.toLocaleString('ja-JP', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                )}
                <Text style={styles.row}>注文方法: {item.orderMethod}</Text>
                <Text style={styles.tap}>タップして実行済みとして記録</Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}

      {done.length > 0 ? (
        <>
          <Text style={styles.section}>完了済み</Text>
          {done.map((item, index) => (
            <Card key={`manual-done-${item.id}-${index}`} style={styles.doneCard}>
              <Text style={styles.muted}>
                ✓ {item.name} · {item.estimatedShares}株
              </Text>
            </Card>
          ))}
          <Pressable onPress={clearCompletedManualOrders}>
            <Text style={styles.clear}>完了済みを削除</Text>
          </Pressable>
        </>
      ) : null}

      <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={closeConfirm}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>実行済み注文として記録</Text>
              <Text style={styles.modalMessage}>
                Rakuten Tradeで実際に注文を完了した場合のみ、保有銘柄に追加します。
              </Text>

              {selected ? (
                <>
                  <Text style={styles.fieldLabel}>銘柄</Text>
                  <Text style={styles.fieldValue}>
                    {selected.name}（{selected.symbol}） · {MARKET_LABEL[selected.market]}
                  </Text>

                  <Text style={styles.fieldLabel}>数量</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={shares}
                    onChangeText={setShares}
                    editable={!saving}
                  />

                  <Text style={styles.fieldLabel}>約定価格</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={executedPrice}
                    onChangeText={setExecutedPrice}
                    editable={!saving}
                  />

                  <Text style={styles.fieldLabel}>通貨</Text>
                  <Text style={styles.fieldValue}>{selected.currency}</Text>

                  <Text style={styles.fieldLabel}>メモ（任意）</Text>
                  <TextInput
                    style={[styles.input, styles.memoInput]}
                    value={memo}
                    onChangeText={setMemo}
                    placeholder="例: Rakuten Tradeで約定"
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    editable={!saving}
                  />

                  <View style={styles.modalActions}>
                    <Button label="キャンセル" onPress={closeConfirm} variant="ghost" disabled={saving} />
                    <Button
                      label={saving ? '保存中…' : '保有銘柄に追加'}
                      onPress={() => void onConfirmSave()}
                      disabled={saving}
                    />
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 20 },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.xs },
  section: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md, marginTop: theme.spacing.sm },
  side: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.sm },
  name: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg, marginTop: 4 },
  row: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  tap: { color: theme.colors.primary, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm, fontWeight: '600' },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  doneCard: { opacity: 0.7 },
  clear: { color: theme.colors.primary, textAlign: 'center', marginTop: theme.spacing.md, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg, marginBottom: theme.spacing.sm },
  modalMessage: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20, marginBottom: theme.spacing.md },
  fieldLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
  fieldValue: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600', marginTop: 4 },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    marginTop: theme.spacing.xs,
  },
  memoInput: { minHeight: 72, textAlignVertical: 'top' },
  modalActions: { marginTop: theme.spacing.lg, gap: theme.spacing.sm },
});
