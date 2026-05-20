import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenerStockCard } from '../components/ScreenerStockCard';
import { useApp } from '../context/AppContext';
import type { RootStackParamList } from '../navigation/types';
import {
  filterRankedStocks,
  rankAllStocks,
  STOCK_SEARCH_FILTER_LABELS,
  type StockSearchFilterId,
} from '../services/stockSearch';
import { tryVoiceSearch, VOICE_SEARCH_UNAVAILABLE_MESSAGE } from '../services/voiceSearch';
import type { RankedStock } from '../types';
import { theme } from '../theme';

const FILTER_IDS: StockSearchFilterId[] = [
  'us',
  'bursa',
  'hk',
  'etf',
  'dividend',
  'growth',
  'beginner',
];

export function ScreenerScreen() {
  const { aiLearningState, state, addScreenerCandidateToManualList } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<StockSearchFilterId>>(new Set());
  const [voiceLoading, setVoiceLoading] = useState(false);

  const allRanked = useMemo(
    () => rankAllStocks({ aiState: aiLearningState }),
    [aiLearningState],
  );

  const filtered = useMemo(
    () => filterRankedStocks(allRanked, query, activeFilters),
    [allRanked, query, activeFilters],
  );

  const candidateKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of state.manualOrderList) {
      if (item.side === 'buy' && !item.completed) {
        keys.add(`${item.market}-${item.symbol}`);
      }
    }
    return keys;
  }, [state.manualOrderList]);

  const toggleFilter = (id: StockSearchFilterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onVoiceSearch = async () => {
    setVoiceLoading(true);
    try {
      const result = await tryVoiceSearch();
      if (!result.ok) {
        Alert.alert('音声検索', result.message);
        return;
      }
      setQuery(result.text);
    } finally {
      setVoiceLoading(false);
    }
  };

  const onAddCandidate = useCallback(
    (stock: RankedStock) => {
      const res = addScreenerCandidateToManualList(stock);
      if (!res.ok) {
        Alert.alert('追加できません', res.error ?? 'エラーが発生しました');
        return;
      }
      Alert.alert('追加しました', `${stock.name}を手動注文リストの候補に追加しました。`);
    },
    [addScreenerCandidateToManualList],
  );

  const renderItem = useCallback(
    ({ item }: { item: RankedStock }) => {
      const key = `${item.market}-${item.symbol}`;
      return (
        <ScreenerStockCard
          stock={item}
          candidateAdded={candidateKeys.has(key)}
          onPress={() =>
            navigation.navigate('StockDetail', { symbol: item.symbol, market: item.market })
          }
          onAddCandidate={() => onAddCandidate(item)}
        />
      );
    },
    [candidateKeys, navigation, onAddCandidate],
  );

  const listHeader = (
    <View style={styles.header}>
      <Text style={styles.title}>銘柄検索</Text>
      <Text style={styles.subtitle}>総合おすすめ度の高い順に表示しています</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="銘柄名・ティッカー・市場・セクター"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Pressable
          style={({ pressed }) => [styles.voiceBtn, pressed && styles.voiceBtnPressed]}
          onPress={() => void onVoiceSearch()}
          disabled={voiceLoading}
          accessibilityLabel="音声検索"
        >
          <Ionicons name="mic-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.voiceLabel}>音声検索</Text>
        </Pressable>
      </View>
      <Text style={styles.voiceHint}>{VOICE_SEARCH_UNAVAILABLE_MESSAGE}</Text>

      <View style={styles.filters}>
        {FILTER_IDS.map((id) => {
          const active = activeFilters.has(id);
          return (
            <Pressable
              key={id}
              onPress={() => toggleFilter(id)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {STOCK_SEARCH_FILTER_LABELS[id]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.resultCount}>{filtered.length}件</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.symbol}-${item.market}`}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text style={styles.empty}>該当する銘柄が見つかりません</Text>
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  separator: { height: theme.spacing.sm },
  header: { marginBottom: theme.spacing.sm, gap: theme.spacing.sm },
  title: { color: theme.colors.text, fontSize: theme.fontSize.title, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    backgroundColor: theme.colors.surface,
  },
  voiceBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    minWidth: 72,
  },
  voiceBtnPressed: { opacity: 0.85 },
  voiceLabel: { color: theme.colors.primary, fontSize: 10, fontWeight: '700', marginTop: 2 },
  voiceHint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  resultCount: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  empty: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    fontSize: theme.fontSize.md,
  },
});
