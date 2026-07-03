/** Shared UiAutomator helpers — match React Native testID (content-desc on Android). */

export function xmlTexts(xml) {
  const s = new Set();
  const re = /(?:text|content-desc)="([^"]*)"/g;
  let m;
  while ((m = re.exec(xml))) if (m[1]) s.add(m[1]);
  return s;
}

export function findTestId(xml, testId) {
  const re = /(?:text|content-desc)="([^"]*)"/g;
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

export const TIDS = {
  homeManualOrderButton: (mode) => `home-manual-order-${mode}`,
  settingsUxMode: (mode) => `settings-ux-mode-${mode}`,
  settingsNavAiStrategy: 'settings-nav-ai-strategy',
  aiInvestmentMode: (mode) => `ai-investment-mode-${mode}`,
  manualOrderCreate: (mode) => `manual-order-create-${mode}`,
};
