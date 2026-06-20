import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { buildBeginnerOnboardingAdvicePreview } from '../../services/beginner/beginnerMaterialSummaryBuilder';
import { theme } from '../../theme';

type Props = {
  visible: boolean;
  onComplete: () => void;
};

const TAB_INTRO = [
  { icon: '🏠', label: 'ホーム', desc: '今日の方針' },
  { icon: '📋', label: '保有銘柄', desc: 'このまま持つ？' },
  { icon: '✓', label: '銘柄チェック', desc: 'なぜそう？' },
  { icon: '💬', label: 'AI相談', desc: 'わからないことは聞く' },
] as const;

function bulletChar(bullet: 'filled' | 'open' | 'dash'): string {
  if (bullet === 'filled') return '●';
  if (bullet === 'open') return '○';
  return '—';
}

export function BeginnerOnboardingModal({ visible, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const preview = buildBeginnerOnboardingAdvicePreview();

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
                ようこそ
              </Text>
              <Text style={styles.body}>
                このアプリは、株の「買う・持つ・見る」を AI がやさしく整理してくれます。
              </Text>
              <Text style={styles.body}>急いで売買する必要はありません。</Text>
              <View style={styles.actions}>
                <Pressable onPress={handleSkip} testID="onboarding-skip">
                  <Text style={styles.skip}>スキップ</Text>
                </Pressable>
                <Button label="次へ" onPress={handleNext} />
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={styles.title} testID="onboarding-step-2">
                4つの画面
              </Text>
              {TAB_INTRO.map((tab) => (
                <View key={tab.label} style={styles.tabRow}>
                  <Text style={styles.tabIcon}>{tab.icon}</Text>
                  <Text style={styles.tabLabel}>
                    {tab.label}  →  {tab.desc}
                  </Text>
                </View>
              ))}
              <View style={styles.actionsSingle}>
                <Button label="次へ" onPress={handleNext} />
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Text style={styles.title} testID="onboarding-step-3">
                今日のAIアドバイス（プレビュー）
              </Text>
              {preview.lines.map((line) => (
                <Text key={line.text} style={styles.previewLine}>
                  {bulletChar(line.bullet)} {line.text}
                </Text>
              ))}
              <Text style={styles.previewLine}>— {preview.newPurchaseSummaryJa}</Text>
              <Text style={styles.footer}>{preview.footerJa}</Text>
              <View style={styles.actionsSingle}>
                <Button label="ホームではじめる" onPress={handleNext} />
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
