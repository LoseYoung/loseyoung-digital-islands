<p align="center">
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/main"><kbd>English</kbd></a>
  ·
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/doc-zh"><kbd>简体中文</kbd></a>
  ·
  <strong><kbd>日本語</kbd></strong>
</p>

# LoseYoung · デジタル・アイランズ

> Somewhere Between Real and Imagined

「Digital Islands」は LoseYoung の個人ポータルであり、少しずつ増えていく作品インデックスです。それぞれの“島”は独立したサイトとして、写真、ゲーム、幻想世界、AI 体験、そして今後生まれる新しいプロジェクトを収容します。すべてを同じ製品に統一するのではなく、異なる世界をひとつの展覧会カタログのように並べることを目指しています。

このリポジトリでは、ポータルのトップページ、島のインデックス、ビジュアル演出、レスポンシブレイアウト、共有メタデータ、デプロイ設定を管理します。各島の個別ロジックやコンテンツは、それぞれのプロジェクト側で管理されます。

**公開サイト**

- [OpenAI Sites · Digital Islands](https://loseyoung-digital-islands.lzy793222567.chatgpt.site)
- [GitHub Pages · Digital Islands](https://loseyoung.github.io/loseyoung-digital-islands/)

## 現在の体験

### 月夜の Hero

ファーストビューには実写の月夜の海を使用し、その上に控えめな展覧会風モーションを重ねています。

- 右上の月光は複数の光帯で構成され、静止中もゆっくり呼吸するように明滅・漂移します。
- Hero のスクロール量に応じて光の向き、位置、広がりが変化し、海面の反射、月の霞、水平線の明るさも連動します。
- タイトルと導入文はゆっくり現れ、スクロール時にはわずかなパララックスを伴って退場します。
- 背景写真は `public/moonlit-ocean-pramod-tiwari.jpg` を使用しています。

### 透明な水紋インタラクション

Hero の下は深い青黒の単色背景とし、その上にフルスクリーンの WebGL2 水紋を重ねています。

- 水紋は DOM の円やマウス軌跡ではなく、ダブルバッファの高さ場で波の拡散をシミュレートします。
- マウス移動時は局所的な摂動だけを加え、その後の拡散・干渉・減衰は水面シミュレーション側で進みます。
- 見た目は透明なガラス / 月光に照らされた水面を目標にし、銀青・冷たいシアン・ごく弱い紫の屈折だけを残しています。
- 水紋の強さは Hero から本文へスクロールするにつれて滑らかに強くなります。

### 1 行型の Island Index

Selected Islands は 3 列カードから、長期的に増やしやすい **Media Object / Editorial Project Index** へ変更しました。

- 各島が 1 行を占有し、デスクトップでは左にカバー、右に番号 / カテゴリ / タイトル / 概要 / リンクを配置します。
- 5 個目以降の島もそのまま下へ追加でき、3 の倍数を意識する必要がありません。
- カバーは `object-fit: contain` で常に全体を表示し、トリミングや無理な拡大は行いません。
- Island セクションは Hero と同じ左右余白を共有し、ページ全体の基準線を揃えています。

## 公開中の島

| Island | Type | Summary | Link |
| --- | --- | --- | --- |
| Photos Island · A Softer Gaze | Photography | 旅、都市、自然、偶然出会った瞬間を集める、少しずつ成長していく個人的な写真アーカイブです。 | [Photos Island](https://photos-island.lzy793222567.chatgpt.site/) |
| Faerie Britain Echoes · Another Reality | Fantasy / RPG | 妖精国、登場人物、旅の余韻を保存し、物語が終わった後にも残る空気や記憶を、もう一度入れる空間として組み直します。 | [Faerie Britain Echoes](https://faerie-britain-echoes.lzy793222567.chatgpt.site/) |
| Gridwake · Further Out | Sci-Fi / FPS | SF と FPS のテンポを軸に、戦闘、空間、残された秩序、未知の環境を、より冷たく鋭いデジタル領域へまとめています。 | [Gridwake](https://digital-island-gridwake.lzy793222567.chatgpt.site/) |
| RoamIsle · A Journey, in Conversation | AI Travel / Agent | AI による旅行計画を軸に、目的地のアイデア、ルート整理、旅の途中で生まれる考えを、相談しながら調整できる一つの旅へまとめていく空間です。 | [RoamIsle](https://roamisle.lzy793222567.chatgpt.site/) |

島の名称、説明、カバー、リンクは `app/islands.ts` で一元管理しています。

## 技術スタック

| Category | Current stack |
| --- | --- |
| UI | React 19.2.6、TypeScript 5.9.3 |
| Routing / Rendering | Next.js 16.2.6 App Router、Sites 側は vinext 0.0.50 |
| Build | Vite 8.0.13、Cloudflare Vite plugin |
| Styling | Custom CSS、Tailwind CSS 4.2.1 / PostCSS |
| Motion | CSS Transform / Opacity、IntersectionObserver、requestAnimationFrame、WebGL2 height-field ripple |
| Hosting | OpenAI Sites / Cloudflare Workers、GitHub Pages |

## ディレクトリ構成

```text
.
├── app/
│   ├── page.tsx
│   ├── islands.ts
│   ├── catalogue-motion.tsx
│   ├── fluid-cursor.tsx
│   ├── hero-light-motion.css
│   └── island-index.css
├── public/
│   ├── moonlit-ocean-pramod-tiwari.jpg
│   ├── photos-island.png
│   ├── faerie-britain.png
│   ├── gridwake.png
│   ├── roamisle.svg
│   └── og.png
├── .github/workflows/pages.yml
├── README.md
├── package.json
└── package-lock.json
```

## ローカル開発

```bash
git clone https://github.com/LoseYoung/loseyoung-digital-islands.git
cd loseyoung-digital-islands
npm ci
npm run dev
```

### よく使うコマンド

| Command | Purpose |
| --- | --- |
| `npm run dev` | vinext 開発サーバーを起動 |
| `npm run build` | OpenAI Sites 用 production build |
| `npm run build:pages` | GitHub Pages 用 static export を `out/` に生成 |
| `npm run test:pages` | Pages の出力と asset path を検証 |
| `npm run lint` | ESLint を実行 |
| `npm test` | build 後に HTML / resource tests を実行 |

## デプロイ

### OpenAI Sites

`.openai/hosting.json` は既存の「LoseYoung · Digital Islands」プロジェクトに紐づいています。GitHub への push と Sites への公開は別工程です。

### GitHub Pages

`main` への push で `.github/workflows/pages.yml` が自動的に build / static export / deploy を実行します。

## 現在の状態

- Version: **0.1.0**
- 現在 4 つの島を公開し、More to Arrive の将来枠を残しています。
- 月夜の実写 Hero、動的な月光、透明 WebGL 水紋、スクロール連動の水紋強度、1 行型 Island Index を実装済みです。

## デザインノート

現在の方向性は「夜の海 × 星空」を軸にした個人展覧会カタログです。実写写真が Hero の感情を担い、本文は深い青黒へ戻し、動きは月光、海面、透明な水紋に絞っています。