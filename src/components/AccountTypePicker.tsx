import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ACCOUNT_TYPE_LABEL,
  ACCOUNT_TYPE_WARNING,
  HIGH_RISK_ACCOUNTS,
} from '../constants/rakutenTrade';
import type { AccountType } from '../types';
import { accountTypeShortLabel } from '../i18n/ja';
import { theme } from '../theme';

const TYPES: AccountType[] = ['cash_upfront', 'contra', 'raku_margin'];

type Props = {
  selected: AccountType;
  onSelect: (type: AccountType) => void;
};

export function AccountTypePicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.list}>
      {TYPES.map((type) => {
        const disabled = HIGH_RISK_ACCOUNTS.includes(type);
        const active = selected === type;
        return (
          <Pressable
            key={type}
            disabled={disabled}
            onPress={() => {
              if (disabled) {
                Alert.alert('高リスク口座', ACCOUNT_TYPE_WARNING[type]);
                return;
              }
              onSelect(type);
            }}
            style={[styles.item, active && styles.itemActive, disabled && styles.itemDisabled]}
          >
            <Text style={[styles.title, disabled && styles.textDisabled]}>
              {accountTypeShortLabel[type]}
            </Text>
            <Text style={[styles.sub, disabled && styles.textDisabled]}>
              {ACCOUNT_TYPE_LABEL[type]}
              {disabled ? ' · 無効' : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing.sm },
  item: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  itemActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceElevated },
  itemDisabled: { opacity: 0.45 },
  title: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  sub: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  textDisabled: { color: theme.colors.textMuted },
});
