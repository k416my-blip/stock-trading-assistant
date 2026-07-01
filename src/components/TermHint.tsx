import { Alert, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GlossaryTerm } from '../constants/glossary';
import { theme } from '../theme';

type TermHintProps = {
  term: GlossaryTerm;
  /** true = 説明文を下に常時表示（コンパクト行向けは false） */
  showDescription?: boolean;
  style?: ViewStyle;
};

/** 用語ラベル ＋ ？ ＋（任意）やさしい説明 */
export function TermHint({ term, showDescription = true, style }: TermHintProps) {
  const { t } = useTranslation('glossary');
  const label = t(`${term}.label`);
  const description = t(`${term}.description`);

  const showTerm = () => {
    Alert.alert(label, description);
  };

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          onPress={showTerm}
          hitSlop={10}
          accessibilityLabel={t('explainTitle', { term: label })}
        >
          <Text style={styles.icon}>？</Text>
        </Pressable>
      </View>
      {showDescription ? <Text style={styles.desc}>{description}</Text> : null}
    </View>
  );
}

type LabeledValueProps = {
  term: GlossaryTerm;
  value: string;
  valueStyle?: object;
};

/** 用語 ＋ ？ ＋ 値 ＋ 短い説明（カード内の1行向け） */
export function LabeledValue({ term, value, valueStyle }: LabeledValueProps) {
  const { t } = useTranslation('glossary');
  const label = t(`${term}.label`);
  const description = t(`${term}.description`);

  const showTerm = () => {
    Alert.alert(label, description);
  };

  return (
    <View style={styles.valueWrap}>
      <View style={styles.valueRow}>
        <Text style={styles.valueLabel}>{label}</Text>
        <Pressable onPress={showTerm} hitSlop={10}>
          <Text style={styles.icon}>？</Text>
        </Pressable>
        <Text style={[styles.valueText, valueStyle]}>{value}</Text>
      </View>
      <Text style={styles.desc}>{description}</Text>
    </View>
  );
}

/** インラインの？のみ（既にラベルがある行用） */
export function TermHintIcon({ term }: { term: GlossaryTerm }) {
  const { t } = useTranslation('glossary');
  const label = t(`${term}.label`);
  const description = t(`${term}.description`);

  const showTerm = () => {
    Alert.alert(label, description);
  };

  return (
    <Pressable onPress={showTerm} hitSlop={10} style={styles.iconOnly}>
      <Text style={styles.icon}>？</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  icon: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: theme.fontSize.md,
    width: 22,
    height: 22,
    textAlign: 'center',
    lineHeight: 22,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 11,
    overflow: 'hidden',
  },
  iconOnly: { marginLeft: 4 },
  desc: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2, lineHeight: 18 },
  valueWrap: { marginTop: theme.spacing.sm },
  valueRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  valueLabel: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  valueText: { color: theme.colors.text, fontSize: theme.fontSize.md, flexShrink: 1, flexGrow: 1, minWidth: 48 },
});
