<p align="center">
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/main"><kbd>English</kbd></a> ·
  <a href="https://github.com/LoseYoung/loseyoung-digital-islands/tree/doc-zh"><kbd>简体中文</kbd></a> ·
  <strong><kbd>日本語</kbd></strong>
</p>

# LoseYoung · デジタル・アイランズ

> Somewhere Between Real and Imagined

Digital Islands は LoseYoung の個人ポータルであり、成長を続ける作品カタログです。写真、ゲーム、幻想世界、AI 旅行の島々が、それぞれの個性を保ったまま一つの入口に集まります。

このリポジトリはポータル、ビジュアル、任意で遊べるカバー実験を管理します。写真ライブラリ、ゲーム本編、旅行サービスは個別プロジェクト側の機能です。

[GitHub Pages](https://loseyoung.github.io/loseyoung-digital-islands/) · [Sites](https://loseyoung-digital-islands.lzy793222567.chatgpt.site)

## 現在の体験

実写の月夜の海、呼吸する光、スクロールに反応する月光と海面を維持しています。本文は深い青黒と透明な銀青の水紋です。島は一行ずつ、左にカバー全体、右に説明を配置し、狭い画面では縦に並びます。余白は Hero と共通です。

### 星を投げる

星をつかんで海へ投げると、手の動きによって一回から六回まで跳ねます。そっと置けば一回だけ着水します。ドラッグ中だけ最初の着水地点を表示し、接触光、少量の水滴、透明な波紋の順に応答します。一回遊んだ後は、最後の跳躍を月光の目印に合わせられます。クリックや Enter でも投げられ、Esc で中止できます。

### 遊べるカバー

| 島 | カバー実験 | 本編 |
| --- | --- | --- |
| Photos Island · A Softer Gaze | 光で現像し、一筆戻す。暗部を残して定着し、PNG を保存。 | [写真アーカイブ](https://photos-island.lzy793222567.chatgpt.site/) |
| Faerie Britain Echoes · Another Reality | 月、星、風のルーンを描き、順序によって森に異なる結果を残す。 | [Fantasy / RPG](https://faerie-britain-echoes.lzy793222567.chatgpt.site/) |
| Gridwake · Further Out | 六つの的、中心ヒット、成績、同じ問題の再挑戦と共有リンク。 | [Sci-Fi / FPS](https://digital-island-gridwake.lzy793222567.chatgpt.site/) |
| RoamIsle · A Journey, in Conversation | 自由な経路編集と、月が沈む前に到着する架空の旅。 | [AI 旅行 Agent](https://roamisle.lzy793222567.chatgpt.site/) |

暗室には既存の **Pramod Tiwari の一枚の写真を使った三種類のフレーミング練習**があります。新しい三枚の写真でも、個人アルバムへの接続でもありません。経路の刻み、渡船の期限、山林の条件は架空のゲーム規則であり、実際の地理・時刻表・AI 行程ではありません。

月→風→星で石門が光り、月→星→風で星座が枝の間を漂います。魔法陣を消してもルーンの記録は残ります。経路の自由モードには制限がなく、挑戦モードでは公開された規則から「月が沈む前の手紙」「夜番の灯」「途中の宿泊」という三つの結末が生まれます。

### 一時停止と継続

カバーを閉じる、別の実験へ移る、画面外へスクロールする、タブを隠す操作は、描画と時計を止めますが現在のページ内の状態は残します。再開始ボタンまたはページの破棄でのみリセットします。拡大表示は native dialog を使い、エンジンを複製しません。Esc で埋め込みサイズへ戻ります。Motion off は作品を消しません。

中断や表示領域の変更があった照準ラウンドは中断練習として区別します。同じ的の列、領域と的のサイズ、入力方式、かつ連続したラウンドだけを比較します。キーボード補助や混在入力はポインター精度と比較しません。`?aim=v1-<uint32>` は的の列だけを共有し、成績や信頼できるランキングを提供するものではありません。

状態はページのメモリー内にあり、再読み込み後には残らず、端末間や Pages / Sites 間でも同期しません。PNG はブラウザー内で生成し、筆跡をアップロードしません。

## 性能とアクセシビリティ

主要コンテンツとリンクはサーバー出力で、JavaScript なしでも閲覧できます。各エンジンは必要時だけ別々に読み込み、同時に一つのカバー実験だけを実行します。停止中に状態を維持するための描画ループはありません。

本文の水紋は固定 60Hz の時間ステップを使い、一回の補間処理は最大三ステップ、シミュレーション長辺は最大 460、表示長辺は最大 1920 に制限しています。高リフレッシュレートでも波の速度は変わりません。星は局所的な Canvas 2D 表現で、追加の全画面 WebGL はありません。

既定では `prefers-reduced-motion` を尊重し、タッチ、ポインター、キーボードに代替操作があります。JavaScript 無効時は実験ボタンを隠し、本編へのリンクを残します。拡大時は native dialog のフォーカス管理と明示的な閉じる操作を使います。音声、アカウント、iframe、新しいゲームエンジン依存は追加していません。

## 技術スタック

React 19.2.6、TypeScript 5.9.3、Next.js 16.2.6 App Router、Sites 向け vinext 0.0.50、Vite 8.0.13、Tailwind CSS 4.2.1 / PostCSS と独自 CSS を使用します。インタラクションは Canvas 2D、SVG、WebGL2、Pointer Events、requestAnimationFrame です。

Drizzle、D1 / R2、ChatGPT 認証ヘルパーは任意の拡張基盤であり、現在のポータルの有効な業務機能ではありません。

## 開発と検証

Node.js **>=22.13.0**、npm、Git が必要です。必須の業務環境変数、データベース、オブジェクトストレージ、ログイン設定はありません。

```bash
git clone https://github.com/LoseYoung/loseyoung-digital-islands.git
cd loseyoung-digital-islands
npm ci
npm run dev
```

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | vinext 開発サーバー |
| `npm run build` | Sites production build |
| `npm start` | ビルド後のプレビュー |
| `npm run build:pages` | `out/` へ Pages 静的エクスポート |
| `npm run test:pages` | エクスポートとサブパス資産検証 |
| `npm run test:play` | ルールと固定ステップの単体検証 |
| `npm test` | Sites build、HTML とゲーム規則検証 |
| `npm run lint` | ESLint |
| `npm run db:generate` | DB schema 導入後の Drizzle migration |

GitHub Actions のクラウド runner でビルドと実際の production 出力のブラウザー検証を行います。ブラウザー依存は CI 専用であり、訪問者に配信しません。状態保持、部分現像、魔法の組合せ、旅の結末、ラウンド比較、キーボード、モバイル拡大、JavaScript 無効時の動作を確認します。CI ソフトウェア描画の数値は、実機 FPS の保証ではありません。

## 編集箇所

`app/page.tsx` がページ構造、`app/islands.ts` が島のデータと自動番号、`public/` がカバー資産です。新しい島は `id / title / description / name / category / url / cover / coverAlt` を追加するだけで並び、必ずしもミニゲームを必要としません。

`app/playable-cover.tsx` は状態保持と拡大、`app/play/*-engine.ts` は各エンジン、`app/play/continuity-model.ts` は時間と魔法・旅の規則です。本文の水紋は `app/fluid-cursor.tsx`、Hero は `app/catalogue-motion.tsx`、追加の局所スタイルは `app/continuity.css` にあります。

[継続体験の規則と境界](https://github.com/LoseYoung/loseyoung-digital-islands/blob/main/docs/interactive-continuity.md) · [初期実験の説明](https://github.com/LoseYoung/loseyoung-digital-islands/blob/main/docs/playgrounds.md) · [照準統計の定義](https://github.com/LoseYoung/loseyoung-digital-islands/blob/main/docs/aim-trainer.md)

過去の設計文書は履歴です。変更された動作については現在のソースと継続体験の説明を優先してください。

## 公開とバージョン識別

`main` への push は `.github/workflows/pages.yml` を起動し、Sites build 検証、Pages 静的 export、資産検証、Pages deploy を行います。既定のサブパスは `/loseyoung-digital-islands` です。

`.openai/hosting.json` は Sites プロジェクトに関連づけられていますが、**GitHub commit は Sites deploy ではありません**。Sites は別途 build と公開が必要です。

ビルド時の `public/build-info.json` は実際のソース SHA、対象、時刻を記録し、ページ末尾に識別子を表示します。Git 情報がなければ不明と表示し、`BUILD_SOURCE_SHA` で与えることもできます。二つの公開先が同じソースかどうかは識別子で確認します。

Version **0.1.0**、公開中の島は四つです。CMS、世界ランキング、端末間セーブ、ポータル写真アップロード、業務 DB は提供していません。
