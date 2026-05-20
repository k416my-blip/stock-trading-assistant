import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AiTradeQueueItem } from '../types/aiStrategyBriefing';
import {
  AI_PERSONAL_SAFETY_FOOTER,
  AI_SAFE_ACTION_LABEL,
  AI_UI,
  AI_URGENCY_LABEL,
} from '../constants/aiStrategyBriefing';
import { Button } from './ui/Button';
import { theme } from '../theme';

type Props = {
  visible: boolean;
  item: AiTradeQueueItem | null;
  onClose: () => void;
};

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((line) => (
        <Text key={`${title}-${line}`} style={styles.bullet}>
          · {line}
        </Text>
      ))}
    </View>
  );
}

export function AiSuggestionExplanationModal({ visible, item, onClose }: Props) {
  if (!item) return null;

  const { explanation } = item;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{AI_UI.modalTitle}</Text>
          <Text style={styles.ticker}>
            {item.ticker} · {item.name}
          </Text>
          <Text style={styles.action}>{AI_SAFE_ACTION_LABEL[item.suggestedAction]}</Text>
          <Text style={styles.meta}>
            {AI_UI.confidence} {item.confidence}% · {AI_UI.urgency} {AI_URGENCY_LABEL[item.urgency]}
          </Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <BulletSection title={AI_UI.modalTechnical} items={explanation.technicalReasons} />
            <BulletSection title={AI_UI.modalMacro} items={explanation.macroReasons} />
            <BulletSection title={AI_UI.modalRisk} items={explanation.riskReasons} />
            <Text style={styles.freshnessTitle}>{AI_UI.modalFreshness}</Text>
            <Text style={styles.freshness}>{explanation.dataFreshnessNote}</Text>
            <Text style={styles.disclaimer}>{AI_PERSONAL_SAFETY_FOOTER}</Text>
          </ScrollView>
          <Button label={AI_UI.close} onPress={onClose} variant="ghost" />
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
    maxHeight: '85%',
    gap: theme.spacing.sm,
  },
  title: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  ticker: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: '700' },
  action: { color: theme.colors.primary, fontSize: theme.fontSize.lg, fontWeight: '600' },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  scroll: { marginVertical: theme.spacing.sm },
  section: { marginBottom: theme.spacing.md },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  bullet: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginTop: 2,
  },
  freshnessTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  freshness: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  disclaimer: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
});
