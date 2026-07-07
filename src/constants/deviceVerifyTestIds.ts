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
  /** Home → ManualOrderList (E2E / all UX modes). */
  homeNavManualOrderList: 'home-nav-manual-order-list',
  homeManualOrderButton: (mode: ManualOrderFlowMode) => `home-manual-order-${mode}`,
  settingsDisplayModeSection: 'settings-display-mode-section',
  settingsUxMode: (mode: AppUxMode) => `settings-ux-mode-${mode}`,
  settingsNavAiStrategy: 'settings-nav-ai-strategy',
  aiInvestmentModeSection: 'ai-investment-mode-section',
  aiInvestmentMode: (mode: InvestmentDisplayMode) => `ai-investment-mode-${mode}`,
  manualOrderCreate: (mode: ManualOrderFlowMode) => `manual-order-create-${mode}`,
  manualOrderPendingCount: 'manual-order-pending-count',
  manualOrderCompletedCount: 'manual-order-completed-count',
  manualOrderListScreen: 'manual-order-list-screen',
  manualOrderCard: (id: string) => `manual-order-card-${id}`,
  manualOrderDelete: (id: string) => `manual-order-delete-${id}`,
  manualOrderEdit: (id: string) => `manual-order-edit-${id}`,
  manualOrderComplete: (id: string) => `manual-order-complete-${id}`,
  manualOrderBulkDeletePending: 'manual-order-bulk-delete-pending',
  manualOrderTabPending: 'manual-order-tab-pending',
  manualOrderTabCompleted: 'manual-order-tab-completed',
  manualOrderEditSave: 'manual-order-edit-save',
  manualOrderEditCancel: 'manual-order-edit-cancel',
  manualOrderEditShares: 'manual-order-edit-shares',
  manualOrderConfirmDialog: 'manual-order-confirm-dialog',
  manualOrderConfirmTitle: 'manual-order-confirm-title',
  manualOrderConfirmBody: 'manual-order-confirm-body',
  manualOrderConfirmCancel: 'manual-order-confirm-cancel',
  manualOrderConfirmOk: 'manual-order-confirm-ok',
  manualOrderInputDeposit: 'manual-order-input-deposit',
  manualOrderInputSymbol: 'manual-order-input-symbol',
  manualOrderInputShares: 'manual-order-input-shares',
  /** E2E aliases (UiAutomator). */
  manualOrderSymbolInput: 'manual-order-symbol-input',
  manualOrderSharesInput: 'manual-order-shares-input',
  manualOrderDepositInput: 'manual-order-deposit-input',
  manualOrderSideBuy: 'manual-order-side-buy',
  manualOrderMarketBursa: 'market-picker-bursa',
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
export const DEVICE_VERIFY_COMPLETED_COUNT_PROBE_PREFIX = 'manual-order-completed-count:';

export function formatPendingManualOrderProbe(count: number): string {
  return `${DEVICE_VERIFY_PENDING_COUNT_PROBE_PREFIX}${count}`;
}

export function formatCompletedManualOrderProbe(count: number): string {
  return `${DEVICE_VERIFY_COMPLETED_COUNT_PROBE_PREFIX}${count}`;
}

export function parsePendingManualOrderProbe(label: string): number | null {
  const prefix = DEVICE_VERIFY_PENDING_COUNT_PROBE_PREFIX;
  if (!label.startsWith(prefix)) return null;
  const n = Number(label.slice(prefix.length));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const DEVICE_VERIFY_FORM_STATE_PREFIX = 'manual-order-form-state:';

export function formatManualOrderFormProbe(fields: Record<string, string | number | boolean>): string {
  const pairs = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return `${DEVICE_VERIFY_FORM_STATE_PREFIX}${pairs}`;
}

export function parseManualOrderFormProbe(label: string): Record<string, string> | null {
  if (!label.startsWith(DEVICE_VERIFY_FORM_STATE_PREFIX)) return null;
  const body = label.slice(DEVICE_VERIFY_FORM_STATE_PREFIX.length);
  const out: Record<string, string> = {};
  for (const part of body.split(',')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    out[part.slice(0, i)] = part.slice(i + 1);
  }
  return Object.keys(out).length ? out : null;
}

/** Dev/E2E only — seeds ManualOrderFlowScreen controlled inputs via AsyncStorage. */
export const E2E_MANUAL_ORDER_FORM_SEED_KEY = '@sta/e2e_manual_order_form_seed';
