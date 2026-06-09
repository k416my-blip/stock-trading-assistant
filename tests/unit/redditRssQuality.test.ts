import { describe, expect, it } from 'vitest';
import {
  applyRedditQualityToEntries,
  applyRedditQualityToTitles,
  buildRedditSearchQueries,
  computeInvestmentConfidence,
  computeRedditConfidence,
  filterScoreSortRedditEntries,
  filterScoreSortRedditTitles,
  hasBankingNegativeKeyword,
  hasInvestmentPositiveKeyword,
  isMaybankStock,
  isPreferredInvestmentSubreddit,
  passesStage2InvestmentFilter,
  scoreRedditEntry,
  scoreRedditTitle,
  titleMatchesRedditKeywords,
} from '../../src/services/bursa/redditRssQuality';

const MAYBANK_INPUT = { stockCode: '1155', companyName: 'MALAYAN BANKING BERHAD' };

describe('redditRssQuality', () => {
  it('uses Maybank-specific search queries including subreddit bias', () => {
    expect(isMaybankStock('1155', 'MALAYAN BANKING BERHAD')).toBe(true);
    expect(buildRedditSearchQueries(MAYBANK_INPUT)).toEqual([
      'Maybank',
      'MAYBANK',
      'MALAYAN BANKING',
      '1155.KL',
      '1155 Bursa',
      'Maybank subreddit:BursaMalaysia',
      'Maybank subreddit:malaysia',
      '1155 KLSE',
      'Maybank dividend',
      'Maybank earnings',
      'Maybank shares',
      '1155 dividend',
    ]);
  });

  it('stage1 excludes unrelated titles', () => {
    expect(titleMatchesRedditKeywords('Made the payment', MAYBANK_INPUT)).toBe(false);
    expect(titleMatchesRedditKeywords('Maybank earnings', MAYBANK_INPUT)).toBe(true);
  });

  it('stage2 requires investment keywords and excludes banking topics', () => {
    expect(hasBankingNegativeKeyword('Maybank Savings Account')).toBe(true);
    expect(hasBankingNegativeKeyword('new mortgage: 1.45% fix maybank')).toBe(true);
    expect(hasBankingNegativeKeyword('Maybank delivered my card to wrong address')).toBe(false);
    expect(passesStage2InvestmentFilter({ title: 'Maybank Savings Account', subreddit: null, link: null })).toBe(
      false,
    );
    expect(
      passesStage2InvestmentFilter({
        title: 'Maybank dividend outlook for 1155 on Bursa',
        subreddit: null,
        link: null,
      }),
    ).toBe(true);
    expect(
      passesStage2InvestmentFilter({
        title: 'Maybank outlook',
        subreddit: 'BursaMalaysia',
        link: 'https://www.reddit.com/r/BursaMalaysia/comments/abc',
      }),
    ).toBe(false);
  });

  it('preferred subreddits boost score but do not bypass keyword filter', () => {
    expect(hasInvestmentPositiveKeyword('Maybank quarterly results beat estimates')).toBe(true);
    expect(isPreferredInvestmentSubreddit('BursaMalaysia')).toBe(true);
    expect(isPreferredInvestmentSubreddit('malaysia')).toBe(false);
    expect(isPreferredInvestmentSubreddit('personalfinance')).toBe(false);
  });

  it('filters and scores investment material only', () => {
    const entries = [
      { title: 'Made the payment', subreddit: null, link: null },
      { title: 'Maybank Savings Account', subreddit: null, link: null },
      { title: 'new mortgage: 1.45% 2Y fix maybank', subreddit: null, link: null },
      { title: 'Maybank dividend discussion for 1155', subreddit: null, link: null },
      { title: 'MALAYAN BANKING quarterly results on Bursa', subreddit: 'BursaMalaysia', link: null },
      { title: '1155.KL thread — Maybank outlook', subreddit: null, link: null },
    ];
    const result = filterScoreSortRedditEntries(entries, MAYBANK_INPUT);
    expect(result.fetchedCount).toBe(6);
    expect(result.validCount).toBe(2);
    expect(result.excludedCount).toBe(4);
    expect(result.items.every((item) => !/savings account|mortgage/i.test(item.title))).toBe(true);
    expect(result.items.some((item) => item.title.includes('dividend'))).toBe(true);
  });

  it('scores Maybank and investment keywords', () => {
    expect(scoreRedditTitle('Maybank outlook', MAYBANK_INPUT)).toBe(10);
    expect(scoreRedditTitle('Malayan Banking results', MAYBANK_INPUT)).toBe(15);
    expect(
      scoreRedditEntry(
        { title: 'Maybank dividend on Bursa', subreddit: 'BursaMalaysia', link: null },
        MAYBANK_INPUT,
      ),
    ).toBeGreaterThan(30);
  });

  it('computes investment confidence from valid investment items', () => {
    expect(
      computeInvestmentConfidence(2, [
        { title: 'Maybank dividend outlook', score: 35, subreddit: null },
        { title: '1155 quarterly results', score: 40, subreddit: 'BursaMalaysia' },
      ]),
    ).toBe('高');
    expect(computeInvestmentConfidence(0, [])).toBe('低');
  });

  it('marks low quality when most articles are filtered out', () => {
    const quality = applyRedditQualityToTitles(
      [
        'Made the payment',
        'Buy in dip',
        'Kuala Lumpur weather',
        'Random thread',
        'Maybank Savings Account',
      ],
      MAYBANK_INPUT,
    );
    expect(quality.fetchedCount).toBe(5);
    expect(quality.validCount).toBe(0);
    expect(quality.excludedCount).toBe(5);
    expect(quality.confidenceJa).toBe('低');
    expect(quality.investmentConfidenceJa).toBe('低');
    expect(quality.qualityWarningJa).toBe('Reddit品質低');
  });

  it('marks high reddit confidence with enough valid articles', () => {
    const { confidenceJa, qualityWarningJa } = computeRedditConfidence(6, 4);
    expect(confidenceJa).toBe('高');
    expect(qualityWarningJa).toBeNull();
  });

  it('applyRedditQualityToEntries prioritizes subreddit posts in sort order', () => {
    const quality = applyRedditQualityToEntries(
      [
        {
          title: 'Maybank dividend outlook',
          subreddit: 'personalfinance',
          link: null,
        },
        {
          title: 'Maybank earnings beat on KLSE',
          subreddit: 'BursaMalaysia',
          link: 'https://www.reddit.com/r/BursaMalaysia/comments/abc',
        },
      ],
      MAYBANK_INPUT,
    );
    expect(quality.validCount).toBe(2);
    expect(quality.items[0]?.subreddit).toBe('bursamalaysia');
  });
});
