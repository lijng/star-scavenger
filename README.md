# 星际拾荒者 · Star Scavenger

一个**零依赖、零构建**的 H5 街机小游戏：驾驶拾荒船穿越陨石雨，收集能量晶石，连击拿高分。
纯原生 HTML + CSS + JavaScript（Canvas 2D），放进 GitHub Pages 即可拥有自己的网址。

> 演示地址（替换成你自己的）：`https://<你的用户名>.github.io/star-scavenger/`

---

## 玩法

| 操作 | 说明 |
|---|---|
| 鼠标 / 手指 | 左右移动飞船（按距离比例跟随） |
| `←` `→` 或 `A` `D` | 键盘驾驶 |
| 空格 / 回车 | 开始 / 重新开始 |
| `P` 或 `Esc` | 暂停 / 继续 |
| `M` | 静音开关 |

- 飞船**自动开火**，击碎陨石得分；大陨石会分裂成两个小的。
- 连续拾取晶石会累积**连击倍率**（最高 x5），2 秒内不拾取则清零。
- 三种道具：护盾（吸收一次撞击）、时缓（陨石减速 8 秒）、连射（三向火力 9 秒）。
- 3 条命，被撞掉一条；最高分存在浏览器 `localStorage` 里。

---

## 本地运行

因为用了相对路径的多个 JS 文件，建议起一个本地服务器（直接双击 `index.html` 也能跑，但部分浏览器会限制 `localStorage`）。

```bash
# 方式一：Python（本机已装）
python -m http.server 8080

# 方式二：Node
npx serve .

# 方式三：VS Code 装 Live Server 插件，右键 index.html → Open with Live Server
```

然后打开 <http://localhost:8080>。

---

## 部署到 GitHub Pages

### 路线 A：GitHub Actions 自动部署（推荐，本项目已配好）

仓库里已经有 `.github/workflows/deploy.yml`，push 到 `main` 就会自动发布。

```bash
# 1. 初始化仓库
git init
git add .
git commit -m "feat: 星际拾荒者 H5 小游戏"

# 2. 创建 GitHub 仓库并推送（需要先 gh auth login）
gh auth login
gh repo create star-scavenger --public --source=. --remote=origin --push

# 3. 打开 Pages，把 Source 设为 "GitHub Actions"
#    Settings → Pages → Build and deployment → Source: GitHub Actions
```

也可以直接用脚本一键搞定：

```bash
bash scripts/publish.sh star-scavenger      # macOS / Linux / Git Bash
```

```powershell
.\scripts\publish.ps1 -RepoName star-scavenger   # Windows PowerShell
```

之后每次改完代码：

```bash
git add .
git commit -m "update"
git push
```

约 30 秒后自动上线。

### 路线 B：从分支直接发布（不用 Actions）

1. 推到 GitHub 后进入仓库 **Settings → Pages**。
2. **Source** 选 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`。
3. 保存，等 1～2 分钟，访问 `https://<用户名>.github.io/<仓库名>/`。

> 项目名如果是 `<用户名>.github.io`，网址会直接是 `https://<用户名>.github.io/`。

### 自定义域名（可选）

1. 域名 DNS 添加 CNAME 记录指向 `<用户名>.github.io`。
2. 仓库 Settings → Pages → Custom domain 填入域名。
3. 勾选 Enforce HTTPS。

---

## 目录结构

```
h5game/
├── index.html                 # 页面骨架 + HUD + 三块覆盖层（开始/暂停/结束）
├── css/style.css              # 全部样式，深空配色
├── js/
│   ├── storage.js             # 最高分持久化（localStorage 容错）
│   ├── audio.js               # WebAudio 现场合成音效，无音频文件
│   ├── input.js               # Pointer Events + 键盘统一输入
│   ├── fx.js                  # 粒子 / 屏幕震动 / 闪屏
│   ├── game.js                # 核心：实体、碰撞、难度曲线、渲染
│   └── main.js                # 启动：画布自适应、场景切换、主循环
├── assets/favicon.svg
├── .github/workflows/deploy.yml
├── scripts/publish.sh|.ps1    # 一键建仓库 + 推送 + 开启 Pages
└── README.md
```

---

## 想改成自己的游戏？

`game.js` 里的入口很集中：

- **换难度**：`spawnTick()` 里的 `1.25 - t * 0.013` 控制陨石生成间隔，`addAsteroid()` 里的 `76 ~ 116 + elapsed * 1.8` 控制下落速度。
- **换美术**：`drawPlayer / drawAsteroids / drawOrbs` 三个函数，全是 Canvas 路径，改成贴图也只需要 `ctx.drawImage`。
- **换玩法**：`checkCollisions()` 是唯一判定入口，`update()` 是唯一的时间推进入口，改这两处就能换游戏类型。
- **加音效**：`audio.js` 里照着 `shoot()` 加一个方法即可，不需要任何音频文件。

---

## 兼容性

- 现代浏览器（Chrome / Edge / Safari / Firefox），支持 Pointer Events 即可。
- 移动端已处理：禁用双击缩放、`touch-action: none`、安全区适配、DPR 缩放。
- 无外部依赖、无网络请求，断网也能玩。

## License

MIT
