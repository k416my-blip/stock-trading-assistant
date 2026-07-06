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
  manualOrderInputDeposit: 'manual-order-input-deposit',
  manualOrderInputSymbol: 'manual-order-input-symbol',
  manualOrderInputShares: 'manual-order-input-shares',
  portfolioManualOrderList: 'portfolio-manual-order-list',
  settingsNavPracticeMode: 'settings-nav-practice-mode',
  appModeLiveAnalysis: 'app-mode-live-analysis',
  appModePractice: 'app-mode-practice',
  manualOrderFlowScreen: (mode: ManualOrderFlowMode) => `manual-order-flow-${mode}`,
  manualOrderCreateReady: 'manual-order-create-ready',
} as const;

export const DEVICE_VERIFY_CREATE_BLOCKED_PREFIX = 'manual-order-create-blocked:';
export const DEVICE_VERIFY_CREATE_READY_LABEL = 'manual-order-create-ready:yes';

export function formatCreateBlockedProbe(reason: string): string {
  return `${DEVICE_VERIFY_CREATE_BLOCKED_PREFIX}${reason}`;
}

export const DEVICE_VERIFY_CREATE_ERROR_PREFIX = 'manual-order-create-error:';
export const DEVICE_VERIFY_CREATE_SUCCESS_PREFIX = 'manual-order-create-success:';

export function formatCreateErrorProbe(reason: string): string {
  return `${DEVICE_VERIFY_CREATE_ERROR_PREFIX}${reason}`;
}

export function formatCreateSuccessProbe(count: number): string {
  return `${DEVICE_VERIFY_CREATE_SUCCESS_PREFIX}${count}`;
}

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
