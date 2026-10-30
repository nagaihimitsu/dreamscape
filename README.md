# Dreamscape

恋愛 × 世界観光 × 英語学習の、モバイル優先ブラウザゲーム。現在は **Phase 0・Phase 1 のカフェデート1本**を実装しています。仕様の優先順位は [AGENTS.md](AGENTS.md)、全体設計は [docs/](docs/) を参照してください。

## 起動

Node.js 22.12以上を推奨（開発・検証環境: Node.js 24.19.0 / npm 11.9.0）。

```sh
npm ci
npm run dev
```

表示されたURL（通常 `http://localhost:5173`）で遊べます。Viteは `0.0.0.0` にバインドします。同じネットワークのスマートフォンからは開発機のIPと表示ポートにアクセスしてください。外部のクラウド開発環境では環境側のポート公開URLを使用します。

```sh
npm run build
npm run preview
```

本番出力は `dist/`。静的ホスティングで配信でき、サブディレクトリ配信にも対応する相対パス設定です。HTMLファイルを直接開かず、HTTP経由でアクセスしてください。バックエンド・アカウント・クラウド保存はありません。

## GitHub Pages

公開先: https://nagaihimitsu.github.io/dreamscape/

`.github/workflows/pages.yml` が `main` へのpushで、コンテンツ検証・単体テスト・型チェック・本番ビルドを実行し、成功した `dist/` をGitHub Pagesへ公開します。初回のみリポジトリの **Settings → Pages → Build and deployment → Source: GitHub Actions** を選択してください。設定後はActionsの「Deploy to GitHub Pages」から手動実行もできます。公開設定とデプロイの権限はGitHub側で必要です。

## 試遊手順

1. 主人公名・ヒロイン名を設定して「旅をはじめる」。既定は「なお」「りえ」、名前は最大24文字（HTMLのmaxlengthと同じUTF-16単位）です。
2. 開発用「ミラノ章初回クリア」を押すと **4AP**。章クリアの報酬は一度限りです。
3. 章末の自由時間で「カフェデートに誘う」→確認して **2AP** を使用。
4. 一文ずつ読み進め、日本語の3択を **2回** 選びます。選択後の確認画面で言い直せます。文字送りは3速度、全文表示と中断・再開にも対応します。
5. 「デートを終える」で思い出を確認。APは **2** のまま持ち越します。好感度・関係段階は画面には表示しません。
6. 途中でページ更新しても、表示中の一文・選択肢・選んだ後の反応から再開できます。「セーブ」「ロード」でも同じ保存枠を使えます。各操作で自動保存するため、ロードは過去に巻き戻す機能ではありません。
7. 体験済みデートを再鑑賞する場合も2APを使います。別の返答を選んでも好感度・思い出は再獲得しません。AP不足では開始できません。

名前はデートの外で「設定」から変更できます。再読み込み・連打・選択の再送でAPや効果は重複しません。テストには360px幅・最大長の名前・HTMLのような名前の安全なテキスト表示を含めています。

## 文章・データの編集

会話の編集元は [`content/stories/milano/cafe_01.ink`](content/stories/milano/cafe_01.ink)。台詞と選択肢をReactに埋め込まず、Inkに置いています。

```ink
# speaker: heroine
「……{player_name}さん。明日の予定、一つだけ書いてもいい？」
```

名前は `player_name` / `heroine_name` をゲーム状態から渡します。`* [選択肢]`、`->` の合流で短い分岐を編集します。タグは `speaker`（narrator/heroine/player）、`background`、`emotion`、`effect` に限定。背景・表情はpresentationに登録、effectはeffect_catalogのIDに限定し、文字列をコードとして実行しません。本文タグとInk公式choice tagsの両方を検証・処理します。

| 編集ファイル                          | 内容                                         |
| ------------------------------------- | -------------------------------------------- |
| `content/stories/**/*.ink`            | 会話、選択肢、リアクション、タグ             |
| `content/romance/date_catalog.json`   | タイトル・説明・AP費用・必要章・シナリオ参照 |
| `content/romance/effect_catalog.json` | 選択による好感度差分と思い出ID               |
| `content/romance/presentation.json`   | 背景キャプション・表情名・思い出の文章       |
| `content/romance/balance.json`        | AP上限12・既定名・名前長                     |
| `content/cities/milano.json`          | 初回章クリアの報酬4AP                        |

```sh
npm run content:check
```

