# LoseYoung · 数字岛屿

> Somewhere Between Real and Imagined

“数字岛屿”是 LoseYoung 的个人网页总门户，用统一的入口展示正在创造与维护的作品。每座“岛屿”对应一个独立站点，承载影像、游戏或持续生长的创意。

本仓库维护门户首页、项目入口、视觉样式与部署配置。照片画廊和游戏的具体实现位于各自项目中。

**访问门户：[LoseYoung · 数字岛屿](https://loseyoung-digital-islands.lzy793222567.chatgpt.site)**

## 核心功能

- **项目导航**：通过项目卡片查看作品简介、封面和入口，在新标签页打开对应站点。
- **策展目录**：以 A Softer Gaze、Another Reality、Further Out 三个章节展示当前作品，目录可持续扩展。
- **More to Arrive**：为未来岛屿预留目录位置，序号随已开放作品数量自动延续，尚未开放的条目不可点击。
- **克制的视觉与动效**：本地海面背景、星光明暗、海面反光与光雾呼吸；衬线标题、缓慢入场、滚动显现和随阅读推进的光点轨迹。Motion 开关支持暂停与记忆，默认遵循系统偏好；禁用 JavaScript 时仍可完整阅读和导航。
- **响应式布局与基础无障碍支持**：适配桌面和移动端，提供导航标签、图片替代文本及键盘焦点样式。
- **分享元数据**：配置中文标题、描述、Open Graph 和 Twitter 大图卡片，使用本地分享图。

### 当前展示的岛屿

| 项目 | 首页介绍 | 入口 |
| --- | --- | --- |
| 照片岛 · Photos Island | 收藏光影与记忆的公开照片画廊 | [进入照片岛](https://photos-island.lzy793222567.chatgpt.site/) |
| 妖精国余响 · Faerie Britain: Echoes | 以阿尔托莉雅·Caster 为角色的横版动作 RPG | [开始巡礼](https://faerie-britain-echoes.lzy793222567.chatgpt.site/) |
| 栅域余烬 · Gridwake | 原创像素风第一人称生存游戏，单机大逃杀 Demo | [进入战场](https://digital-island-gridwake.lzy793222567.chatgpt.site/) |

以上名称、介绍和入口以门户代码为准；子站点的功能和运行状态由各自项目维护。目录不是实时可用性监测，子站的开放情况由各自项目维护。

## 技术栈

| 类别 | 当前使用 |
| --- | --- |
| 界面 | React 19.2.6、TypeScript 5.9.3 |
| 路由与渲染 | Next.js App Router API；Sites 使用 vinext 0.0.50；Pages 使用 Next.js 16.2.6 静态导出 |
| 构建 | Vite 8.0.13、Cloudflare Vite 插件 |
| 样式 | 自定义全局 CSS、Tailwind CSS 4.2.1 / PostCSS |
| 运行与托管 | OpenAI Sites / Cloudflare Workers、GitHub Pages |
| 检查 | ESLint 9、Node.js 内置测试运行器 |
| 可选扩展 | Drizzle ORM / Kit、Cloudflare D1 / R2 配置、ChatGPT 登录辅助函数 |

默认开发与 Sites 构建脚本调用 `vinext`；`build:pages` 使用已有的 Next.js 依赖生成纯静态页面。D1、R2 和登录辅助函数当前没有接入门户首页。

## 目录结构

```text
.
├── app/
│   ├── page.tsx                 # 策展首页与可扩展作品陈列
│   ├── islands.ts               # 岛屿数据与自动编号
│   ├── catalogue-motion.tsx       # 渐进式动效、减少动态效果和键盘导航处理
│   ├── fonts/                   # 本地字体与 SIL Open Font License
│   ├── layout.tsx               # 中文页面布局与分享元数据
│   ├── globals.css              # 艺术展目录视觉、动效与响应式样式
│   └── chatgpt-auth.ts          # 预留的 ChatGPT 登录辅助函数
├── public/
│   ├── quiet-horizon.webp        # 无文字首屏背景（约 51 KB）
│   ├── photos-island.png        # 照片岛封面
│   ├── faerie-britain.png        # 妖精国余响封面
│   ├── gridwake.png             # 栅域余烬封面
│   └── og.png                   # 门户分享图
├── worker/
│   └── index.ts                # Worker 请求处理与图片优化入口
├── build/
│   └── sites-vite-plugin.ts     # 将 Sites 配置和迁移目录复制到构建产物
├── .openai/
│   └── hosting.json             # Sites 项目关联与可选 D1 / R2 绑定
├── db/
│   ├── index.ts                # 可选 D1 / Drizzle 数据库访问工具
│   └── schema.ts               # 当前为空，尚无业务数据表
├── drizzle/                    # 数据库迁移元数据，目前无业务迁移
├── examples/d1/                 # 保留的 D1 示例，不是门户实际 API
├── .github/workflows/pages.yml # GitHub 自动构建、检查与 Pages 发布
├── scripts/build-pages.mjs     # 静态导出与发布地址配置
├── tests/
│   ├── rendered-html.test.mjs   # 门户服务端渲染与本地资源检查
│   └── pages-export.test.mjs    # 静态页面内容与子路径资源检查
├── vite.config.ts              # vinext、Sites 与 Cloudflare 构建配置
├── next.config.ts              # Pages 静态导出与基础路径配置
├── drizzle.config.ts           # 可选的数据库迁移生成配置
├── eslint.config.mjs           # ESLint 配置
├── postcss.config.mjs          # Tailwind CSS / PostCSS 配置
├── tsconfig.json               # TypeScript 配置
├── tsconfig.pages.json         # Pages 前端类型检查范围
├── package.json                # 项目依赖及运行脚本
└── package-lock.json           # npm 依赖锁文件
```

## 本地运行与开发

### 环境要求

- Node.js **>= 22.13.0**
- npm
- Git，以及本仓库的读取权限

### 启动开发环境

```bash
# 获取仓库并进入项目目录
git clone https://github.com/LoseYoung/loseyoung-digital-islands.git
cd loseyoung-digital-islands

# 按锁文件安装依赖
npm ci

# 启动开发服务器，访问终端输出的本地地址
npm run dev
```

当前首页不需要数据库、对象存储或登录配置，也没有必填的业务环境变量。

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 vinext 开发服务器 |
| `npm run build` | 生成 Sites 生产构建 |
| `npm run build:pages` | 生成 GitHub Pages 静态文件到 `out/` |
| `npm run test:pages` | 检查已导出的 Pages 页面、分享地址及资源 |
| `npm start` | 调用 `vinext start` 启动生产预览，需先构建 |
| `npm run lint` | 执行 ESLint 检查 |
| `npm test` | 先构建，再执行门户 HTML 渲染和资源检查 |
| `npm run db:generate` | 使用 Drizzle 生成迁移，仅在接入数据库并修改 schema 后需要 |

```bash
# 检查代码与门户渲染
npm run lint
npm test

# 单独构建并启动生产预览
npm run build
npm start
```

现有测试覆盖双平台完整渲染、子站安全新标签导航、页内锚点、无 JavaScript 内容可见性、可信分享地址，以及 Pages 子目录下的图片、脚本、样式和字体路径；不验证外部子站点的完整功能。

### 内容维护

- 修改项目名称、介绍、链接和封面：编辑 `app/islands.ts`；首页区块和文案位于 `app/page.tsx`。
- 新增岛屿：在 `app/islands.ts` 的 `islands` 数组追加一项并添加 `public/` 封面；编号和未来条目序号自动延续，网格在桌面 / 平板 / 手机按 3 / 2 / 1 列排列。
- 修改主题、动画和移动端布局：编辑 `app/globals.css`。
- 修改页面标题、描述和分享信息：编辑 `app/layout.tsx`，需要时更新 `public/og.png`。

## 部署方式

当前门户通过 **OpenAI Sites** 托管。`.openai/hosting.json` 已关联现有“LoseYoung · 数字岛屿”项目，`d1` 和 `r2` 均为 `null`。

### 更新现有 Sites 站点

1. 完成代码修改，运行 `npm run lint` 和 `npm test`。
2. 使用构建产物发布：服务端入口为 `dist/server/index.js`，客户端资源位于 `dist/client/`，Sites 元数据位于 `dist/.openai/`。
3. 在具备现有项目发布权限的 Sites 工作流中，同步对应源码提交、打包构建产物并保存新版本。
4. 将保存的版本部署到现有 Sites 项目，确认部署成功后访问门户检查结果。

维护现有站点时应保留 `.openai/hosting.json` 中的项目关联。真实的 Cloudflare 资源和部署绑定由 Sites 管理，本仓库没有手写的 `wrangler.jsonc`。

**GitHub 提交与 Sites 发布是两个步骤。** 下方工作流只发布 GitHub Pages，不会更新已有 Sites 站点。

### GitHub Pages 自动构建与发布

GitHub Free 需要将仓库设为公开，才能使用此 Pages 发布方式。

1. 在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
2. 推送到 `main` 后，`.github/workflows/pages.yml` 自动安装依赖，验证 Sites 构建，再执行 Pages 静态导出与资源检查。
3. 所有检查通过后上传 `out/` 并发布。可在仓库 **Actions** 查看构建日志和部署结果。
4. 发布地址：[LoseYoung · 数字岛屿（GitHub Pages）](https://loseyoung.github.io/loseyoung-digital-islands/)。

PR 只运行构建检查；公开仓库的 `main` 才会触发部署。也可以在 Actions 页面手动运行此工作流。

本地生成同样的静态文件：

```bash
npm ci
npm run build:pages
npm run test:pages
```

脚本默认使用当前仓库的发布子路径 `/loseyoung-digital-islands` 和完整 Pages 地址，确保封面、脚本、样式及分享图片路径正确。复制仓库后，GitHub Actions 会根据 `GITHUB_REPOSITORY` 自动确定地址；使用自定义域名时，可显式设置 `NEXT_PUBLIC_BASE_PATH`（根目录为空字符串）和 `NEXT_PUBLIC_SITE_URL`。

Pages 发布的是本仓库的门户静态页面。三个岛屿仍链接到各自站点，照片上传、登录或数据库等服务端功能不会由 Pages 提供。

## 当前状态

- 包版本为 **0.1.0**，项目持续构建中。
- 门户已有三个独立项目入口，以及 More to Arrive 预留目录（移动端仅显示两个预留条目）。
- 页面内容直接维护在源码中，目前没有内容管理后台、照片上传、用户账户或业务数据库功能。
- `db/`、`examples/d1/` 和 `app/chatgpt-auth.ts` 是保留的扩展基础，不代表这些能力已经上线。
- 后续作品准备好后，可通过更新首页卡片和封面接入门户。

## 本轮设计与素材

设计、动效规则和生成背景来源见 [策展首页开发说明](docs/curated-homepage.md)。
