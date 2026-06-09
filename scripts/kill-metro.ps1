# Kill Metro / Expo dev server on Windows (port 8081 + common node children)
$ErrorActionPreference = 'SilentlyContinue'
$port = 8081

Write-Host "Stopping Metro on port $port..."
$conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conns) {
  if ($c.OwningProcess) {
    Write-Host "  Stop-Process -Id $($c.OwningProcess)"
    Stop-Process -Id $c.OwningProcess -Force
  }
}

Write-Host "Stopping node processes with expo/metro in command line..."
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -match 'expo|metro|react-native' } |
  ForEach-Object {
    Write-Host "  Stop-Process -Id $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force
  }

Start-Sleep -Seconds 1
$still = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($still) {
  Write-Host "Warning: port $port may still be in use."
} else {
  Write-Host "Port $port is free."
}
