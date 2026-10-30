# Dreamscape

恋愛 × 世界観光 × 英語学習の、モバイル優先ブラウザゲーム。現在は **Phase 2まで**を実装しています。クイズなしで、名前設定から通常デート3本、ヒロインの誘い、告白、交際エンディングまで遊べます。仕様の優先順位は [AGENTS.md](AGENTS.md)、全体設計は [docs/](docs/) を参照してください。

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

## Phase 2の試遊手順

1. 主人公名・ヒロイン名を設定して「旅をはじめる」。既定は「なお」「りえ」、最大24文字（UTF-16単位）。既存のPhase 1セーブがあれば、その場面から続けられます。
2. 開発用「ミラノ章初回クリア」で **4AP** を受け取り、「運河沿いのカフェ」に **2AP** で誘います。
3. 日本語の3択を2回選び、デート終了後「自由時間に戻る」。**旅をもう一歩／Phase 2 試遊用** の「翌日の自由時間」で一度だけ **4AP** を受け取れます。
4. 「夕暮れの散歩」（3AP）を完了。ヒロインから届いた「彼女の寄り道」の誘いに応えます。この特別イベントは **無料・一度限り** です。
5. 試遊用「夜の自由時間」で一度だけ **4AP** を受け取り、「灯りを数える夜」（3AP）を楽しみます。
6. 「旅の続きに、きみと」で気持ちを伝えます。告白に **APは不要**。過去のカフェの言葉を振り返り、交際開始か保留に分かれます。
7. 保留になったら、無料の「書きかけのポストカード」で話してから、もう一度告白できます。通常デートで低めの好感度の選択を重ねても、誠実に気持ちを伝えれば交際エンディングへ到達できます。

通常デートは3択2回、特別イベント・保留後の会話・告白は3択1回です。好感度の数値、段階名、解放閾値は表示せず、呼び方や会話で変化を伝えます。これらのシナリオはシステム検証用の短編で、本番脚本としての推敲は別途行う前提です。

一文ずつの文字送りは3速度・全文表示に対応し、選択は確認画面で言い直せます。「中断する」やリロード後も、表示中の一文・選択肢・選んだ後の反応から再開できます。「セーブ」「ロード」は自動保存と同じ保存枠なので、過去へ巻き戻す機能ではありません。名前は会話の外で「設定」から変更できます。

再鑑賞は元のAP費用を使い、好感度・思い出を再獲得しません。これから必要なデートのAPまで使い切る再鑑賞は無効になります。試遊用APは総量12（初回章4＋仮進行4＋4）、所持上限12で、報酬IDごとに一度だけです。上限を超える試遊報酬は空きができるまで受け取れません。特別イベントと保留後の会話は一度だけ、保留中の告白は無料で再挑戦できます。

開発者向けの最低経路確認: カフェ選択1→1、散歩1→2、誘い1、夜景1→2、告白1で保留、ポストカードは任意、再告白1で成功。ブラウザテストもこの経路を検証しています。交際エンディングの到達状態は保存され、再読み込み後も表示されます。恋人後の長編はありません。

## 文章・データの編集

会話の編集元は `content/stories/milano/` の各 `.ink` ファイルです。既存 [`cafe_01.ink`](content/stories/milano/cafe_01.ink) はPhase 1から変更していません。台詞と選択肢をReactに埋め込まず、Inkに置いています。

```ink
# speaker: heroine
「……{player_name}さん。明日の予定、一つだけ書いてもいい？」
```

名前は `player_name` / `heroine_name` をゲーム状態から渡します。新しいシナリオでは `player_address`（段階に応じた敬称つき呼称）、`romance_stage`、`memory_callback`（過去の思い出）、`confession_ready` も利用できます。AP・段階・告白条件の計算はTypeScript側で行い、Inkには結果だけを渡します。`* [選択肢]`、`->` の合流で短い分岐を編集します。タグは `speaker`（narrator/heroine/player）、`background`、`emotion`、`effect` に限定。背景・表情はpresentationに登録、effectはeffect_catalogのIDに限定し、文字列をコードとして実行しません。本文タグとInk公式choice tagsの両方を検証・処理します。

| 編集ファイル                             | 内容                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `content/stories/**/*.ink`               | 会話、選択肢、リアクション、タグ                                     |
| `content/romance/date_catalog.json`      | 種別、表示文、AP費用、必要章・履歴、シナリオ参照、選択回数・検証条件 |
| `content/romance/effect_catalog.json`    | 好感度差分、思い出ID、告白結果（accepted/deferred）                  |
| `content/romance/progression.json`       | 4段階の閾値・必要履歴・敬称、告白成立条件、思い出の引用              |
| `content/romance/trial_progression.json` | 試遊専用の有限AP報酬と前提イベント。将来の章報酬とは分離             |
| `content/romance/presentation.json`      | 背景・表情・思い出・保留案内・エンディングの文章                     |
| `content/romance/balance.json`           | AP上限・既定名・名前長                                               |
| `content/cities/milano.json`             | 章クリアの初回報酬                                                   |

新しい通常デートは、InkとJSON定義・効果を追加するだけで既存のメニューと会話画面に表示されます。`kind` は `normal` / `special` / `confession` / `reassurance`。通常は `choiceCount: 2`、無料イベントは必要に応じて0〜2回の3択を設定できます。`effectCount` は各経路で期待する効果数です。`actionLabelJa` もJSONにあり、Reactにイベント固有の文言を追加する必要はありません。

