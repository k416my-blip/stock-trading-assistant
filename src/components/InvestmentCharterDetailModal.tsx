import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHARTER_WHY_BUTTON_LABEL_JA } from '../constants/investmentCharter';
import type { AllocationRecommendationMeta } from '../services/recommendationProvenance';
import { Button } from './ui/Button';
import { theme } from '../theme';

type Props = {
  visible: boolean;
  symbol: string;
  name?: string;
  meta: AllocationRecommendationMeta | null;
  onClose: () => void;
};

export function InvestmentCharterDetailModal({ visible, symbol, name, meta, onClose }: Props) {
  if (!meta) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{CHARTER_WHY_BUTTON_LABEL_JA}</Text>
          <Text style={styles.ticker}>
            {name ?? symbol}（{symbol}）
          </Text>
          <Text style={styles.subtitle}>AIコンシェルジュ投資憲章 — 判断根拠全文</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>{meta.fullRationaleJa}</Text>
          </ScrollView>
          <Button label="閉じる" onPress={onClose} variant="ghost" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    maxHeight: '88%',
    gap: theme.spacing.sm,
  },
  title: { color: theme.colors.primary, fontSize: theme.fontSize.lg, fontWeight: '700' },
  ticker: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  scroll: { marginVertical: theme.spacing.sm },
  body: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
});
