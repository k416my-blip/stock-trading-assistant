import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';

const FIXTURE = join(process.cwd(), 'scripts/klse-sample-1155.html');

function loadFixture(): string {
  return readFileSync(FIXTURE, 'utf8');
}

describe('bursa KLSE parsers (1155 Maybank fixture)', () => {
  it('parses company profile fields', () => {
    const html = loadFixture();
    const profile = parseBursaCompanyProfileFromHtml(html, '1155');

    expect(profile.companyName).toContain('MALAYAN BANKING');
    expect(profile.sector).toBe('Banking');
    expect(profile.subSector).toBeNull();
    expect(profile.companyOverview).toContain('Malayan Banking Berhad');
    expect(profile.marketCap).toBeGreaterThan(100_000_000_000);
    expect(profile.sharesOutstanding).toBeGreaterThan(10_000_000_000);
    expect(profile.fetchedFields).toContain('companyName');
    expect(profile.fetchedFields).toContain('marketCap');
  });

  it('parses latest quarterly report', () => {
    const html = loadFixture();
    const q = parseBursaQuarterlyFromHtml(html, '1155');

    expect(q.latestQuarter).not.toBeNull();
    expect(q.latestQuarter?.quarterEndDate).toBe('2026-03-31');
    expect(q.latestQuarter?.announcedDate).toBe('2026-05-28');
    expect(q.latestQuarter?.revenue).toBeGreaterThan(1_000_000_000);
    expect(q.latestQuarter?.netProfit).toBeGreaterThan(1_000_000_000);
    expect(q.latestQuarter?.eps).toBeGreaterThan(0);
    expect(q.latestQuarter?.operatingProfit).toBeNull();
  });

  it('parses dividend history', () => {
    const html = loadFixture();
    const d = parseBursaDividendFromHtml(html, '1155');

    expect(d.history.length).toBeGreaterThan(2);
    expect(d.history[0]?.amountPerShare).toBeGreaterThan(0);
    expect(d.history[0]?.dividendType).toContain('Dividend');
  });
});
