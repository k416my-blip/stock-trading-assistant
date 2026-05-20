import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONCIERGE_PANEL_SECTION_ORDER,
  CONCIERGE_SECTION_TEST_ID,
  SETTINGS_ADVANCED_DISCLOSURE_ORDER,
  SETTINGS_ADVANCED_DISCLOSURE_TEST_ID,
  SELECTABLE_TEXT_PROP,
  SHOW_CONCIERGE_QUICK_ACTIONS,
  conciergeSectionIndex,
  settingsAdvancedDisclosureIndex,
} from '../../src/constants/aiConciergeLayout';

const root = join(process.cwd(), 'src');

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('aiConciergeUiLayout', () => {
  it('composer is above system status in concierge panel', () => {
    expect(conciergeSectionIndex('composer')).toBeLessThan(conciergeSectionIndex('status_card'));
    expect(conciergeSectionIndex('status_card')).toBeLessThan(conciergeSectionIndex('chat_history'));
  });

  it('quick question chips are disabled for concierge', () => {
    expect(SHOW_CONCIERGE_QUICK_ACTIONS).toBe(false);
    expect(CONCIERGE_PANEL_SECTION_ORDER).not.toContain('quick_actions');
  });

  it('risk notice is not a concierge section', () => {
    expect(CONCIERGE_PANEL_SECTION_ORDER).not.toContain('risk_notice');
    expect('risk_notice' in CONCIERGE_SECTION_TEST_ID).toBe(false);
  });

  it('settings advanced disclosure order: beginner, personal use, risk last', () => {
    expect(settingsAdvancedDisclosureIndex('beginner_guide')).toBe(0);
    expect(settingsAdvancedDisclosureIndex('personal_use_card')).toBe(1);
    expect(settingsAdvancedDisclosureIndex('risk_notice')).toBe(2);
    expect(settingsAdvancedDisclosureIndex('risk_notice')).toBe(
      SETTINGS_ADVANCED_DISCLOSURE_ORDER.length - 1,
    );
    expect(SETTINGS_ADVANCED_DISCLOSURE_TEST_ID.risk_notice).toBe('settings-advanced-risk-notice');
  });

  it('selectable text prop enables copy', () => {
    expect(SELECTABLE_TEXT_PROP.selectable).toBe(true);
  });

  it('AiAssistantChat concierge uses SelectableText for user and assistant bubbles', () => {
    const src = readSrc('components/AiAssistantChat.tsx');
    expect(src).toContain('styles.bubbleText');
    expect(src).toContain('styles.bubbleTextConcierge');
    expect(src).toContain('SelectableText style={styles.bubbleRole}');
    expect(src).not.toContain('AI_CONCIERGE_QUICK_ACTIONS');
  });

  it('concierge system status lines use SelectableText', () => {
    const src = readSrc('components/AiAssistantChat.tsx');
    expect(src).toContain('conciergeSystemStatusBlock');
    expect(src).toContain('SelectableText style={styles.conciergeStatusLabel}');
  });

  it('RiskNoticeOrangeBox is in Settings advanced disclosure not Home or concierge chat', () => {
    const chat = readSrc('components/AiAssistantChat.tsx');
    const home = readSrc('screens/HomeScreen.tsx');
    const settingsSection = readSrc('components/SettingsAdvancedDisclosureSection.tsx');
    expect(chat).not.toContain('RiskNoticeOrangeBox');
    expect(home).not.toContain('RiskNoticeOrangeBox');
    expect(home).not.toContain('PersonalUseBanner');
    expect(home).not.toContain('HomeFeatureFooter');
    expect(settingsSection).toContain('RiskNoticeOrangeBox');
    expect(settingsSection).toContain('SETTINGS_ADVANCED_DISCLOSURE_TEST_ID.risk_notice');
  });

  it('concierge composer is outside scroll content in layout', () => {
    const src = readSrc('components/AiAssistantChat.tsx');
    const composerIdx = src.indexOf('{composerBlock}');
    const scrollIdx = src.indexOf('ref={conciergeScrollRef}');
    expect(composerIdx).toBeGreaterThan(-1);
    expect(scrollIdx).toBeGreaterThan(composerIdx);
  });
});