`inkjs/compiler/Compiler`（公式inkjsのコンパイラ）でコンパイルし、`src/content/generated/stories.json` を生成します。独自Inkパーサー・外部コマンド・.NETの準備は不要です。生成JSONはGit管理せず、手動編集しません。ブラウザには `inkjs` のランタイムを使用します。

`dev` 起動前、`test` 前、`build` 内で必ずコンパイル・検証します。開発サーバー起動中にInkを改稿したら別ターミナルで `npm run content:build` を実行してください。生成JSON変更をViteが反映します。**Ink原稿そのものの自動監視はありません。**

検証はJSONスキーマ、重複ID、章・背景・シナリオ・思い出参照、許可タグ、全9経路で「3択×2回・効果2件」を確認します。壊れたInk・参照切れ・未定義effect・不正JSONはビルド失敗になります。将来用クイズサンプルはデータ検証だけを行い、ゲームには読み込みません。

## 実装とセーブ

- `src/app/` / `src/components/`: 表示・操作・保存後の状態反映。APや好感度の計算はありません。
- `src/domain/`: 純粋関数で章報酬、デート可否、AP、効果、履歴を処理。
- `src/story/`: 公式 `Continue` / `currentChoices` / `ChooseChoiceIndex` とstate JSONを包むアダプタ。
- `src/persistence/`: localStorageアダプタ・保存データ検証・バックアップ。
- `src/content/` / `scripts/`: データ契約・許可タグ・ビルド時検証。

保存キーは `dreamscape.save.v1`、データ内の `schemaVersion` は1。名前・AP・非表示好感度・思い出・履歴と、進行中のInk state/表示フレーム/選択回数/適用済み効果をまとめて保存します。リビジョン付き操作で古い選択を無視し、章報酬IDとデート実行位置で二重適用を防ぎます。保存が成功してから画面を進め、保存失敗時はその場に留まって再試行できます。

破損・未知バージョン・不整合な保存は自動上書きしません。案内画面から明示的に新しく始める場合に限り、元データを `dreamscape.save.v1.backup.<時刻>` に退避します。他アプリの保存データは削除しません。シナリオ更新で進行中のInkとの互換性が失われた場合も元データを保護します。現段階では旧シナリオへの移行機能はなく、改稿確認には別ブラウザプロファイルを使うと既存の旅を残せます。保存は端末・ブラウザ・URLのオリジンごとです。

## 検証

```sh
npm run content:check
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

空のcheckoutでは `npm ci` のあと、生成物を必要とする単独 `typecheck` より先に `content:check` を実行してください。`npm run build` はこの順序を含みます。

単体テストは全9通りの各場面の保存・復元、AP上限/不足/未解放/連打、効果の冪等性、再鑑賞、破損/未知schema/保存失敗、コンテンツ検証エラーを対象とします。PlaywrightはモバイルChromiumで実際に名前設定から最後まで操作し、リロード前後・連打・長い名前・破損セーブを確認します。実機Safariでの検証は別途必要です。

背景は本実装用の簡易SVGイラストです。実在の観光スポットの資料画像ではありません。フォントはNoto Sans JP / Noto Serif JP（Google Fonts、SIL OFL）を任意取得し、取得できなくてもシステムフォントで動作します。

## 採用バージョンと公式資料

`package-lock.json` に依存関係を固定しています。動作確認済み: Vite 8.3.5（Node要件 `^20.19.0 || >=22.12.0`）、React 19.3.1、TypeScript 7.0.2、inkjs 2.4.0、Zod 4.6.7、Vitest 5.0.5、Playwright 1.64.1。inkjs・Vite・React・Zod・VitestはMIT、TypeScript・PlaywrightはApache-2.0です。

- [Vite公式セットアップ・Node要件](https://vite.dev/guide/)
- [inkjs公式README・コンパイラ・互換性](https://github.com/y-lohse/inkjs)
- [Inkの文章・選択肢記法](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md)
- [Inkのタグ・状態保存](https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md)

## Phase 2への接続点（未実装）

`romanceStage` は1で保持し、デート定義には必要段階を持たせています。次フェーズで段階判定をdomainに加え、許可済みeffect・思い出IDから専用Inkを参照できます。**段階進行、特別デート、告白、クイズ、観光、他都市は実装していません。** 次の実装に入る前に、この一本の文章と操作性を人間が試遊・評価する方針です。
