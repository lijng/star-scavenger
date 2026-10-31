#!/usr/bin/env bash
# 一键：初始化仓库 → 提交 → 建 GitHub 仓库 → 推送 → 开启 Pages
set -euo pipefail

REPO_NAME="${1:-star-scavenger}"

if ! command -v gh >/dev/null 2>&1; then
  echo "[x] 没找到 gh（GitHub CLI）。先装：https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "[i] 还没登录 GitHub，下面会走一次授权流程。"
  gh auth login
fi

OWNER="$(gh api user --jq .login)"
echo "[i] 当前账号：$OWNER"

if [ ! -d .git ]; then
  echo "[i] 初始化 git 仓库"
  git init -b main
fi

git add -A
if ! git diff --cached --quiet; then
  git commit -m "feat: 星际拾荒者 H5 小游戏" || true
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "[i] 已有 origin，直接推送"
  git push -u origin main
else
  echo "[i] 创建远程仓库 $OWNER/$REPO_NAME"
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
fi

echo "[i] 开启 GitHub Pages（Source: GitHub Actions）"
if ! gh api -X POST "repos/$OWNER/$REPO_NAME/pages" -f build_type=workflow >/dev/null 2>&1; then
  gh api -X POST "repos/$OWNER/$REPO_NAME/pages" \
    -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 || true
fi

echo ""
echo "[✓] 完成。首次部署约需 1 分钟，之后访问："
echo "    https://$OWNER.github.io/$REPO_NAME/"
echo ""
echo "    查看构建状态：gh run list --workflow=deploy.yml"
