import { describe, expect, it } from 'vitest';
import { createDefaultAppState } from '../../../src/services/storage';
import { detectRakutenImportIntent } from '../../../src/services/rakutenImport/detectRakutenImportIntent';
import {
  buildConfirmPromptJa,
  parseNaturalLanguageTransaction,
} from '../../../src/services/rakutenImport/naturalLanguageTransactionParser';
import { buildNaturalLanguageImportCandidate } from '../../../src/services/rakutenImport/buildNaturalLanguageImportCandidate';
import { canSaveImportCandidate } from '../../../src/services/rakutenImport/rakutenImportConfidence';

describe('detectRakutenImportIntent', () => {
  it('detects deposit and trade phrases', () => {
    expect(detectRakutenImportIntent('500リンギット入金した')).toBe(true);
    expect(detectRakutenImportIntent('RM500 deposit')).toBe(true);
    expect(detectRakutenImportIntent('Maybankを100株買った')).toBe(true);
    expect(detectRakutenImportIntent('配当が入った')).toBe(true);
    expect(detectRakutenImportIntent('500リンギット出金した')).toBe(true);
    expect(detectRakutenImportIntent('RM500 withdrawal')).toBe(true);
    expect(detectRakutenImportIntent('手数料RM8')).toBe(true);
    expect(detectRakutenImportIntent('brokerage fee RM8')).toBe(true);
    expect(detectRakutenImportIntent('今日の相場は？')).toBe(false);
  });
});

describe('parseNaturalLanguageTransaction — user examples', () => {
  const state = createDefaultAppState();

  it('500リンギット入金した', () => {
    const r = parseNaturalLanguageTransaction('500リンギット入金した', { state });
    expect('type' in r && r.type).toBe('deposit');
    if (!('type' in r)) return;
    expect(r.totalMYR).toBe(500);
    expect(r.currency).toBe('MYR');
    expect(r.overallConfidence).toBeGreaterThanOrEqual(0.85);
    expect(canSaveImportCandidate(asCandidate(r))).toBe(true);
    expect(buildConfirmPromptJa(r)).toContain('RM500');
  });

  it('RM500 deposit', () => {
    const r = parseNaturalLanguageTransaction('RM500 deposit', { state });
    expect('type' in r && r.type).toBe('deposit');
    if (!('type' in r)) return;
    expect(r.totalMYR).toBe(500);
    expect(r.overallConfidence).toBeGreaterThanOrEqual(0.85);
  });

  it('Maybankを100株買った — price missing blocks save', () => {
    const r = parseNaturalLanguageTransaction('Maybankを100株買った', { state });
    expect('type' in r && r.type).toBe('buy');
    if (!('type' in r)) return;
    expect(r.symbol).toBe('1155');
    expect(r.quantity).toBe(100);
    expect(r.lowConfidenceFields).toContain('price');
    expect(canSaveImportCandidate(asCandidate(r))).toBe(false);
  });

  it('MaybankをRM9.20で100株買った — high confidence save', () => {
    const r = parseNaturalLanguageTransaction('MaybankをRM9.20で100株買った', { state });
    expect('type' in r && r.type).toBe('buy');
    if (!('type' in r)) return;
    expect(r.symbol).toBe('1155');
    expect(r.quantity).toBe(100);
    expect(r.price).toBe(9.2);
    expect(r.overallConfidence).toBeGreaterThanOrEqual(0.85);
    expect(canSaveImportCandidate(asCandidate(r))).toBe(true);
  });

  it('CIMBを売った — uses holdings qty, price missing blocks save', () => {
    const withHolding = {
      ...state,
      portfolio: [
        {
          id: 'p1',
          symbol: '1023',
          market: 'bursa' as const,
          currency: 'MYR' as const,
          shares: 200,
          averageBuyPrice: 7,
          currentPrice: 7.5,
        },
      ],
    };
    const r = parseNaturalLanguageTransaction('CIMBを売った', { state: withHolding });
    expect('type' in r && r.type).toBe('sell');
    if (!('type' in r)) return;
    expect(r.symbol).toBe('1023');
    expect(r.quantity).toBe(200);
    expect(r.lowConfidenceFields).toContain('price');
    expect(canSaveImportCandidate(asCandidate(r))).toBe(false);
  });

  it('配当が入った — low confidence, save blocked', () => {
    const r = parseNaturalLanguageTransaction('配当が入った', { state });
    expect('type' in r && r.type).toBe('dividend');
    if (!('type' in r)) return;
    expect(r.overallConfidence).toBeLessThan(0.6);
    expect(canSaveImportCandidate(asCandidate(r))).toBe(false);
  });

  it('Maybankの配当がRM50入った — saveable dividend', () => {
    const r = parseNaturalLanguageTransaction('Maybankの配当がRM50入った', { state });
    expect('type' in r && r.type).toBe('dividend');
    if (!('type' in r)) return;
    expect(r.symbol).toBe('1155');
    expect(r.totalMYR).toBe(50);
    expect(canSaveImportCandidate(asCandidate(r))).toBe(true);
    expect(buildConfirmPromptJa(r)).toContain('RM50');
  });

  it('500リンギット出金した — withdrawal RM500', () => {
    const r = parseNaturalLanguageTransaction('500リンギット出金した', { state });
    expect('type' in r && r.type).toBe('withdrawal');
    if (!('type' in r)) return;
    expect(r.totalMYR).toBe(500);
    expect(canSaveImportCandidate(asCandidate(r))).toBe(true);
  });

  it('RM500 withdrawal — withdrawal RM500', () => {
    const r = parseNaturalLanguageTransaction('RM500 withdrawal', { state });
    expect('type' in r && r.type).toBe('withdrawal');
    if (!('type' in r)) return;
    expect(r.totalMYR).toBe(500);
    expect(canSaveImportCandidate(asCandidate(r))).toBe(true);
  });

  it('手数料RM8 — fee RM8 no symbol', () => {
    const r = parseNaturalLanguageTransaction('手数料RM8', { state });
    expect('type' in r && r.type).toBe('fee');
    if (!('type' in r)) return;
    expect(r.fee).toBe(8);
    expect(r.symbol).toBeUndefined();
    expect(canSaveImportCandidate(asCandidate(r))).toBe(true);
  });

  it('brokerage fee RM8 — fee RM8', () => {
    const r = parseNaturalLanguageTransaction('brokerage fee RM8', { state });
    expect('type' in r && r.type).toBe('fee');
    if (!('type' in r)) return;
    expect(r.fee).toBe(8);
    expect(canSaveImportCandidate(asCandidate(r))).toBe(true);
  });
});

