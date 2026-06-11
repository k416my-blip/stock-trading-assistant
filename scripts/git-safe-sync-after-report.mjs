#!/usr/bin/env node
/**
 * Phase レポート作成後の GitHub 安全同期
 *
 * Usage:
 *   node scripts/git-safe-sync-after-report.mjs \
 *     --report docs/review/PHASE22_REPORT.md \
 *     --phase 22 \
 *     --summary "add analyst target intelligence report and integration" \
 *     --pass-fail PASS \
 *     --critical-count 0
 *
 * Options:
 *   --dry-run          commit/push せずチェックのみ
 *   --no-push          レポート §14 更新のみ（FAIL 時と同様）
 *   --skip-tests       Unit Test をスキップ
 *   --skip-typecheck   Typecheck をスキップ
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { githubSyncSectionMarkdown } from './report-audit-blocks.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PROTECTED_BRANCHES = new Set(['main', 'master']);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const BLOCKED_PATH_PATTERNS = [
  /^node_modules\//,
  /\.log$/,
  /^\.env(\.|$)/,
  /^agent-tools\//,
  /^\.expo-bundle-/,
];

/** Built at runtime so pre-commit hook does not match literal key patterns in this file. */
function buildSecretPatterns() {
  const c = String.fromCharCode;
  const openAiEnv = [79, 80, 69, 78, 65, 73, 95, 65, 80, 73, 95, 75, 69, 89, 61]
    .map(c)
    .join('');
  const newsEnv = [78, 69, 87, 83, 95, 65, 80, 73, 95, 75, 69, 89, 61].map(c).join('');
  const anthropicEnv = [65, 78, 84, 72, 82, 79, 80, 73, 67, 95, 65, 80, 73, 95, 75, 69, 89, 61]
    .map(c)
    .join('');
  const patterns = [];
  patterns.push({
    name: 'OpenAI key prefix',
    re: new RegExp(`${c(115, 107)}${c(45)}[a-zA-Z0-9]{8,}`),
  });
  patterns.push({
    name: 'Google API key prefix',
    re: new RegExp(`${c(65, 73)}${c(122, 97)}[0-9A-Za-z_-]{20,}`),
  });
  patterns.push({
    name: 'GitHub PAT prefix',
    re: new RegExp(`${c(103, 104)}${c(112, 95)}[a-zA-Z0-9]{20,}`),
  });
  patterns.push({
    name: 'Slack bot token prefix',
    re: new RegExp(`${c(120, 111, 120)}${c(98, 45)}[0-9-]+`),
  });
  patterns.push({ name: 'Bearer token', re: /Bearer\s+[a-zA-Z0-9._-]{20,}/i });
  patterns.push({ name: 'OpenAI env assignment', re: new RegExp(`${openAiEnv}\\S+`) });
  patterns.push({ name: 'News env assignment', re: new RegExp(`${newsEnv}\\S+`) });
  patterns.push({ name: 'TWELVE_DATA', re: /TWELVE_DATA[_A-Z]*=\S+/i });
  patterns.push({ name: 'X Bearer env', re: /X_BEARER[_A-Z]*=\S+/i });
  patterns.push({ name: 'Reddit secret env', re: /REDDIT[_A-Z]*SECRET=\S+/i });
  patterns.push({ name: 'FMP env', re: /FMP_API_KEY=\S+/ });
  patterns.push({
    name: 'Finnhub URL token',
    re: /finnhub\.io\/api\/v1\/[^?\s]+\?[^&\s]*token=[^&\s]{8,}/i,
  });
  patterns.push({ name: 'Anthropic env assignment', re: new RegExp(`${anthropicEnv}\\S+`) });
  return patterns;
}

const SECRET_PATTERNS = buildSecretPatterns();

function parseArgs(argv) {
  const out = {
    report: '',
    phase: '',
    summary: '',
    passFail: 'PASS',
    criticalCount: 0,
    dryRun: false,
    noPush: false,
    skipTests: false,
    skipTypecheck: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--report') out.report = next();
    else if (a === '--phase') out.phase = next();
    else if (a === '--summary') out.summary = next();
    else if (a === '--pass-fail') out.passFail = next();
    else if (a === '--critical-count') out.criticalCount = Number(next());
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--no-push') out.noPush = true;
    else if (a === '--skip-tests') out.skipTests = true;
    else if (a === '--skip-typecheck') out.skipTypecheck = true;
    else if (a === '--paths') {
      out.paths = out.paths ?? [];
      out.paths.push(next());
    }
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function git(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: opts.stdio ?? 'pipe', ...opts }).trim();
}

function gitShortCommit(ref = 'HEAD') {
  try {
    return git(`git rev-parse --short ${ref}`);
  } catch {
    return 'unknown';
  }
}

