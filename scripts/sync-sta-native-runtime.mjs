/**
 * Ensure sta-native-runtime is a real copy in node_modules (not a broken symlink on EAS).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'modules/sta-native-runtime');
const DEST = path.join(ROOT, 'node_modules/sta-native-runtime');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

if (!fs.existsSync(SRC)) {
  console.error(`[sync-sta-native-runtime] missing source: ${SRC}`);
  process.exit(1);
}

if (fs.existsSync(DEST)) {
  fs.rmSync(DEST, { recursive: true, force: true });
}

copyDir(SRC, DEST);

const gradle = path.join(DEST, 'android/build.gradle');
if (!fs.existsSync(gradle)) {
  console.error(`[sync-sta-native-runtime] android/build.gradle missing after copy`);
  process.exit(1);
}

console.log('[sync-sta-native-runtime] synced modules/sta-native-runtime -> node_modules/sta-native-runtime');
