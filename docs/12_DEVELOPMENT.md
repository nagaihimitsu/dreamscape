# 12 開発の手引き

Dreamscapeを開発・制作する人の入口です。起動とコマンド、生成と編集の流れ、公開のしかた、今の実装の範囲をまとめ、詳しい資料へ案内します。遊び方は[遊び方](11_HOW_TO_PLAY.md)、仕様の優先順位は [AGENTS.md](../AGENTS.md) を見てください。

## 資料の案内

すべての資料と、それぞれの役目は [README の「資料」](../README.md#資料) にあります。開発でよく開くのは次の資料です。

- [02 技術設計](02_TECH_ARCHITECTURE.md)：フォルダ構成、旅行編フォルダと統合、生成時の検査、生成物、IDの付け方、場面の時点と順番、画面の決まり。
- [07 データ契約・検証・テスト](07_DATA_AND_TESTS.md)：保存の仕組み、セーブの版、受け入れテスト。
- [10 開発時の確認](10_DEVELOPMENT_CHECKS.md)：変更ごとの確認、テストの組、E2E、探索テスト、Debug起動URL、CI。
- [コンテンツ制作ガイド](../authoring/CONTENT_GUIDE.md)と[新しい都市を1つ足す手引き](../authoring/NEW_CITY_GUIDE.md)：会話・クイズ・データの書き方と、都市を足す順番。

## 準備と起動

- Node.js 22.12以上を勧めます（開発・検証の環境は Node.js 24.19.0 / npm 11.9.0）。Viteの要件は `^20.19.0 || >=22.12.0` です。
- `npm ci` で依存関係を入れ、`npm run dev` で開発サーバーを起動します。表示されたURL（ふつうは `http://localhost:5173`）で遊べます。
- Viteは `0.0.0.0` で待ち受けます。同じネットワークのスマートフォンからは、開発機のIPアドレスと表示されたポートで開きます。外部のクラウド開発環境では、環境のポート公開のURLを使います。
- `npm run dev:sample` は、見本の編を含めて生成し、開発サーバーを起動します（[見本の編](02_TECH_ARCHITECTURE.md#見本の編)）。
- `npm run build` で本番の出力を `dist/` に作り、`npm run preview` で確かめます。`dist/` は静的なホスティングで配信できます。相対パスで組んでいるので、サブディレクトリにも置けます。HTMLファイルを直接開かず、HTTPで開いてください。
- バックエンド・アカウント・クラウドの保存はありません。
- Playwrightを初めて使うときは `npx playwright install chromium` を実行します。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | コンテンツを生成してから開発サーバーを起動 |
| `npm run dev:sample` | 見本の編（`authoring/templates/sample_trip/`）を含めて生成し、開発サーバーを起動。タイトル画面に「見本の旅」が並ぶ（`npm run dev` に戻すと消える。[見本の編](02_TECH_ARCHITECTURE.md#見本の編)） |
| `npm run content:build`（`content:check`） | 共通データと全旅行編を検証・統合し、`src/content/generated/` に書き出す。成功すると旅行編ごとに提供内容の件数を1行ずつ表示し、警告は件数だけ出す（`-- --verbose` で一覧。[生成時の検査と報告](02_TECH_ARCHITECTURE.md#生成時の検査と報告)）。会話の全分岐検査は前回の成功結果を再利用する（`-- --no-cache` で再利用せずに全部検査。[キャッシュ](10_DEVELOPMENT_CHECKS.md#会話の全分岐検査のキャッシュ)）。`-- --with-sample` で見本の編も加える（単体テストの前の生成はこの形） |
| `npm run content:watch` | 生成を1回行い、その後は `content/`・`public/` のファイル（Ink・JSON・画像）を保存するたびに生成し直す（`-- --with-sample` で見本の編も含めて監視）。失敗しても監視を続け、生成物は前回のまま。Ctrl+C で終了 |
| `npm run dev:watch` | `content:watch` と開発サーバーを一緒に起動し、保存した Ink・JSON・画像を開いている画面へ反映する。開発サーバーは最初に生成に成功してから起動する（`npm run dev` と同じ）。Ctrl+C で両方を終了（`-- --with-sample` で見本の編も） |
| `npm run typecheck` | 型検査（`tsc --noEmit`）。生成物を読むので、空のチェックアウトでは先に `npm run content:check` |
| `npm run test:quick` | コンテンツを生成してから速い組の単体テスト（日常の確認。全件は `npm test`・`verify`。[テストの組](10_DEVELOPMENT_CHECKS.md#単体テストの組と所要時間)） |
| `npm test` | コンテンツを生成してから全単体テスト |
| `npm run test:saves` | コンテンツを生成してから保存関連の単体テスト（`src/persistence/`）だけ。過去のセーブが更新後に再開できることを保証するものではない |
| `npm run build` | 生成・型検査・本番ビルド（`dist/`）と、`dist/` にテスト用のコードやデータがないか、タイトル画面で読み込むファイルにDebugが入っていないか、ライブラリのライセンス一覧（`third-party-licenses.json`）があるかの検査 |
| `npm run verify` | 見本の編を含めた生成・全単体テストの後、見本なしで生成し直して型検査・本番ビルド・`dist/` の検査を行う（公開前・大きな変更）。最初の生成は会話の全分岐検査のキャッシュを使わない |
| `npm run dist:check` | ビルド済みの `dist/` にテスト用の読み取り口・仮データ・見本の旅行編がないか、Debug・プレビューがタイトル画面で読み込まない別のファイルだけにあるか、`package.json` の `dependencies` がすべてライブラリのライセンス一覧に載っているかを検査（`build`・`verify` が自動で実行） |
| `npm run test:e2e` | E2E（Playwright）の開発サーバーの2つの段（合否判定 `gate` とDebug起動台 `debug`）。1つの段だけは `npx playwright test --project=gate`（[E2Eの段](10_DEVELOPMENT_CHECKS.md#e2eの段)） |
| `npm run test:e2e:prod` | 本番ビルド（`npm run build` の後の `vite preview`）でのE2E。起動・全旅行編の開始画面・ミラノの最初の流れ・Debugモードがオフの間は `?debug` を無視しDebugのファイルを読み込まないこと、ゲームの設定のパスワードでDebugモードをオンにしてDebugを開けること、タイトル画面までの読み込み量の報告 |
| `npm run test:e2e:sample` | 見本の編を含めて生成した専用の開発サーバー（4175番）でのE2E。見本の編を新しい旅から旅の終わりまで遊ぶ。終わると見本なしで生成し直す。ほかの段と同時に実行しない |
| `npm run test:walk` | 見本の編を含めて生成してから、ゲーム関数の層のランダムウォーク（全旅行編を種付きで歩き、保存・AP・報酬・詰みを毎手確かめ、固定の歩みではどの開始地点からも1回以上その都市を出て、全都市をクリアしてエピローグを読むことを確かめる）を実行し、到達した内容の要約を表示する。種と手数は `DREAMSCAPE_WALK_SEEDS`・`DREAMSCAPE_WALK_STEPS`（[探索テスト](10_DEVELOPMENT_CHECKS.md#探索テスト)） |
| `npm run test:e2e:explore` | モンキー（`@explore`）。押せる部品を種付きの乱数で押し続け、エラー・保存・詰みを確かめる。種は `MONKEY_SEED`、開始地点ごとの秒数は `MONKEY_SECONDS`（合否判定にしない。CIでは手動の実行だけ） |
| `npm run test:e2e:webkit` | `@smoke` のテストを iPhone 13 の WebKit で実行（WebKit を入れた環境だけ。CIでは手動の実行だけ） |
| `npm run screens` | 主要な画面を320px・390pxで撮り `artifacts/screens/index.html` にまとめる（人の確認用。`-- --previous <前の一覧>` で変わった画面に印。[人が画面を確かめる](10_DEVELOPMENT_CHECKS.md#人が画面を確かめる)） |
| `npm run content:inspect -- <ファイル>` | 1ファイルの形式とInkコンパイルを確認（使い方は[制作ガイドの「確認と公開前レビュー」](../authoring/CONTENT_GUIDE.md#確認と公開前レビュー)） |
| `npm run journey:new -- <旅行編ID> --name <日本語名> --city <都市ID> --city-name <日本語名>` | 見本の編を複製して新しい旅行編（準備中）を `content/journeys/<旅行編ID>/` に作る。`--prefix <接頭辞>`（省略時は旅行編ID）、`--with-optional`（見本の README の「任意の部分」も複製：特殊戦B・C、道中交流と品物、ほかの時点の場面、貸し自転車、その国の言葉、旅の図鑑）。置き換えるものは作った旅行編の `CHECKLIST.md`。見本の出典・画像・文章が残っているうちは `journey:readiness` が示し、`journey:release` は止まる（[新しい編を追加する手順](02_TECH_ARCHITECTURE.md#新しい編を追加する手順)） |
| `npm run journey:scaffold`・`journey:readiness`・`journey:release` | 旅行編へシナリオとクイズを取り込む制作ツール（[手順](../authoring/JOURNEY_AUTHORING.md)） |
| `npm run journey:scenario -- --journey <旅行編ID> --directory <下書きのフォルダ> [--city <都市ID>]` | 下書きの場所のファイル（`authoring/journeys/<旅行編ID>/drafts/scenario` など）を、`content:build` と同じく全部の道を歩いて確かめる（[手順](../authoring/JOURNEY_AUTHORING.md#クイズより先に脚本を制作する場合)） |
| `npm run journey:readthrough -- --journey <旅行編ID>` | 観光地ごとの場面の並びと、各場面の行を道ごとに書き出す（点検の読み物。何も検査しない。先に `npm run content:build`） |
| `npm run story:move-memos -- --journey <旅行編ID> --from <ストーリーID> --to <ストーリーID> [--write]` | 場面を場所のファイルへ移したときに、表情と無言の反応のメモ（`presentation/dialogue-expressions.json`・`dialogue-reactions.json`）のストーリーIDを書き換える（`--write` なしでは件数だけ） |
| `npm run india:draft`・`india:check`・`india:scaffold`・`india:readiness`・`india:release` | インド編だけの制作ツールと、共通の `journey:*` をインド編で動かす短い名前（[旅行編の制作手順](../authoring/JOURNEY_AUTHORING.md)） |
| `npm run journey:transit -- --journey <旅行編ID>` | 都市ごと・乗り物ごとの交通判断（使う・使わない・走っていない・特定できず）の件数と、徒歩の経路がない向き・出典のない経路（どちらも注意）を表示（`--json` も可。「特定できず」が残ると終了コード1。[乗り物と交通判断台帳](02_TECH_ARCHITECTURE.md#乗り物と交通判断台帳)） |
| `npm run balance:report -- [--journey <旅行編ID>] [--out <ファイル>]` | 旅行編のお金・AP・関係値の出入りと合計を、都市ごとに Markdown の表にする（開発用。先に `npm run content:build`。[お金・AP・関係値のまとめ](10_DEVELOPMENT_CHECKS.md#お金ap関係値のまとめ)） |
| `npm run voice:script -- --journey <旅行編ID> [--out <フォルダ>]` | ヒロインの台詞を、声を作る人に渡す台本（`heroine_lines.txt`）とそのデータ（`entries.json`）にして `artifacts/voice/<旅行編ID>/` に書く（1行＝1ファイル。ID は前に渡した台本・`# voice:` のまま変わらない。[台詞の声の台本](../authoring/CONTENT_GUIDE.md#台詞の声の台本と台詞が変わったときの確認2026-11-13)） |
| `npm run voice:tag -- --journey <旅行編ID> --from <フォルダ>` | 届いた声（`<ID>.mp3`・`<ID>.wav`）の行の前に `# voice: <ID>` を書き、その声が言っている文を `authoring/journeys/<旅行編ID>/voice/recorded.json` に記録する（文が台本と違う声・MP3 がまだ `public/assets/voice/` にない声は付けずに理由を出す） |
| `npm run voice:changes -- --journey <旅行編ID>` | 録音した行を `recorded.json` の文と、まだ録音していない行を渡した最新の台本（`authoring/journeys/<旅行編ID>/voice/<日付>/`）と比べ、録り直しが要る行（先に出す）・変わった・なくなった・台本にない台詞を出す（録音した行が変わると `content:build` も注意を出す） |
| `npm run city:bundle` | 都市単位の作業用JSONで地点・交通・背景などを編集（[手順](../authoring/CITY_BUNDLES.md)） |
| `npm run schemas:build` | エディタの入力補助（JSON Schema）を作り直す。`authoring/schemas/` に、旅行編の `manifest.json`・都市・経路・旅行設定・交通判断台帳・クイズ・各カタログのスキーマを書き、`.vscode/settings.json` でそれぞれのファイルに結び付ける（VS Code で項目の候補・型・書き間違いが出る）。データの書式を変えたときに実行し、作ったファイルもコミットする。入力の補助だけで、検査は `content:build` |
| `npm run icons:build` | `authoring/brand/favicon-master.png` から `public/` のファビコン（16・32・48px、顔の切り抜き）、Apple touch icon（180px）、アプリアイコン（192・512px）を作り直す。元画像を差し替えたときだけ実行し、生成した画像もコミットする |
| `npm run images:optimize` | 観光写真を配信用の WebP（品質80）にし、立ち絵の配信用の軽い版（非可逆の WebP 品質85、透明度は可逆）を `authoring/` の元の絵（可逆のPNG）から作る。そのままでは確認だけで、`--write` を付けると書き換える（`--journey <旅行編ID>` で1つの旅行編だけ。例 `npm run images:optimize -- --journey <旅行編ID> --write`）。観察で拡大する写真（観光地の画像と観察資料の画像）は同じ大きさ、ほかは幅1600px・高さ1800pxの枠に収め、写真の色の情報（ICCプロファイル）は残す。カタログの `path`・`width`・`height`・`modificationJa` と観察資料の `path`・`sha256` も書き換え、元のファイルを消す（出典と確認日は変えない）。仮の画像（`isPlaceholder`）と見本の画像は変えない。立ち絵は元の絵から作り直し、変わったものだけ書き換える（元の絵のない可逆の立ち絵は、先にそれを元の絵として残す）。変換できる写真や可逆のまま配信している立ち絵があると `content:build` が警告する |

どの確認をいつ行うかは[開発時の確認](10_DEVELOPMENT_CHECKS.md)にあります。

## 生成と編集の流れ

- ゲームは `content/` を直接読まず、`npm run content:build` が書き出す生成物（`src/content/generated/`）だけを読みます。生成物は手で編集しません（[生成物](02_TECH_ARCHITECTURE.md#生成物手動で編集しない)）。Ink・JSON・画像を編集した後は `npm run content:build` を実行します。`dev`・`test`・`test:quick`・`build`・`verify` は自動で実行します。
- `vite` を直接起動するときも、先に `npm run content:build` を実行します。生成していないと、警告なしに画像のない状態で起動します。空のチェックアウトで `npm run typecheck` だけを実行するときも、先に `npm run content:check` で生成します。
- Inkは公式のinkjsのコンパイラ（`inkjs/compiler/Compiler`）でコンパイルし、`src/content/generated/stories.json` に書きます。独自のInkパーサー・外部コマンド・.NETの準備は要りません。ブラウザでは `inkjs` のランタイムで動かします。
- 開発サーバーを起動したままInkを書き直したら、別のターミナルで `npm run content:build` を実行します。生成したJSONの変化をViteが反映します。
- 保存のたびに自動で生成し直すには、開発サーバーの代わりに `npm run dev:watch` を使います（開発サーバーをもう起動しているときは、別のターミナルで `npm run content:watch`）。Ink・JSON・画像のどれを保存しても、約5秒（会話の全分岐検査のキャッシュがないときは約20秒）で生成し直します。失敗したときは理由を表示し、生成物を前回のままにして、直して保存するのを待ちます。`dev:watch` の最初の生成が失敗したときは、直して生成に成功してから開発サーバーを起動します。
- 監視している間は `npm test`・`npm run test:quick` を実行しないでください。テストの前の生成は見本の編を含め、次の自動の生成が見本なしに戻すためです。生成物は開発サーバーとテストで共通の1つです。
- 監視は Linux・Node 22 で確かめています。Linux ではフォルダごとに監視するので、一時ファイルに書いて置き換える保存（`city:bundle`・`journey:release` の書き込み、`sed -i`、安全な保存をするエディタ）の後の保存も、新しく作ったフォルダの中の保存も拾います。macOS・Windows では Node の再帰的なファイル監視を使います（まだ確かめていません）。

## Debugモード

制作・確認用のDebug（「場面の確認」と起動URL）と、公開版でDebugモードをオンにする方法は、[開発時の確認の「Debug起動URL」](10_DEVELOPMENT_CHECKS.md#debug起動url)と[技術設計の「UX/スマホ」のDebugモードの項](02_TECH_ARCHITECTURE.md#uxスマホ)にあります。Debugで遊んだ場面は、通常のセーブの保存・再開の確認の代わりにしません。

## 公開（GitHub Pages）

- 公開先：https://nagaihimitsu.github.io/dreamscape/
- `.github/workflows/pages.yml` が、`main` へのpushで本番ビルド（コンテンツの検証・型検査・`dist/` の検査を含む）を行い、成功した `dist/` をGitHub Pagesへ公開します。PRでは `ci.yml` の本番ビルドだけが動きます。単体テスト・E2E・探索は手動（Actionsから実行）だけです（[CI](10_DEVELOPMENT_CHECKS.md#cigithub-actions)）。
- 初めてのときだけ、リポジトリの **Settings → Pages → Build and deployment → Source: GitHub Actions** を選びます。設定の後は、Actionsの「Deploy to GitHub Pages」から手で実行することもできます。公開の設定とデプロイには、GitHub側の権限が要ります。
- 旅行編の「公開中」（`manifest.json` の `status: "available"`）は、このソースでのビルドの登録状態です。サイトに出すには、別にGitHub Pagesへのデプロイが要ります。

## 今の実装の範囲

- 遊べる旅行編：ミラノ編（1都市）と、インド・ゴールデントライアングル編（デリー・アーグラ・ジャイプールの3都市）。どちらにも観光・クイズ・都市フィナーレ・エピローグ・道中交流・デート・告白（受け入れ・保留・断り）・彼女の返事があります。
  - ミラノ編：推理クイズB・C、写真の観察。
  - インド編：都市ごとの告白、アーグラの日帰りツアー、ミニゲーム、旅の図鑑、アルバムの絵、ヒロインの台詞の声、旅行編のBGM、オープニングムービー。推理クイズB・Cはありません。観光地の観察は、2026-11-11のユーザー判断でなくしました。
  - 共通の仕組み：効果音・BGM・環境音（[技術設計の「UX/スマホ」](02_TECH_ARCHITECTURE.md#uxスマホ)）、Debugモード（上の「Debugモード」）。
- 準備中の旅行編：ウズベキスタン編（4都市）とルアンパパーン編（市街地）。どちらもシナリオとクイズは未制作で、本番では旅の準備（名前の保存）までです。登録してある内容は[旅行編の制作手順](../authoring/JOURNEY_AUTHORING.md#ウズベキスタン編の例)にあります。
- 対象外：世界地図、3D、アカウント、オンラインの保存、恋人になった後の長い章。
- 絵：観光の画面と手がかり帳は、利用条件を確かめた実物の写真です。画像を登録していない会話の背景と、専用の絵を登録していないクイズの相手は、簡単なSVGの絵か抽象的な表示です。文字は Noto Sans JP / Noto Serif JP（Google Fonts、SIL OFL）を読み込めたときに使い、読み込めなくてもシステムの文字で動きます。
