import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { MarketPicker } from '../components/MarketPicker';
import {
  buildManualOrderListProbes,
  writePendingManualOrderProbe,
} from '../services/manualOrderVerification';
import {
  DELETE_ALL_BODY,
  DELETE_ALL_TITLE,
  DELETE_ONE_BODY,
  DELETE_ONE_TITLE,
  isManualOrderCompleted,
  isManualOrderPending,
  MANUAL_ORDER_LIST_SAFETY_JA,
  MARK_COMPLETE_BODY,
  MARK_COMPLETE_TITLE,
} from '../services/manualOrderListManagement';
import { DEVICE_VERIFY_TEST_IDS } from '../constants/deviceVerifyTestIds';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Screen } from '../components/ui/Screen';
import { useApp } from '../context/AppContext';
import type { ManualOrderItem, Market } from '../types';
import { theme } from '../theme';

type ListTab = 'pending' | 'completed';

type ConfirmDialogState =
  | { kind: 'delete-one'; item: ManualOrderItem; title: string; body: string; okLabel: string }
  | { kind: 'delete-all'; title: string; body: string; okLabel: string }
  | { kind: 'mark-complete'; item: ManualOrderItem; title: string; body: string; okLabel: string };

export function ManualOrderListScreen() {
  const {
    state,
    confirmManualOrderAsExecuted,
    clearCompletedManualOrders,
    removePendingManualOrder,
    clearPendingManualOrders,
    updateManualOrder,
    markManualOrderCompleted,
    readOnlyBlockedMessage,
  } = useApp();

  const pending = useMemo(
    () => state.manualOrderList.filter(isManualOrderPending),
    [state.manualOrderList],
  );
  const done = useMemo(
    () => state.manualOrderList.filter(isManualOrderCompleted),
    [state.manualOrderList],
  );

  const [tab, setTab] = useState<ListTab>('pending');
  const [selected, setSelected] = useState<ManualOrderItem | null>(null);
  const [editTarget, setEditTarget] = useState<ManualOrderItem | null>(null);
  const [editSymbol, setEditSymbol] = useState('');
  const [editName, setEditName] = useState('');
  const [editShares, setEditShares] = useState('');
  const [editSide, setEditSide] = useState<'buy' | 'sell'>('buy');
  const [editMarket, setEditMarket] = useState<Market>('bursa');
  const [editMemo, setEditMemo] = useState('');
  const [editEntryPrice, setEditEntryPrice] = useState('');
  const [shares, setShares] = useState('');
  const [executedPrice, setExecutedPrice] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const probes = buildManualOrderListProbes(state.manualOrderList);

  useEffect(() => {
    void writePendingManualOrderProbe(state.manualOrderList);
  }, [state.manualOrderList]);

  const openEdit = (item: ManualOrderItem) => {
    setEditTarget(item);
    setEditSymbol(item.symbol);
    setEditName(item.name);
    setEditShares(String(item.estimatedShares));
    setEditSide(item.side);
    setEditMarket(item.market);
    setEditMemo(item.memo ?? '');
    setEditEntryPrice(String(item.entryPrice));
  };

  const closeEdit = () => {
    if (saving) return;
    setEditTarget(null);
  };

  const onSaveEdit = () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const result = updateManualOrder(editTarget.id, {
        symbol: editSymbol,
        name: editName,
        estimatedShares: Number(editShares) || 0,
        side: editSide,
        market: editMarket,
        memo: editMemo,
        entryPrice: Number(editEntryPrice) || editTarget.entryPrice,
      });
      if (!result.ok) {
        Alert.alert('保存できません', result.error ?? '不明なエラー');
        return;
      }
      setEditTarget(null);
    } finally {
      setSaving(false);
    }
  };

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
    setSaving(true);
    try {
      const result = await confirmManualOrderAsExecuted(selected.id, {
        shares: Number(shares) || 0,
        executedPrice: Number(executedPrice) || 0,
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
      setConfirmDialog({
        kind: 'delete-one',
        item,
        title: DELETE_ONE_TITLE,
        body: DELETE_ONE_BODY,
        okLabel: '削除',
      });
    },
    [readOnlyBlockedMessage],
  );

  const onClearAllPending = useCallback(() => {
    if (readOnlyBlockedMessage) {
      Alert.alert('操作できません', readOnlyBlockedMessage);
      return;
    }
    if (pending.length === 0) return;
    setConfirmDialog({
      kind: 'delete-all',
      title: DELETE_ALL_TITLE,
      body: DELETE_ALL_BODY,
      okLabel: 'すべて削除',
    });
  }, [pending.length, readOnlyBlockedMessage]);

  const onMarkComplete = useCallback(
    (item: ManualOrderItem) => {
      if (readOnlyBlockedMessage) {
        Alert.alert('操作できません', readOnlyBlockedMessage);
        return;
      }
      setConfirmDialog({
        kind: 'mark-complete',
        item,
        title: MARK_COMPLETE_TITLE,
        body: MARK_COMPLETE_BODY,
        okLabel: '実行済みにする',
      });
    },
    [readOnlyBlockedMessage],
  );

  const onConfirmDialogOk = useCallback(() => {
    if (!confirmDialog) return;
    if (confirmDialog.kind === 'delete-one') {
      const result = removePendingManualOrder(confirmDialog.item.id);
      if (!result.ok) Alert.alert('削除できません', result.error ?? '不明なエラー');
    } else if (confirmDialog.kind === 'delete-all') {
      const result = clearPendingManualOrders();
      if (!result.ok) Alert.alert('削除できません', result.error ?? '不明なエラー');
    } else {
      const result = markManualOrderCompleted(confirmDialog.item.id);
      if (!result.ok) Alert.alert('更新できません', result.error ?? '不明なエラー');
    }
    setConfirmDialog(null);
  }, [clearPendingManualOrders, confirmDialog, markManualOrderCompleted, removePendingManualOrder]);

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

  const renderPendingCard = (item: ManualOrderItem, index: number) => (
    <View testID={DEVICE_VERIFY_TEST_IDS.manualOrderCard(item.id)}>
      <Card key={`manual-pending-${item.id}-${index}`}>
      <Text style={styles.side}>{item.side === 'buy' ? '買い' : '売り'}</Text>
      <Text style={styles.name}>
        {item.name}（{item.symbol}）
      </Text>
      <Text style={styles.row}>市場: {MARKET_LABEL[item.market]}</Text>
      <Text style={styles.row}>
        Rakuten指値: {CURRENCY_SYMBOL[item.currency]}
        {item.entryPrice.toFixed(2)} · {item.estimatedShares}株
      </Text>
      <Text style={styles.row}>注文金額: RM{item.allocationMYR.toLocaleString('ja-JP')}</Text>
      {item.memo ? <Text style={styles.row}>メモ: {item.memo}</Text> : null}
      <View style={styles.cardActions}>
        <Button
          label="編集"
          onPress={() => openEdit(item)}
          variant="ghost"
          disabled={!!readOnlyBlockedMessage}
          testID={DEVICE_VERIFY_TEST_IDS.manualOrderEdit(item.id)}
          accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderEdit(item.id)}
        />
        <Button
          label="削除"
          onPress={() => onDeleteItem(item)}
          variant="ghost"
          disabled={!!readOnlyBlockedMessage}
          testID={DEVICE_VERIFY_TEST_IDS.manualOrderDelete(item.id)}
          accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderDelete(item.id)}
        />
        <Button
          label="実行済みにする"
          onPress={() => onMarkComplete(item)}
          variant="ghost"
          disabled={!!readOnlyBlockedMessage}
          testID={DEVICE_VERIFY_TEST_IDS.manualOrderComplete(item.id)}
          accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderComplete(item.id)}
        />
        {item.side === 'buy' ? (
          <Button
            label="Rakuten指値を登録"
            onPress={() => openEdit(item)}
            variant="ghost"
            disabled={!!readOnlyBlockedMessage}
          />
        ) : null}
      </View>
      <Pressable onPress={() => openConfirm(item)}>
        <Text style={styles.tap}>約定後: 保有銘柄に反映</Text>
      </Pressable>
      </Card>
    </View>
  );

  const renderDoneCard = (item: ManualOrderItem, index: number) => (
    <Card key={`manual-done-${item.id}-${index}`} style={styles.doneCard}>
      <Text style={styles.muted}>
        ✓ {item.name}（{item.symbol}） · {item.estimatedShares}株
      </Text>
      {item.completedAt ? (
        <Text style={styles.row}>実行済み: {new Date(item.completedAt).toLocaleString('ja-JP')}</Text>
      ) : null}
    </Card>
  );

  return (
    <Screen title="手動注文リスト" subtitle="Rakuten Tradeで入力するチェックリスト">
      <View
        testID={DEVICE_VERIFY_TEST_IDS.manualOrderListScreen}
        accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderListScreen}
        style={styles.probeHidden}
      />
      <View
        testID={DEVICE_VERIFY_TEST_IDS.manualOrderPendingCount}
        accessibilityLabel={probes.probeLabel}
        accessible
        importantForAccessibility="yes"
        style={styles.probeHidden}
      />
      <View
        testID={DEVICE_VERIFY_TEST_IDS.manualOrderCompletedCount}
        accessibilityLabel={probes.completedProbeLabel}
        accessible
        importantForAccessibility="yes"
        style={styles.probeHidden}
      />

      <Card>
        <Text style={styles.safety}>{MANUAL_ORDER_LIST_SAFETY_JA}</Text>
        <Text style={styles.hint}>
          注文前: 編集で内容を調整。Rakuten Tradeで入力後「実行済みにする」。約定後は「保有銘柄に反映」。
        </Text>
      </Card>

      {readOnlyBlockedMessage ? <Text style={styles.warn}>{readOnlyBlockedMessage}</Text> : null}

      <View style={styles.tabRow}>
        <Pressable
          testID={DEVICE_VERIFY_TEST_IDS.manualOrderTabPending}
          accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderTabPending}
          onPress={() => setTab('pending')}
          style={[styles.tab, tab === 'pending' && styles.tabActive]}
        >
          <Text style={styles.tabText}>未完了（{pending.length}）</Text>
        </Pressable>
        <Pressable
          testID={DEVICE_VERIFY_TEST_IDS.manualOrderTabCompleted}
          accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderTabCompleted}
          onPress={() => setTab('completed')}
          style={[styles.tab, tab === 'completed' && styles.tabActive]}
        >
          <Text style={styles.tabText}>実行済み（{done.length}）</Text>
        </Pressable>
      </View>

      {tab === 'pending' ? (
        pending.length === 0 ? (
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
                disabled={!!readOnlyBlockedMessage || pending.length === 0}
                testID={DEVICE_VERIFY_TEST_IDS.manualOrderBulkDeletePending}
                accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderBulkDeletePending}
              />
            </View>
            {pending.map(renderPendingCard)}
          </>
        )
      ) : done.length === 0 ? (
        <Card>
          <Text style={styles.muted}>実行済みの注文はありません。</Text>
        </Card>
      ) : (
        <>
          <Text style={styles.section}>実行済み（{done.length}件）</Text>
          {done.map(renderDoneCard)}
          <Pressable onPress={onClearCompleted}>
            <Text style={styles.clear}>完了済みを削除</Text>
          </Pressable>
        </>
      )}

      <Modal visible={editTarget !== null} transparent animationType="slide" onRequestClose={closeEdit}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>手動注文を編集</Text>
              {editTarget ? (
                <>
                  <Text style={styles.fieldLabel}>銘柄コード</Text>
                  <TextInput style={styles.input} value={editSymbol} onChangeText={setEditSymbol} autoCapitalize="characters" editable={!saving} />
                  <Text style={styles.fieldLabel}>銘柄名</Text>
                  <TextInput style={styles.input} value={editName} onChangeText={setEditName} editable={!saving} />
                  <Text style={styles.fieldLabel}>数量</Text>
                  <TextInput style={styles.input} keyboardType="number-pad" value={editShares} onChangeText={setEditShares} editable={!saving} testID={DEVICE_VERIFY_TEST_IDS.manualOrderEditShares} accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderEditShares} />
                  <Text style={styles.fieldLabel}>指値 (entryPrice)</Text>
                  <TextInput style={styles.input} keyboardType="decimal-pad" value={editEntryPrice} onChangeText={setEditEntryPrice} editable={!saving} />
                  <Text style={styles.fieldLabel}>売買</Text>
                  <View style={styles.toggleRow}>
                    <Button label="買い" variant={editSide === 'buy' ? 'primary' : 'ghost'} onPress={() => setEditSide('buy')} />
                    <Button label="売り" variant={editSide === 'sell' ? 'primary' : 'ghost'} onPress={() => setEditSide('sell')} />
                  </View>
                  <MarketPicker selected={editMarket} onSelect={setEditMarket} />
                  <Text style={styles.fieldLabel}>メモ（任意）</Text>
                  <TextInput style={[styles.input, styles.memoInput]} value={editMemo} onChangeText={setEditMemo} multiline editable={!saving} />
                  <View style={styles.modalActions}>
                    <Button label="キャンセル" onPress={closeEdit} variant="ghost" disabled={saving} testID={DEVICE_VERIFY_TEST_IDS.manualOrderEditCancel} accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderEditCancel} />
                    <Button label={saving ? '保存中…' : '保存'} onPress={onSaveEdit} disabled={saving} testID={DEVICE_VERIFY_TEST_IDS.manualOrderEditSave} accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderEditSave} />
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
              <Text style={styles.modalMessage}>Rakuten Tradeで実際に約定した場合のみ、保有銘柄に追加します。</Text>
              {selected ? (
                <>
                  <Text style={styles.fieldLabel}>数量</Text>
                  <TextInput style={styles.input} keyboardType="number-pad" value={shares} onChangeText={setShares} editable={!saving} />
                  <Text style={styles.fieldLabel}>約定価格</Text>
                  <TextInput style={styles.input} keyboardType="decimal-pad" value={executedPrice} onChangeText={setExecutedPrice} editable={!saving} />
                  <Text style={styles.fieldLabel}>メモ（任意）</Text>
                  <TextInput style={[styles.input, styles.memoInput]} value={memo} onChangeText={setMemo} multiline editable={!saving} />
                  <View style={styles.modalActions}>
                    <Button label="キャンセル" onPress={closeConfirm} variant="ghost" disabled={saving} />
                    <Button label={saving ? '保存中…' : '保有銘柄に追加'} onPress={() => void onConfirmSave()} disabled={saving} />
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmDialog !== null} transparent animationType="fade" onRequestClose={() => setConfirmDialog(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, styles.confirmSheet]} testID={DEVICE_VERIFY_TEST_IDS.manualOrderConfirmDialog}>
            {confirmDialog ? (
              <>
                <Text
                  style={styles.modalTitle}
                  testID={DEVICE_VERIFY_TEST_IDS.manualOrderConfirmTitle}
                  accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderConfirmTitle}
                >
                  {confirmDialog.title}
                </Text>
                <Text
                  style={styles.modalMessage}
                  testID={DEVICE_VERIFY_TEST_IDS.manualOrderConfirmBody}
                  accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderConfirmBody}
                >
                  {confirmDialog.body}
                </Text>
                <View style={styles.modalActions}>
                  <Button
                    label="キャンセル"
                    onPress={() => setConfirmDialog(null)}
                    variant="ghost"
                    testID={DEVICE_VERIFY_TEST_IDS.manualOrderConfirmCancel}
                    accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderConfirmCancel}
                  />
                  <Button
                    label={confirmDialog.okLabel}
                    onPress={onConfirmDialogOk}
                    testID={DEVICE_VERIFY_TEST_IDS.manualOrderConfirmOk}
                    accessibilityLabel={DEVICE_VERIFY_TEST_IDS.manualOrderConfirmOk}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safety: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 20, fontWeight: '600' },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 20 },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: theme.spacing.xs },
  probeHidden: { width: 1, height: 1, opacity: 0.01 },
  tabRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.primary },
  tabText: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
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
  doneCard: { opacity: 0.85 },
  clear: { color: theme.colors.primary, textAlign: 'center', marginTop: theme.spacing.md, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginVertical: theme.spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    maxHeight: '85%',
  },
  confirmSheet: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.xl, borderRadius: theme.radius.lg },
  modalTitle: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.lg, marginBottom: theme.spacing.sm },
  modalMessage: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20, marginBottom: theme.spacing.md },
  fieldLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: theme.spacing.sm },
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
