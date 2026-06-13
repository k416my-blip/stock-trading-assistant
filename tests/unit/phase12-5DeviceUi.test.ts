import { describe, expect, it } from 'vitest';
import {
  findStockSearchCards,
  isStockCardLabel,
  isStockAppForeground,
  isForeignAppForeground,
  isStockDetailVisible,
  isWrongStockDetail,
  normalizeMatchText,
  parseForegroundPackage,
  pickBestStockCard,
  pickStockCardTapTargets,
  stockSearchInputText,
  stockSearchQueries,
} from '../../scripts/lib/phase12-5-device-ui.mjs';

const STOCK_1295 = {
  code: '1295',
  label: 'Public Bank',
  query: 'Public Bank',
  screenerSymbols: ['5225'],
  cardNames: ['Public Bank Berhad'],
  detailExclude: ['IHH', 'Healthcare'],
};

const STOCK_1155 = {
  code: '1155',
  label: 'Maybank',
  query: 'Maybank',
  aliases: ['Malayan Banking', 'MAYBANK'],
};

const STOCK_4707 = {
  code: '4707',
  label: 'Nestle',
  query: 'Nestle',
  aliases: ['Nestlé', 'Nestle Malaysia'],
  patterns: ['4707', 'Nestle'],
};

function mockFindLabels(xml: string, pred: (l: string) => boolean) {
  const re = /(?:text|content-desc)="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  const out: Array<{ label: string; cx: number; cy: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (!pred(m[1])) continue;
    out.push({
      label: m[1],
      cx: Math.floor((+m[2] + +m[4]) / 2),
      cy: Math.floor((+m[3] + +m[5]) / 2),
    });
  }
  return out;
}

const STOCK_6033 = {
  code: '6033',
  label: 'Petronas Gas',
  query: 'Petronas Gas',
  aliases: ['PETGAS', 'Petronas'],
  patterns: ['6033', 'Petronas Gas', 'PETGAS', 'Petronas'],
  cardNames: ['Petronas Gas Berhad', 'PETRONAS GAS', 'PETRONAS GAS BERHAD'],
  cardMustInclude: ['Gas'],
  cardExclude: ['Chemicals', 'Dagangan', 'IHH', 'Healthcare', '5183'],
  detailExclude: ['Petronas Chemicals', '5183', 'Chemicals', 'Dagangan', 'IHH', 'Healthcare'],
  detailWaitMs: 45_000,
};

