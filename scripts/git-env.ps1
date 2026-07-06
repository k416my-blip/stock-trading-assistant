# Resolve git.exe for Cursor shells where Git for Windows is missing from PATH.
$gitCandidates = @(
    "$env:LOCALAPPDATA\MinGit\cmd\git.exe",
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe"
)
foreach ($candidate in $gitCandidates) {
    if (Test-Path $candidate) {
        $dir = Split-Path $candidate -Parent
        if ($env:Path -notlike "*$dir*") { $env:Path = "$dir;$env:Path" }
        $env:STA_GIT_EXE = $candidate
        Write-Host "git: $candidate"
        & $candidate --version
        exit 0
    }
}
Write-Warning "git.exe not found"
