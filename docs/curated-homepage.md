# Digital Islands · 策展首页 v1

依据 Learning /「开源部署方案」的最新确认稿实现：方案 2、标题方向 C、艺术展目录与未来扩展空间。

## 页面与交互

- Hero：Somewhere Between Real and Imagined；中文前言保持完整。
- Curatorial Note、Selected Islands、More to Arrive、Footer 六段式目录。
- 作品数据统一在 `app/islands.ts`，开放条目与预留条目自动连续编号。
- 子站卡片完整可点击，安全新标签打开。Archive 暂不启用，未来条目没有虚假动作。
- 桌面 / 平板 / 手机使用 3 / 2 / 1 列；手机仅显示两项预留位置。
- 内容先服务端输出，动效只是增强：无 JavaScript 时内容和导航依然可用。
- 54 秒轻微光点漂移；1.2 秒首屏曝光；细线展开；18px 滚动显现；4px 悬停反馈。
- 滚动轨迹由单个 requestAnimationFrame 节流更新，不注册鼠标视差。
- 减少动态效果偏好变化后立即撤销动效；键盘焦点和锚点跳转自动显现目标内容。
- 两套构建共用源码、封面、字体和既有分享图。分享域名来自已配置的发布地址，不从请求 Host 生成。

## 素材

- 首屏：`public/quiet-horizon.webp`，1672 × 941，52,050 bytes。
- 使用内置 `image_gen` 生成一次，随后仅做 WebP 发布压缩；保留已有项目封面及 `og.png`。
- 字体：`app/fonts/cormorant-garamond-regular.ttf` 和 `cormorant-garamond-italic.ttf`，本地随构建托管；许可为同目录 `OFL.txt`（SIL Open Font License 1.1）。

### 背景生成原始提示词

```text
Use case: photorealistic-natural
Asset type: original photographic background asset for a personal art-exhibition-style website; image only, separate HTML headline will be added later.
Primary request: a cinematic wide 16:9 landscape of a quiet midnight ocean beneath sparse tiny stars, somewhere between real and imagined, contemplative and understated.
Composition/framing: distant razor-thin sea horizon around the lower third of the image, with huge dark negative space throughout the upper and left/center two thirds. Very subtle small distant moon glow toward the far right, casting restrained cold silver reflected light on the water. Keep the moon tiny and unobtrusive.
Style/medium: elegant gallery photographic art, nuanced natural ocean texture and fine film grain.
Lighting/mood: very dark, hushed, restrained, natural night light; soft distant glow, no dramatic effects.
Color palette: deep #07111A navy and muted cold silver, low saturation.
Constraints: generate exactly one wide image. No text, letters, logos, UI, frames, neon, planets, mountains, foreground objects, or watermark. Preserve clean dark negative space for a separate serif headline.
```

## 验证

```sh
npm test
npm run build:pages
npm run test:pages
```

静态导出测试单独处理 preconnect / dns-prefetch 提示，检查实际图片、脚本、样式和 CSS 中引用的本地字体是否存在于仓库发布子目录。

GitHub PR 构建与正式发布是不同步骤；现有 Sites 的项目关联保持有效。
