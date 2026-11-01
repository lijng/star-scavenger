#!/usr/bin/env python3
"""把游戏打包成 GameMonetize 可上传的 .zip。

用法：
    python scripts/build_gm.py --game-id 你的GameId

产出：
    dist/star-scavenger-gamemonetize.zip
    压缩包根目录直接是 index.html（GameMonetize 的硬性要求）
"""
import argparse
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INCLUDE = ["index.html", "css", "js", "assets"]
STAGE = ROOT / "dist" / "_stage"
DEFAULT_OUT = ROOT / "dist" / "star-scavenger-gamemonetize.zip"


def fail(msg):
    print("[x] " + msg)
    sys.exit(1)


def main():
    ap = argparse.ArgumentParser(description="打包 GameMonetize 提交包")
    ap.add_argument("--game-id", required=True, help="GameMonetize 控制面板里的 gameId")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="输出 zip 路径")
    args = ap.parse_args()

    game_id = args.game_id.strip()
    if not game_id or game_id.upper() in ("YOUR_GAME_ID_HERE", "PLACEHOLDER"):
        fail("gameId 不能为空或占位符，请填控制面板里的真实值")

    if STAGE.exists():
        shutil.rmtree(STAGE)
    STAGE.mkdir(parents=True)

    for item in INCLUDE:
        src = ROOT / item
        dst = STAGE / item
        if src.is_dir():
            shutil.copytree(src, dst)
        elif src.is_file():
            shutil.copy2(src, dst)
        else:
            fail("缺少必要文件/目录：%s" % item)

    # 注入真实 gameId
    cfg = STAGE / "js" / "gm-config.js"
    text = cfg.read_text(encoding="utf-8")
    new_text, n = re.subn(
        r'window\.GM_GAME_ID\s*=\s*"[^"]*"',
        'window.GM_GAME_ID = "%s"' % game_id,
        text,
    )
    if n != 1:
        fail("gm-config.js 里没找到 GM_GAME_ID 赋值语句，注入失败")
    cfg.write_text(new_text, encoding="utf-8")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        out.unlink()

    files = sorted(p for p in STAGE.rglob("*") if p.is_file())
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p in files:
            z.write(p, p.relative_to(STAGE).as_posix())

    # 校验：index.html 必须在根
    with zipfile.ZipFile(out) as z:
        names = z.namelist()
    if "index.html" not in names:
        fail("打包结果里 index.html 不在根目录，GameMonetize 会拒绝")

    size_kb = out.stat().st_size / 1024
    print("[OK] 已生成：%s" % out)
    print("     文件数 %d，大小 %.1f KB" % (len(names), size_kb))
    print("     根目录文件：%s" % ", ".join(n for n in names if "/" not in n))
    print("     gameId 已注入：%s" % game_id)
    print("")
    print("下一步：Game Management > My games > 选游戏 > 拖入该 zip > Verify Game > REQUEST ACTIVATION")


if __name__ == "__main__":
    main()
