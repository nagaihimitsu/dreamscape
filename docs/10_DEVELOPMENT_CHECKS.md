# 開発時の確認

変更の影響範囲に合わせて確認を選ぶ。ファイルの拡張子だけで判断せず、Ink・JSONが生成データや画面に渡る経路、共通コンポーネントや保存への影響も確認する。

| 変更 | 主な確認 |
| --- | --- |
| 文書（Markdown）の追加・移動・リンク | `npx vitest run scripts/docs-links.test.ts`（生成不要。Git管理下の全Markdownの相対リンク先が存在するかを検査する。新しいファイルは `git add` 後に対象になる） |
| 誤字・会話文 | Ink・JSONの変更は `npm run content:check` と必要な会話経路の実表示。型やUIコードにも影響する場合は型検査や対象テストを追加 |
| 画像・背景 | `npm run content:check`、対象画面の実表示と必要な画像失敗時の表示。画像の配置・パスを変えた場合はE2E一式（`npm run test:e2e`）も実行 |
| CSS・UIの小変更 | 対象操作とスマートフォン幅の実画面。共通UIや型・操作への影響に応じて `npm run typecheck` やE2E一式を追加 |
| ゲームルール | 該当ドメインテストと必要な画面操作。型・共通進行への影響があれば型検査と関連テストを追加 |
| 旅行編フォルダの追加・削除、統合規則・生成処理の変更 | `npm run content:build`、`npx vitest run scripts/journey-folders.test.ts scripts/content-sources.test.ts scripts/catalog-merge.test.ts scripts/content-ownership.test.ts`（先に `content:build`）、E2E一式（`boot.spec.ts` が登録済みの全旅行編の開始画面を開く） |
| 保存・進行 | 同一バージョン内の保存・再開、読めないデータの保護、明示消去、別タブ、報酬重複防止の関連テストとE2E一式、必要な実画面。型・共通基盤の影響に応じて型検査と検証範囲を広げる |
| CI・Playwrightの設定、本番ビルドの検査（`.github/workflows/`・`playwright.config.ts`・`scripts/dist-guard.ts`） | `npm run build`（`dist/` の検査を含む）、`npx vitest run scripts/dist-guard.test.ts`、E2E一式。ワークフローの変更はPRで実際の実行結果を確認する |
| 単体テストの設定・テストの組・テスト用フィクスチャ（`vite.config.ts` の `test`・`scripts/test-sets.ts`・`scripts/test-image-guard.ts`・`src/content/test-fixtures.ts`） | `npx vitest run scripts/test-sets.test.ts scripts/test-image-guard.test.ts src/content/test-fixtures.test.ts`（先に `content:build`）、`npm test`（両方の組） |
| 会話の全分岐検査とそのキャッシュ（`scripts/ink-validation.ts`・`scripts/story-validation-cache.ts`） | `npx vitest run scripts/story-validation-cache.test.ts scripts/story-validation-cache-content.test.ts`（先に `content:build`）、`npm run content:build -- --no-cache` と通常の `npm run content:build` が同じ結果になること。検査コードを変えると指紋が変わり、次の生成はすべて検査する（[キャッシュ](#会話の全分岐検査のキャッシュ)） |
| 大きな変更・公開前 | `npm run verify`、E2E一式と、影響範囲に応じた実画面確認 |

`npm run content:check` は差分検証ではなく全コンテンツを検証・生成する。対象テストを絞る場合、例えば `npm test -- src/domain/encounter-ap.test.ts` は通常どおり `pretest` でコンテンツを生成してから、そのテストだけを実行する。Playwrightの `webServer` は通常 `npm run dev` を実行し、その `predev` がコンテンツを生成する。既に起動したサーバーを再利用する場合は、対象の変更が反映され、生成物が最新であることを確認する。自動テストの通過だけを写真の切れ方や操作性の目視確認の代わりにはしない。

小変更のたびに全単体テストや全E2Eを手元で実行する必要はない。日常の単体テストは `npm run test:quick`（速い組。[単体テストの組](#単体テストの組と所要時間)）とし、全件（`npm test`）はCIと、公開前・大きな変更の `npm run verify` で実行する。PRと `main` へのpushでは、GitHub Actionsが全単体テスト・本番ビルド・E2E一式を自動実行する（[CI](#cigithub-actions)）。上の表でE2E一式を挙げた変更は、PRを出す前に手元でも実行する。開発中はv12以前の旧開発版セーブの更新後の再開を保証せず、旧互換テストを新機能ごとに増やす必要はない。現在のゲームの保存・再開や読めないデータの保護は維持する。

`npm test` と `npm run build` はそれぞれ実行前にコンテンツを生成する。`npm run verify` は生成、全ユニットテスト、型検査、製品ビルド、`dist/` の検査を順に行う一括用コマンドで、生成は一度だけ行う。この生成は会話の全分岐検査のキャッシュを使わずにすべて検査する（`content:build -- --no-cache`。[キャッシュ](#会話の全分岐検査のキャッシュ)）。この中の `npm run test --ignore-scripts` は直前の生成を利用して `pretest` のみ省略している。個別に `--ignore-scripts` を付ける、または `npx vitest run` を直接呼ぶ場合は自動生成されないため、Ink・JSON等を変更した後は事前に `npm run content:build` を実行する。生成物の鮮度が分からない場合も再生成する。

ゲームと、データを参照するだけの単体テストは `content/` のJSONを直接読まず、`npm run content:build` が検証・統合して書き出す `src/content/generated/content/`（生成物。手動編集しない）を読む。JSONを編集した後も `npm run content:build` を実行する。一方、原本を一時フィクスチャへ写して書き換え、生成を検証するテスト（`src/content/*-content.test.ts` など）と制作ツールは `content/`（旅行編フォルダを含む）の原本を読む。画像も同様に、`npm run content:build` が直下の `public/` と各旅行編の `public/` を `src/content/generated/public/` にまとめ、開発サーバー・`vite build`・Playwrightはこのフォルダを配信する（`npm run dev` / `build` / `test` は先に `content:build` を実行する）。`vite`（`npx vite`・`vite build`・`vite preview`）を直接起動する場合は、先に `npm run content:build` を実行する。このフォルダがないと、画像なしで起動・ビルドされる（警告は出ない）。

`scripts/journey-folders.test.ts` は、原本の一時コピーで旅行編フォルダの改名・追加（`tests/fixtures/journeys/zz_fixture_trip/`）・各旅行編フォルダの除外を行い、そのたびに `content:build` 相当の生成と検証を実行する（約1分、旅行編が増えるほど長くなる）。特定の旅行編・都市の内容を確かめる単体テストは、全旅行編の合計件数や一覧ではなく、その旅行編・都市の範囲に絞って数える。

テストは簡潔な dot レポーターを使い、成功したテスト内のログを省略する。失敗したテストのログ、失敗箇所、終了コードは保持する。内容を詳しく追う場合は、生成後に `npx vitest run --reporter=verbose <対象>` とする。通常のコンテンツ生成は旧会話注釈の警告を件数で示し、個々の警告は `npm run content:build -- --verbose` で確認できる。生成に失敗した場合は警告の詳細と原因を表示し、失敗のまま終了する。

検証の絞り込みと成功ログの抑制は、テストを削除したことや実行時間・トークンの削減量を意味しない。今回確認したコマンドと、実施できなかった確認は作業報告に記載する。

## 単体テストの組と所要時間

単体テストは2つの組に分かれる（`vite.config.ts` の `test.projects`）。

| 組 | 内容 | 実行 |
| --- | --- | --- |
| `quick` | ゲームルール、保存、画面部品、生成物を読むだけのテスト、制作ツールの純粋関数など | `npm run test:quick`（生成してから、この組だけ）。日常の確認用 |
| `content` | コンテンツ全体の生成と検証（`buildContent`）や一時コピーの準備（`prepareContentFixture`）を使うテストと、それらを使う制作ツール（`city-bundle`・`promote-journey`・`inspect-content` など）を読み込むテスト | `npx vitest run --project content`（先に `content:build`） |

`npm test` と `npm run verify`、CIは両方の組を実行する。どちらの組に入るかは一覧で管理せず、`scripts/test-sets.ts` がテストファイルの `import` から自動で決める。テストファイル自身の相対 `import` を何段でもたどり、`scripts/content-pipeline.ts`（`buildContent`）か `src/content/test-fixtures.ts`（`prepareContentFixture`）に届くファイルが `content`、それ以外が `quick` になる（型だけの `import type` は数えない）。新しいテストもこの規則で自動的にどちらかに入り、どちらにも入らないテストはない（`scripts/test-sets.test.ts` が確認する）。ファイルを指定した `npx vitest run <ファイル>` は組に関係なく実行できる。

判定はモジュール単位で、関数の呼び出しまでは追わない。そのため `scripts/content-pipeline.ts` は `buildContent` だけを公開し、テストが単独で使う検査関数は軽いモジュールに置く（Inkのコンパイルと会話の検査は `scripts/ink-validation.ts`、クイズ1件の検査は `scripts/quiz-validation.ts`、都市のつながりは `scripts/city-links.ts`、読み込んだ内容全体の検証は `scripts/content-validation.ts` の `validateContent`）。テストはこれらを直接 `import` すれば `quick` に入る。`validateContent` は、メモリ上に作った小さな内容（`contentTreeFromFiles`）で拒否を確かめるテストに使う。リポジトリ全体の内容を検証すると生成と同じだけ時間がかかるため、そうしたテストは `buildContent` を使う（`content` に入る）。一方、`buildContent` を読み込む制作ツールのモジュールから純粋な関数だけを使うテストも `content` に入る（2026年11月時点で `src/content/inspect-content.test.ts`、`scripts/journey-authoring.test.ts`、`scripts/journeys/golden_triangle/india-readiness.test.ts`。3ファイル合わせて約1秒）。これらは日常の `test:quick` では実行されないが、`npm test`・`npm run verify`・CIでは実行される。モジュール単位の判定は、読み込むだけで使わない場合も `content` に数える。

`import` の読み取りは正規表現による簡易なもので、たどれるのは行頭の `import`・`export … from`（複数行も可）、`import "…"`、文字列を直接書いた `import("…")` で、行き先は `.` で始まる相対パスの `.ts`・`.tsx`・`.mts`（`index` を含む）だけである。次の書き方はたどらない：行の途中から始まる `import`、`require()`、変数やテンプレート文字列で指定した `import()`、子プロセスで実行する生成、パスの別名、拡張子を `.js` と書いたTypeScriptファイルの指定（`./x.js` → `x.ts`）。逆に、テンプレート文字列の中で行頭にある `import` 文は読み込みとして数える。2026年11月時点のテストと読み込み先には、これらの書き方はない。たどれなかった先が生成に届くテストは `quick` に入り、日常の `test:quick` が遅くなる（`npm test`・`verify`・CIは両方の組を実行するので、実行されないテストは出ない）。そうした書き方は使わない。また、組は設定を読み込んだときに一度だけ決まる。監視モード（`npx vitest`）の実行中に追加したテストファイルはどちらの組にも入らず実行されず、`import` を変えたテストの組も変わらないため、Vitestを起動し直す。

`prepareContentFixture` は `content/` と `public/` を一時フォルダへ写すが、各旅行編の画像（`content/journeys/<journeyId>/public/` のファイル。リポジトリの大半の容量）は写さず、フォルダだけを作って各ファイルへのシンボリックリンクを置く（リンクを作れない環境、たとえばリンク作成の権限がないWindowsでは、ファイルをコピーする。遅くなるが結果は同じ）。テストはそこへファイルを追加・削除してよいが、リンクされたファイルへ上書きするとリポジトリの画像が変わるため、差し替えは `replaceFixtureFile` を使う。単体テストの実行の前後で各旅行編の画像の大きさと更新時刻を比べ、変わっていれば実行全体を失敗にする（`scripts/test-image-guard.ts`）。失敗の表示には、変わったファイルと、最後にコミットした版へ戻すコマンド（`git checkout -- <ファイル>`）が出る。テストが追加したファイルは削除する。まだコミットしていない画像や、コミット後に編集した画像はgitから戻せないため、画像を追加・編集したら単体テストの前にコミットしておく。

所要時間（4コアの開発環境で計測、2026年11月。[会話の全分岐検査のキャッシュ](#会話の全分岐検査のキャッシュ)の導入前、キャッシュが空のとき、保存済みのとき）：

| 確認 | 導入前 | キャッシュが空 | 保存済み |
| --- | --- | --- | --- |
| `npm run content:build` | 約15.7秒 | 約15.4〜16.0秒（`--no-cache` も同じ） | 約3.4秒 |
| `npm run test:quick`（生成を含む） | 約44秒（110ファイル） | 約46秒（111ファイル） | 約30秒 |
| 全単体テスト（`npx vitest run`、生成を除く） | 約400秒（全ワーカーの作業時間 約1,530秒分） | 約190秒（約690秒分） | 約150秒（約530秒分） |
| `npm run verify`（生成はキャッシュなし。単体テストはキャッシュを使う） | 約416秒 | 約200秒 | 約165秒 |

- キャッシュが空でも全単体テストが速いのは、同じ内容の生成を繰り返すテストが、同じ実行の中で先に計算された結果を使うため（1回の実行で約2,700項目・約14MBが保存される）。2回目以降は、テストが一時コピーで作る内容の変化も保存済みになる。単体テストの組を分ける前（ワーカー数の調整も前）は約610秒だった。
- 時間の長いファイル（保存済みのキャッシュで）は `content` の組にある：`scripts/city-bundle*.test.ts` のうち3ファイル（各約45〜60秒。全9都市の書き出し・反映を繰り返す）、`src/content/content.test.ts`（約50秒）、`scripts/story-validation-cache-content.test.ts`（約42秒。比較のためキャッシュなしの生成を含む）。`quick` の組で最も長いのは `src/domain/milano-freedom.test.ts`（約10秒。`scripts/journey-scenario-validation.test.ts` は約14秒から約2秒になった）。
- 1回の生成（約15秒）のうち約12秒はデートの会話の全分岐の検査（`validateStory`。1回の生成で212回）で、キャッシュはこの部分を省く。残りの約3.4秒は、Inkのコンパイル（約1秒）、画像の中身の検査（約1.3秒）、ほかの検証、起動など。キャッシュ導入前の単体テスト一式では `validateStory` が約18,000回呼ばれ、全ワーカーの作業時間の約7割を占めていた。
- ワーカーはCPUのコア数だけ使う（`vite.config.ts` の `maxWorkers`）。1つのファイルの中のテストは順に実行されるため、極端に長いファイルは分けて、別々のワーカーで並列に動くようにする（`scripts/city-bundle*.test.ts` は1つのファイルだったときに約610秒かかり、全体の待ち時間を決めていたため4つに分けた）。
- 計測は `npx vitest run --reporter=dot --reporter=json --outputFile.json=<出力先>.json`（先に `content:build`）で、JSONの各ファイルの `startTime`・`endTime` を比べる。
- 制作ツール（`city:bundle`・`journey:release`）は、検証中に入力が変わっていないことを確かめるため、`content/` と `public/` の全ファイルの指紋（`journeyInputFingerprint`）を取る。1回約80〜110ミリ秒（約73MBを読む）で、ツールの実行時間に比べて小さい。生成と検証は全旅行編を統合した結果に対して行うため、指紋を対象の旅行編だけに絞ると、別の旅行編での同時編集（IDの重複など）を見逃す。このため絞り込みは行わない（2026年11月に判断）。画像を内容ではなくパス・大きさ・更新時刻で比べて読む量を減らす案は、制作ツールの手直しの際に検討する。

### 会話の全分岐検査のキャッシュ

デートの会話の全分岐検査（`validateStory`）は生成時間の大半を占めるため、成功した結果をディスクに保存し、同じ入力と同じ検査コードの組み合わせでは検査をやり直さずに結果を使う（`scripts/story-validation-cache.ts`）。`npm run content:build`・`npm run journey:scenario`、単体テストと制作ツールの中の生成（一時コピーを含む）のすべてが同じ場所を使う。

- 保存場所はGit管理外の `node_modules/.cache/dreamscape/ink-validation/`（1回の生成分で約200項目・約1MB）。フォルダはいつ消してもよく、消すと次の生成ですべて検査し直す。`npm ci` でも空になる。検査コードの指紋ごとにフォルダを分け、新しい方から3つだけを残す（ブランチの行き来で残す分）。
- 項目は内容を変えるたびに増える。鍵には全体のID（効果・背景・表情）・効果の定義・思い出の一覧が入るため、どこか1か所のデータを変えると、ほぼすべてのデートが新しい項目になる（生成1回で約1MB、全単体テストで約14MB。古い項目は残る）。このため1つの指紋のフォルダには最近使った10,000項目（約50MB）までを残し、それを超えた分は、キャッシュを開くとき（生成のたび）に最後に使った日時の古いものから消す。使った項目は使うたびに更新日時を新しくする。
- 鍵（項目の名前）は、検査が読む入力のすべて（コンパイル済みのInk、タグとして許すID〔効果・背景・表情〕、デートの選択の数・効果の数・種類、Inkへ渡す変数、効果の定義、思い出、偶然の反応と関係トーンの指定）と、検査コードの指紋から作る。指紋は `scripts/ink-validation.ts` と `scripts/story-validation-cache.ts`、そこから読み込むすべてのモジュール（何段でもたどる。2026年11月時点で `src/content/tags.ts`・`src/story/memory.ts`・`src/domain/romance-tone.ts` など8ファイル）の中身、使うパッケージ（`inkjs`・`zod`）の版、Node.jsの版から作る。どれか1つでも変われば別の項目になり、検査を実行する。読み込み先が見つからないなど指紋を作れない場合は、キャッシュを使わない。
- 保存するのは成功した結果（経路の数と、検査が通った台詞・効果の一覧）だけ。失敗は保存しないため、エラーの文言は常にその場で検査した結果になる。保存した結果を使うときは、台詞と効果を一度ずつ（最初に通った順に）検査の受け手へ渡し直す。受け手（会話注釈の「古い注釈」警告、効果を使うデートの集計）は集合として数えるので、結果は検査し直した場合と同じになる。読めない・壊れた・鍵の合わない項目は、無いものとして検査する。
- `npm run content:build` は「`Ink validation cache: 212 reused, 0 run`」のように再利用と実行の件数を表示する。キャッシュを使わずにすべて検査するには `npm run content:build -- --no-cache`（`journey:scenario` も同じ）、または環境変数 `DREAMSCAPE_INK_CACHE=off` を使う（`off`・`0`・`false`・`no`）。結果に疑いがあるとき、検査コードの外（例えば `node_modules` の中身を手で書き換えた場合）を変えたときは、これで確かめる。
- `npm run verify`（手元の公開前の確認と、`pages.yml` の公開前の確認）：最初の生成は `--no-cache` で、キャッシュを読まず書かずにすべて検査する。続く単体テストはキャッシュを使う（手元では、同じ検査コードで以前に保存した結果も使う）。
- CI：キャッシュは持ち越さない。各ジョブは `npm ci` で `node_modules` を作り直し、ワークフローは `actions/cache` を使わない（`setup-node` が保存するのは `~/.npm` だけ）。このため、使われる結果はすべて同じジョブの中で同じコードが計算したもの。そのうえで公式の内容検査（`ci.yml` の「Content, types and production build」）は `DREAMSCAPE_INK_CACHE=off` で、キャッシュなしにすべて検査する。単体テストのジョブは、空のキャッシュで始まる最初の生成ですべて検査し、以降のテストがその結果を再利用する。`pages.yml` は上の `npm run verify`。`scripts/story-validation-cache.test.ts` がワークフローと `verify` のこの条件も確かめる。
- 正しさの確認：`scripts/story-validation-cache.test.ts`（`quick`）は、指紋が読み込み先をすべて含むこと（読み込みの解析とは別の広い検索でも確かめる）、指紋に入るモジュールが実行中にファイル・環境変数・時刻・乱数などを読まないこと、検査コード・Inkの本文・タグのID・変数などの入力のどれを変えても検査し直すこと、保存した結果で経路数・台詞（同じ文を別の話者が話す場合を含む）・効果・会話注釈の警告が同じになること、失敗を保存しないこと、壊れた項目を無視すること、項目数の上限で最近使ったものを残すことを確かめる。テストは環境変数 `DREAMSCAPE_INK_CACHE` に関係なく自分の一時フォルダのキャッシュを開くため、`off` を付けて `npm test` などを実行しても失敗しない。`scripts/story-validation-cache-content.test.ts`（`content`）は、実際のコンテンツでキャッシュなし・空のキャッシュ・保存済みのキャッシュの生成結果と警告が一致し、壊したデートのエラーが同じ文言になることを確かめる。
- `validateStory` に引数を足す場合は、`StoryValidationInput` にも加える（キャッシュ付きの呼び出しは、この入力だけを `validateStory` に渡す）。検査が使うデータは必ずこの入力から渡し、検査コード（指紋に入るモジュール）の中でファイル・`import.meta.glob`・環境変数・時刻・乱数などから読まない。そうしたデータは指紋にも鍵にも入らず、変わっても古い結果が使われる（上のテストが検出する）。

## E2Eテスト

`tests/e2e/` のE2Eは、利用者と同じ操作で主要機能が動くことと、重大な不具合（起動できない、進行が止まる、保存が失われる、致命的なJSエラー）がないことだけを確認する最小構成とする。個々の観光地・シナリオ・選択肢・デート・品物の網羅や、細かな見た目・位置は対象にしない。それらのルールは単体・統合テストで、見た目は [UIレビュー](../UI_REVIEW_CHECKLIST.md) と実画面で確認する。

| ファイル | 確認する流れ |
| --- | --- |
| `boot.spec.ts` | 起動とタイトル画面、登録済みの全旅行編の開始画面、Debugが通常の保存データに触れないこと |
| `play.spec.ts` | ミラノの新しい旅で移動、観光ガイド、クイズバトル、報酬、デート（AP消費）を経て自由時間へ戻る |
| `save-load.spec.ts` | 自動保存とイベント途中の再読み込み、手動セーブ、別タブからの同時利用の防止、読めないセーブの保護 |
| `inter-city.spec.ts` | ゴールデントライアングル編でデリーのエピローグからアーグラへ移り、地図と都市情報が切り替わる |

`npm run test:e2e`（個別には `npx playwright test tests/e2e/play.spec.ts`）で実行する。一式は1〜2ワーカーで数分以内に終わる。各テストは自分のブラウザコンテキスト（保存領域・タブ）を持ち、同じファイルのテストも別のワーカーで並列に実行する（`fullyParallel`）。テスト同士で保存データや順序に依存しない。共通の `tests/e2e/helpers.ts` の `test` は、どのタブでもコンソールエラー・未処理の例外・ゲームの画像等の欠落があればテストを失敗にする（外部の地図タイル・Webフォントの取得失敗は除く）。都市間移動はデリー全体の操作に数分かかるため、ページ内のゲーム関数で実際の規則どおりにデリーを最後まで進めたセーブを作り、移動そのものを画面で操作している。

### E2Eテストを追加する際の判断基準

1. まず単体・統合テストで確認できないか考える。ゲームルール、AP・報酬、分岐・解放条件、保存形式・別タブ競合・破損データの保護、コンテンツ参照は `src/**/*.test.ts`・`scripts/**/*.test.ts` に書く。画面の中にしかない判定は、先に純粋関数へ移せないか検討する。
2. E2Eに残すのは、ブラウザで組み合わせて初めて起きる重大な失敗（画面の遷移、ReactとInkの実行、ブラウザの保存領域・再読み込み・別タブ、画像やスクリプトの読み込み）を、利用者と同じ操作で確かめる場合に限る。
3. 新しいファイルやテストを増やす前に、上の4つの流れへ1〜2個の確認を足せないか検討する。
4. 全観光地・全シナリオ・全選択肢・全デート・全品物の網羅、台詞や文言の一致、要素の位置・幅・余白、画面幅ごとの繰り返し、Debug画面の細部はE2Eにしない。
5. 共通の `test` を使い、固定時間ではなく保存のリビジョンや画面要素で待つ。状態の近道は、実際の操作では数分かかる場合だけ、実際のゲーム関数で作った通常のセーブを使い、理由をコメントに残す。テストのためにゲーム側の設計・分岐・設定を変えない。コンテンツファイルのパスには依存せず、IDと画面で確認する。
6. 追加・変更後は一式を3回続けて実行し、毎回通ることを確かめる。不安定なテストは再試行で隠さず、原因を直すか削除する。一式の実行時間は数分以内に保つ。

## CI（GitHub Actions）

GitHub Actionsは次のワークフローを実行する。同じイベントで動くジョブはすべて並列に動き、互いの完了を待たない。

| きっかけ | ワークフローとジョブ | 内容 |
| --- | --- | --- |
| PR（作成・push） | `ci.yml`「Content, types and production build」 | `npm run build`（コンテンツの検証・生成、型検査、本番ビルド、`dist/` の検査）。会話の全分岐検査はキャッシュを使わずにすべて行う（`DREAMSCAPE_INK_CACHE=off`。[キャッシュ](#会話の全分岐検査のキャッシュ)） |
| | `ci.yml`「Unit tests」 | `npm test`（全単体テスト） |
| | `e2e.yml`「E2E (gate)」 | E2E一式（`npm run test:e2e`） |
| `main` へのpush | `pages.yml` | `npm run verify` の後にGitHub Pagesへ公開する |
| | `e2e.yml`「E2E (gate)」 | E2E一式。公開と並列に動く |
| 手動（Actions画面の「Run workflow」） | 3つのワークフロー | それぞれ上と同じ内容 |

- 公開はE2Eの合格を待たない。`main` のE2Eは公開と並列に動き、失敗するとそのコミットのチェックが失敗（赤い×）になり、GitHubの通知設定に従って知らされる。公開済みの版に問題があれば、修正をPRで取り込んで再公開する。
- PRでは、新しいpushが来ると同じPRの実行中のCIとE2Eを取り消して最新のコミットだけを確かめる。`main` へのpushと手動実行は取り消さず、最後まで実行する。
- 画面の見た目・操作感・実機の確認は人が並行して行う。CIの合否を待つ必要はなく、CIの通過は目視確認の代わりにならない。
- E2Eはマトリクスの段（tier）ごとに別のジョブになる。現在は「gate」の1段だけ。本番ビルドでの確認などの段を足すときや、長い段を `--shard=1/2`・`--shard=2/2` で分けるときは、`e2e.yml` の `matrix.include` に項目を足す。足した段も並列に動く。
- Playwrightの設定（`playwright.config.ts`）：失敗したテストは再試行しない（不安定なテストは再試行で隠さず原因を直す）。失敗したテストだけ、スクリーンショットとトレースを `test-results/` に保存する。CI（環境変数 `CI` がある場合）では、さらに `test.only` が残っていれば失敗にし、2ワーカーで実行し、失敗の注釈・HTMLレポート（`playwright-report/`）・一覧を出力する。CIの実行は12分で打ち切り（`globalTimeout`）、打ち切った場合もレポートと、そこまでに失敗したテストのトレースを残す。`e2e.yml` はテストの手順に16分、ジョブに25分の上限を置き、手順が時間切れになった場合も成果物（下記）を保存する（ジョブ全体の時間切れでは保存の手順が実行されないため）。手元では一覧だけを出力し、ワーカー数はPlaywrightの既定（CPUの半数）。

### 失敗したときの見方

1. PRの「Checks」タブ、またはコミットの赤い×から失敗したジョブを開く。単体テスト・ビルドはジョブのログの末尾に、失敗したテストと理由が出る。
2. E2Eは、失敗したテストの行が注釈として実行結果ページ（Summary）の「Annotations」に出る。そのファイルがPRの差分に含まれる場合は、差分（Files changed）の該当行にも出る。ジョブのログには各テストの成否と失敗箇所が出る。
3. E2Eが失敗した実行（時間切れを含む）では、実行結果ページ（Summary）の「Artifacts」に `e2e-<段の名前>` が14日間残る。ダウンロードして展開し、`npx playwright show-report playwright-report` でHTMLレポートを開く。レポートから各テストのスクリーンショットとトレース（操作ごとの画面・DOM・コンソール・通信）を見られる。トレースだけを見る場合は `npx playwright show-trace test-results/<テスト名>/trace.zip`。`test-results/<テスト名>/error-context.md` には失敗時のページの構造が残る。
4. 手元で同じテストを実行して再現する（`npx playwright test tests/e2e/<ファイル> --repeat-each=3` など）。CIでだけ失敗する場合は、待ち時間ではなく画面の状態・保存のリビジョンで待っているかを確かめる。

### 本番ビルドの検査

`npm run build` と `npm run verify` は、`vite build` の後に `npm run dist:check`（`scripts/check-dist.ts`）で `dist/` を検査する。Debug・人物素材のプレビュー（`src/dev/`）、テスト用の仮データ（`*-test-fixture.ts`・`tests/fixtures/`）、自動テスト専用・見本の旅行編（`zz_fixture_trip`・`sample_trip`）に固有の文字列が、公開されるファイルの名前か内容に1つでもあれば、ファイル名・文字列・その由来を表示してビルドを失敗にする。`vite.config.ts` は変えていない。

- 失敗した場合は、開発専用のモジュールを `import.meta.env.DEV` の分岐の外から読み込んでいないか、生成物（`src/content/generated/`）にテスト用・見本の旅行編が入っていないかを確かめる。生成物が原因なら `npm run content:build` で生成し直してからビルドする。
- 検出に使う文字列と由来のファイルは `scripts/dist-guard.ts` にある。由来のファイルを改名・改稿して文字列が消えると `scripts/dist-guard.test.ts` が失敗するので、そのファイルに固有の別の文字列へ差し替える。本番のコードやコンテンツが同じ文字列を使うとビルドが失敗するため、目印には開発用のファイルにしかない文字列を選ぶ。
- 目印による確認なので、目印を持たない開発用のコード（目印を登録していない新しいファイルなど）が入っても失敗しないことがある。`src/dev/`・テスト用の仮データに新しいファイルを足したら、そのファイルに固有の文字列を目印に加える。
