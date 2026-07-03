import fs from 'node:fs';

const p = 'docs/review/device-verify-v44/run-v44-phase-b-final.mjs';
let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const oldTab = `async function tapBottomTab(name) {
  if (name === 'Settings') {
    adbShell('input tap 1118 2486');
    await sleep(2500);
    return true;
  }
  if (name === 'Home') {
    adbShell('input tap 101 2486');
    await sleep(2500);
    return true;
  }
  return false;
}`;

const newTab = `async function tapBottomTab(name) {
  const xml = await dumpUi('tab-' + name);
  const labels = name === 'Settings' ? ['\\u8a2d\\u5b9a', 'Settings'] : ['Home', '\\u30db\\u30fc\\u30e0'];
  for (const l of labels) {
    const btn = findNodes(xml, (t) => t === l);
    if (btn[0]) {
      tap(btn[0]);
      await sleep(2500);
      return true;
    }
  }
  if (name === 'Settings') {
    adbShell('input tap 1118 2486');
    await sleep(2500);
    return true;
  }
  if (name === 'Home') {
    adbShell('input tap 101 2486');
    await sleep(2500);
    return true;
  }
  return false;
}`;

if (s.includes(oldTab)) {
  s = s.replace(oldTab, newTab);
  fs.writeFileSync(p, s);
  console.log('tabBottomTab patched');
} else {
  console.log('tabBottomTab pattern not found');
}
