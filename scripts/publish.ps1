# 一键：初始化仓库 -> 提交 -> 建 GitHub 仓库 -> 推送 -> 开启 Pages
param(
    [string]$RepoName = "star-scavenger"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "[x] 没找到 gh（GitHub CLI）。先装：https://cli.github.com/" -ForegroundColor Red
    exit 1
}

gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[i] 还没登录 GitHub，下面会走一次授权流程。" -ForegroundColor Yellow
    gh auth login
}

$Owner = (gh api user --jq .login).Trim()
Write-Host "[i] 当前账号：$Owner" -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "[i] 初始化 git 仓库" -ForegroundColor Cyan
    git init -b main
}

git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m "feat: 星际拾荒者 H5 小游戏"
}

git remote get-url origin 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[i] 已有 origin，直接推送" -ForegroundColor Cyan
    git push -u origin main
} else {
    Write-Host "[i] 创建远程仓库 $Owner/$RepoName" -ForegroundColor Cyan
    gh repo create $RepoName --public --source=. --remote=origin --push
}

Write-Host "[i] 开启 GitHub Pages（Source: GitHub Actions）" -ForegroundColor Cyan
gh api -X POST "repos/$Owner/$RepoName/pages" -f build_type=workflow 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    gh api -X POST "repos/$Owner/$RepoName/pages" -f "source[branch]=main" -f "source[path]=/" 2>$null | Out-Null
}

Write-Host ""
Write-Host "[OK] 完成。首次部署约需 1 分钟，之后访问：" -ForegroundColor Green
Write-Host "     https://$Owner.github.io/$RepoName/"
Write-Host ""
Write-Host "     查看构建状态：gh run list --workflow=deploy.yml"
