# Safe Expo/Metro start on Windows — frees port 8081, sets heap, optional cache clear / tunnel
param(
  [ValidateSet('default', 'clear', 'tunnel')]
  [string]$Mode = 'default'
)

$ErrorActionPreference = 'SilentlyContinue'
$port = 8081

Write-Host "Releasing port $port (stale Metro)..."
$conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conns) {
  if ($c.OwningProcess) {
    Write-Host "  Stop-Process -Id $($c.OwningProcess)"
    Stop-Process -Id $c.OwningProcess -Force
  }
}
Start-Sleep -Seconds 2

$env:NODE_OPTIONS = '--max-old-space-size=8192'
Remove-Item Env:CI -ErrorAction SilentlyContinue
Write-Host "NODE_OPTIONS=$env:NODE_OPTIONS"

switch ($Mode) {
  'clear' {
    Write-Host 'Starting: expo start -c'
    npx expo start -c
  }
  'tunnel' {
    Write-Host 'Starting: expo start -c --tunnel --port 8081'
    npx expo start -c --tunnel --port 8081
  }
  default {
    Write-Host 'Starting: expo start'
    npx expo start
  }
}
