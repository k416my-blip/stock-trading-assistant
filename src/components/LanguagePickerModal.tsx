import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import {
  LANGUAGE_PICKER_OPTIONS,
  nativeLabelForAppLanguage,
  useAppLanguage,
} from '../context/AppLanguageContext';
import type { AppLanguage } from '../types/appLanguage';
import { theme } from '../theme';

type Props = {
  visible: boolean;
};

export function LanguagePickerModal({ visible }: Props) {
  const { t } = useTranslation('common');
  const { appLanguage, confirmInitialLanguage } = useAppLanguage();
  const [selected, setSelected] = useState<AppLanguage>(appLanguage);
  const [busy, setBusy] = useState(false);

  const onConfirm = () => {
    setBusy(true);
    void confirmInitialLanguage(selected).finally(() => setBusy(false));
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      testID="language-picker-modal"
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('languagePicker.title')}</Text>
          <Text style={styles.subtitle}>{t('languagePicker.subtitle')}</Text>

          {LANGUAGE_PICKER_OPTIONS.map((language, index) => (
            <Pressable
              key={language}
              onPress={() => setSelected(language)}
              testID={`language-option-${language}`}
              style={({ pressed }) => [
                styles.optionRow,
                index < LANGUAGE_PICKER_OPTIONS.length - 1 && styles.optionRowBorder,
                pressed && styles.optionRowPressed,
                selected === language && styles.optionRowSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  selected === language && styles.optionLabelSelected,
                ]}
              >
                {nativeLabelForAppLanguage(language)}
              </Text>
              {selected === language ? (
                <Text style={styles.optionCheck}>✓</Text>
              ) : (
                <View style={styles.optionRadioOff} />
              )}
            </Pressable>
          ))}

          <Button
            label={t('languagePicker.confirm')}
            onPress={onConfirm}
            disabled={busy}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  optionRowPressed: {
    opacity: 0.85,
  },
  optionRowSelected: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  optionLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  optionCheck: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  optionRadioOff: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
});
