import { StyleSheet, View } from 'react-native';
import { AiAssistantChat } from '../components/AiAssistantChat';
import { AiConciergeErrorBoundary } from '../components/concierge/AiConciergeErrorBoundary';
import { Screen } from '../components/ui/Screen';
import { theme } from '../theme';

/** Beginner/Standard dedicated AI相談 tab — inline concierge chat (FAB hidden in beginner). */
export function ConciergeTabScreen() {
  return (
    <Screen title="AI相談" subtitle="わからないことはここで聞けます">
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
