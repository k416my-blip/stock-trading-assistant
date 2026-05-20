# Block commits that contain API keys or .env files.
# Invoked from .githooks/pre-commit (Git Bash) or directly on Windows.

$ErrorActionPreference = 'Stop'

$staged = git diff --cached --name-only --diff-filter=ACM
if (-not $staged) { exit 0 }

foreach ($f in $staged) {
  $name = $f -replace '\\', '/'
  if ($name -match '(^|/)\.env(\.|$)|(^|/)\.env$') {
    Write-Host "pre-commit: blocked — do not commit env files: $f"
    Write-Host "  Remove from index: git rm --cached `"$f`""
    exit 1
  }
}

# Build pattern at runtime so this hook file does not match its own added diff line.
$skPrefix = 'sk'
$pattern =
  "(" +
  $skPrefix +
  "-[a-zA-Z0-9]{8,}|AIza[0-9A-Za-z_-]{20,}|ghp_[a-zA-Z0-9]{20,}|xoxb-[0-9-]+|OPENAI_API_KEY=\S+|ANTHROPIC_API_KEY=\S+)"

$currentFile = ''
$diff = git diff --cached -U0
foreach ($line in $diff) {
  if ($line -match '^\+\+\+ b/(.+)$') {
    $currentFile = $Matches[1] -replace '\\', '/'
    continue
  }
  if ($line -notmatch '^\+' -or $line -match '^\+\+\+') { continue }
  if ($currentFile -match '(^|/)\.githooks/') { continue }
  if ($line -match $pattern) {
    Write-Host 'pre-commit: blocked — possible API key or secret in staged changes.'
    Write-Host "  File: $currentFile"
    Write-Host '  Move secrets to .env (gitignored) and use DUMMY_API_KEY in tests.'
    exit 1
  }
}

exit 0
