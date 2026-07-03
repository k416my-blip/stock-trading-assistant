import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MANUAL_ORDER_WARNING } from '../../services/allocationActions';
import type { ManualOrderFlowMode } from '../../services/manualOrderFlow';
import type { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';

const FLOW_MODES: ManualOrderFlowMode[] = [
  'concierge_full',
  'manual_full',
  'concierge_symbol',
  'concierge_quantity',
];

function modeToKey(mode: ManualOrderFlowMode): string {
  switch (mode) {
    case 'concierge_full':
      return 'conciergeFull';
    case 'manual_full':
      return 'manualFull';
    case 'concierge_symbol':
      return 'conciergeSymbol';
    case 'concierge_quantity':
      return 'conciergeQuantity';
    default:
      return 'conciergeFull';
  }
}

export function HomeManualOrderEntrySection() {
  const { t } = useTranslation('home');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Card>
      <Text style={styles.sectionTitle}>{t('manualOrderEntry.sectionTitle')}</Text>
      <Text style={styles.sectionSubtitle}>{t('manualOrderEntry.sectionSubtitle')}</Text>
      <Text style={styles.disclaimer}>{MANUAL_ORDER_WARNING}</Text>

      <View style={styles.buttonStack}>
        {FLOW_MODES.map((mode) => (
          <View key={mode} style={styles.flowBlock}>
            <Button
              label={t(`manualOrderEntry.${modeToKey(mode)}.title`)}
              onPress={() => navigation.navigate('ManualOrderFlow', { mode })}
              testID={`home-manual-order-${mode}`}
            />
            <Text style={styles.flowDesc}>{t(`manualOrderEntry.${modeToKey(mode)}.description`)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  disclaimer: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
  },
  buttonStack: {
    gap: theme.spacing.md,
  },
  flowBlock: {
    gap: theme.spacing.xs,
  },
  flowDesc: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    paddingHorizontal: theme.spacing.xs,
  },
});
