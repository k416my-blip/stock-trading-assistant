# Metro with 8GB heap (Windows PowerShell)
$env:NODE_OPTIONS = "--max-old-space-size=8192"
npx expo start -c
