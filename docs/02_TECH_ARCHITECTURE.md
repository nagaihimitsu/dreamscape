# 02 技術設計 / 第一候補

## 原則
既存リポジトリを最初に調査。作成時にはREADMEのみ確認されていたが、変更がありうる。構成が空に近い場合、以下を第一候補とする。
- Vite + React + TypeScript（ブラウザゲーム、スマホ優先、静的配信）。
- `.ink`（編集用の会話原稿）、Inkコンパイラ（ビルド時）、`inkjs`（ブラウザの実行時）。**原稿の独自パーサーを作らない。**
- `.json`（都市/観光地/クイズ/デート定義/数値バランス）。スキーマ検証（Zodなど）は必要な範囲だけ導入。
- 状態は小規模ならReact Context + useReducer等。用途が拡大してから状態管理ライブラリの導入を検討する。
- `localStorage` と `schemaVersion`。現在のゲームで作成した有効なデータの、同一バージョン内の保存・再開を維持する。将来の汎用移行基盤やJSONエクスポート/インポートは今回の必須要件ではない。
- 画像 WebP/PNG。最初はプレースホルダーで十分。写真・名画の細部を問う本番問題は、画像使用権と正確性を確認したものを使う。

## 編集元と生成物の分離
編集元 `content/journeys/<journeyId>/stories/**/*.ink` → ビルド時にコンパイル → 配信対象となる `.json` → `inkjs` 実行 → Reactで台詞と選択肢を描画 → TypeScriptのルール層にイベント通知。
- `.ink` から生成したJSONは手動で編集しない。
- `.ink` はゲームの文章と分岐を担当。AP計算/好感度/保存はTypeScript側。
- Inkのタグは制限付きのメタデータ: `speaker: heroine`, `background: milano_cafe`, `emotion: shy`, `effect: memory_milano_promise` など。
- `effect` は**許可済みイベントIDをルール層に渡す**だけ。文字列をコードとして評価しない。同一効果の適用はイベント単位で冪等にする。
- ヒロイン/主人公名や現在の呼称は、GameStateから読み込み、Inkの変数または安全なプレースホルダーに渡す。新規台詞に固定名を直書きしない。

## 推奨フォルダ（Codexが現状調査のうえ適宜調整）
```
src/
  app/                  # 画面遷移・起動
  components/           # DialogueBox, ChoiceButtons, CharacterPortrait
  features/romance/     # RomanceScreen, DateMenu
  features/tourism/     # 将来: TourismScreen, Observation
  features/battle/      # 将来: BattleScreen, QuestionCard
  domain/               # AP, event eligibility, affection, rewards（UIに依存しない）
  content/              # 読み込みとスキーマ検証
    generated/          # content:build の生成物（Git管理しない・手動編集しない）
  story/                # inkjs実行アダプタ
  persistence/          # セーブ・復元・データ保護
  types/                # GameState, Event, Content types
content/                # 共通データ（全旅行編で共有する基盤）
  journeys/<journeyId>/ # 旅行編ごとのフォルダ（manifest.json, cities/, travel/, stories/, quizzes/, 各カタログ, public/assets/ の画像）
scripts/                # Inkコンパイル・コンテンツ検証・共通の制作ツール
  journeys/<journeyId>/ # その旅行編だけの制作ツール（共通コード・ツールからは読み込まない）
authoring/              # 共通の制作手順・テンプレート
  journeys/<journeyId>/ # 旅行編ごとの下書き・調査記録（ゲームは読み込まない）
public/assets/         # 全旅行編で共有する画像・音声（ヒロイン、演出、共通アイコン）
tests/e2e/             # 最小構成のE2E（Playwright）
tests/fixtures/journeys/ # 自動テスト専用の旅行編フォルダ（ゲームには含めない）
```

## 共通データと旅行編フォルダ