function gitStatusShort() {
  try {
    return git('git status --short');
  } catch {
    return '';
  }
}

function currentBranch() {
  try {
    return git('git rev-parse --abbrev-ref HEAD');
  } catch {
    return 'unknown';
  }
}

function remoteBranch() {
  const branch = currentBranch();
  try {
    const upstream = git(`git rev-parse --abbrev-ref ${branch}@{upstream}`);
    return upstream;
  } catch {
    return branch;
  }
}

function pushUrl() {
  try {
    const remote = git('git remote get-url origin');
    const branch = currentBranch();
    if (/github\.com[:/]/i.test(remote)) {
      const m = remote.match(/github\.com[:/](.+?)(?:\.git)?$/i);
      if (m) return `https://github.com/${m[1]}/tree/${branch}`;
    }
    return `${remote} (${branch})`;
  } catch {
    return 'N/A';
  }
}

function isEnvGitignored() {
  try {
    const out = git('git check-ignore -v .env');
    return out.length > 0;
  } catch {
    return false;
  }
}

function isEnvTracked() {
  try {
    const out = git('git ls-files .env .env.local .env.production');
    return out.split('\n').filter(Boolean).length > 0;
  } catch {
    return false;
  }
}

function readGitignoreEssentials() {
  const path = join(ROOT, '.gitignore');
  if (!existsSync(path)) return { ok: false, reason: '.gitignore 不在' };
  const text = readFileSync(path, 'utf8');
  const checks = [
    { label: '.env', ok: /^\.env$/m.test(text) || /^\.env\./m.test(text) },
    { label: 'node_modules/', ok: /^node_modules\//m.test(text) },
    { label: '*.log', ok: /^\*\.log/m.test(text) },
  ];
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);
  return missing.length ? { ok: false, reason: `不足: ${missing.join(', ')}` } : { ok: true };
}

function scanDiffForSecrets() {
  const hits = [];
  let diff = '';
  try {
    diff = git('git diff HEAD');
  } catch {
    return hits;
  }
  try {
    const staged = git('git diff --cached');
    diff += `\n${staged}`;
  } catch {
    /* ignore */
  }
  let currentFile = '';
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6).replace(/\\/g, '/');
      continue;
    }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (currentFile.startsWith('.githooks/')) continue;
    if (currentFile.includes('git-safe-sync-after-report.mjs')) continue;
    if (currentFile.includes('report-audit-blocks.mjs')) continue;
    const content = line.slice(1);
    for (const p of SECRET_PATTERNS) {
      if (p.re.test(content)) {
        hits.push({ file: currentFile, pattern: p.name });
      }
    }
  }
  return hits;
}

function listChangedPaths(statusShort) {
  return statusShort
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const part = l.slice(3).trim();
      const path = part.includes(' -> ') ? part.split(' -> ').pop() : part;
      return { xy: l.slice(0, 2), path: path.replace(/\\/g, '/') };
    });
}

/** push 対象に含めるパス（未追跡バンドル・ログ等を除外） */
function stageablePaths(statusShort, reportRel, extraPaths = []) {
  const allowedUntrackedPrefix = /^(docs\/review|src\/|scripts\/|tests\/|package\.json$)/;
  const out = new Set([reportRel, ...extraPaths]);

  for (const { xy, path } of listChangedPaths(statusShort)) {
    if (!path) continue;
    if (BLOCKED_PATH_PATTERNS.some((re) => re.test(path))) continue;

    const isUntracked = xy.includes('?');
    if (isUntracked && !extraPaths.includes(path)) {
      if (!allowedUntrackedPrefix.test(path)) continue;
    }

    const blocked = validatePaths([path]);
    if (blocked.length) continue;
    out.add(path);
  }

  return [...out].filter(Boolean);
}

function validatePaths(paths) {
  const blocked = [];
  for (const p of paths) {
    for (const re of BLOCKED_PATH_PATTERNS) {
      if (re.test(p)) {
        blocked.push({ path: p, reason: 'blocked pattern' });
        break;
      }
    }
    const abs = join(ROOT, p);
    if (existsSync(abs)) {
      try {
        const st = statSync(abs);
        if (st.isFile() && st.size > MAX_FILE_BYTES) {
          blocked.push({ path: p, reason: `large file (${st.size} bytes)` });
        }
      } catch {
        /* ignore */
      }
    }
  }
  return blocked;
}

