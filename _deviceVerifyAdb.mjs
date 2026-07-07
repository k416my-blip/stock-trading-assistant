/** Shared UiAutomator helpers — match React Native testID (content-desc on Android). */

export function xmlTexts(xml) {
  const s = new Set();
  const re = /(?:text|content-desc)="([^"]*)"/g;
  let m;
  while ((m = re.exec(xml))) if (m[1]) s.add(m[1]);
  return s;
}

export function findTestId(xml, testId) {
  const re = /(?:text|content-desc|resource-id)="([^"]*)"/g;
  const boundsRe = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
  let m;
  while ((m = re.exec(xml))) {
    const label = m[1];
    if (label !== testId && !label.includes(testId)) continue;
    const b = xml.slice(m.index, m.index + 500).match(boundsRe);
    if (!b) continue;
    return {
      label,
      cx: Math.floor((+b[1] + +b[3]) / 2),
      cy: Math.floor((+b[2] + +b[4]) / 2),
    };
  }
  return null;
}

export function parsePendingCountFromXml(xml) {
  for (const label of xmlTexts(xml)) {
    if (!label.startsWith('manual-order-pending-count:')) continue;
    const n = Number(label.split(':')[1]);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

export function parseCompletedCountFromXml(xml) {
  for (const label of xmlTexts(xml)) {
    if (!label.startsWith('manual-order-completed-count:')) continue;
    const n = Number(label.split(':')[1]);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

export function parseListProbesFromXml(xml) {
  return {
    pending: parsePendingCountFromXml(xml),
    completed: parseCompletedCountFromXml(xml),
  };
}

export function parseCreateBlockReason(xml) {
  for (const label of xmlTexts(xml)) {
    if (!label.startsWith('manual-order-create-blocked:')) continue;
    return label.split(':').slice(1).join(':') || 'unknown';
  }
  return null;
}

export function parseCreateErrorFromXml(xml) {
  for (const label of xmlTexts(xml)) {
    if (!label.startsWith('manual-order-create-error:')) continue;
    return label.slice('manual-order-create-error:'.length) || 'unknown';
  }
  return null;
}

export function parseCreateSuccessFromXml(xml) {
  for (const label of xmlTexts(xml)) {
    if (!label.startsWith('manual-order-create-success:')) continue;
    const n = Number(label.split(':')[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export const FORM_STATE_PREFIX = 'manual-order-form-state:';

export function parseManualOrderFormProbeFromXml(xml) {
  for (const label of xmlTexts(xml)) {
    if (!label.startsWith(FORM_STATE_PREFIX)) continue;
    const body = label.slice(FORM_STATE_PREFIX.length);
    const out = {};
    for (const part of body.split(',')) {
      const i = part.indexOf('=');
      if (i <= 0) continue;
      out[part.slice(0, i)] = part.slice(i + 1);
    }
    return Object.keys(out).length ? out : null;
  }
  return null;
}

export function isCreateReady(xml) {
  const labels = [...xmlTexts(xml)];
  if (labels.some((l) => l.startsWith('manual-order-create-error:'))) return false;
  return labels.some((l) => l === 'manual-order-create-ready:yes');
}

export const TIDS = {
  languagePickerModal: 'language-picker-modal',
  languageJa: 'language-ja',
  languageOption: (lang) => `language-option-${lang}`,
  settingsLanguage: (lang) => `settings-language-${lang}`,
  homeManualOrderSection: 'home-manual-order-section',
  homeNavManualOrderList: 'home-nav-manual-order-list',
  homeManualOrderButton: (mode) => `home-manual-order-${mode}`,
  manualOrderListScreen: 'manual-order-list-screen',
  manualOrderBulkDeletePending: 'manual-order-bulk-delete-pending',
  manualOrderEditSave: 'manual-order-edit-save',
  settingsUxMode: (mode) => `settings-ux-mode-${mode}`,
  settingsNavAiStrategy: 'settings-nav-ai-strategy',
  aiInvestmentMode: (mode) => `ai-investment-mode-${mode}`,
  manualOrderCreate: (mode) => `manual-order-create-${mode}`,
  manualOrderFlowScreen: (mode) => `manual-order-flow-${mode}`,
  manualOrderCreateReady: 'manual-order-create-ready',
  manualOrderInputDeposit: 'manual-order-input-deposit',
  manualOrderInputSymbol: 'manual-order-input-symbol',
  manualOrderInputShares: 'manual-order-input-shares',
  portfolioManualOrderList: 'portfolio-manual-order-list',
  settingsNavPracticeMode: 'settings-nav-practice-mode',
  appModeLiveAnalysis: 'app-mode-live-analysis',
  appModePractice: 'app-mode-practice',
};

export const CREATE_READY = 'manual-order-create-ready:yes';
export const CREATE_BLOCKED_PREFIX = 'manual-order-create-blocked:';
