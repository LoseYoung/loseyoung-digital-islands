<p align="center">
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/main"><kbd>English</kbd></a>
  ·
  <strong><kbd>简体中文</kbd></strong>
  ·
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/doc-ja"><kbd>日本語</kbd></a>
</p>

# LoseYoung · 数字岛屿

> Somewhere Between Real and Imagined

“数字岛屿”是 LoseYoung 的个人网页总门户，也是一个持续生长的作品索引。每座“岛屿”对应一个独立站点，承载影像、游戏、幻想世界、AI 体验或之后还会出现的新项目；门户本身不追求把它们做成统一产品，而是像一份展览目录一样，把彼此不同的世界放在同一个入口中。

本仓库维护门户首页、岛屿索引、视觉动效、响应式布局、分享信息与部署配置。各个岛屿的业务逻辑与具体内容仍由各自项目维护。

**在线访问**

- [OpenAI Sites · LoseYoung 数字岛屿](https://loseyoung-digital-islands.lzy793222567.chatgpt.site)
- [GitHub Pages · LoseYoung 数字岛屿](https://loseyoung.github.io/loseyoung-digital-islands/)

## 当前页面体验

### 月夜 Hero

首页首屏使用真实月夜海面摄影作为背景，并在其上叠加克制的展览式动效：

- 右上方月光由多层光带组成，静止时会缓慢呼吸、漂移，而不是保持完全静止。
- 月光会随 Hero 的滚动进度产生明显偏转、位移与收束，同时带动海面反光、月晕和地平线亮度变化。
- 标题与前言采用缓慢入场和轻微视差，滚动时逐渐离开首屏。
- 背景摄影使用 `public/moonlit-ocean-pramod-tiwari.jpg`；旧版生成背景仍保留在 `public/` 作为历史素材，但不再作为当前 Hero 主背景。

### 透明水波交互

Hero 以下使用纯净深蓝黑作为主背景，并保留一层全屏 WebGL2 水波交互：

- 水波使用双缓冲高度场模拟扩散，不是 DOM 圆环或沿鼠标连线的“拖尾”。
- 鼠标移动时只向水面注入局部扰动，波纹会自行扩散、叠加和衰减。
- 当前视觉以透明玻璃 / 月光水纹为目标，主体接近透明，只保留银蓝、冷青和极弱紫色折射。
- 水波强度会随页面从 Hero 向正文滚动逐渐增强，不再使用上下两档透明度切换。
- 模拟分辨率、鼠标采样和空闲停止都做了性能限制；触屏设备和减少动态效果模式会自动降级。

### 单行岛屿索引

Selected Islands 已从三列卡片墙改为更适合长期扩展的 **Media Object / Editorial Project Index**：

- 每个岛屿独占一整行，桌面端左侧封面、右侧编号 / 分类 / 标题 / 概述 / 入口。
- 新增第 5、6、7 个岛屿时只需要继续向下追加，不再受 3 的倍数影响。
- 封面始终完整展示，使用 `object-fit: contain`，不会通过裁切或放大制造统一比例。
- 桌面端封面最大宽度约 720px；中等屏继续等比缩小，窄屏自动切换为上下布局。
- 岛屿区和首页共用同一套左右版心，滚动过程中页面边界保持连续。
- 每个岛屿概述都保留更完整的作品定位和情绪说明，而不是只有一句短标语。

### 动效与可访问性

- 内容先服务端输出，动效只作为增强；无 JavaScript 时核心内容和导航仍可阅读。
- `Motion on / off` 开关可手动暂停或开启页面动效，并记忆用户选择。
- 默认遵循系统 `prefers-reduced-motion`。
- 页面切到后台时会暂停部分持续动画，减少无意义的 GPU 消耗。
- 图片包含替代文本，页内导航、焦点和锚点跳转都保留基础无障碍处理。

## 当前展示的岛屿

| 岛屿 | 类型 | 概述 | 入口 |
| --- | --- | --- | --- |
| Photos Island · A Softer Gaze | Photography | 一册持续生长的私人影像档案，收集旅行、城市、自然与偶然相遇的瞬间，让记忆以照片的方式慢慢沉淀。 | [进入照片岛](https://photos-island.lzy793222567.chatgpt.site/) |
| Faerie Britain Echoes · Another Reality | Fantasy / RPG | 保存关于妖精国、角色与旅途的余响，把幻想作品结束后仍未消失的氛围与记忆重新编排成一个可以再次进入的空间。 | [进入妖精国余响](https://faerie-britain-echoes.lzy793222567.chatgpt.site/) |
| Gridwake · Further Out | Sci-Fi / FPS | 从科幻与 FPS 的节奏出发，把战斗、空间、残存秩序与陌生环境收束成一片更冷、更锋利的数字区域。 | [进入 Gridwake](https://digital-island-gridwake.lzy793222567.chatgpt.site/) |
| RoamIsle · A Journey, in Conversation | AI Travel / Agent | 围绕 AI 旅行规划，把目的地灵感、路线整理和途中想法逐渐收束成一段可以讨论、调整并真正出发的旅程。 | [进入 RoamIsle](https://roamisle.lzy793222567.chatgpt.site/) |

岛屿名称、介绍、封面和入口统一维护在 `app/islands.ts`。门户只负责展示和导航，不承担外部子站的实时可用性监测。

## 技术栈

| 类别 | 当前使用 |
| --- | --- |
| UI | React 19.2.6、TypeScript 5.9.3 |
| 路由与渲染 | Next.js 16.2.6 App Router；Sites 侧使用 vinext 0.0.50 |
| 构建 | Vite 8.0.13、Cloudflare Vite 插件 |
| 样式 | 自定义 CSS、Tailwind CSS 4.2.1 / PostCSS |
| 动效 | CSS Transform / Opacity、IntersectionObserver、requestAnimationFrame、WebGL2 高度场水波 |
| 运行与托管 | OpenAI Sites / Cloudflare Workers、GitHub Pages |
| 检查 | ESLint 9、Node.js 内置测试运行器 |
| 可选扩展 | Drizzle ORM / Kit、Cloudflare D1 / R2、ChatGPT 登录辅助函数 |

默认开发与 Sites 构建脚本调用 `vinext`；`build:pages` 使用 Next.js 静态导出生成 GitHub Pages 版本。D1、R2 和登录辅助函数目前没有接入门户首页。

## 目录结构

```text
.
├── app/
│   ├── page.tsx                  # 首页结构：Hero、策展说明、岛屿索引、未来目录、Footer
│   ├── islands.ts                # 岛屿数据、概述、封面、入口和自动编号
│   ├── catalogue-motion.tsx      # 滚动进度、章节显现、Motion 开关、月光滚动变量
│   ├── fluid-cursor.tsx          # WebGL2 双缓冲高度场水波
│   ├── globals.css               # 基础视觉系统和通用响应式样式
│   ├── exhibition-motion.css     # Hero、章节、海面与展览式动效
│   ├── ambient-background.css    # 纯深色正文背景与水波画布层级
│   ├── hero-light-motion.css     # 右上月光呼吸、滚动偏转与海面联动
│   ├── island-index.css          # 单行左图右文岛屿索引布局
│   ├── layout.tsx                # 页面元数据与样式入口
│   ├── fonts/                    # 本地字体与许可
│   └── chatgpt-auth.ts           # 预留的 ChatGPT 登录辅助函数
├── public/
│   ├── moonlit-ocean-pramod-tiwari.jpg # 当前 Hero 月夜海面摄影
│   ├── photos-island.png
│   ├── faerie-britain.png
│   ├── gridwake.png
│   ├── roamisle.svg
│   ├── og.png
│   ├── quiet-horizon.webp
│   └── moonlit-ocean-4k.svg
├── .github/workflows/pages.yml
├── scripts/build-pages.mjs
├── tests/
│   ├── rendered-html.test.mjs
│   └── pages-export.test.mjs
├── README.md
├── package.json
└── package-lock.json
```

## 本地运行

### 环境要求

- Node.js **>= 22.13.0**
- npm
- Git

```bash
git clone https://github.com/LoseYoung/loseyoung-digital-islands.git
cd loseyoung-digital-islands
npm ci
npm run dev
```

当前首页不需要数据库、对象存储或登录配置，也没有必填的业务环境变量。

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 vinext 开发服务器 |
| `npm run build` | 生成 OpenAI Sites 生产构建 |
| `npm run build:pages` | 生成 GitHub Pages 静态文件到 `out/` |
| `npm run test:pages` | 检查 Pages 导出页面与资源路径 |
| `npm start` | 启动生产预览，需先构建 |
| `npm run lint` | 执行 ESLint |
| `npm test` | 先构建，再执行门户 HTML 渲染和资源检查 |
| `npm run db:generate` | 仅在接入数据库并修改 schema 后生成 Drizzle 迁移 |

## 内容维护

新增或调整岛屿时，主要修改 `app/islands.ts`，并把对应封面加入 `public/`。编号会自动延续，单行目录会自然继续向下增加。

## 部署

### OpenAI Sites

`.openai/hosting.json` 关联现有“LoseYoung · 数字岛屿”项目。GitHub 提交与 Sites 发布是两个独立步骤，需要在对应的 Sites 工作流中重新构建并部署。

### GitHub Pages

推送到 `main` 后，`.github/workflows/pages.yml` 会自动执行依赖安装、构建、静态导出、资源检查和 Pages 发布。

## 当前状态

- 项目版本：**0.1.0**。
- 当前开放 4 座岛屿，并保留 More to Arrive 未来目录。
- 首页已经完成月夜摄影 Hero、动态月光、透明 WebGL 水波、滚动渐进强度和单行岛屿索引。
- 门户内容仍直接维护在源码中，没有 CMS、用户账户、照片上传或业务数据库。

## 设计说明

当前视觉方向是“夜海 × 星空”的个人展览目录：真实摄影负责首屏情绪，正文退回纯深蓝黑，动态只保留月光、海面与透明水波等少量层次。