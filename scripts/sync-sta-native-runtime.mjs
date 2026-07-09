/**
 * Ensure sta-native-runtime is a real copy in node_modules (not a broken symlink on EAS).
 * Reinstall expo when incomplete after prebuild npm prune (EAS EAGER_BUNDLE).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'modules/sta-native-runtime');
const DEST = path.join(ROOT, 'node_modules/sta-native-runtime');
const EXPO_MARKER = path.join(ROOT, 'node_modules/expo/src/launch/registerRootComponent.js');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function ensureExpoPresent() {
  if (fs.existsSync(EXPO_MARKER)) return;
  console.error('[sync-sta-native-runtime] expo incomplete — reinstalling for EAS bundle');
  execSync('npm install expo@54.0.21 --no-save --include=dev', { stdio: 'inherit', cwd: ROOT });
  if (!fs.existsSync(EXPO_MARKER)) {
    console.error('[sync-sta-native-runtime] expo still missing after reinstall');
    process.exit(1);
  }
}

if (!fs.existsSync(SRC)) {
  console.error(`[sync-sta-native-runtime] missing source: ${SRC}`);
  process.exit(1);
}

if (fs.existsSync(DEST)) fs.rmSync(DEST, { recursive: true, force: true });
copyDir(SRC, DEST);

const gradle = path.join(DEST, 'android/build.gradle');
if (!fs.existsSync(gradle)) {
  console.error('[sync-sta-native-runtime] android/build.gradle missing after copy');
  process.exit(1);
}

ensureExpoPresent();
console.log('[sync-sta-native-runtime] synced modules/sta-native-runtime -> node_modules/sta-native-runtime');