- `content/`（`content/journeys/` を除く）は全旅行編で共有する基盤データ（共通レイヤー）。置けるのは `romance/balance.json`・`romance/response_profiles.json`・共通デート効果（`common_date_*`）・`romance/presentation.json` の共通部分（保留・エンディング表示、感情、既定背景 `milano_cafe`）・`romance/progression.json` の段階と告白・`learning/word-meanings.json`・`presentation/characters.json` だけ。都市・移動・Ink・クイズや旅行編専用のカタログは置けず、共通データから都市や旅行編のデータを参照することもできない（`scripts/content-ownership.ts` が検査）。
- 各旅行編は `content/journeys/<journeyId>/`（`manifest.json` で登録し、`order` の順に並ぶ）へ同じ相対配置でデータを置く。`npm run content:build` が共通データと各旅行編を統合・検証して `src/content/generated/content/` に書き出し、ゲームはこの生成物だけを読む。
- 画像は、全旅行編で共有するものをリポジトリ直下の `public/`、旅行編だけが使うもの（観光写真・デート背景・その旅行編の品物アイコン）を `content/journeys/<journeyId>/public/` に、配信時と同じ相対パス（`assets/tourism/...` など）で置く。`npm run content:build` がこれらを `src/content/generated/public/`（生成物。Git管理しない）へまとめて写し（変更のないファイルはサイズと更新時刻で判定して省略し、元がなくなったファイルは消す）、Viteはこのフォルダを `publicDir` として配信・ビルドする（Viteプラグインや独自のVite処理は使わない）。同じ相対パスの画像を二つのフォルダに置くと `content:build` が失敗する。データ中の画像パスは配信時の相対パスのままで、置き場所によって変わらない。
- タイトル画面・新しいゲーム・Debugの初期値は、`order` 順で最初の公開中（`status: "available"`）の旅行編とその最初の都市。公開中の旅行編がない場合、`content:build` が失敗する。
- どの旅行編フォルダも単独で外せる。ある種類のカタログをどの旅行編も持たない場合（例：ミラノ編を外したときの道中交流・会話注釈・英語ノートの詳細）、統合結果は空のカタログになる。ただし統合後のスキーマ検査はそのまま適用されるため、対決・エピソード・デートなど1件以上が必要な種類は、公開中の旅行編のどれかが持っている必要がある（`scripts/journey-folders.test.ts` が各旅行編フォルダを外した一時コピーで確認する）。

### 統合の規則

`npm run content:build` は `scripts/content-sources.ts` で共通データ（`content/`、`content/journeys/` を除く）と各旅行編フォルダを `order` 順に読み、`scripts/content-layout.ts` の `CATALOG_RULES` に従って種類（相対パス）ごとに統合する。統合の前に `scripts/content-ownership.ts` が所属と参照を検査し、統合後のデータを既存のZodスキーマと参照検査で検証する。

| 種類（相対パス） | 統合方法 |
| --- | --- |
| `battles/catalog.json` | `battles` を連結 |
| `encounters/catalog.json` | `items`・`encounters` を連結 |
| `encounters/entry-rules.json` | `entries` を連結 |
| `learning/details.json` | ファイル全体を1つの層だけが持つ（どの層にもなければ `questions` が空） |
| `learning/translations.json` | `questions` をキーごとに統合 |
| `learning/word-meanings.json` | `words` をキーごとに統合（同じ内容の重複だけ許可） |
| `presentation/characters.json` | `characters` を連結、`battleCharacters`・`wardrobe.cities`・`wardrobe.scenes` をキーごとに統合。`expressionIds`・`wardrobe.regions`・`wardrobe.countries` は共通データのみ |
| `presentation/dialogue-expressions.json`・`dialogue-reactions.json`・`reasoning-intros.json` | `entries` を連結 |
| `progression/journey.json` | `episodes`・`storyBattles`・`rewards` を連結 |
| `romance/balance.json`・`romance/response_profiles.json` | ファイル全体を共通データだけが持つ |
| `romance/date_catalog.json`・`date_destinations.json`・`effect_catalog.json` | `dates`・`destinations`・`effects` を連結 |
| `romance/presentation.json` | `backgrounds`・`memories` をキーごとに統合。`deferred`・`ending`・`emotions` は共通データのみ |
| `romance/progression.json` | `memoryCallbacks` を連結。`stages`・`confession`・`fallbackMemoryCallbackJa` は共通データのみ |
| `tourism/catalog.json` | `assets`・`landmarks`・`clues` を連結 |
| `journeys/catalog.json` | 各 `manifest.json` から生成（`schemaVersion`・`order`・`authoring` を除き、`order` 順） |

