$ErrorActionPreference = "Stop"
$RemoteUrl = "https://github.com/Finkedinkedude/LivingFog.git"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or not on PATH."
}

if (-not (Test-Path ".git")) {
    git init -b main
    if ($LASTEXITCODE -ne 0) { throw "git init failed." }
}

$CurrentRemote = $null
try {
    $CurrentRemote = (git remote get-url origin 2>$null)
} catch {
    $CurrentRemote = $null
}

if ($CurrentRemote) {
    if ($CurrentRemote.Trim() -ne $RemoteUrl) {
        throw "Existing origin is '$($CurrentRemote.Trim())'. Expected '$RemoteUrl'. Refusing to overwrite it automatically."
    }
} else {
    git remote add origin $RemoteUrl
    if ($LASTEXITCODE -ne 0) { throw "Could not add origin remote." }
}

Write-Host "Fetching origin/main..."
git fetch origin main
if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }

Write-Host "Attaching this working tree to the current GitHub main branch without overwriting local files..."
git reset --mixed origin/main
if ($LASTEXITCODE -ne 0) { throw "git reset failed." }

try { git branch --set-upstream-to=origin/main main | Out-Null } catch {}

Write-Host ""
Write-Host "Ready. Current changes compared with GitHub main:"
git status --short --branch
