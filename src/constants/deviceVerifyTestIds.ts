import type { AppUxMode } from '../types/appUxMode';
import type { InvestmentDisplayMode } from '../types/investmentDisplay';
import type { ManualOrderFlowMode } from '../services/manualOrderFlow';

/** Stable testIDs / accessibility probes for device verification (UiAutomator). */
export const DEVICE_VERIFY_TEST_IDS = {
  languagePickerModal: 'language-picker-modal',
  languageOption: (language: string) => `language-option-${language}`,
  /** UiAutomator alias for initial language picker (ja). */
  languageJa: 'language-ja',
  settingsLanguage: (language: string) => `settings-language-${language}`,
  homeManualOrderSection: 'home-manual-order-section',
  homeManualOrderButton: (mode: ManualOrderFlowMode) => `home-manual-order-${mode}`,
  settingsDisplayModeSection: 'settings-display-mode-section',
  settingsUxMode: (mode: AppUxMode) => `settings-ux-mode-${mode}`,
  settingsNavAiStrategy: 'settings-nav-ai-strategy',
  aiInvestmentModeSection: 'ai-investment-mode-section',
  aiInvestmentMode: (mode: InvestmentDisplayMode) => `ai-investment-mode-${mode}`,
  manualOrderCreate: (mode: ManualOrderFlowMode) => `manual-order-create-${mode}`,
  manualOrderPendingCount: 'manual-order-pending-count',
  settingsNavPracticeMode: 'settings-nav-practice-mode',
  appModeLiveAnalysis: 'app-mode-live-analysis',
} as const;

export const DEVICE_VERIFY_PENDING_COUNT_PROBE_PREFIX = 'manual-order-pending-count:';

export function formatPendingManualOrderProbe(count: number): string {
  return `${DEVICE_VERIFY_PENDING_COUNT_PROBE_PREFIX}${count}`;
}

export function parsePendingManualOrderProbe(label: string): number | null {
  const prefix = DEVICE_VERIFY_PENDING_COUNT_PROBE_PREFIX;
  if (!label.startsWith(prefix)) return null;
  const n = Number(label.slice(prefix.length));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
