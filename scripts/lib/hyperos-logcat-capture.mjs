/**
 * Node-native adb logcat capture — avoids broken PowerShell Out-File pipelines on Windows.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * @returns {{ child: import('node:child_process').ChildProcess, stream: fs.WriteStream, destPath: string, pid: number }}
 */
export function startLogcatCaptureToFile({ serial, destPath, rootDir = process.cwd() }) {
  const abs = path.isAbsolute(destPath) ? destPath : path.join(rootDir, destPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, '', 'utf8');
  const stream = fs.createWriteStream(abs, { flags: 'a', encoding: 'utf8' });
  const child = spawn('adb', ['-s', serial, 'logcat', '-v', 'threadtime'], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.pipe(stream, { end: false });
  child.stderr.pipe(stream, { end: false });
  child.on('error', (err) => {
    try {
      stream.write(`\n[logcat-capture-error] ${err.message}\n`);
    } catch {
      /* ignore */
    }
  });
  return { child, stream, destPath: abs, pid: child.pid ?? 0 };
}

export function stopLogcatCapture(handle) {
  if (!handle) return;
  const { child, stream } = handle;
  try {
    child.stdout?.unpipe(stream);
    child.stderr?.unpipe(stream);
  } catch {
    /* ignore */
  }
  try {
    if (!child.killed) child.kill('SIGTERM');
  } catch {
    /* ignore */
  }
  setTimeout(() => {
    try {
      if (!child.killed) child.kill('SIGKILL');
    } catch {
      /* ignore */
    }
  }, 2000);
  try {
    stream.end();
  } catch {
    /* ignore */
  }
}

export function readCaptureBytes(destPath) {
  if (!fs.existsSync(destPath)) return 0;
  return fs.statSync(destPath).size;
}
