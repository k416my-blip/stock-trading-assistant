import { useCallback, useEffect, useState } from 'react';
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
import {
  buildPendingManualOrderProbe,
  writePendingManualOrderProbe,
} from '../services/manualOrderVerification';
import { DEVICE_VERIFY_TEST_IDS } from '../constants/deviceVerifyTestIds';
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
    updateManualOrderEntryPrice,
    clearCompletedManualOrders,
    removePendingManualOrder,
    clearPendingManualOrders,
    readOnlyBlockedMessage,
  } = useApp();
  const pending = state.manualOrderList.filter((i) => !i.completed);
  const done = state.manualOrderList.filter((i) => i.completed);

  const [selected, setSelected] = useState<ManualOrderItem | null>(null);
  const [editTarget, setEditTarget] = useState<ManualOrderItem | null>(null);
  const [editEntryPrice, setEditEntryPrice] = useState('');
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

  const openEditEntry = (item: ManualOrderItem) => {
    setEditTarget(item);
    setEditEntryPrice(String(item.entryPrice));
  };

  const closeConfirm = () => {
    if (saving) return;
    setSelected(null);
  };

  const closeEditEntry = () => {
    if (saving) return;
    setEditTarget(null);
  };

  const onSaveEntryPrice = () => {
    if (!editTarget) return;
    const priceNum = Number(editEntryPrice) || 0;
    setSaving(true);
    try {
      const result = updateManualOrderEntryPrice(editTarget.id, priceNum);
      if (!result.ok) {
        Alert.alert('保存できません', result.error ?? '不明なエラー');
        return;
      }
      Alert.alert('保存しました', 'Rakuten指値を登録しました。');
      setEditTarget(null);
    } finally {
      setSaving(false);
    }
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

  const onDeleteItem = useCallback(
    (item: ManualOrderItem) => {
      if (readOnlyBlockedMessage) {
        Alert.alert('操作できません', readOnlyBlockedMessage);
        return;
      }
      Alert.alert('この手動注文を削除しますか？', '削除すると元に戻せません。', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            const result = removePendingManualOrder(item.id);
            if (!result.ok) {
              Alert.alert('削除できません', result.error ?? '不明なエラー');
            }
          },
        },
      ]);
    },
    [readOnlyBlockedMessage, removePendingManualOrder],
  );

  const onClearAllPending = useCallback(() => {
    if (readOnlyBlockedMessage) {
      Alert.alert('操作できません', readOnlyBlockedMessage);
      return;
    }
    if (pending.length === 0) return;
    Alert.alert('未完了の手動注文をすべて削除しますか？', '削除すると元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'すべて削除',
        style: 'destructive',
        onPress: () => {
          const result = clearPendingManualOrders();
          if (!result.ok) {
            Alert.alert('削除できません', result.error ?? '不明なエラー');
          }
        },
      },
    ]);
  }, [clearPendingManualOrders, pending.length, readOnlyBlockedMessage]);

  const onClearCompleted = useCallback(() => {
    if (readOnlyBlockedMessage) {
      Alert.alert('操作できません', readOnlyBlockedMessage);
      return;
    }
    if (done.length === 0) return;
    Alert.alert(
      '完了済みの手動注文を削除しますか？',
      `実行済みとして記録済みの ${done.length}件をリストから削除します。削除すると元に戻せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => clearCompletedManualOrders(),
        },
      ],
    );
  }, [clearCompletedManualOrders, done.length, readOnlyBlockedMessage]);

  const pendingProbe = buildPendingManualOrderProbe(state.manualOrderList);

  useEffect(() => {
    void writePendingManualOrderProbe(state.manualOrderList);
  }, [state.manualOrderList]);

  return (
    <Screen title="手動注文リスト" subtitle="Rakuten Tradeで入力するチェックリスト">
      <View
        testID={DEVICE_VERIFY_TEST_IDS.manualOrderPendingCount}
        accessibilityLabel={pendingProbe.probeLabel}
        accessible
        importantForAccessibility="yes"
        style={styles.probeHidden}
      />
      <Card>
        <Text style={styles.warn}>{MANUAL_ORDER_WARNING}</Text>
        <Text style={styles.hint}>
          注文前: 「Rakuten指値を登録」で entryPrice を入力。約定後: 「実行済みとして記録」で保有に反映。
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
          <View style={styles.sectionRow}>
            <Text style={styles.section}>未完了（{pending.length}件）</Text>
            <Button
              label="未完了をすべて削除"
              onPress={onClearAllPending}
              variant="ghost"
              disabled={!!readOnlyBlockedMessage}
            />
          </View>
          {pending.map((item, index) => (
            <Card key={`manual-pending-${item.id}-${index}`}>
              <Text style={styles.side}>{item.side === 'buy' ? '買い' : '売り'}</Text>
              <Text style={styles.name}>
                {item.name}（{item.symbol}）
              </Text>
              <Text style={styles.row}>市場: {MARKET_LABEL[item.market]}</Text>
              <Text style={styles.row}>
                Rakuten指値 (entryPrice): {CURRENCY_SYMBOL[item.currency]}
                {item.entryPrice.toFixed(2)}
              </Text>
              <Text style={styles.row}>
                注文金額: RM
                {(item.entryPrice * item.estimatedShares).toLocaleString('ja-JP', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                （{item.estimatedShares}株）
              </Text>
              <Text style={styles.row}>allocationMYR: RM{item.allocationMYR.toLocaleString('ja-JP')}</Text>
              <Text style={styles.row}>注文方法: {item.orderMethod}</Text>
              <View style={styles.cardActions}>
                {item.side === 'buy' ? (
                  <Button
                    label="Rakuten指値を登録"
                    onPress={() => openEditEntry(item)}
                    variant="ghost"
                    disabled={!!readOnlyBlockedMessage}
                  />
                ) : null}
                <Button
                  label="削除"
                  onPress={() => onDeleteItem(item)}
                  variant="ghost"
                  disabled={!!readOnlyBlockedMessage}
                />
              </View>
              <Pressable onPress={() => openConfirm(item)}>
                <Text style={styles.tap}>タップして実行済みとして記録</Text>
              </Pressable>
            </Card>
          ))}
        </>
      )}

      {done.length > 0 ? (
        <>
          <Text style={styles.section}>実行済みとして記録済み（{done.length}件）</Text>
          <Text style={styles.hint}>
            ここに表示される注文は保有銘柄へ反映済みです。リストから消す場合は下の「完了済みを削除」を使ってください。
          </Text>
          {done.map((item, index) => (
            <Card key={`manual-done-${item.id}-${index}`} style={styles.doneCard}>
              <Text style={styles.muted}>
                ✓ {item.name} · {item.estimatedShares}株
              </Text>
            </Card>
          ))}
          <Pressable onPress={onClearCompleted}>
            <Text style={styles.clear}>完了済みを削除</Text>
          </Pressable>
        </>
      ) : null}

      <Modal visible={editTarget !== null} transparent animationType="slide" onRequestClose={closeEditEntry}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Rakuten指値を登録</Text>
              <Text style={styles.modalMessage}>
                Rakuten Tradeで入力した指値価格を entryPrice として保存します。注文評価額 = 指値 × 株数
              </Text>

              {editTarget ? (
                <>
                  <Text style={styles.fieldLabel}>銘柄</Text>
                  <Text style={styles.fieldValue}>
                    {editTarget.name}（{editTarget.symbol}） · {editTarget.estimatedShares}株
                  </Text>

                  <Text style={styles.fieldLabel}>指値 (entryPrice) · MYR</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={editEntryPrice}
                    onChangeText={setEditEntryPrice}
                    editable={!saving}
                    placeholder="例: 12.15"
                    placeholderTextColor={theme.colors.textMuted}
                  />

                  <Text style={styles.fieldLabel}>注文金額（自動）</Text>
                  <Text style={styles.fieldValue}>
                    RM
                    {(
                      (Number(editEntryPrice) || 0) * editTarget.estimatedShares
                    ).toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>

                  <View style={styles.modalActions}>
                    <Button label="キャンセル" onPress={closeEditEntry} variant="ghost" disabled={saving} />
                    <Button
                      label={saving ? '保存中…' : '指値を保存'}
                      onPress={onSaveEntryPrice}
                      disabled={saving}
                    />
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  probeHidden: { width: 1, height: 1, opacity: 0.01 },
  section: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md, marginTop: theme.spacing.sm },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
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