`validationContexts` に関係段階、告白可能/保留、引用するmemoryIdを指定し、その文脈から全分岐を検証します。告白は成立条件の真偽を両方指定する必要があります。通常デートは各文脈9経路、選択機会1回のイベントは各文脈3経路です。現在は6シナリオを合計105経路・文脈で検証しています。

```sh
npm run content:check
```

`inkjs/compiler/Compiler`（公式inkjsのコンパイラ）でコンパイルし、`src/content/generated/stories.json` を生成します。独自Inkパーサー・外部コマンド・.NETの準備は不要です。生成JSONはGit管理せず、手動編集しません。ブラウザには `inkjs` のランタイムを使用します。

`dev` 起動前、`test` 前、`build` 内で必ずコンパイル・検証します。開発サーバー起動中にInkを改稿したら別ターミナルで `npm run content:build` を実行してください。生成JSON変更をViteが反映します。**Ink原稿そのものの自動監視はありません。**

検証はJSONスキーマ、重複ID、章・背景・シナリオ・思い出参照、許可タグ、前提イベントの循環、段階設定、報酬ID重複、シナリオごとの選択数・効果数・告白結果を確認します。壊れたInk・参照切れ・未定義effect・不正JSONはビルド失敗になります。将来用クイズサンプルはデータ検証だけを行い、ゲームには読み込みません。

## 実装とセーブ

- `src/app/` / `src/components/`: 表示・操作・保存後の状態反映。APや好感度の計算はありません。
- `src/domain/`: 純粋関数で章報酬、デート可否、AP、効果、履歴を処理。
- `src/story/`: 公式 `Continue` / `currentChoices` / `ChooseChoiceIndex` とstate JSONを包むアダプタ。
- `src/persistence/`: localStorageアダプタ・保存データ検証・バックアップ。
- `src/content/` / `scripts/`: データ契約・許可タグ・ビルド時検証。

保存キーは旧版と同じ `dreamscape.save.v1`、データ内の `schemaVersion` は **2**。名前・AP・非表示好感度・思い出・履歴と、進行中のInk state/表示フレーム/選択回数/適用済み効果をまとめて保存します。リビジョン付き操作で古い選択を無視し、章報酬IDとデート実行位置で二重適用を防ぎます。保存が成功してから画面を進め、保存失敗時はその場に留まって再試行できます。

Phase 1（schemaVersion 1）は検証後にメモリ上で2へ移行し、次の進行操作で保存します。AP、名前、好感度、思い出、報酬・デート履歴、進行中のInk JSON・表示フレーム・選択位置を保持します。既存のカフェを変更していないため、選択前・選択後・再鑑賞中も同じ箇所から再開できます。段階は既存の好感度と完了履歴から再評価します。実際のPhase 1実装で作成した `tests/fixtures/phase1-saves.json` を単体・ブラウザ両方で検証しています。

Phase 2では解放済みイベントID、告白の保留/成功、交際エンディングの到達を保持します。成立の思い出とエンディングは告白を読み終えた時点で一緒に確定するため、成功反応の途中で更新しても欠落・二重付与しません。古いタブからの上書きも検出してロードを案内します。

破損・未知バージョン・不整合な保存は自動上書きしません。案内画面から明示的に新しく始める場合に限り、元データを `dreamscape.save.v1.backup.<時刻>` に退避します。他アプリの保存データは削除しません。シナリオ更新で進行中のInkとの互換性が失われた場合も元データを保護します。Phase 1→2の既存カフェには対応していますが、任意に改稿したInkの実行位置を移す機能はありません。改稿確認には別ブラウザプロファイルを使うと既存の旅を残せます。保存は端末・ブラウザ・URLのオリジンごとです。

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

単体テストは通常デート各9通りの保存・復元、段階と履歴の判定、告白の成功/保留/再挑戦、特別イベントの一度限り実行、AP上限/不足/未解放/連打、再鑑賞による資金不足の防止、旧セーブ移行、破損/未知schema/保存失敗、コンテンツ検証エラーを対象とします。PlaywrightはモバイルChromiumで既存カフェ、低好感度からの保留・回復・交際開始、高好感度での成功、過去の思い出・名前変更の反映、旧セーブの途中再開を実際に操作します。実機Safariでの検証は別途必要です。

背景は本実装用の簡易SVGイラストです。実在の観光スポットの資料画像ではありません。フォントはNoto Sans JP / Noto Serif JP（Google Fonts、SIL OFL）を任意取得し、取得できなくてもシステムフォントで動作します。

## 採用バージョンと公式資料

`package-lock.json` に依存関係を固定しています。動作確認済み: Vite 8.3.5（Node要件 `^20.19.0 || >=22.12.0`）、React 19.3.1、TypeScript 7.0.2、inkjs 2.4.0、Zod 4.6.7、Vitest 5.0.5、Playwright 1.64.1。inkjs・Vite・React・Zod・VitestはMIT、TypeScript・PlaywrightはApache-2.0です。

- [Vite公式セットアップ・Node要件](https://vite.dev/guide/)
- [inkjs公式README・コンパイラ・互換性](https://github.com/y-lohse/inkjs)
- [Inkの文章・選択肢記法](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md)
- [Inkのタグ・状態保存](https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md)

## 今回の範囲

Phase 2の恋愛進行・通常デート追加・ヒロインの誘い・保留後の会話・告白・交際エンディングまでです。試遊専用AP処理は `trial_progression.json` と `claimTrialMilestone` に分離しました。今後の章実装は、既存の一度限り報酬関数に結果を渡せます。Phase 3の英語クイズバトル、観光・観察、他都市、恋人後の長編には着手していません。
