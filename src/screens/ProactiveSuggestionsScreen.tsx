import { ScrollView, StyleSheet, Text } from 'react-native';
import { ProactiveSuggestionCard } from '../components/proactive/ProactiveSuggestionCard';
import { Screen } from '../components/ui/Screen';
import { PROACTIVE_UI } from '../constants/proactiveConcierge';
import { useProactiveConcierge } from '../context/ProactiveConciergeContext';
import { useAiConcierge } from '../context/AiConciergeContext';
import { isUnhandledProactiveStatus } from '../types/proactiveSuggestion';
import { theme } from '../theme';

export function ProactiveSuggestionsScreen() {
  const { suggestions, acknowledge, seeLater, openDetail } = useProactiveConcierge();
  const { openPanel } = useAiConcierge();

  const list = suggestions.filter((s) => isUnhandledProactiveStatus(s.status));

  return (
    <Screen title={PROACTIVE_UI.listTitle} subtitle="確認型・参考型の提案のみ（自動売買なし）">
      <ScrollView contentContainerStyle={styles.scroll}>
        {list.length === 0 ? (
          <Text style={styles.empty}>未確認の提案はありません</Text>
        ) : (
          list.map((s) => (
            <ProactiveSuggestionCard
              key={s.id}
              suggestion={s}
              onAcknowledge={() => void acknowledge(s.id)}
              onSeeLater={() => void seeLater(s.id)}
              onDetail={() => {
                void openDetail(s.id);
                openPanel({ focusSuggestionId: s.id, seedMessage: `${s.titleJa} — 詳しく教えてください（参考情報として）` });
              }}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: theme.spacing.xl },
  empty: { color: theme.colors.textMuted, fontSize: theme.fontSize.md, marginTop: theme.spacing.md },
});