- 連結は共通データが先、続いて旅行編を `order` 順に並べ、ファイル内の順序を保つ。キーごとの統合で同じキーを二つの層が定義するとエラー（両方のファイル名を表示）。`schemaVersion` はファイルを持つすべての層で同じ値にする。表にないキー、共通データ専用のキーを旅行編が設定することはエラー。
- 旅行編のファイルは、自分が使うキーだけを書いてよい（例：`{ "schemaVersion": 1, "backgrounds": { … } }`）。ファイルがない層は何も加えない。共通データ専用の種類（`CORE_LAYER_KINDS`）をどの層も持たない場合は「Missing content file」で失敗する。
- 都市は `cities/<cityId>.json`、移動は同じ層の `travel/<cityId>.json` と `travel/<cityId>-settings.json`。同じ都市のファイルを二つの層に置くこと、`manifest.json` に登録していない都市を旅行編フォルダに置くことはエラー。
- Inkは各層の `stories/**/*.ink`、クイズは `quizzes/**/*.json`（`*.sample.json` は検証だけで出題しない）。ストーリーIDは全体で一意で、同じ相対パスのInkを二つの層に置くとエラー。クイズは同じファイル名を別の層に置けるが、クイズID（JSONの `id`）は全体で一意。
- `*.md` とドットで始まるファイル・フォルダは読み込まない。それ以外の未知の `.json`・`.ink` はエラー。旅行編フォルダの `public/` に置けるのは `public/assets/**` だけ。

### 生成物（手動で編集しない）

`src/content/generated/` は `npm run content:build` の出力で、Git管理しない。`npm run dev`・`npm test`・`npm run build`・`npm run verify` は先に生成する。

- `stories.json`（コンパイル済みInk）、`quizzes.json`（出題するクイズ）。
- `content/`：統合・検証済みのカタログを、旧 `content/` と同じ相対パス（`battles/catalog.json`、`cities/delhi.json`、`journeys/catalog.json` など）で書き出した写し。都市・移動ファイルは元のバイト列のまま写す。ゲームと参照だけの単体テストはここだけを読む（`scripts/content-boundary.test.ts` が検査）。
- `public/`：直下の `public/` と各旅行編の `public/` を集めた配信フォルダ（`vite.config.ts` の `publicDir`）。

いずれも変更のないファイルは書き直さず、元がなくなったファイルは削除する。JSONや画像を編集した後も、Inkと同様に `npm run content:build` を実行する。

### ストーリーIDとIDの名前空間

- ストーリーIDは、その層の `stories/` からの相対パスから `.ink` を除いたもの（例：`content/journeys/milano/stories/milano/sound_cafe_01.ink` → `milano/sound_cafe_01`）。旅行編フォルダ名は含まない。複数の旅行編が `stories/battles/` のような同じフォルダ名を使えるため、ファイル名（または旅行編専用のサブフォルダ）でIDが重ならないようにする。
- 都市・地点・観光地・発見・画像・背景・思い出・効果・デート・行き先・エピソード・報酬・対決・クイズ・問題・道中交流・品物・旅行編のIDは、すべての旅行編で共有する一つの名前空間にある。保存データもこれらのIDを記録するため、公開後は変更しない。
- 新しい旅行編では、`manifest.json` の `authoring.eventPrefix` と同じ接頭辞をIDとストーリーのファイル名に付けることを推奨する（インド編 `gt_`、ウズベキスタン編 `uz_`、ルアンパパーン編 `lpb_`）。地点IDは都市IDを接頭辞にする（例：`delhi_red_fort`）。ミラノ編は作成時からの `milano_`・`sound_` などをそのまま使う。

### 予約された名前

- `content/journeys/<旅行編ID>/manifest.json`：旅行編の登録。フォルダ名と `id` を一致させる（英小文字で始まり、英小文字・数字・`_` のみ）。`manifest.json` のないフォルダはエラー。
- `content/journeys/catalog.json`：旧来の一括登録ファイル。置くとエラーになる（一覧は各 `manifest.json` から生成する）。
- 共通デート効果 `common_date_*` は共通データの `romance/effect_catalog.json` 専用。共通の既定背景は `milano_cafe`。
- Debugの「仮の場面」は、準備中の旅行編の都市ごとに `<都市ID>_episode`・`<都市ID>_battle`・`<都市ID>_date` など `<都市ID>_` で始まるID（試験用の都市では `test_`）と、`<都市ID>/guide` などのストーリーIDをメモリ上だけで作る。準備中の旅行編の正式データには、上の接頭辞（例：`uz_`）を付けたIDを使う。
- `tests/fixtures/journeys/zz_fixture_trip/` は自動テスト専用の旅行編で、`content/journeys/` には置かない。

### 新しい編を追加する手順

