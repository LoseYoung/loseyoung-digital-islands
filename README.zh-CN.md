<p align="center">
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/main"><kbd>English</kbd></a> ·
  <strong><kbd>简体中文</kbd></strong> ·
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/doc-ja"><kbd>日本語</kbd></a>
</p>

# LoseYoung · 数字岛屿

> Somewhere Between Real and Imagined

数字岛屿是 LoseYoung 的个人网页门户，也是持续生长的作品目录。摄影、游戏、幻想世界和 AI 旅行项目保持各自的身份，在这里共享一个安静的入口。

本仓库维护门户、视觉系统与可选的封面小游戏。相册、完整游戏和旅行服务仍由各自项目维护。

[GitHub Pages](https://loseyoung.github.io/loseyoung-digital-islands/) · [Sites](https://loseyoung-digital-islands.lzy793222567.chatgpt.site)

## 当前体验

首屏保留真实月夜海面摄影、呼吸月光、滚动偏转与海面联动。正文为深蓝黑背景与透明银蓝水波。每座岛屿独占一行，左侧完整封面、右侧说明；窄屏自然堆叠，与 Hero 共用版心。

### 摘一颗星

按住星光拖向海面并甩出，手势决定一到六次弹跳，轻放只落水一次。抓取时显示第一落点预览，松手后消失；落水先有短暂接触高光和有限水珠，再展开透明透视水纹。完成一轮后，可以尝试让最后一跳停在月光落点中。点击或 Enter 也可投掷，Esc 中止。

### 四座可玩的岛屿

| 岛屿 | 封面实验 | 正式项目 |
| --- | --- | --- |
| Photos Island · A Softer Gaze | 用光显影、撤销一笔、保留留白并局部定影，保存 PNG。 | [照片档案](https://photos-island.lzy793222567.chatgpt.site/) |
| Faerie Britain Echoes · Another Reality | 手绘月环、星芒与微风；施法顺序改变持续存在的森林场景。 | [幻想 / RPG](https://faerie-britain-echoes.lzy793222567.chatgpt.site/) |
| Gridwake · Further Out | 六点瞄准、中心命中、统计、同组重练与同题链接。 | [科幻 / FPS](https://digital-island-gridwake.lzy793222567.chatgpt.site/) |
| RoamIsle · A Journey, in Conversation | 自由路线拖排，以及按选择产生不同结尾的月落前旅程。 | [AI 旅行 Agent](https://roamisle.lzy793222567.chatgpt.site/) |

暗房目前提供现有 **同一张 Pramod Tiwari 月夜摄影的三种取景练习**，并不是三张新照片，也没有接入个人图库。路线刻度、渡船期限与山林规则均为虚构游戏机制，不是真实交通信息、距离或 AI 行程。

月环→微风→星芒会点亮石门；月环→星芒→微风让星座沿枝梢远行。清空法阵可以重试组合，但保留符文记录。路线自由模式没有时限；挑战模式公开全部规则，并可能得到“月落前的回信”“守夜人的灯”或“沿途停靠”。

### 暂停不等于清空

收起、切换实验、滚离视口或转到后台，只暂停绘图与计时，保留当前页面会话。只有“重来”或页面卸载才清空。展开游玩使用原生模态 dialog，不复制或重挂载引擎；Esc 返回内嵌大小。关闭 Motion 不会删除作品或关闭小游戏。

瞄准进行中暂停或改变场地尺寸，该局会标记为“中断练习”。只有目标序列、场地、靶标尺寸、输入方式一致且未中断，才比较两轮用时与逐靶响应。键盘辅助、混合输入不与指针精度比较。`?aim=v1-<uint32>` 只分享目标序列，不分享成绩，也不代表可信排行榜。

进度仅在当前网页内存中保存，刷新后重置，不跨设备或跨 Pages / Sites 同步。PNG 在浏览器内生成，不上传笔迹。

## 性能与可访问性

正文和安全外链服务端输出，无 JavaScript 仍可浏览；各引擎按需独立加载，同一时刻只运行一个封面实验。暂停会停止绘图、计时及待执行反馈，保留状态不需要持续循环。

正文水波使用固定 60Hz 时间步，单次最多补算三步，模拟长边最高 460、显示长边最高 1920。高刷屏不会加快模拟速度，空闲时停止运行。首屏星光仍用局部 Canvas 2D 透视，不额外增加全屏 WebGL。

默认遵循 `prefers-reduced-motion`，提供鼠标、触屏与键盘替代路径。无脚本时隐藏小游戏按钮、保留正式项目入口。展开模式使用原生焦点行为与明确关闭按钮。不新增音频、账户、iframe 或游戏引擎运行时依赖。

## 技术栈

| 类别 | 当前使用 |
| --- | --- |
| UI | React 19.2.6、TypeScript 5.9.3 |
| 渲染 | Next.js 16.2.6 App Router；Sites 使用 vinext 0.0.50 |
| 构建 | Vite 8.0.13、Cloudflare Vite 插件 |
| 样式 | 自定义 CSS、Tailwind CSS 4.2.1 / PostCSS |
| 交互 | Canvas 2D、SVG、WebGL2、Pointer Events、requestAnimationFrame |
| 托管 | GitHub Pages 静态导出；独立 Sites / Workers 构建 |
| 可选基础 | Drizzle、D1 / R2、ChatGPT 登录工具，未接入当前门户业务 |

## 开发与检查

要求 Node.js **>=22.13.0**、npm、Git。当前门户没有必填业务环境变量，不依赖数据库、对象存储或登录。

```bash
git clone https://github.com/LoseYoung/loseyoung-digital-islands.git
cd loseyoung-digital-islands
npm ci
npm run dev
```

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | vinext 开发服务 |
| `npm run build` | Sites 生产构建 |
| `npm start` | 构建后的生产预览 |
| `npm run build:pages` | 导出 Pages 静态文件到 `out/` |
| `npm run test:pages` | 静态页面与子路径资源检查 |
| `npm run test:play` | 玩法与固定时间步纯计算测试 |
| `npm test` | Sites 构建、服务端输出与玩法测试 |
| `npm run lint` | ESLint |
| `npm run db:generate` | 仅接入数据库后生成 Drizzle 迁移 |

当前编辑与验证可完全使用 GitHub 和 Actions 云端流程，不要求在个人电脑建立开发目录。浏览器依赖只装在 CI，不进入网页运行时。回归覆盖原有小游戏，以及进度保留、局部定影、符文顺序、路线结尾、瞄准比较、键盘、手机展开和无脚本导航。CI 软件渲染结果不等于真实电脑的 FPS。

## 维护入口

`app/page.tsx` 管理首页结构，`app/islands.ts` 管理岛屿内容和自动编号，`public/` 存放完整封面。新增项目填写 `id / title / description / name / category / url / cover / coverAlt` 即可继续追加，不要求每个项目都实现小游戏。

`app/playable-cover.tsx` 管理会话与展开；`app/play/*-engine.ts` 是独立引擎，`app/play/continuity-model.ts` 管理时间步、符文组合和旅程规则。`app/fluid-cursor.tsx` 管理正文水波，`app/catalogue-motion.tsx` 管理 Hero 与 Motion；`app/continuity.css` 只覆盖本轮局部交互样式。

[连续体验规则与实现边界](https://github.com/LoseYoung/loseyoung-digital-islands/blob/main/docs/interactive-continuity.md) · [早期小游戏说明](https://github.com/LoseYoung/loseyoung-digital-islands/blob/main/docs/playgrounds.md) · [瞄准统计口径](https://github.com/LoseYoung/loseyoung-digital-islands/blob/main/docs/aim-trainer.md)

早期设计文档保留历史方案；行为发生变更时，以当前源码和连续体验说明为准。

## 部署与版本标识

`main` 推送触发 `.github/workflows/pages.yml`，执行 Sites 构建检查、Pages 静态导出、资源检查与发布。默认子路径为 `/loseyoung-digital-islands`。

`.openai/hosting.json` 关联 Sites 项目，但 **GitHub 提交不等于 Sites 发布**。Sites 必须在对应环境单独重新构建和发布，不能从 Pages 成功推断两个入口已同步。

构建脚本生成 `public/build-info.json`，包含真实源码 SHA、构建目标和时间，页面底部显示标识。缺少 Git 元数据时明确提示源码标识未提供，也可通过 `BUILD_SOURCE_SHA` 注入。用这个标识核对两个发布版本，而不是靠肉眼猜测。

项目版本 **0.1.0**，当前四座岛屿开放。没有 CMS、全球排行榜、跨设备存档、门户照片上传或业务数据库；可选脚手架不代表这些能力已经上线。
