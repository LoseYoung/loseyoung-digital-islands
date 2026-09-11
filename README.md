<p align="center">
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/main"><kbd>English</kbd></a>
  ·
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/doc-zh"><kbd>简体中文</kbd></a>
  ·
  <strong><kbd>日本語</kbd></strong>
</p>

# LoseYoung · デジタル・アイランズ

> Somewhere Between Real and Imagined

「Digital Islands」は LoseYoung の個人ポータルであり、少しずつ増えていく作品インデックスです。それぞれの“島”は独立したサイトとして、写真、ゲーム、幻想世界、そして今後生まれる新しいプロジェクトを収容します。すべてを同じ製品に統一するのではなく、異なる世界をひとつの展覧会カタログのように並べることを目指しています。

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
- 背景写真は `public/moonlit-ocean-pramod-tiwari.jpg` を使用しています。旧素材は履歴用として `public/` に残していますが、現在の Hero では使用していません。

### 透明な水紋インタラクション

Hero の下は深い青黒の単色背景とし、その上にフルスクリーンの WebGL2 水紋を重ねています。

- 水紋は DOM の円やマウス軌跡ではなく、ダブルバッファの高さ場で波の拡散をシミュレートします。
- マウス移動時は局所的な摂動だけを加え、その後の拡散・干渉・減衰は水面シミュレーション側で進みます。
- 見た目は透明なガラス / 月光に照らされた水面を目標にし、銀青・冷たいシアン・ごく弱い紫の屈折だけを残しています。
- 水紋の強さは Hero から本文へスクロールするにつれて滑らかに強くなります。
- シミュレーション解像度、マウスサンプリング、アイドル停止を制限し、タッチ端末や reduced motion では自動的に簡略化します。

### 1 行型の Island Index

Selected Islands は 3 列カードから、長期的に増やしやすい **Media Object / Editorial Project Index** へ変更しました。

- 各島が 1 行を占有し、デスクトップでは左にカバー、右に番号 / カテゴリ / タイトル / 概要 / リンクを配置します。
- 4、5、6 個目の島もそのまま下へ追加でき、3 の倍数を意識する必要がありません。
- カバーは `object-fit: contain` で常に全体を表示し、トリミングや無理な拡大は行いません。
- デスクトップではカバー最大幅を約 720px に制限し、中間幅では比例縮小、狭い画面では縦積みに切り替わります。
- Island セクションは Hero と同じ左右余白を共有し、ページ全体の基準線を揃えています。
- 各島の概要は短いタグラインだけでなく、作品の位置づけや雰囲気まで説明します。

### モーションとアクセシビリティ

- コンテンツはサーバー側で先に出力し、モーションはあくまで拡張として扱います。JavaScript が無効でも主要コンテンツとナビゲーションは利用できます。
- `Motion on / off` でアニメーションを手動切り替えでき、選択は保存されます。
- 既定では `prefers-reduced-motion` に従います。
- ページがバックグラウンドに移ると、一部の連続アニメーションを停止します。
- 画像には代替テキストがあり、ページ内ナビゲーション、フォーカス、アンカー遷移にも基本的なアクセシビリティ対応があります。

## 公開中の島