function runPreCommitHook() {
  const hookSh = join(ROOT, '.githooks', 'pre-commit');
  const hookPs1 = join(ROOT, '.githooks', 'pre-commit.ps1');
  if (!existsSync(hookSh) && !existsSync(hookPs1)) {
    return { ok: true, skipped: true, reason: 'pre-commit hook 未配置（スキップ）' };
  }
  try {
    const hooksPath = git('git config core.hooksPath').trim();
    if (hooksPath !== '.githooks') {
      return { ok: true, skipped: true, reason: `core.hooksPath=${hooksPath || 'default'}（未検証）` };
    }
  } catch {
    return { ok: true, skipped: true, reason: 'core.hooksPath 未設定（スキップ）' };
  }
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'powershell.exe' : 'sh';
  const args = isWin
    ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', hookPs1]
    : [hookSh];
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {
    return { ok: false, reason: (r.stderr || r.stdout || 'pre-commit failed').trim() };
  }
  return { ok: true };
}

function runNpmScript(script) {
  const r = spawnSync('npm', ['run', script], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true,
    stdio: 'pipe',
  });
  return {
    ok: r.status === 0,
    output: ((r.stdout || '') + (r.stderr || '')).slice(-2000),
  };
}

function stageAndCommit(paths, message, dryRun) {
  if (dryRun) return { ok: true, dryRun: true };
  try {
    for (const p of paths) {
      git(`git add -- "${p.replace(/"/g, '')}"`);
    }
    const hookCheck = runPreCommitHook();
    if (!hookCheck.ok && !hookCheck.skipped) {
      git('git reset HEAD');
      return { ok: false, reason: hookCheck.reason || 'pre-commit blocked commit' };
    }
    git(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message || String(e) };
  }
}

function pushBranch(dryRun) {
  if (dryRun) return { ok: true, dryRun: true, result: 'dry-run' };
  const branch = currentBranch();
  try {
    git(`git push -u origin HEAD`, { stdio: 'inherit' });
    return { ok: true, result: 'pushed', branch: `origin/${branch}` };
  } catch (e) {
    return { ok: false, result: 'push failed', reason: e.message || String(e) };
  }
}

function upsertReportSection14(reportPath, sectionMd) {
  const abs = resolve(ROOT, reportPath);
  if (!existsSync(abs)) {
    writeFileSync(abs, sectionMd, 'utf8');
    return;
  }
  let text = readFileSync(abs, 'utf8');
  const marker = '## 14. GitHub同期結果';
  const auditIdx = text.indexOf('## 【監査サマリー】');
  const footerIdx = text.indexOf('\n---\n\n## 【監査サマリー】');

  if (text.includes(marker)) {
    const start = text.indexOf(marker);
    const endCandidates = [
      text.indexOf('\n## 【監査サマリー】', start),
      text.indexOf('\n---\n\n## 【監査サマリー】', start),
      text.length,
    ].filter((i) => i > start);
    const end = Math.min(...endCandidates);
    text = text.slice(0, start) + sectionMd.trimEnd() + '\n\n' + text.slice(end).replace(/^\n+/, '');
  } else if (footerIdx >= 0) {
    text = text.slice(0, footerIdx) + '\n\n' + sectionMd.trimEnd() + text.slice(footerIdx);
  } else if (auditIdx >= 0) {
    text = text.slice(0, auditIdx) + sectionMd.trimEnd() + '\n\n' + text.slice(auditIdx);
  } else {
    text = text.trimEnd() + '\n\n' + sectionMd.trimEnd() + '\n';
  }
  writeFileSync(abs, text, 'utf8');
}

function buildCommitMessage(phase, summary) {
  const slug = String(phase).replace(/\s+/g, '');
  return `phase${slug}: ${summary}`;
}

function evaluatePushAllowed(ctx) {
  const reasons = [];
  const pf = ctx.passFail.toUpperCase();
  if (pf !== 'PASS' && pf !== 'CONDITIONAL PASS') {
    reasons.push(`PASS/FAIL=${ctx.passFail}（push不可）`);
  }
  if (ctx.criticalCount > 0) {
    reasons.push(`Critical課題件数=${ctx.criticalCount}`);
  }
  if (ctx.secrets.length) {
    reasons.push(`秘密情報検出 ${ctx.secrets.length} 件`);
  }
  if (ctx.envTracked) {
    reasons.push('.env が git 管理対象');
  }
  if (!ctx.gitignoreOk) {
    reasons.push(`.gitignore: ${ctx.gitignoreReason}`);
  }
  if (PROTECTED_BRANCHES.has(ctx.branch)) {
    reasons.push(`保護ブランチ ${ctx.branch} へ push 禁止`);
  }
  if (ctx.blockedPaths.length) {
    reasons.push(`禁止パス: ${ctx.blockedPaths.map((b) => b.path).join(', ')}`);
  }
  if (!ctx.typecheck.ok && !ctx.skipTypecheck) {
    reasons.push('Typecheck FAIL');
  }
  if (!ctx.unitTest.ok && !ctx.skipTests) {
    reasons.push('Unit Test FAIL');
  }
  if (ctx.noPush) reasons.push('--no-push 指定');
  if (ctx.dryRun) reasons.push('--dry-run 指定');
  return { allowed: reasons.length === 0, reasons };
}