1. 旅行編IDと接頭辞を決める（例：`kyoto` と `ky_`）。既存の旅行編・都市・IDと重ならないことを確認する。
2. `content/journeys/<旅行編ID>/manifest.json` を作る。`schemaVersion: 1`、一覧での並び順 `order`（他の旅行編と重ならない整数）、`id`、`nameJa`、`status: "preparing"`、`cities`（都市の順序）、`currency`、`initialBudget`、`intercityModes` などを、既存の `manifest.json`（例：ルアンパパーン編）にならって書く。最小の例は `tests/fixtures/journeys/zz_fixture_trip/` にある。制作ツール（`journey:scaffold` など）を使う場合は `authoring` も設定する（[JOURNEY_AUTHORING](../authoring/JOURNEY_AUTHORING.md)）。
3. 都市ごとに `cities/<都市ID>.json`（最初は `productionStatus: "prototype"`）、`travel/<都市ID>.json`、`travel/<都市ID>-settings.json` を置く。都市別の作業用JSON（[CITY_BUNDLES](../authoring/CITY_BUNDLES.md)）で作成・反映してもよい。
4. 背景・行き先・観光画像など、その旅行編が使う項目を、共通データと同じ相対パスのカタログ（`romance/presentation.json`、`romance/date_destinations.json`、`tourism/catalog.json` など）に書く。必要なキーだけでよい。
5. その旅行編だけが使う画像は `content/journeys/<旅行編ID>/public/assets/…` に置き、データには配信時のパス（`assets/tourism/<フォルダ>/<ファイル>`）を書く。全旅行編で共有する画像だけを直下の `public/assets/` に置く。
6. 会話・クイズを登録するときは `stories/**/*.ink`、`quizzes/*.json` と、`progression/journey.json`・`battles/catalog.json`・`romance/date_catalog.json` などの該当カタログに追加する（[JOURNEY_AUTHORING](../authoring/JOURNEY_AUTHORING.md)、[CONTENT_GUIDE](../authoring/CONTENT_GUIDE.md)）。
7. 下書き・調査記録は `authoring/journeys/<旅行編ID>/`、その旅行編だけで使う制作ツールは `scripts/journeys/<旅行編ID>/` に置く（共通コード・共通ツールからは読み込まない）。
8. `npm run content:build` を実行し、エラーを直す。`npm run dev` のタイトル画面に旅行編が「準備中」として並び、`?debug` で都市が「制作中」として選べることを確認する。
9. 公開するときは開始都市を `complete` にし、`status` を `available` にする（`npm run journey:release` でも反映できる）。公開前に `npm run verify` とE2E一式を実行する（`boot.spec.ts` は登録済みのすべての旅行編の開始画面を開く）。

旅行編をやめる場合は、そのフォルダ（と `authoring/journeys/<旅行編ID>/`、`scripts/journeys/<旅行編ID>/`）を削除して `npm run content:build` を実行する。利用者のブラウザにある `dreamscape.journey.<旅行編ID>.*` の保存データは削除されない。

### 共通コードに残るミラノ由来の既定値
- 背景 `milano_cafe` は共通レイヤーの既定背景。Inkが背景を指定しない会話（`src/story/runtime.ts`）と、旅の開始前の画面や背景未指定の場面の `CanalScene` が使う。名前はミラノ由来だが、どの旅行編からも使える共通データとして扱う。
- 都市の会話の初期背景は、その都市の `travel/<cityId>-settings.json` の `storyBackgroundAssetId`（ミラノは `milano_cafe`）。未指定の都市は現在地（なければ宿）の背景を使う。
- 所持品のアイコンは道中交流カタログの品物の `iconPath`（未指定なら共通の `assets/items/item.svg`）。
- 観光地のバトル後に自由時間から改めてクイズに挑める道中交流（ミラノのガッレリアの願掛け）は、`encounters/entry-rules.json` の `quizAfterLandmarkBattle` で指定する。
- Debugの「仮の場面」（`src/domain/multi-city-test-fixture.ts`）と一部のテストは、ミラノのデータ（観光・対決・特殊戦・フィナーレ・道中交流とその品物・デート・地点）を複製して試験用の都市を作る。開発用で、通常プレイには影響しない。仮の場面は準備中で実際のエピソードがまだない旅行編だけに作り、ミラノ編のフォルダがない場合はその旨を表示して作らない。

## レイヤー間の依存
- `screens/components` → アプリ操作サービス → `domain` 純粋関数 → `persistence`
- シナリオアダプタは Ink の `Continue/currentChoices/ChooseChoiceIndex` を包み、画面に表示用のDialogueLine・ChoiceViewを返す。
- シナリオ終了・選択効果はゲームイベントへ変換する。APの残高やイベントの可否はstory runtimeでなくdomainが判定。
- `romance` が `battle` のUIコードを直接呼ばない。クイズ結果は `GameEvent` 経由でAP付与処理へ。
- 初期から巨大なイベントバスやプラグイン基盤は作らない。

## 実装の責務分担

既存の入口を保ちながら、次の単位で処理を分担する。

