# 一键：打包 zip -> (可选)重出截图 -> 打开上传页和文件夹
# 用法：
#   .\scripts\oneclick.ps1                 # 用 gm-config.js 里的 gameId 打包
#   .\scripts\oneclick.ps1 -GameId xxx     # 指定 gameId
#   .\scripts\oneclick.ps1 -Shots          # 顺便重新生成三张 JPG
param(
    [string]$GameId = "",
    [switch]$Shots
)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not $GameId) {
    if (Test-Path "gm-game-id.txt") {
        $GameId = (Get-Content "gm-game-id.txt" -Raw).Trim()
    }
}
if (-not $GameId) {
    $cfg = Get-Content "js/gm-config.js" -Raw
    if ($cfg -match 'GM_GAME_ID\s*=\s*"([^"]+)"') { $GameId = $Matches[1] }
}
if (-not $GameId) {
    Write-Host "[x] 没有 gameId。用 -GameId 指定，或写进项目根目录的 gm-game-id.txt" -ForegroundColor Red
    exit 1
}

Write-Host "=== [1/3] 打包提交 zip ===" -ForegroundColor Cyan
python scripts/build_gm.py --game-id $GameId
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Shots) {
    Write-Host "`n=== [2/3] 重新生成三张 JPG ===" -ForegroundColor Cyan
    node _test/shots.js
    python scripts/make_jpgs.py
} else {
    Write-Host "`n=== [2/3] 跳过截图（加 -Shots 可重新生成）===" -ForegroundColor DarkGray
}

Write-Host "`n=== [3/3] 打开上传页与文件夹 ===" -ForegroundColor Cyan
Start-Process explorer.exe -ArgumentList (Resolve-Path "dist").Path
Start-Process "https://gamemonetize.com/dashboard"

Write-Host ""
Write-Host "[OK] 把 dist\star-scavenger-gamemonetize.zip 拖进上传区即可" -ForegroundColor Green
Write-Host "     三张图在 dist\gm-upload\（512x384 / 512x512 / 512x340）" -ForegroundColor Green
