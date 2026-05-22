import { StyleSheet, Text, View } from 'react-native';
import { CONCIERGE_RISK_COLOR_HEX } from '../../constants/conciergeUx';
import type { ConciergeOneScreenSection, ConciergeUxBundle } from '../../types/conciergeUx';
import { ConciergeAiSummaryCard } from './ConciergeAiSummaryCard';
import { ConciergeFocusSymbolCard } from './ConciergeFocusSymbolCard';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: ConciergeUxBundle;
};

function SectionBlock({ section }: { section: ConciergeOneScreenSection }) {
  const accent = CONCIERGE_RISK_COLOR_HEX[section.riskColor];
  return (
    <View style={[styles.section, { borderLeftColor: accent }]}>
      <Text style={styles.sectionTitle}>{section.titleJa}</Text>
      {section.linesJa.map((line, i) => (
        <SelectableText key={`${section.id}-${i}`} style={styles.sectionLine}>
          {line}
        </SelectableText>
      ))}
    </View>
  );
}

export function ConciergeOneScreenDashboard({ bundle }: Props) {
  return (
    <View testID="concierge-ux-one-screen">
      <ConciergeAiSummaryCard summary={bundle.summary} />
      {bundle.focusSymbol ? <ConciergeFocusSymbolCard focus={bundle.focusSymbol} /> : null}
      <View style={styles.grid}>
        {bundle.oneScreen.map((s) => (
          <SectionBlock key={s.id} section={s} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: theme.spacing.xs },
  section: {
    borderLeftWidth: 3,
    paddingLeft: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginBottom: 2,
  },
  sectionLine: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
});
