# 首页小实验：可玩封面与星光打水漂

本轮不改背景摄影、正文水波、左右版心和岛屿概述。互动是可选增强，作品入口不以完成游戏为前提。封面实验并不是对应子站的实际游戏或 AI 服务。

## 怎么玩

- 首屏的「摘一颗星」支持拖拽、甩出后松手。近 110ms 的手势速度和方向决定轨迹与 1–6 次落水；轻放一次，横向快速甩出可多次弹跳。点击 / Enter 提供预设投掷，Esc 中止。后台、离开首屏或打开封面实验会停止动画。
- Photos Island：用笔迹擦去暗层，显出仓库现有的月夜摄影。支持「显影整幅」按钮；这不是 AI 识图，也不是按笔迹搜索照片库。
- Faerie Britain Echoes：圆环、折线、长弧分别触发月环、星芒与微风。使用简单几何判别，不使用模型；按钮提供不依赖绘画的替代操作。
- Gridwake：依次点击六个目标。首击之后计时，显示本轮用时和空击次数；支持 Tab / Enter，无排行榜，不收集操作数据。
- RoamIsle：调整四个示例地点的顺序，路线和行进标记随之变化。支持拖拽、点击轮换、左右方向键排序。示例不是实际地理地图、路线距离或生成后的行程，没有假装接入旅行 Agent。

## 技术边界

`playable-cover.tsx` 保留服务端输出的封面和安全新标签链接，只在点击后动态加载 `play/cover-engine.ts`。封面实验与「进入岛屿」的链接分开，避免按钮嵌套进外链。退出或滚离视口后销毁实验的事件、计时与绘图任务；同一时刻只打开一张封面。

星光使用局部 Canvas 2D、按时间计算的分段抛物线和透视落水圈。它不修改原有 `fluid-cursor.tsx` 的全屏 WebGL 模拟，不增加物理引擎、音频、iframe 或新依赖。画布长边上限 1600，空闲不运行 RAF。

`Motion off` / 系统减少动态效果时，停止正在运行的动画；用户主动再次操作可得到静态落点、符文或路线终点。触屏只在星星按钮和已激活的绘画 / 拖动区域使用 `touch-action: none`，不锁住整个页面。禁用 JavaScript 时隐藏实验启动按钮，作品封面与入口仍可用。

## 文件与验证

- `app/play/physics.ts`：纯计算、符文识别与排序函数。
- `app/play/runtime.ts`：停止条件、画布与本地控件辅助。
- `app/play/star-engine.ts`：投掷输入、轨迹及落水反馈。
- `app/play/cover-engine.ts`：四种封面实验。
- `app/star-skipping.tsx` / `app/playable-cover.tsx`：React 适配与按需启动。
- `app/playgrounds.css`：局部样式，不改变原版心。

```bash
node --experimental-strip-types --test tests/playgrounds.test.mjs
npm test
npm run build:pages
npm run test:pages
```

浏览器回归应覆盖：四种实验的真实输入和重置、拖拽 / 点击投掷差异、收起后的焦点恢复、移出视口停止、后台停止、Motion 切换、手机无横向溢出、无脚本时正常导航，以及 Pages 子路径下的动态模块和图片加载。
