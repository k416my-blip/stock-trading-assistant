import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AiAssistantChat } from '../components/AiAssistantChat';
import { AiConciergeErrorBoundary } from '../components/concierge/AiConciergeErrorBoundary';
import { Screen } from '../components/ui/Screen';
import { theme } from '../theme';

/** Beginner/Standard dedicated AI相談 tab — inline concierge chat (FAB hidden in beginner). */
export function ConciergeTabScreen() {
  const { t } = useTranslation('concierge');

  return (
    <Screen title={t('screenTitle')} subtitle={t('screenSubtitle')}>
      <View style={styles.chatHost} testID="concierge-tab-screen">
        <AiConciergeErrorBoundary>
          <AiAssistantChat variant="concierge" />
        </AiConciergeErrorBoundary>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chatHost: {
    flex: 1,
    minHeight: 420,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
});
