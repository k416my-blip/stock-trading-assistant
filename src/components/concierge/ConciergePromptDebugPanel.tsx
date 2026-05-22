import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadConciergePromptDebug } from '../../services/conciergePromptDebug';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

export function ConciergePromptDebugPanel() {
  const [expanded, setExpanded] = useState(false);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const snap = await loadConciergePromptDebug();
    if (!snap) {
      setInstructions(null);
      setPayload(null);
      setSavedAt(null);
      return;
    }
    setInstructions(snap.instructionsFull);
    setPayload(snap.userPayloadJson);
    setSavedAt(snap.savedAt);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!instructions && !payload) {
    return (
      <Text style={styles.empty}>デバッグ: まだAIリクエストがありません</Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.title}>
          AIプロンプト（デバッグ） {expanded ? '▼' : '▶'}
          {savedAt ? ` · ${new Date(savedAt).toLocaleString('ja-JP')}` : ''}
        </Text>
      </Pressable>
      {expanded ? (
        <ScrollView style={styles.scroll} nestedScrollEnabled>
          <Text style={styles.sectionLabel}>instructions</Text>
          <SelectableText style={styles.mono}>{instructions}</SelectableText>
          <Text style={styles.sectionLabel}>user payload</Text>
          <SelectableText style={styles.mono}>{payload}</SelectableText>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 280,
  },
  empty: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  scroll: {
    marginTop: 6,
    maxHeight: 220,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 6,
    marginBottom: 2,
  },
  mono: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: theme.colors.text,
  },
});
