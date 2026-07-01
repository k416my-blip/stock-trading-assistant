import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { buildBeginnerOnboardingAdvicePreview } from '../../services/beginner/beginnerMaterialSummaryBuilder';
import { theme } from '../../theme';

type Props = {
  visible: boolean;
  onComplete: () => void;
};

function bulletChar(bullet: 'filled' | 'open' | 'dash'): string {
  if (bullet === 'filled') return '●';
  if (bullet === 'open') return '○';
  return '—';
}

export function BeginnerOnboardingModal({ visible, onComplete }: Props) {
  const { t } = useTranslation('home');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const preview = buildBeginnerOnboardingAdvicePreview();

  const tabIntro = [
    { icon: '🏠', label: t('onboarding.tabHome'), desc: t('onboarding.tabHomeDesc') },
    { icon: '📋', label: t('onboarding.tabPortfolio'), desc: t('onboarding.tabPortfolioDesc') },
    { icon: '✓', label: t('onboarding.tabStockCheck'), desc: t('onboarding.tabStockCheckDesc') },
    { icon: '💬', label: t('onboarding.tabConcierge'), desc: t('onboarding.tabConciergeDesc') },
  ] as const;

  const handleSkip = () => {
    setStep(1);
    onComplete();
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((s) => (s === 1 ? 2 : 3) as 1 | 2 | 3);
      return;
    }
    setStep(1);
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      testID="beginner-onboarding-modal"
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {step === 1 ? (
            <>
              <Text style={styles.title} testID="onboarding-step-1">
                {t('onboarding.welcomeTitle')}
              </Text>
              <Text style={styles.body}>{t('onboarding.welcomeBody1')}</Text>
              <Text style={styles.body}>{t('onboarding.welcomeBody2')}</Text>
              <View style={styles.actions}>
                <Pressable onPress={handleSkip} testID="onboarding-skip">
                  <Text style={styles.skip}>{t('onboarding.skip')}</Text>
                </Pressable>
                <Button label={t('onboarding.next')} onPress={handleNext} />
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={styles.title} testID="onboarding-step-2">
                {t('onboarding.tabsTitle')}
              </Text>
              {tabIntro.map((tab) => (
                <View key={tab.label} style={styles.tabRow}>
                  <Text style={styles.tabIcon}>{tab.icon}</Text>
                  <Text style={styles.tabLabel}>
                    {tab.label}  →  {tab.desc}
                  </Text>
                </View>
              ))}
              <View style={styles.actionsSingle}>
                <Button label={t('onboarding.next')} onPress={handleNext} />
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Text style={styles.title} testID="onboarding-step-3">
                {t('onboarding.previewTitle')}
              </Text>
              {preview.lines.map((line) => (
                <Text key={line.text} style={styles.previewLine}>
                  {bulletChar(line.bullet)} {line.text}
                </Text>
              ))}
              <Text style={styles.previewLine}>— {preview.newPurchaseSummaryJa}</Text>
              <Text style={styles.footer}>{preview.footerJa}</Text>
              <View style={styles.actionsSingle}>
                <Button label={t('onboarding.startOnHome')} onPress={handleNext} />
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 24,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  tabIcon: {
    fontSize: 20,
    width: 28,
  },
  tabLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    flex: 1,
  },
  previewLine: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    lineHeight: 24,
  },
  footer: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  actionsSingle: {
    marginTop: theme.spacing.md,
  },
  skip: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    padding: theme.spacing.sm,
  },
});