describe('phase12-5 device UI helpers', () => {
  it('parseForegroundPackage extracts package from dumpsys line', () => {
    const line =
      '  mCurrentFocus=Window{abc u0 com.assistant.stocktrading/com.assistant.stocktrading.MainActivity}';
    expect(parseForegroundPackage(line)).toBe('com.assistant.stocktrading');
    expect(parseForegroundPackage('  mCurrentFocus=Window{x u0 com.whatsapp/com.whatsapp.Home}')).toBe(
      'com.whatsapp',
    );
  });

  it('stockSearchQueries returns query then aliases deduped by case', () => {
    expect(stockSearchQueries(STOCK_1155)).toEqual(['Maybank', 'Malayan Banking']);
    expect(stockSearchInputText(STOCK_1155)).toBe('Maybank');
  });

  it('normalizeMatchText folds case and accents', () => {
    expect(normalizeMatchText('Nestlé')).toBe('nestle');
    expect(normalizeMatchText('MAYBANK')).toBe('maybank');
  });

  it('isStockCardLabel matches code dot label and alias-insensitive cards', () => {
    expect(isStockCardLabel('1155 · Maybank · マレー', STOCK_1155)).toBe(true);
    expect(isStockCardLabel('1023 · バルサ・マレーシア', { code: '1023', label: 'CIMB', query: 'CIMB' })).toBe(
      true,
    );
    expect(
      isStockCardLabel('Public Bank Berhad', {
        code: '1295',
        label: 'Public Bank',
        query: 'Public Bank',
        screenerSymbols: ['5225'],
        cardNames: ['Public Bank Berhad'],
      }),
    ).toBe(true);
    expect(
      isStockCardLabel('5225 · バルサ・マレーシア', {
        code: '1295',
        label: 'Public Bank',
        query: 'Public Bank',
        screenerSymbols: ['5225'],
      }),
    ).toBe(true);
    expect(isStockCardLabel('マレーシア市場', STOCK_1155)).toBe(false);
    expect(isStockCardLabel('0件', STOCK_1155)).toBe(false);
  });

  it('findStockSearchCards skips filters and finds result row', () => {
    const xml =
      '<node text="マレーシア市場" bounds="[0,0][1,1]" />' +
      '<node text="1155 · Maybank · マレー" bounds="[10,20][100,80]" />';
    const cards = findStockSearchCards(xml, STOCK_1155, mockFindLabels);
    expect(cards).toHaveLength(1);
    expect(cards[0].label).toContain('Maybank');
  });

  it('pickStockCardTapTargets prefers ticker line over title for 1295', () => {
    const cards = [
      { label: 'Public Bank Berhad', cx: 100, cy: 200 },
      { label: '5225 · バルサ・マレーシア', cx: 100, cy: 240 },
    ];
    const targets = pickStockCardTapTargets(STOCK_1295, cards);
    expect(targets[0].label).toBe('5225 · バルサ・マレーシア');
    expect(pickBestStockCard(STOCK_1295, cards)?.label).toBe('5225 · バルサ・マレーシア');
  });

  it('isWrongStockDetail rejects IHH page for Public Bank', () => {
    const ihh =
      '<node text="AI四季報" /><node text="会社名" /><node text="IHH HEALTHCARE BERHAD" />';
    expect(isWrongStockDetail(ihh, STOCK_1295)).toBe(true);
    const pbb =
      '<node text="AI四季報" /><node text="会社名" /><node text="Public Bank Berhad" />';
    expect(isWrongStockDetail(pbb, STOCK_1295)).toBe(false);
    expect(isStockDetailVisible(pbb, STOCK_1295)).toBe(true);
  });

  it('isStockDetailVisible detects code and AI四季報 content', () => {
    const xml = '<node text="AI四季報" /><node text="4707 Nestle Malaysia" />';
    expect(isStockDetailVisible(xml, STOCK_4707)).toBe(true);
    expect(isStockDetailVisible('<node text="AI四季報を取得中" />', STOCK_4707)).toBe(false);
  });

  it('foreground helpers distinguish stock app vs foreign app', () => {
    expect(isStockAppForeground('com.assistant.stocktrading')).toBe(true);
    expect(isStockAppForeground('com.whatsapp')).toBe(false);
    expect(isForeignAppForeground('com.whatsapp')).toBe(true);
    expect(isForeignAppForeground('com.assistant.stocktrading')).toBe(false);
  });

  it('6033 search queries prefer Petronas Gas and exclude Chemicals card', () => {
    expect(stockSearchQueries(STOCK_6033)).toEqual(['Petronas Gas', 'PETGAS', 'Petronas']);
    expect(
      isStockCardLabel('Petronas Chemicals Group | 5183 · バルサ', STOCK_6033),
    ).toBe(false);
    expect(isStockCardLabel('Petronas Gas Berhad', STOCK_6033)).toBe(true);
    expect(isStockCardLabel('6033 · バルサ', STOCK_6033)).toBe(true);
  });

  it('6033 detail visible accepts PETRONAS GAS BERHAD and rejects Chemicals', () => {
    const gas =
      '<node text="AI四季報" /><node text="会社名" /><node text="PETRONAS GAS BERHAD" /><node text="6033" />';
    const chemicals =
      '<node text="AI四季報" /><node text="会社名" /><node text="Petronas Chemicals Group" /><node text="5183" />';
    expect(isStockDetailVisible(gas, STOCK_6033)).toBe(true);
    expect(isWrongStockDetail(chemicals, STOCK_6033)).toBe(true);
    expect(isWrongStockDetail(gas, STOCK_6033)).toBe(false);
  });
});
