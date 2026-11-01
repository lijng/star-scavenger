#!/usr/bin/env bash
# 一键：打包 zip -> (可选)重出截图 -> 打开上传页
# 用法：bash scripts/oneclick.sh [gameId] [--shots]
set -euo pipefail

cd "$(dirname "$0")/.."

GAME_ID=""
SHOTS=0
for a in "$@"; do
  case "$a" in
    --shots) SHOTS=1 ;;
    *) GAME_ID="$a" ;;
  esac
done

if [ -z "$GAME_ID" ]; then
  if [ -f gm-game-id.txt ]; then
    GAME_ID="$(tr -d '[:space:]' < gm-game-id.txt)"
  fi
fi
if [ -z "$GAME_ID" ]; then
  GAME_ID="$(grep -oE 'GM_GAME_ID[[:space:]]*=[[:space:]]*"[^"]*"' js/gm-config.js | head -1 | sed -E 's/.*"([^"]*)"/\1/')"
fi
if [ -z "$GAME_ID" ]; then
  echo "[x] 没有 gameId。用法：bash scripts/oneclick.sh <gameId>"
  echo "    或把它写进项目根目录的 gm-game-id.txt"
  exit 1
fi

echo "=== [1/3] 打包提交 zip ==="
python scripts/build_gm.py --game-id "$GAME_ID"

if [ "$SHOTS" = "1" ]; then
  echo ""
  echo "=== [2/3] 重新生成三张 JPG ==="
  node _test/shots.js
  python scripts/make_jpgs.py
else
  echo ""
  echo "=== [2/3] 跳过截图（加 --shots 可重新生成）==="
fi

echo ""
echo "=== [3/3] 产物位置 ==="
ls -lh dist/star-scavenger-gamemonetize.zip 2>/dev/null || true
ls -lh dist/gm-upload/*.jpg 2>/dev/null || true

echo ""
echo "[OK] 打开 https://gamemonetize.com/dashboard"
echo "     把 dist/star-scavenger-gamemonetize.zip 拖进上传区即可"