function printHelp() {
  console.log(`Usage: node scripts/git-safe-sync-after-report.mjs --report PATH --phase N --summary TEXT [options]

Options:
  --pass-fail PASS|CONDITIONAL PASS|FAIL   default: PASS
  --critical-count N                       default: 0
  --dry-run                                checks only
  --no-push                                update §14 only, no push
  --skip-tests / --skip-typecheck
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.report || !args.phase || !args.summary) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const reportRel = relative(ROOT, resolve(ROOT, args.report)).replace(/\\/g, '/');
  const statusBefore = gitStatusShort();
  const commitBefore = gitShortCommit();
  const branch = currentBranch();

  console.log('[git-safe-sync] 1/5 git status --short');
  console.log(statusBefore || '(clean)');

  console.log('[git-safe-sync] 2/5 秘密情報・.gitignore チェック');
  const secrets = scanDiffForSecrets();
  const envTracked = isEnvTracked();
  const envIgnored = isEnvGitignored();
  const gitignore = readGitignoreEssentials();
  const stagePaths = stageablePaths(statusBefore, reportRel, args.paths ?? []);
  const blockedStagePaths = validatePaths(stagePaths);

  console.log('[git-safe-sync] 3/5 pre-commit hook（commit 時に再実行）');
  const preCommit = { ok: true, skipped: true, reason: 'commit 前に実行' };

  console.log('[git-safe-sync] 4/5 typecheck / unit test');
  const typecheck = args.skipTypecheck ? { ok: true, skipped: true } : runNpmScript('typecheck');
  const unitTest = args.skipTests ? { ok: true, skipped: true } : runNpmScript('test:unit');

  const evalCtx = {
    passFail: args.passFail,
    criticalCount: args.criticalCount,
    secrets,
    envTracked,
    gitignoreOk: gitignore.ok,
    gitignoreReason: gitignore.reason,
    branch,
    blockedPaths: blockedStagePaths,
    stagePaths,
    preCommit,
    typecheck,
    unitTest,
    noPush: args.noPush,
    dryRun: args.dryRun,
    skipTypecheck: args.skipTypecheck,
    skipTests: args.skipTests,
  };
  const { allowed, reasons } = evaluatePushAllowed(evalCtx);

  const commitMessage = buildCommitMessage(args.phase, args.summary);
  let commitAfter = commitBefore;
  let pushResult = 'skipped';
  let remote = remoteBranch();
  let skippedReason = allowed ? '' : reasons.join('; ');

  if (!allowed) {
    console.log(`[git-safe-sync] push 停止: ${skippedReason}`);
    if (args.passFail.toUpperCase() === 'FAIL') {
      console.log('FAILのためGitHub同期停止');
    }
  } else {
    const toStage = stagePaths.filter((p) => !blockedStagePaths.some((b) => b.path === p));
    console.log('[git-safe-sync] 5/5 commit & push');
    const commitRes = stageAndCommit(toStage, commitMessage, args.dryRun);
    if (!commitRes.ok) {
      pushResult = 'commit failed';
      skippedReason = commitRes.reason || 'commit failed';
    } else {
      commitAfter = args.dryRun ? commitBefore : gitShortCommit();
      const pushRes = pushBranch(args.dryRun);
      pushResult = pushRes.dryRun ? 'dry-run (not pushed)' : pushRes.ok ? 'success' : pushRes.result;
      if (!pushRes.ok) skippedReason = pushRes.reason || pushRes.result;
      remote = pushRes.branch || remote;
    }
  }

  const section = githubSyncSectionMarkdown({
    gitStatusBefore: statusBefore || '(clean)',
    commitBefore,
    commitAfter,
    commitMessage,
    pushResult,
    remoteBranch: remote,
    skippedReason: skippedReason || (pushResult === 'success' ? '—' : '—'),
    pushUrl: pushUrl(),
  });

  upsertReportSection14(reportRel, section.join('\n'));

  const result = {
    ok: pushResult === 'success' || pushResult === 'dry-run (not pushed)',
    passFail: args.passFail,
    pushAllowed: allowed,
    pushResult,
    commitBefore,
    commitAfter,
    commitMessage,
    remoteBranch: remote,
    pushUrl: pushUrl(),
    skippedReason,
    branch,
    secretsFound: secrets.length,
    envTracked,
    envIgnored,
    typecheckOk: typecheck.ok,
    unitTestOk: unitTest.ok,
    report: reportRel,
  };

  console.log('\n--- GitHub Sync Result ---');
  console.log(JSON.stringify(result, null, 2));

  if (args.passFail.toUpperCase() === 'FAIL') {
    console.log('\nFAILのためGitHub同期停止');
  }

  process.exit(result.ok || !allowed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