- `src/app/App.tsx` は旅行編の選択と保存領域のロック、`GameApp.tsx` はゲーム画面と画面間の操作を担当する。`useGameSession.ts` が状態更新・保存・復元・削除時の競合確認をまとめ、`useTravelEffects.tsx` が成功した移動の演出を扱う。
- `src/domain/game.ts` はゲームの状態遷移を扱う。保存形式の定義は `game-state-schema.ts`、デートの条件判定は `date-rules.ts`、保存された進行の整合確認は `game-state-validation.ts` に分ける。既存の公開関数と型は `game.ts` から引き続き利用できる。
- `src/domain/travel-destinations.ts` は行き先候補と待機時刻を計算する。帰宿候補と宿泊計画は `travel-game.ts` を画面表示と実際の操作で共用し、画面内に同じルールを重複実装しない。
- `scripts/content-pipeline.ts` はコンテンツ検証・生成の実行順を管理する。Inkのコンパイルと会話経路の検証は `ink-validation.ts`、背景画像とキャラクターの参照検証は `presentation-validation.ts` が担当する。共通データと各旅行編フォルダ（`content/journeys/<journeyId>/`）の統合は `content-sources.ts`、旅行編フォルダが自分の都市だけを扱い、同じ旅行編か共通データだけを参照することの検査は `content-ownership.ts` が担当する。
- `scripts/city-bundle.ts` は都市編集の公開APIと検証手順を担当する。編集形式は `city-bundle-schema.ts`、経路の圧縮・展開は `city-bundle-routes.ts`、共有カタログの統合は `city-bundle-catalogs.ts`、競合確認と原子的なファイル更新は `city-bundle-files.ts` が担当する。交通判断台帳は旅行編の `manifest.json` の `authoring`（都市ごとの `transitDirectory`、または旅行編全体で1つの `transitDecisionLedger`）から選び、旅行編専用のツールは読み込まない。

機能を追加するときは該当する責務へ実装し、画面や入口のファイルへ個別の保存・進行・検証ルールを戻さない。分離したモジュール間で型だけが必要な場合は `import type` を使い、実行時の循環参照を避ける。

## 開発中の保存とシナリオ更新

開発中は、更新後に以前のセーブを利用できることや、自動移行を保証しない。現在のゲームセーブはv13で、v1〜v12の自動移行は行わず読み込み対象外とする（元のデータは消さず、旧版として案内する）。v13は旅行の日数・時刻・現在地と活動中の時間枠を保持する。保存先は旅行編ごとに分かれ、ミラノ編を含むすべての旅行編が `dreamscape.journey.<旅行編ID>.save.v1`（ゲーム進行）と `dreamscape.journey.<旅行編ID>.learning.v1`（英語ノート）を使う。以前のミラノ編の `dreamscape.save.v1` / `dreamscape.learning.v1` は読み込まず、消去もしない。各旅行編はWeb Locksで別タブからの同時編集を防ぐ。`schemaVersion` と保存された場面の指紋・状態を検証し、内容が異なる脚本や問題を無理に復元しない。誤字修正や改稿のたびに旧セーブ再開用のInk・定義を残すことは必須ではない。一方、読み込めるデータを更新のたびに無条件で無効化しない。

安全に読めないデータは自動削除・上書きせず、原因を断定できない場合もその旨を案内する。利用者が確認した場合だけ対象のDreamscape管理キーを消去できるようにし、別タブ競合と他アプリ・バックアップの保護を維持する。現在のバージョン内の保存・再開と二重適用防止は維持する。一般公開時には必要に応じて互換性方針を再検討する。

## UX/スマホ
- 縦画面最優先（約360〜430px幅）。PCでは適切な最大幅を設定。
- 選択肢は大きなタップ領域、文字切れ防止。読みやすい文字送り・戻れない選択時の確認・スキップ機能は段階的に実装。
- 台詞表示は行をまとめて同時に見せすぎず、状況説明→会話→選択のテンポを設計。
- 本番は静的WebサイトとしてURLでアクセス（HTML添付をiPhoneで開かせる方式に依存しない）。

## 品質
- `npm run dev` / `npm run build` / `npm run test` を初期導入。TypeScript型チェック、ユニットテスト、Inkコンパイル失敗時の検出。
- `content/` にあるサンプルは検証されるまで試作扱い。実際の実装でサンプルの見た目や数値を固定しない。
- 実際の依存バージョン、Inkコンパイラ方法、ライセンス、Vite対応をCodexが公式資料から確認し、手元で動く手順をREADMEに記録する。