| Island | Type | Summary | Link |
| --- | --- | --- | --- |
| Photos Island · A Softer Gaze | Photography | 旅、都市、自然、偶然出会った瞬間を集める、少しずつ成長していく個人的な写真アーカイブです。 | [Photos Island](https://photos-island.lzy793222567.chatgpt.site/) |
| Faerie Britain Echoes · Another Reality | Fantasy / RPG | 妖精国、登場人物、旅の余韻を保存し、物語が終わった後にも残る空気や記憶を、もう一度入れる空間として組み直します。 | [Faerie Britain Echoes](https://faerie-britain-echoes.lzy793222567.chatgpt.site/) |
| Gridwake · Further Out | Sci-Fi / FPS | SF と FPS のテンポを軸に、戦闘、空間、残された秩序、未知の環境を、より冷たく鋭いデジタル領域へまとめています。 | [Gridwake](https://digital-island-gridwake.lzy793222567.chatgpt.site/) |

島の名称、説明、カバー、リンクは `app/islands.ts` で一元管理しています。ポータルは表示とナビゲーションのみを担当し、外部サブサイトの稼働状況をリアルタイム監視するものではありません。

## 技術スタック

| Category | Current stack |
| --- | --- |
| UI | React 19.2.6、TypeScript 5.9.3 |
| Routing / Rendering | Next.js 16.2.6 App Router、Sites 側は vinext 0.0.50 |
| Build | Vite 8.0.13、Cloudflare Vite plugin |
| Styling | Custom CSS、Tailwind CSS 4.2.1 / PostCSS |
| Motion | CSS Transform / Opacity、IntersectionObserver、requestAnimationFrame、WebGL2 height-field ripple |
| Hosting | OpenAI Sites / Cloudflare Workers、GitHub Pages |
| Checks | ESLint 9、Node.js built-in test runner |
| Optional foundation | Drizzle ORM / Kit、Cloudflare D1 / R2、ChatGPT auth helper |

通常の開発と Sites ビルドは `vinext` を使用します。`build:pages` は Next.js の静的エクスポートで GitHub Pages 用の成果物を生成します。D1、R2、ログイン補助機能は現在のトップページには接続していません。

## ディレクトリ構成

```text
.
├── app/
│   ├── page.tsx                  # Hero、キュレーション、Island Index、Future、Footer
│   ├── islands.ts                # 島データ、説明、カバー、URL、自動番号
│   ├── catalogue-motion.tsx      # スクロール進行、reveal、Motion 切替、月光変数
│   ├── fluid-cursor.tsx          # WebGL2 ダブルバッファ水紋
│   ├── globals.css               # 基本ビジュアルと共通レスポンシブ
│   ├── exhibition-motion.css     # Hero、セクション、海面、展示風モーション
│   ├── ambient-background.css    # 本文背景と水紋キャンバスのレイヤー
│   ├── hero-light-motion.css     # 月光の呼吸、スクロール偏向、海面連動
│   ├── island-index.css          # 1 行型の左画像・右説明レイアウト
│   ├── layout.tsx                # Metadata とスタイルエントリ
│   ├── fonts/                    # ローカルフォントとライセンス
│   └── chatgpt-auth.ts           # 将来用 ChatGPT auth helper
├── public/
│   ├── moonlit-ocean-pramod-tiwari.jpg # 現在の Hero 背景
│   ├── photos-island.png
│   ├── faerie-britain.png
│   ├── gridwake.png
│   ├── og.png
│   ├── quiet-horizon.webp        # 旧 Hero 素材
│   └── moonlit-ocean-4k.svg      # 旧生成背景
├── .github/workflows/pages.yml   # GitHub Pages build / deploy
├── scripts/build-pages.mjs       # Pages static export
├── tests/
│   ├── rendered-html.test.mjs
│   └── pages-export.test.mjs
├── README.md                     # 現在のブランチ言語 README
├── package.json
└── package-lock.json
```

## ローカル開発

### 必要環境

- Node.js **>= 22.13.0**
- npm
- Git

### 起動

```bash
git clone https://github.com/LoseYoung/loseyoung-digital-islands.git
cd loseyoung-digital-islands
npm ci
npm run dev
```

現在のトップページには、データベース、オブジェクトストレージ、ログイン設定などの必須環境変数はありません。

### よく使うコマンド

| Command | Purpose |
| --- | --- |
| `npm run dev` | vinext 開発サーバーを起動 |
| `npm run build` | OpenAI Sites 用 production build |
| `npm run build:pages` | GitHub Pages 用 static export を `out/` に生成 |
| `npm run test:pages` | Pages の出力と asset path を検証 |
| `npm start` | production preview を起動（事前 build が必要） |
| `npm run lint` | ESLint を実行 |
| `npm test` | build 後に HTML / resource tests を実行 |
| `npm run db:generate` | DB schema を導入した場合のみ Drizzle migration を生成 |

コミット前の推奨チェック：

```bash
npm run lint
npm test
npm run build:pages
npm run test:pages
```

## コンテンツ管理

新しい島を追加または編集する場合は、主に `app/islands.ts` を更新します。

```ts
{
  id: "new-island",
  title: "Project Title",
  description: "短いキャッチコピーではなく、島の概要を少し詳しく書きます。",
  name: "New Island",
  category: "Category",
  url: "https://example.com/",
  cover: "/new-island.png",
  coverAlt: "カバー画像の代替テキスト",
}
```

カバー画像を `public/` に追加すれば、番号は自動的に続き、1 行型インデックスもそのまま下に増えます。

主な編集箇所：

- ページ構造と静的コピー：`app/page.tsx`
- Island Index レイアウト：`app/island-index.css`
- Hero / section motion：`app/exhibition-motion.css`
- 月光モーション：`app/hero-light-motion.css`
- WebGL 水紋：`app/fluid-cursor.tsx`
- 水紋レイヤーと本文背景：`app/ambient-background.css`
- Metadata / share info：`app/layout.tsx`

## デプロイ

### OpenAI Sites

`.openai/hosting.json` は既存の「LoseYoung · Digital Islands」プロジェクトに紐づいています。現在のポータルは D1 / R2 を必須としていません。

GitHub への push と Sites への公開は別工程です。リポジトリの更新だけでは既存 Sites 版は置き換わらず、対応する Sites ワークフローで再ビルド・再デプロイする必要があります。

### GitHub Pages

`.github/workflows/pages.yml` が設定済みです。`main` への push で依存関係のインストール、build、static export、asset check、Pages deploy が自動で実行されます。

ローカルで同じ静的版を生成する場合：

```bash
npm ci
npm run build:pages
npm run test:pages
```

既定の Pages base path は `/loseyoung-digital-islands` です。

## 現在の状態

- Version: **0.1.0**
- 現在 3 つの島を公開し、More to Arrive の将来枠を残しています。
- 月夜の実写 Hero、動的な月光、透明 WebGL 水紋、スクロール連動の水紋強度、1 行型 Island Index を実装済みです。
- コンテンツは現在もソースコードで直接管理しており、CMS、ユーザーアカウント、写真アップロード、業務 DB はありません。
- `db/`、Drizzle、D1 / R2、`app/chatgpt-auth.ts` は将来拡張のための基盤です。
- 新しい島は `app/islands.ts` と `public/` を拡張するだけで追加できます。

## デザインノート

現在の方向性は「夜の海 × 星空」を軸にした個人展覧会カタログです。実写写真が Hero の感情を担い、本文は深い青黒へ戻し、動きは月光、海面、透明な水紋に絞っています。初期の 3 列カードと広いカラフル背景に比べ、現在は余白、連続した読書体験、長期的な拡張性を重視しています。

`docs/curated-homepage.md` には初期の設計とモーションの変遷を記録していますが、一部は後続の実装で更新されています。現在の `app/` と本 README を正としてください。