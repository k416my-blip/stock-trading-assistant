import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const url = 'https://www.klsescreener.com/v2/shareholdings?code=1155';
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
  });
  const html = await res.text();
  writeFileSync(join(process.cwd(), 'scripts/klse-shareholdings-1155.html'), html, 'utf8');
  console.log('status', res.status, 'len', html.length);
}

main().catch(console.error);
