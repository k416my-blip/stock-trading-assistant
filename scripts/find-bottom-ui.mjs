import fs from 'node:fs';

const x = fs.readFileSync(process.argv[2], 'utf8');
const re = /(?:text|content-desc)="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
let m;
const all = [];
while ((m = re.exec(x))) {
  const x1 = +m[2];
  const y1 = +m[3];
  const x2 = +m[4];
  const y2 = +m[5];
  if (x2 <= x1 || y2 <= y1) continue;
  all.push({ label: m[1], cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, y1, y2 });
}
all.sort((a, b) => b.cy - a.cy);
console.log('bottom 15:', JSON.stringify(all.slice(0, 15), null, 2));
