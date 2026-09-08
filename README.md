# LoseYoung · 数字岛屿

> 把灵感，安放在星海之间。

“数字岛屿”是 LoseYoung 的个人网页总门户，用统一的入口展示正在创造与维护的作品。每座“岛屿”对应一个独立站点，承载影像、游戏或持续生长的创意。

本仓库维护门户首页、项目入口、视觉样式与部署配置。照片画廊和游戏的具体实现位于各自项目中。

**访问门户：[LoseYoung · 数字岛屿](https://loseyoung-digital-islands.lzy793222567.chatgpt.site)**

## 核心功能

- **项目导航**：通过项目卡片查看作品简介、封面和入口，在新标签页打开对应站点。
- **三个岛屿入口**：首页展示照片岛、妖精国余响和栅域余烬。
- **未来坐标**：为后续作品保留“下一座岛屿”的展示位置，目前是不可交互的占位区域。
- **星海主题与动效**：深色星空、海岸背景和鼠标视差效果；针对触屏设备及减少动态效果偏好进行适配。
- **响应式布局与基础无障碍支持**：适配桌面和移动端，提供导航标签、图片替代文本及键盘焦点样式。
- **分享元数据**：配置中文标题、描述、Open Graph 和 Twitter 大图卡片，使用本地分享图。

### 当前展示的岛屿

| 项目 | 首页介绍 | 入口 |
| --- | --- | --- |
| 照片岛 · Photos Island | 收藏光影与记忆的公开照片画廊 | [进入照片岛](https://photos-island.lzy793222567.chatgpt.site/) |
| 妖精国余响 · Faerie Britain: Echoes | 以阿尔托莉雅·Caster 为角色的横版动作 RPG | [开始巡礼](https://faerie-britain-echoes.lzy793222567.chatgpt.site/) |
| 栅域余烬 · Gridwake | 原创像素风第一人称生存游戏，单机大逃杀 Demo | [进入战场](https://digital-island-gridwake.lzy793222567.chatgpt.site/) |

以上名称、介绍和入口以门户代码为准；子站点的功能和运行状态由各自项目维护。首页的“公开访问 / 公开试玩”和岛屿数量是静态展示内容，不是实时可用性监测结果。

## 技术栈

| 类别 | 当前使用 |
| --- | --- |
| 界面 | React 19.2.6、TypeScript 5.9.3 |
| 路由与渲染 | Next.js App Router API；实际开发、构建和启动使用 vinext 0.0.50 |
| 构建 | Vite 8.0.13、Cloudflare Vite 插件 |
| 样式 | 自定义全局 CSS、Tailwind CSS 4.2.1 / PostCSS |
| 运行与托管 | Cloudflare Workers 兼容入口、OpenAI Sites |
| 检查 | ESLint 9、Node.js 内置测试运行器 |
| 可选扩展 | Drizzle ORM / Kit、Cloudflare D1 / R2 配置、ChatGPT 登录辅助函数 |

项目保留了 Next.js 16.2.6 依赖，但 `package.json` 中的运行脚本调用的是 `vinext`。D1、R2 和登录辅助函数当前没有接入门户首页。

## 目录结构

```text
.
├── app/
│   ├── page.tsx                 # 门户首页、三个项目入口与鼠标视差
│   ├── layout.tsx               # 中文页面布局与分享元数据
│   ├── globals.css              # 星海主题、动效与响应式样式
│   └── chatgpt-auth.ts          # 预留的 ChatGPT 登录辅助函数
├── public/
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
├── tests/
│   └── rendered-html.test.mjs   # 门户服务端渲染与本地资源检查
├── vite.config.ts              # vinext、Sites 与 Cloudflare 构建配置
├── next.config.ts              # Next.js 兼容配置
├── drizzle.config.ts           # 可选的数据库迁移生成配置
├── eslint.config.mjs           # ESLint 配置
├── postcss.config.mjs          # Tailwind CSS / PostCSS 配置
├── tsconfig.json               # TypeScript 配置
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
| `npm run build` | 生成生产构建 |
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

现有测试覆盖门户响应、主要文案、部分项目链接、分享图 URL、本地封面文件和模板残留检查；它不验证三个外部子站点的完整功能。

### 内容维护

- 修改项目名称、介绍、链接和卡片：编辑 `app/page.tsx`。
- 新增岛屿：添加对应卡片与 `public/` 封面，并同步首页的岛屿数量、相关文案及测试。
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

**GitHub 提交与 Sites 发布是两个步骤。** 当前仓库未包含 GitHub Actions 部署工作流，也没有 `npm run deploy` 脚本；仅推送到 GitHub 不代表站点已重新发布。

### 其他托管环境

当前构建面向 Cloudflare Workers 兼容运行时，布局还会读取请求头生成分享链接。迁移到其他平台时，需要适配运行时、静态资源绑定及部署配置；当前配置不能直接作为 GitHub Pages 的纯静态站点发布。

## 当前状态

- 包版本为 **0.1.0**，项目持续构建中。
- 门户已有三个独立项目入口，以及一个“未来坐标”占位区域。
- 页面内容直接维护在源码中，目前没有内容管理后台、照片上传、用户账户或业务数据库功能。
- `db/`、`examples/d1/` 和 `app/chatgpt-auth.ts` 是保留的扩展基础，不代表这些能力已经上线。
- 后续作品准备好后，可通过更新首页卡片和封面接入门户。