describe('buildNaturalLanguageImportCandidate', () => {
  it('stages natural_language source with ready_to_confirm when save allowed', () => {
    const built = buildNaturalLanguageImportCandidate('RM500 deposit', {
      state: createDefaultAppState(),
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.candidate.source).toBe('natural_language');
    expect(built.candidate.status).toBe('ready_to_confirm');
    expect(built.batch.source).toBe('natural_language');
  });

  it('stages draft when price missing on buy', () => {
    const built = buildNaturalLanguageImportCandidate('Maybankを100株買った', {
      state: createDefaultAppState(),
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.candidate.status).toBe('draft');
  });
});

function asCandidate(
  r: ReturnType<typeof parseNaturalLanguageTransaction> & object,
): import('../../../src/types/rakutenImport').BrokerTransactionCandidate {
  if ('ok' in r && r.ok === false) throw new Error('parse failed');
  const nl = r as Exclude<typeof r, { ok: false }>;
  return {
    id: 'test',
    batchId: 'batch',
    source: 'natural_language',
    type: nl.type,
    status: 'draft',
    executedAt: nl.executedAt,
    symbol: nl.symbol,
    companyName: nl.companyName,
    market: nl.market,
    currency: nl.currency,
    quantity: nl.quantity,
    price: nl.price,
    fee: nl.fee,
    totalMYR: nl.totalMYR,
    fieldConfidence: nl.fieldConfidence,
    overallConfidence: nl.overallConfidence,
    lowConfidenceFields: nl.lowConfidenceFields,
    createdAt: new Date().toISOString(),
  };
}
