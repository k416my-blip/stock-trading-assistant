import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OpenConciergePanelOptions } from '../../context/AiConciergeContext';
import { AI_CONCIERGE_UI } from '../../constants/aiConcierge';
import { CONCIERGE_SECTION_TEST_ID } from '../../constants/aiConciergeLayout';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';
import { AiAssistantChat } from '../AiAssistantChat';
import { AiConciergeErrorBoundary } from './AiConciergeErrorBoundary';
import { CompactSafetyNotice } from '../CompactSafetyNotice';

type Props = {
  visible: boolean;
  onClose: () => void;
  panelOptions?: OpenConciergePanelOptions | null;
};

export function AiConciergeSheet({ visible, onClose, panelOptions }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 12 : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={AI_CONCIERGE_UI.close} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
            ]}
          >
            <View style={styles.handle} />
            <View testID={CONCIERGE_SECTION_TEST_ID.header} style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="sparkles" size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.headerText}>
                <SelectableText style={styles.title}>{AI_CONCIERGE_UI.panelTitle}</SelectableText>
                <SelectableText style={styles.subtitle}>{AI_CONCIERGE_UI.panelSubtitle}</SelectableText>
              </View>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
                <Ionicons name="close" size={26} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <CompactSafetyNotice style={styles.safetyNotice} />

            <View style={styles.chatHost}>
              <AiConciergeErrorBoundary>
                <AiAssistantChat
                  variant="concierge"
                  seedMessage={panelOptions?.seedMessage}
                  focusSuggestionId={panelOptions?.focusSuggestionId}
                />
              </AiConciergeErrorBoundary>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  keyboardAvoid: {
    width: '100%',
    maxHeight: '92%',
  },
  sheet: {
    height: '88%',
    maxHeight: '92%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  headerText: { flex: 1 },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  safetyNotice: {
    marginBottom: theme.spacing.sm,
  },
  chatHost: {
    flex: 1,
    minHeight: 0,
  },
});
