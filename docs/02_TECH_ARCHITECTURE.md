# 02 技術設計 / 第一候補

## 原則
既存リポジトリを最初に調査。作成時にはREADMEのみ確認されていたが、変更がありうる。構成が空に近い場合、以下を第一候補とする。
- Vite + React + TypeScript（ブラウザゲーム、スマホ優先、静的配信）。
- `.ink`（編集用の会話原稿）、Inkコンパイラ（ビルド時）、`inkjs`（ブラウザの実行時）。**原稿の独自パーサーを作らない。**
- `.json`（都市/観光地/クイズ/デート定義/数値バランス）。スキーマ検証（Zodなど）は必要な範囲だけ導入。
- 状態は小規模ならReact Context + useReducer等。用途が拡大してから状態管理ライブラリの導入を検討する。
- `localStorage` と `schemaVersion`。現在のゲームで作成した有効なデータの、同一バージョン内の保存・再開を維持する。将来の汎用移行基盤やJSONエクスポート/インポートは今回の必須要件ではない。
- 画像 WebP/PNG。最初はプレースホルダーで十分。写真・名画の細部を問う本番問題は、画像使用権と正確性を確認したものを使う。配信する観光写真は WebP（品質80。観察で拡大する写真は元の大きさ、ほかは幅1600px・高さ1800pxの枠）、ヒロインの立ち絵は可逆の WebP（元のPNGは配信しない `authoring/characters/` に置く）。写真の変換は `npm run images:optimize`（[CONTENT_GUIDE](../authoring/CONTENT_GUIDE.md)）。画像は旅行編ごとに分けて読み込まない（配信物の合計は約41MB、2026-11-08。分けるかどうかは、必要になったときに測り直して決める）。

## 編集元と生成物の分離
編集元 `content/journeys/<journeyId>/stories/**/*.ink` → ビルド時にコンパイル → 配信対象となる `.json` → `inkjs` 実行 → Reactで台詞と選択肢を描画 → TypeScriptのルール層にイベント通知。
- `.ink` から生成したJSONは手動で編集しない。
- `.ink` はゲームの文章と分岐を担当。AP計算/好感度/保存はTypeScript側。
- Inkのタグは制限付きのメタデータ: `speaker: heroine`, `background: milano_cafe`, `emotion: shy`, `effect: memory_milano_promise` など。場面のInkの頭に書く札（`at:`・`priority:`・`when:`・`until:`・`repeat:`）は、起きる時点・順番・条件を表し、`content:build` が条件のJSONに変えて検査する（下の「場面の時点と順番」）。選択肢の札（`option:`・`give:`・`use:`・`rel:`・`money:`・`ap:`・`set:`・`then:`・`later` など）と、選択のない効果の札（`on_done:`）はゲームへの頼みで、ビルドが選択肢ごとの表にし、ゲームが確かめてから当てる。選択肢の出る条件の札 `requires:` を満たさない選択肢は、灰色にせず隠す（理由も出さない。どの条件でも、どの場面でも。`give:`・`use:` の品物を持っていないときも同じ）。お金・AP・運賃が足りない選択肢は、隠さずに選べなくし、払いの理由を出す。
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
  brand/                # ファビコンの元画像（npm run icons:build が public/ のアイコンを生成）
  characters/           # ヒロインの立ち絵の元のPNG（配信しない。配信するのは public/assets/characters/ の可逆WebP）
  journeys/<journeyId>/ # 旅行編ごとの下書き・調査記録（ゲームは読み込まない）
  templates/sample_trip/ # 開発・テスト専用の見本の編（明示したときだけ読み、本番には入らない。npm run journey:new の元。下の「見本の編」）
public/                # ファビコン・アプリアイコン・manifest.webmanifest（index.html から相対パスで参照）
  assets/              # 全旅行編で共有する画像・音声（ヒロイン、演出、共通アイコン）
tests/e2e/             # E2E（Playwright）。段ごとのタグ（gate・debug・prod・sample・smoke）で実行を分ける（docs/10「E2Eの段」）
  explore/             # 週1回のモンキー（@explore。docs/10「探索テスト」）
tests/explore/         # 全旅行編を種付きで歩くゲーム関数の層の探索（単体テストの content の組。docs/10「探索テスト」）
tests/screens/          # 人が見る画面一覧の撮影（npm run screens。合否にしない）
tests/fixtures/         # 単体テスト用の保存データと状態（ゲームには含めない）
tests/journeys/<journeyId>/ # その旅行編だけの内容・経路・制作ツールの単体テストと補助（共通のコード・テストからは読み込まない。docs/10「旅行編ごとのテスト」）
.github/workflows/      # CI（ci.yml・e2e.yml）、週1回の探索（e2e-explore.yml）と GitHub Pages への公開（pages.yml）
```

## 共通データと旅行編フォルダ

- `content/`（`content/journeys/` を除く）は全旅行編で共有する基盤データ（共通レイヤー）。置けるのは `romance/balance.json`・`romance/response_profiles.json`・共通デート効果（`common_date_*`）・`romance/presentation.json` の共通部分（エンディング表示、感情、共通の既定背景 `default_scene`）・`romance/progression.json` の段階と告白・`learning/word-meanings.json`・`presentation/characters.json`・`presentation/own-artwork.json`（直下の `public/` が配信する、Dreamscape のために作った絵の一覧。下の「画像の出典と自作の絵」）だけ。都市・移動・Ink・クイズや旅行編専用のカタログは置けず、共通データから都市や旅行編のデータを参照することもできない（`scripts/content-ownership.ts` が検査）。
- 各旅行編は `content/journeys/<journeyId>/`（`manifest.json` で登録し、`order` の順に並ぶ）へ同じ相対配置でデータを置く（開発・テスト専用の見本の編だけは `authoring/templates/sample_trip/` に置き、明示したときだけ読む。下の「見本の編」）。`npm run content:build` が共通データと各旅行編を統合・検証して `src/content/generated/content/` に書き出し、ゲームはこの生成物だけを読む。
- 画像は、全旅行編で共有するものをリポジトリ直下の `public/`、旅行編だけが使うもの（観光写真・デート背景・その旅行編の品物アイコン）を `content/journeys/<journeyId>/public/` に、配信時と同じ相対パス（`assets/tourism/...` など）で置く。`npm run content:build` がこれらを `src/content/generated/public/`（生成物。Git管理しない）へまとめて写し（変更のないファイルはサイズと更新時刻で判定して省略し、元がなくなったファイルは消す）、Viteはこのフォルダを `publicDir` として配信・ビルドする（Viteプラグインや独自のVite処理は使わない）。同じ相対パスの画像を二つのフォルダに置くと `content:build` が失敗する。データ中の画像パスは配信時の相対パスのままで、置き場所によって変わらない。旅行編のデータが使えるのは自分の `public/` と直下の `public/` の画像だけ、共通データは直下の `public/` の画像だけ。
- 既定の旅行編（タイトル画面で最後に開いた旅行編がないとき・新しいゲーム・Debugの初期値）は、`order` 順で最初の公開中（`status: "available"`）の旅行編とその最初の都市。公開中の旅行編がない場合、`content:build` が失敗する。
- どの旅行編フォルダも単独で外せる。ある種類のカタログをどの旅行編も持たない場合（例：ミラノ編を外したときの道中交流・会話注釈・英語ノートの詳細）、統合結果は空のカタログになる。ただし統合後のスキーマ検査はそのまま適用されるため、対決・エピソード・デートなど1件以上が必要な種類は、公開中の旅行編のどれかが持っている必要がある（`scripts/journey-folders.test.ts` が各旅行編フォルダを外した一時コピーで確認する）。

### 統合の規則

`npm run content:build` は `scripts/content-sources.ts` で共通データ（`content/`、`content/journeys/` を除く）と各旅行編フォルダを `order` 順に読み、`scripts/content-layout.ts` の `CATALOG_RULES` に従って種類（相対パス）ごとに統合する。読み込んだ内容は、まず `scripts/content-ownership.ts` が所属と参照を検査し、次に統合後のデータを既存のZodスキーマと参照検査で検証する（処理の分担は[実装の責務分担](#実装の責務分担)）。

| 種類（相対パス） | 統合方法 |
| --- | --- |
| `battles/catalog.json` | `battles` を連結 |
| `encounters/catalog.json` | `items`・`encounters` を連結 |
| `encounters/entry-rules.json` | `entries` を連結 |
| `learning/details.json` | `questions` をキーごとに統合（問題ごとに学習会話の `storyId` を持つ） |
| `learning/translations.json` | `questions` をキーごとに統合 |
| `learning/word-meanings.json` | `words` をキーごとに統合（同じ内容の重複だけ許可） |
| `presentation/characters.json` | `characters` を連結、`battleCharacters`・`wardrobe.cities`・`wardrobe.scenes` をキーごとに統合。`expressionIds`・`wardrobe.regions`・`wardrobe.countries` は共通データのみ |
| `presentation/dialogue-expressions.json`・`dialogue-reactions.json`・`reasoning-intros.json` | `entries` を連結 |
| `presentation/own-artwork.json` | `artworks` を連結。ただし各層の一覧は、その層の `public/` が配信する画像だけを扱う（下の「画像の出典と自作の絵」）。どの層にもなければエラー（共通データが持つ） |
| `progression/journey.json` | `episodes`・`storyBattles`・`rewards` を連結 |
| `romance/balance.json`・`romance/response_profiles.json` | ファイル全体を共通データだけが持つ |
| `romance/date_catalog.json`・`date_destinations.json`・`effect_catalog.json` | `dates`・`destinations`・`effects` を連結 |
| `romance/presentation.json` | `backgrounds`・`memories` をキーごとに統合。`ending`・`emotions` は共通データのみ |
| `romance/progression.json` | `memoryCallbacks` を連結。`stages`・`confession`・`fallbackMemoryCallbackJa` は共通データのみ |
| `tourism/catalog.json` | `assets`・`landmarks`・`clues` を連結 |
| `journeys/catalog.json` | 各 `manifest.json` から生成（`schemaVersion`・`order`・`authoring` を除き、`order` 順） |

- 連結は共通データが先、続いて旅行編を `order` 順に並べ、ファイル内の順序を保つ。キーごとの統合で同じキーを二つの層が定義するとエラー（両方のファイル名を表示）。`schemaVersion` はファイルを持つすべての層で同じ値にする。表にないキー、共通データ専用のキーを旅行編が設定することはエラー。
- 旅行編のファイルは、自分が使うキーだけを書いてよい（例：`{ "schemaVersion": 1, "backgrounds": { … } }`）。ファイルがない層は何も加えない。共通データ専用の種類（`CORE_LAYER_KINDS`）をどの層も持たない場合は「Missing content file」で失敗する。
- 都市は `cities/<cityId>.json`、移動は同じ層の `travel/<cityId>.json` と `travel/<cityId>-settings.json`、乗り物を宣言した旅行編では交通判断台帳 `travel/<cityId>-transit.json`（下の「乗り物と交通判断台帳」。生成物には写さない）。同じ都市のファイルを二つの層に置くこと、`manifest.json` に登録していない都市を旅行編フォルダに置くことはエラー。
- Inkは各層の `stories/**/*.ink`、クイズは `quizzes/**/*.json`（`*.example.json` は例のクイズで、検証だけで出題しない）。ストーリーIDは全体で一意で、同じ相対パスのInkを二つの層に置くとエラー。クイズのファイル名はクイズID（JSONの `id`）と同じで、クイズIDは全体で一意なので、同じファイル名のクイズを別の層や別のフォルダに置くと重複したIDとして止まる。
- `*.md` とドットで始まるファイル・フォルダは読み込まない。それ以外の未知の `.json`・`.ink` はエラー。旅行編フォルダの `public/` に置けるのは `public/assets/**` だけ。旅行編フォルダのそれ以外のファイル（`public/assets/` の外に置いた画像、`.txt` のメモなど）は読み込まれも配信されもしないため、`content:build` が警告する（下の「生成時の検査と報告」）。

### 生成時の検査と報告

`content:build` はスキーマと参照の検査に加えて、旅行編フォルダの置き忘れ・取り違えを次のとおり検査する。

- エラー（生成を止める）
  - `manifest.json` の `cities[].nameJa` と、その都市の `cities/<都市ID>.json` の `nameJa` が違う（`City name differs from the manifest`）。
  - `productionStatus: "complete"` の都市に、その都市の `kind: "city_finale"` のエピソード（`progression/journey.json`）がない（`Complete city has no city finale`）。都市クリアと次の都市への出発はフィナーレの後に起きるため（エピローグは、制作者が `then: epilogue` で始める時を書いた都市ではその時、書かない都市ではフィナーレの後）。
  - データの画像（観光画像の `path`、背景の `imagePath`、品物の `iconPath`、人物画像、タイトルの絵）が、別の旅行編の `public/` の画像を指す。旅行編のデータが使えるのは自分の `public/` と直下の `public/` の画像、共通データが使えるのは直下の `public/` の画像だけ（`Reference to another layer`）。
  - `manifest.json` の `authoring` のパス（`observationFile`）が、`/` 区切りのリポジトリからの相対パスでない（絶対パス、`..`、`\` を含む）か、`authoring/journeys/<旅行編ID>/` の外を指す。`imageDirectory` は配信時のパス（`assets/` で始まる相対パス）。
  - 配信する画像が、出典つきの観光画像でも自作の絵の一覧にある絵でもない（「出典のない画像」）、その両方である、一覧にあるファイルをその層が配信していない、同じ層の一覧に2回ある（下の「画像の出典と自作の絵」）。
  - 道中交流の頭の札の誤り：知らない札、札の中の `{…}`、段階1で使えない位置（`after guide`・`after battle` など）、その段階ではまだ記録されない事実を読む条件（`flag`・`met` など）、頭の札と入場ルールの両方に書いた交流。
  - 選択肢も終わりもないまま1,000行を超える道（会話が輪になっていて終わらない。案内・到着・エピローグ・対決・道中交流・デート・反論のどれでも。場面の長さそのものは止めない）。
  - 1場面1ファイルのInk（`VAR` で始まる今の形）で `cond(` を使うのに、`EXTERNAL cond(text)` の宣言がない（直し方として、宣言の1行と、Inkyで下書きを見るための代わりの関数の2行を出す）。
  - 都市をクリアできる道がない：フィナーレが地図に出る条件（`progression/journey.json` の `when`）が、いちばんうまく遊んでも満たされない（`not` のない恋愛の値は、いつか満たされるものとして調べる。前の都市から持ち歩く品物（`"carry": "journey"`）の `held` は、その都市でくれる場面（`# on_done: item` など。本筋の場面ならその本筋に届くとき）があれば、いつか満たされるものとして調べる）。`when` と、空でない `requiredEpisodeIds` の両方を書いた。観察のない場所の `after observe`。案内のない場所に書いた `guide_read` の報酬（決して受け取れないため。設計の決定26）。
  - デートの `when`・`until`、道中交流の入場ルールの `when`、地図に出る条件（`progression/journey.json` のエピソード・特殊戦の `when`）と、場面のInkの `cond("…")`（共通条件管理システムの条件。書き方は[制作ガイドの「条件の書き方」](../authoring/CONTENT_GUIDE.md#条件の書き方)）の形の誤り（キーが1つでない、空の `all`・`any`、まだ使えない部品）、存在しないエピソード・都市・バトル・観光地・交流・デート・品物の名前、旅行編が `transportModes` に宣言していない乗り物（徒歩も数えない）、その品物の都市でない条件の `held`、同じ旅の品物の都市より後の都市でない条件の `left_behind`（`scripts/condition-validation.ts`）。入手元（交流の `completionItemId` かクイズの `rewardItemId`、場面の `on_done: item`）のない品物（`Encounter item has no source`）。
  - 1つの場面の1つの道に `then:` が2つ以上、どの選択肢も選べると示せない選択の場（場面の頭の `when:` や外側の分かれ道が保証するものは、選べると数える。`requires:` で隠れる選択肢と、お金・AP・運賃が足りずに選べない選択肢は、保証がなければ選べないと数える。`then: move` を持つ選択肢は、徒歩でも、間に合う帰り道や動いた先の本筋の支払いしだいで選べなくなるので、選べると数えない。`then:` の後は、頭の `when:` が保証するお金・AP も数えない）、条件のない `then:` の輪（行き先の時点でまた出る場面。移動の場面は、出発する場所のどれかから、`then: move` が必ずその移動と同じ乗り物で運賃なしに動くとき（徒歩の道がなく、その乗り物の運賃なしの道がほかより安いか、同じ安さで先に書いてあるときも。先に書いた同じ安さの乗り物が借りる乗り物のときや、毎回運賃がかかるときは注意）。宿の眠る前・「休む」の帰り道（`then: move` で動いた先からの次の「休む」で、その場面か、同じように動かすほかの場面がまた流れ、元の場所へ戻るとき：徒歩か、そこからのただ1つの運賃なしの帰り道。運賃がかかるとき、借りずに乗れる運賃なしの徒歩より速い帰り道があるとき、条件のある場面が入るときは注意）・フィナーレの前（その場所の `place` と窓口も）・都市の出発・エピローグの前に置いて、いつも別の場所へ動く場面も、その手順が来なくなるので止める。エピローグは、それを読まずに都市を出られない都市だけ）、告白のデートの中の `# profile:`、観光地の `order` とその場所の部分（案内・観察・対決）が合わない、バトル・デートの地図に出る条件を Ink の頭の `when:` と JSON の両方に書いた、`ap:` の数の誤り（0、符号のない数、上限の12を超える増やす数）、作者の報酬（`progression/journey.json` の `rewards`）に書いた `scene_tag`、場面の札の AP の決まりの ID が、ほかの決まり・作者の報酬・特殊戦の報酬の ID と重なる（選択肢 ID の `on_done` と頭の `on_done: ap`、名前の中の `__` で起きる）、行き先の決まらない `->`（変数の行き先など）、`then: epilogue` を書いた都市でそれを持つ場面にどう遊んでも届かない（エピローグの後に自動で出発する旅の都市と、旅の最後の都市）、時点にない位置（`visit` の `after date`、宿の `after battle`、移動・窓口・出発の正の数 など）。
- 統合したカタログのスキーマエラーは、問題の項目を持つファイルごとに `Invalid content in <ファイル>:` で始まるまとまりで示し、位置（`path`）はそのファイルの中での位置にする（例：旅行編の最初の対決なら、統合後の `battles[9]` ではなく `battles[0]`）。統合後の位置は、エラーの `cause` に残る。
- 警告（生成は続ける。件数を表示し、`npm run content:build -- --verbose` で一覧。判定は `scripts/content-report.ts`）。警告があっても、単体テスト（`test:quick`・`npm test`）・CI・`npm run verify`・公開は失敗しない。直すかどうかは制作者が一覧を見て判断する
  - 旅行編フォルダの読み込まれず配信もされないファイル（上の「統合の規則」）。
  - データからもゲームのコードからも参照されない、旅行編の `public/` と直下の `public/assets/` のファイル（参照されないまま公開される）。コードが自分で使う画像（演出の画像・既定の品物アイコン）は `src/content/code-images.ts` に一覧し、`src/content/code-images.test.ts` が、それらが直下の `public/` にあることと、ほかのコードが配信パス（`assets/…`）を直接書いていないことを確かめる（開発サーバーは存在しない画像にもページを返すため、ブラウザでは欠落に気付けない）。直下の `public/` のブラウザのアイコンとWebアプリのマニフェストは `index.html` が参照し、`scripts/app-icons.test.ts` が検査するため対象外。
  - `npm run images:optimize` で軽くできる観光写真：JPEG・PNG の写真と、観察で拡大しないのに幅1600px・高さ1800pxの枠を超える WebP の写真（観察で拡大する写真は、観光地の `imageAssetId` と、公開前の都市の観察資料 `authoring.observationFile` の画像。仮の画像（`isPlaceholder`）と見本の編の画像は対象外。判定は `scripts/image-optimization.ts`。観察資料は `authoring/` にあるので、この判定だけはそれも読む）。
  - `authoring.eventPrefix` を持つ旅行編の、接頭辞の決まり（下の「ストーリーIDとIDの名前空間」）に合わないID。既存の例外は `scripts/content-report.ts` の `UNPREFIXED_ID_EXCEPTIONS` に挙げ、新しいIDは例外に足さず接頭辞を付ける。例外に挙げたIDが実データから無くなると、単体テスト（`scripts/content-report.test.ts`）が失敗する（使われない例外を残さないため）。
  - `manifest.json` の `transportModes` に宣言したのに、その旅行編のどの都市の経路にも使われていない乗り物（`unusedTransportModes`。経路を足すか、宣言を消す）。
  - その位置では決して満たされない条件（本筋が書く記録を、それより前の交流が条件にしている など）、「また今度」の後にもう来ない時点、別のファイルどうしの同じ優先度、`until` のない繰り返し（観光地の訪問だけでなく、デート・フィナーレ・エピローグ・宿・移動などどの時点でも）、決して流れない時点（次の都市のない都市の `depart`、入場料のない場所の `ticket`、到着のない都市の `arrive`、その乗り物の経路が `from`・`to` の間にない `trip`）。
  - データの欄の言葉：日本語の欄（`titleJa`・`descriptionJa`・`hintJa`・出典の `claimJa` など「…Ja」の欄と、道中交流の選択肢の `# translation:`）に日本語がない、クイズの英語の欄（問題文・選択肢と、英語ノートの英文）が英文になっていない（画面は文字をそのまま出すので、止めない）。
  - 決して満たされない条件（`never-offered`。`scripts/condition-validation.ts` の `conditionWarnings`）：観察だけで調べる道中交流の `when` が、その交流の観光地のエピソードやバトル（観察の後にしか遊べない）を必ず要る、同じ旅の後の都市の進行・品物を前の都市の条件が必ず要る、暦（`startWeekday`）のない旅の `journeyDay`・`weekday`、互いを待つデート（`datePlayed` の輪）。今はミラノの5つの交流（`duomo_string`・`supper_pantomime`・`castello_pick`・`scala_mint`・`brera_sitter`）がこれに当たる。
  - デートの `when`・`until` の `time`・`rides`・`money`（`date-condition-trip`）：行き先へ向かう移動で変わるので、地図は出発前の状態で出し、着いてから始めるときに調べ直すと始まらないことがある。
  - `cond("…")` の文字が5つ以上ある場面（`cond-walk-partial`）：全部の組み合わせではなく、どの文字も真と偽を少なくとも1回ずつ通る組み合わせで、全部の道を確かめた（4つまでは全部の組み合わせ）。
  - 都市のクリアに要る出る条件が、二度と満たされなくなるおそれ（お金を使う・品物を渡す・使う、交際した・デートを遊んだ（`not couple`・`not date` など）で偽になり、ほかの道がない）。前の都市から持ち歩く品物の `held` は、前の都市の選択肢や場面の終わりで渡す・使うことがあるときも含む。
  - 前の都市の品物が要る都市（`earlier-item-start`）：都市のクリアに要る条件が、前の都市の品物（持ち歩く品物の `held` や、渡した・使ったなどの履歴）を読み、ほかの道がない。ふつうの遊びはいつも最初の都市から始まるが、Debug で後の都市を選んだときや探索テストの後の都市からの開始は、前の都市の品物を持たないことがあり、そのときはクリアできない（止めない）。
  - 恋愛の値（交際・関係値など）がそろわないとクリアできない都市（デートを遊ばない人はクリアできない）。
  - 見つけられない手がかり（観察のない場所の手がかり、どの観察でも見つけられない手がかりを使う問題・特殊戦の証拠）。
  - エピローグの後に自動で出発する旅で、エピローグの後に遊べなくなるバトル。
  - 決して開かないデート（開く条件が、どう遊んでも満たされない）。
  - お金で詰むおそれ（都市のクリアに要る出来事を、デートなどを先に遊んだ後に払いきれないことがある。予算は最後のバランス調整で決めるので、止めない）。
  - AP で詰むおそれ（都市のクリアにデートが要るとき、ほかのデートや場面の札で AP を先に使い切ると、そのデートを遊べなくなることがある。止めない。場面の札の AP は段階3から数える）。
  - `then:` で流れなくなる場面（`then:` を持つ場面や選択肢の後に、同じ時点で流れうる場面や本筋があるとき。払った運賃・入場料は戻らない）、`ap:` の減らす数が上限（12）より大きい（その選択肢はいつも選べない）、条件しだいで抜けられる `then:` の輪、バトルより後の観察でしか見つけられない手がかり、プレイヤーが出発を選ぶ旅の途中の都市で、エピローグを始める場面に届かない、日本語を含まない `# title:`、AP を使う特別なデート（通常デートでないデートの AP が0でない。AP が足りないと始められない）、噛み合いの結果で返事が変わらない（`# profile:` の選択肢の後の返事が、`romance_result` の `positive` と `negative` で同じ。道中交流とデートでは、それまではエラー）。
- 成功すると、旅行編ごとに1行、そのフォルダが持つ都市・ストーリー・クイズ・配信ファイルの数と、各カタログの項目数（0件の種類は省略）を表示する（見出しは旅行編の日本語名とID。例：`Journey ウズベキスタン編（uzbekistan） (preparing): cities 4, stories 0, quizzes 0, public files 40; destinations 24, backgrounds 44, assets 40`）。置き忘れや、空のまま公開しかけていることに気付くための表示。観光の手がかり（`clues`）の後には、そのうち問題と結び付かない観察だけの手がかりの数を出す（0件なら省略。`clues 29, observation-only clues 29`。[観察だけの手がかり](07_DATA_AND_TESTS.md#観察だけの手がかり)）。
- 語の意味（共通の `learning/word-meanings.json` と旅行編の断片）のうち、どの英文にも出ない語があれば、その数を表示する（一覧は `--verbose`。判定は `scripts/content-report.ts` の `unusedWordMeanings`）。対象の英文は、クイズの問題文・選択肢（例のクイズ `*.example.json` を除く）と、道中交流の問題・選択肢（カタログの `textEn` と、そのInkの選択肢の文）。使われない語は害がないため警告ではなく、消すかどうかは制作者が判断する。

### 画像の出典と自作の絵

- 配信する画像（直下の `public/` と各旅行編の `public/` にある `.png`・`.webp`・`.jpg`・`.jpeg`・`.svg`・`.gif`・`.avif`・`.ico`）は、どれも次のどちらか一方に当たる。判定は `scripts/image-rights.ts` の `checkImageRights`（単体テスト `scripts/image-rights.test.ts`）。
  - 出典つきの観光画像：その旅行編の `tourism/catalog.json` の `assets` に、作者・出典・ライセンス・加工・確認日とともに登録した画像（[CONTENT_GUIDE](../authoring/CONTENT_GUIDE.md)）。共通の `public/` には置かない。
  - Dreamscape のために作った絵：その画像を配信する層の `presentation/own-artwork.json` に、配信時のパスを1行ずつ書いた絵。直下の `public/` の絵は共通データの `content/presentation/own-artwork.json`、旅行編の `public/` の絵はその旅行編の `content/journeys/<旅行編ID>/presentation/own-artwork.json`。形式は `{ "schemaVersion": 1, "artworks": [{ "noteJa": "日本語の説明", "paths": ["assets/…"] }] }`（`src/content/own-artwork-schema.ts`）。ヒロインの立ち絵、仮の立ち絵、漫符、品物のアイコン、ブラウザのアイコン、作者が用意したタイトルの絵がここに入る。
- `content:build` は、どちらでもない画像（「出典のない画像」）、両方である画像（「画像の扱いが二重です」）、一覧にあるのにその層が配信していないファイル（「自作の絵の一覧にあるファイルがありません」。古い行が、後で同じ名前で置いた別の画像を覆わないように）、同じ層の一覧に2回あるファイルを、1つのエラーにまとめて示して止まる。画像でない配信ファイル（`manifest.webmanifest`）は対象外。画像を足す・消す・名前を変えるときは、同じ変更で一覧も直す。
- 自作の絵は、出典の一覧（クレジットの画面）に載せない。観光画像の一覧のために、`content:build` は旅行編ごとの観光画像のIDの一覧 `src/content/generated/image-journeys.json` を書き出し、`src/content/credits.ts` の `photoCredits` が読む。
- 「出典・権利の一覧」（`src/app/CreditsDialog.tsx`）：タイトル画面の注記の下と、⚙設定 →「ゲームの設定」のデータの項目の上から開く（設定から開くとゲームの設定は閉じ、閉じると⚙設定へフォーカスが戻る）。共通の枠（`Modal`・`ModalTitle`）で、写真は `photoCredits` の旅行編ごとの開閉（各行は `ImageCredit`、元の画像のリンクは「元の画像：{Commonsのファイル名}」）、地図（`MAP_CREDIT`）、文字（`FONT_CREDIT`）、ライブラリ、自作の絵の注記（`OWN_ARTWORK_NOTE_JA`）を並べる。ライブラリは本番ビルドだけ開いたときに `${BASE_URL}third-party-licenses.json` を読み（`parseThirdPartyLicenses`）、名前・版・識別子の開閉に本文を入れる。開発サーバーでは公開版に出ると書く。準備中の旅行編のタイトル（`PreparingJourney`・`UnavailableJourney`）には入口を置かない。
- ライブラリのライセンス：本番ビルドは `vite.config.ts` の `build.license` で、使っているライブラリの名前・版・ライセンスと本文の一覧 `dist/third-party-licenses.json` を書き出す（開発サーバーにはない）。`npm run dist:check` が、それが読めるJSONの配列で、各項目に名前・版・識別子・本文があり、`package.json` の `dependencies` のすべてが載っていることを確かめる（`scripts/dist-guard.ts` の `checkThirdPartyLicenses`）。

- 自由時間の背景：都市ファイル `cities/<cityId>.json` の任意の `backdropAssetId` に、同じ旅行編の `tourism/catalog.json` の観光画像のIDを書く（別の旅行編の画像は持ち主の検査、知らないIDは検証が `content:build` のエラーにする）。仮の画像（`isPlaceholder`）も書けるが、ゲームは無地で表示する（`journey:new` で複製した写真はみな仮の印が付くため）。なければ無地の背景。今はミラノが `duomo_milano_photo`、見本の街が時計塔（`journey:new` がIDを書き換える）。読むのは `src/content/city-backdrop.ts` の `getCityBackdrop`、行の写真は `src/content/place-photo.ts` の `getPlacePhoto`（その場所の最初の観光地の写真、なければ背景。仮の画像は飛ばし、宿は写真なし）。

### 乗り物と交通判断台帳

旅行編の移動手段は、徒歩（`walk`。どの旅行編にもあり、宣言しない）と、`manifest.json` の `transportModes` に宣言した乗り物（2つまで）。都市間の移動（`intercityModes`）は別の仕組みで、ここには含めない。

- 宣言：`transportModes` は `{ id, nameJa, movingJa, kind, rental? }` の配列（宣言しない旅行編は `[]`）。`id` は英小文字で始まる旅行編の中だけのID（`walk` 以外。接頭辞は付けない。保存データ（借りた乗り物）に入るので、公開したあとは変えない。絵の種類と同じ名前でもよい（ミラノの `tram`）。ただし見本の編の任意の部分の乗り物は、外すときにIDと同じ文字列を消すので、絵の種類と違うIDにする（`rental_bicycle`。`journey:new` の写しも同じID））、`nameJa` は経路のボタンと行き先の行に出る名前（例「路面電車」）、`movingJa` は移動中の演出の文字（例「路面電車で移動中」）、`kind` は演出の絵（`rail`・`tram`・`bus`・`car`・`three_wheeler`・`bicycle`）。宣言の型は `src/content/transport-schemas.ts`、名前と絵の読み出しは `src/content/transport.ts`（`getTransportModes`・`transportLabel`）、絵は `src/features/journey/transport-art.tsx`。
- 経路：`travel/<cityId>.json` の経路の `mode` は `walk` か宣言した `id`。路線や乗り降りの場所は経路の `transferNote`（例「16番」「24番・ミッソーリから乗る」）に書き、ボタンでは名前の後に（ ）で出る。
- 借りる乗り物（仮の仕組み）：`"rental": true` の乗り物は、借りるまで乗れない。借りる場所と料金は `travel/<cityId>-settings.json` の `rentals`（`{ modeId, placeIds, cost, sources }`）。滞在先などで1回払って借りると、その都市を出発するまで乗れる（保存データ `travel.rentedModeIds`。次の都市へ出発すると返す）。借りなくても、どの地点へも行けて宿に帰れること（徒歩と借りない乗り物の経路で）を `content:build` が確かめる。借りた乗り物は帰りの交通費の確保（`returnReserve`）と宿への帰り道に加わるが、借りるまでは加わらない（`src/domain/transport.ts` の `getUsableRoutes`）。乗り物に乗った回数は都市ごとに保存する（`travel.rideCounts`。徒歩以外の乗り物で場所が変わった移動だけを数え、次の都市へ出発すると空になる）。乗車イベントや、借りる条件の細かい指定は、共通の条件の仕組みで後から扱う。
- 宿への帰り道（「休む」の一覧、帰りの交通費の確保 `returnReserve`、時間内に帰れるかの判定）：直接の経路と、乗り物の後に宿まで歩く経路から作り、同じ乗り物の中では時間か料金で得のある候補だけを残す。さらに、宿まで直接歩けるときは、その徒歩より速くも安くもない乗り物の候補（直通も乗り継ぎも）を出さない（規則a。2026-11-08 のユーザー判断）。比べる相手はその直接の徒歩だけで、ほかの乗り物どうしでは比べない。借りていない乗り物は、もともと候補に入らない。徒歩は無料で、外した候補より遅くないので、帰りの交通費の確保・時間内に帰れるかの判定・宿泊の計画は規則aがないときと同じになる（`src/domain/travel-routes.ts` の `findTravelHomeRoutes`。全旅行編と見本の編の全地点で `src/domain/home-route-rule.test.ts` が確かめる）。ミラノ編の「休む」の一覧は13地点で23件から19件になった。
- 交通判断台帳：乗り物を宣言した旅行編は、都市ごとに `travel/<cityId>-transit.json`（`schemaVersion: 2`、`cityId`、出典の一覧 `sourceRefs`、判断 `decisions`）を置く。判断は、地点の組（向きを区別）×宣言した乗り物ごとに1件で、`status` は `available`（経路あり）・`not_suitable`（使わない）・`not_applicable`（走っていない）・`inconclusive`（特定できず）。`available` と経路の有無は一致させ、`available` 以外には事実の出典（`claimType: "documented_fact"`）を付ける。台帳のある都市で徒歩の経路がない向きは、`content:build` の注意に出す（都市ごとに向きの数と最初の1つ。どの地点へも行けることは、徒歩か借りない乗り物の経路があるかを確かめる別の検査が止める）。台帳の理由で徒歩と比べる組（「歩いて◯分で着く」など）には徒歩の経路を置く（制作の点検で見る）。`checkedAt`（確かめた日）と日本語の理由 `reasonJa` は必須。`inconclusive` は生成を止めないが、`journey:readiness` が公開前の問題（`transit_inconclusive`）として示す。検査は `scripts/transit-ledger.ts`・`scripts/transport-validation.ts`。
- 経路の出典：宣言した乗り物の経路は、ゲーム用の推定の印（`"estimation": "game_model"`）と、事実の出典（`documented_fact`）を1つ以上持つ。印か事実の出典のない経路は `content:build` の注意に出す（都市と乗り物ごとに本数と最初の1本。生成は止めない）。資料のない仮の値は、台帳の理由にそう書く。ゲーム用の推定の経路が仮説（`hypothesis`）の出典を持つことは、経路の形式の決まりとして止める。
- 制作ツール：`npm run journey:transit -- --journey <旅行編ID>` が、都市ごと・乗り物ごとの判断の件数と、徒歩の経路がない向き・出典のない経路（どちらも注意）を示す（`--json` も可。「特定できず」の判断があると終了コード1）。都市別の作業用JSON（[CITY_BUNDLES](../authoring/CITY_BUNDLES.md)）の `transitDecisions` は、その都市の台帳に書き出す。

### 生成物（手動で編集しない）

`src/content/generated/` は `npm run content:build` の出力で、Git管理しない。`npm run dev`・`npm test`・`npm run test:quick`・`npm run build`・`npm run verify` は先に生成する。単体テスト（`npm test`・`npm run test:quick`）と `npm run verify` の最初の生成は見本の編を含め（`--with-sample`、下の「見本の編」）、`npm run dev`・`npm run build` は含めない。

- `stories.json`（コンパイル済みInk）、`quizzes.json`（出題するクイズ）、`scene-conditions.json`（場面のInkの `cond("…")` の文字と、その条件のJSON。ストーリーごとの文字の一覧も。ゲームの `src/domain/scene-conditions.ts` が読む）。
- `content/`：統合・検証済みのカタログを、旧 `content/` と同じ相対パス（`battles/catalog.json`、`cities/delhi.json`、`journeys/catalog.json` など）で書き出した写し。都市・移動ファイルは元のバイト列のまま写す。ゲームと参照だけの単体テストはここだけを読む（`scripts/content-boundary.test.ts` が検査）。
- `public/`：直下の `public/` と各旅行編の `public/` を集めた配信フォルダ（`vite.config.ts` の `publicDir`）。
- `public/assets/derived/<journeyId>/`：観光写真の縮小版（UI 段階1.4）。検査の後に `content:build` が作り、`content/` にもGitにも書かない。自由時間の行き先の行の写真（`<assetId>.card.webp`。240×160に切り抜き）と都市の背景（`<assetId>.backdrop.webp`。長い辺を1280pxに縮め、拡大しない）で、どちらもWebP（`sharp`）。元の画像のSHA-256と設定ごとに `node_modules/.cache/dreamscape/derived-images` に置いて使い回し、使わなくなった縮小版は他の生成物と同じく消す。パスは `src/content/code-images.ts` の `derivedImageFile` だけが組み立てる（`src/content/derived-images.ts` の `derivedImagePath`）。出典は元の写真のもので、自由時間の「写真の出典」は縮小・切り抜きして表示していることも書く。
- `image-journeys.json`：旅行編ごとの観光画像のIDの一覧（上の「画像の出典と自作の絵」）。
- `build-info.json`：生成に含めた `content/journeys/` の外の旅行編フォルダ（`{ "extraJourneyFolders": { "sample_trip": "authoring/templates/sample_trip" } }`、なければ空）。

`stories.json`・`quizzes.json`・`scene-conditions.json` は毎回書き直す。`content/`・`public/` は変更のないファイルを書き直さず、元がなくなったファイルを削除する。JSONや画像を編集した後も、Inkと同様に `npm run content:build` を実行する。

### ストーリーIDとIDの名前空間

- ストーリーIDは、その層の `stories/` からの相対パスから `.ink` を除いたもの（例：`content/journeys/milano/stories/dates/milano_date_cafe.ink` → `dates/milano_date_cafe`）。旅行編フォルダ名は含まない。複数の旅行編が `stories/battles/` のような同じフォルダ名を使えるため、ファイル名（または旅行編専用のサブフォルダ）でIDが重ならないようにする。1つのファイルに場面をいくつも書く「場所のファイル」（`places/<頭>_<場所>`）では、場面の住所は「ストーリーID＋knotの名前」で、knotの名前が場面のIDになる（保存に入る。扱いは [必要な安定ID](07_DATA_AND_TESTS.md#必要な安定id) の道中交流のIDと同じ）。knotの名前を変えると、その場面を記録したセーブは、理由を出して再開を断る（データは残す）。ファイルの間で移すだけなら、場面のIDは変わらない。
- 都市・地点・観光地・発見・画像・背景・思い出・効果・デート・行き先・エピソード・報酬・対決・クイズ・問題・道中交流・品物・旅行編のIDは、すべての旅行編で共有する一つの名前空間にある。保存データもこれらのIDを記録するため、公開後は変更しない（例外として、セーブ版 v14 で一度だけ改名した。以後は変えない。[セーブの版](07_DATA_AND_TESTS.md#セーブの版)）。乗り物のID（`transportModes[].id`）は旅行編の中だけで一意（2つの旅行編が同じ `taxi` を使える）だが、保存データ（`travel.rentedModeIds`・`travel.rideCounts`）に入るので、同じく公開後は変えない。品物を渡す・使う道中交流の選択肢のID（Inkの `# option:`）も保存データ（`itemUses`）に入るので、公開後は変えない。
- 新しい旅行編では、`manifest.json` の `authoring.eventPrefix` と同じ接頭辞をIDとストーリーのファイル名に付けることを推奨する（インド編 `gt_`、ウズベキスタン編 `uz_`、ルアンパパーン編 `lpb_`）。地点ID（観光地・デートの行き先・移動の地点）は都市IDを接頭辞にする（例：`delhi_red_fort`）。都市ごとに1本のストーリーは都市IDをファイル名にしてよい（例：`arrivals/delhi`・`epilogues/delhi`）。英語ノートの話題ID（`learning/details.json` の `topics[].id`）も全旅行編で重ならないよう同じ接頭辞を付ける（例：`gt_which_subject`）。ミラノ編は接頭辞を持たない。ストーリー・クイズ・問題は下の「IDの付け方」に合わせて頭を `milano` にした（セーブ版 v14）。対決・デート・エピソード・報酬などのIDは作成時からの名前（`milano_duomo_01` など）のままで、効果・思い出・英語ノートの話題・背景の一部には `sound_` が残る（Inkのタグと保存データに入る名前のため）。`authoring.eventPrefix` を持つ旅行編でこの決まりに合わないIDは、`content:build` が警告する（ミラノ編は接頭辞を持たないため対象外。既存の例外は `UNPREFIXED_ID_EXCEPTIONS`）。対象は、カタログの項目のID（対決・道中交流・品物・人物・エピソード・報酬・デート・行き先・効果・画像・観光地・発見）、背景・思い出、英語ノートの話題、ストーリー、クイズと問題、都市の `firstClearReward.rewardSourceId`、移動の地点とイベント。

### IDの付け方

会話（ストーリー）・クイズ・問題の名前は、すべての旅行編で「頭 ＋ 役割 ＋ 場所・話題」の形にする。頭は `<接頭辞>_<都市ID>`（例：`gt_delhi`、`smp_mihon`）。接頭辞を持たないミラノ編は、都市ID `milano` を頭にする。同じ文を見本の編の [README](../authoring/templates/sample_trip/README.md#idの付け方) にも置いている。

| 種類 | ストーリーID（`stories/` の下の場所と同じ） | クイズID（ファイル名も同じ） |
| --- | --- | --- |
| 通常戦 | `battles/<頭>_main_<観光地>` | `<頭>_main_<観光地>_quiz` |
| 特殊戦B・C | `battles/<頭>_special_b_<観光地>`（Cは `special_c`） | `<頭>_special_b_<観光地>_quiz` |
| 特殊戦の反論の場面 | `battles/<特殊戦の名前>_rebuttal` | なし |
| 都市フィナーレ | `battles/<頭>_finale` | `<頭>_finale_quiz` |
| 観光案内 | `tourism/<頭>_<観光地>_guide` | なし |
| デート・恋愛の出来事 | `dates/<頭>_date_<行き先・出来事>` | なし |
| 道中交流 | `encounters/<頭>_<交流>`（くじの結果は `_won`・`_lost`・`_already`） | なし |
| 到着・エピローグ | `arrivals/<都市ID>`、`epilogues/<都市ID>`（宿の場所のファイル `places/<頭>_hotel_hub` の knot `<頭>_arrival`・`<頭>_epilogue` にも書ける。インド編） | なし |
| 場所のファイル（その場所の場面をまとめる） | `places/<頭>_<場所>`（場所は観光地・デートの行き先・地図の地点のIDから都市名を除いた名前。例：`places/gt_delhi_red_fort`、`places/gt_delhi_lodhi_garden`、`places/gt_delhi_hotel_hub`）。一つの場所の場面は、`_<内容>` を付けた別のファイルに分けてもよい（例：宿の屋上の告白と「待って」の後の `places/gt_delhi_hotel_hub_dates`） | なし |
| 英語ノートの解説 | `learning/<頭>_english`（編に1本だけなら `learning/<接頭辞>_english` でもよい。2本目からは `learning/<頭>_<話題>_english`） | なし |

- 使う文字は英小文字・数字・`_` だけ。英語のレベル（`B1`）や連番（`_01`）は名前に入れない。番号で区別せず、違いを表す語を選ぶ。
- 会話の名前の「観光地」は、観光地IDから都市名を除いた名前（`delhi_red_fort` → `red_fort`）。ミラノは対決IDで使っている短い名前（`duomo`、`galleria`、`last_supper`、`castello`、`la_scala`、`brera`）。デートの「行き先・出来事」は、行き先IDから都市名を除いた名前。2つのデートが同じ行き先を使うときや行き先がないときは、出来事を表す語（`milano_date_confession`）。
- 通常戦の会話の名前は、その観光の出来事・エピソードのIDと同じにする（`journey:scaffold` も同じ名前を作る）。
- クイズのファイル名はクイズIDと同じにする（`quizzes/<クイズID>.json`、例のクイズは `quizzes/<クイズID>.example.json`）。違うと `content:build` が止まる。

問題ID ＝ `<頭>_<観光地>_<要点>`。対決のクイズ・例のクイズ・道中交流のクイズに使う。

- 問題IDの「観光地」は、もっと短くしてよい。観光地IDの中の続いた語を使う（例：`agra_fort` → `fort`、`taj_mahal` → `taj`、`city_palace` → `palace`）。1つのクイズの中では同じ名前を使う。都市フィナーレは `finale`。
- 特殊戦B・Cの問題は、観光地のあとに `b`・`c` を付ける（例：`milano_last_supper_b_slow_revision`、`smp_mihon_market_b_q1`）。同じ観光地に対決が3つあっても分けられる。
- 例のクイズの問題は、観光地のあとに `example` を付ける（例：`milano_last_supper_example_dry_technique`）。
- 道中交流のクイズの問題も同じ形（例：`milano_galleria_bull_city`）。
- 要点は短い英語（1〜3語。数字も使える。例：`gt_delhi_qutb_iron_pillar_fence` の `iron_pillar_fence`、`gt_delhi_humayun_1857_arrest` の `1857_arrest`）か、`q1`〜`q5`。
- 問題IDは、すべての旅行編を通して重ならないようにする（本番のクイズと道中交流のクイズの問題は `content:build` が調べる）。問題IDの形そのものは検査しない。
- 対決・エピソード・地図の出来事・報酬のIDも、同じ役割の語をそろえる（見本の編：`smp_mihon_main_clock_tower`、`smp_mihon_special_b_market`、`smp_mihon_special_c_library`）。ミラノ編の対決・デート・エピソードなどのIDは保存データに入るため、この決まりに合わせて変えていない（上の項目）。

### 予約された名前

- `content/journeys/<旅行編ID>/manifest.json`：旅行編の登録。フォルダ名と `id` を一致させる（英小文字で始まり、英小文字・数字・`_` のみ）。`manifest.json` のないフォルダはエラー。
- `content/journeys/catalog.json`：旧来の一括登録ファイル。置くとエラーになる（一覧は各 `manifest.json` から生成する）。
- 共通デート効果 `common_date_*` は共通データの `romance/effect_catalog.json` 専用。共通の既定背景 `default_scene` は共通データの `romance/presentation.json` に必ず置く（下の「既定背景とタイトルの絵」）。
- Debugの「仮の場面」は、準備中の旅行編の都市ごとに `<都市ID>_episode`・`<都市ID>_battle`・`<都市ID>_special_b`・`<都市ID>_date` など `<都市ID>_` で始まるID（試験用の都市では `test_`）と、`<都市ID>/guide` などのストーリーIDをメモリ上だけで作る。準備中の旅行編の正式データには、上の接頭辞（例：`uz_`）を付けたIDを使う。
- 仮の場面（`src/dev/test-cities.ts`）と一部の単体テストは、実在する1都市のデータを役割ごとに複製して試験用の都市を作る。Debug（確認用）の機能で、通常プレイには影響しない（Debugは自分のページで動き、「通常プレイに戻る」でページごと離れる。仮の場面は共有のカタログをメモリ上で書き換えるため、通常のゲームと同じページでは動かさない）。元にする都市は `src/dev/fixture-template.ts` の `findDebugTemplate` がデータから選ぶ。候補は、見本の編が読み込まれていれば（`npm run dev:sample`・単体テスト。見本の旅行編IDを比べるのは開発時（`import.meta.env.DEV`）だけで、本番のDebugには見本も、そのIDの文字列もない）その都市、なければ公開中の旅行編を `order` 順・都市順に見て、必須の役割をすべて持つ最初の都市（今のデータではミラノ）。必須の役割は、案内と対決のある観光地の通常エピソード、その出来事の地点と徒歩の経路、エピローグのある都市フィナーレ。任意の役割（特殊戦B・特殊戦C、品物をくれる道中交流、デート）は元の都市にあるものだけを作り、ないものはDebugの「場面の確認」に注記して、場面の一覧では選べないことを示す（例：ミラノ編がない構成ではインド編のデリーが元になり、特殊戦と道中交流の仮の場面はない）。条件を満たす都市がなければ、その旨を表示して作らない。ミラノのIDを使うテストは `installTestCity({ templateCityId: "milano" })` と元の都市を明示する。仮の場面は準備中で実際のエピソードがまだない旅行編だけに作る。
- 旅行編ID `sample_trip`、接頭辞 `smp_`、都市ID `mihon`、並び順 `order: 9000` は、開発・テスト専用の見本の編（`authoring/templates/sample_trip/`、下の「見本の編」）のために予約する。`content/journeys/` には置かず、本番には含めない。`npm run journey:new` は、`sample_trip`・`smp`・`mihon` を旅行編ID・都市ID・接頭辞のどれに指定しても拒否し（`_` で区切ったIDの一部としても。`sample_trip` はどこに含んでも、本番の `dist/` の検査に掛かるため拒否する）、新しい旅行編に `order: 9000` を使わない。
- 本番ビルド（`npm run build`・`npm run verify`）は `vite build` の後に `scripts/check-dist.ts` で `dist/` を検査する。Debug（「場面の確認」・Debug起動URL・場面の組み立て部品・仮の場面。`src/dev/`）と素材のプレビューは、Debugモード（下の「UX/スマホ」の「Debugモード」）のために本番にも入るが、`src/main.tsx` の2つの `React.lazy(() => import("./dev/…"))` だけから読み込む別のファイル（チャンク）に限る。検査は目印の文字列の2つの一覧で行う。(1) 本番に入れないもの（`devOnlyMarkers`）：テスト用の読み取り口 `src/dev/debug-hook.ts` の `__dreamscapeDebug`（`DebugMode.tsx` が開発時（`import.meta.env.DEV`）だけ付けるので本番では省かれる）、見本の編の旅行編ID `sample_trip`（画像フォルダ名にも使う）、テスト用の仮データ（`src/content/test-fixtures.ts`）と開発・テスト用のファイルのパス（`src/dev/`・`tests/fixtures/`・`tests/journeys/`。ソースマップなどに出る）。公開されるどのファイルの名前か内容にあってもビルドを失敗にする。(2) Debug・プレビュー・場面の組み立て部品・仮の場面（`lazyDebugMarkers`）：タイトル画面ですぐ読み込むファイル（`index.html` 自身と、それが `<script type="module" src>`・`<link rel="modulepreload">`・`<link rel="stylesheet">` で読み込むファイル。`eagerFiles`）にあれば失敗にする（静的な `import` でDebugがタイトル画面に入るのを防ぐ。遅れて読み込む別のファイルにあるのはよい）。ライブラリのライセンス一覧 `third-party-licenses.json` がないか、`package.json` の `dependencies` のどれかが載っていないときも失敗にする（上の「画像の出典と自作の絵」）。検出に使う文字列と由来のファイルは `scripts/dist-guard.ts` にあり、由来のファイルから文字列が消えると `scripts/dist-guard.test.ts` が失敗する。同じテストは、本番のコードが `src/dev/` を `src/main.tsx` の2つの動的な `import` からだけ読み込むこと（`?debug` は開発サーバーか、Debugモードがオンの端末だけで開く式も含めて固定する）、読み取り口が開発時だけ付くこと、`src/dev/` のうち本番に入るファイル（単体テスト以外。下のフォルダのファイルも含む）が `tests/` とテスト用の仮データを読み込まないことも確かめる（`tests/` のパスの目印はソースマップにしか出ないため）。どの一覧でどのファイルを調べるかは `checkDist` が決め、`scripts/check-dist.ts` はフォルダの全ファイルを渡すだけにする（同じテストが小さなビルドでこのコマンドも実行する）。旅行編ごとのテストの補助（`tests/journeys/<旅行編ID>/` の `test-journey.ts` など）は自分の目印を持たない。旅行編を外すときにそのフォルダを消しても、`scripts/dist-guard.ts` を直さずに済むようにするためで、パスには `tests/journeys/` の目印が出て、読み込みは上の検査が止める。検出は目印による確認で、開発用のコードが入ったことを必ず見つけるものではない（目印を持たない新しいファイルや、目印の部分が使われずに省かれたコードは見逃す）。`src/dev/` などにDebug・テスト用のファイルを足したら、そのファイルに固有の文字列も、本番に入れないものか遅れて読み込むものかに分けて目印に加える（旅行編ごとのテストのフォルダの補助は除く）。

### 新しい編を追加する手順

新しい旅行編は、見本の編 [`authoring/templates/sample_trip/`](../authoring/templates/sample_trip/README.md) を複製する `npm run journey:new` で作る。見本は1都市で観光案内・通常戦・デート・都市フィナーレ・エピローグまで遊べる20ファイルと、任意の特殊戦B・C・道中交流を持ち、その README に必須のファイルと、外したときに `content:build` が出すエラーを一覧している（下の「見本の編」）。各ファイルの書き方は見本で確かめられ、`npm run dev:sample` で実際に遊べる。

1. 旅行編ID・都市ID・IDの接頭辞と日本語名を決め、`npm run journey:new -- <旅行編ID> --name <旅行編の日本語名> --city <都市ID> --city-name <都市の日本語名> [--prefix <接頭辞>] [--with-optional]` を実行する（例：`npm run journey:new -- kyoto_trip --name 京都の旅 --city kyoto --city-name 京都 --prefix ky`）。
   - 見本を `content/journeys/<旅行編ID>/` に複製し、見本の旅行編ID `sample_trip`・接頭辞 `smp`・都市ID `mihon` を、IDの一部（`smp_mihon_finale` → `ky_kyoto_finale`）・ストーリーID・ファイル名・画像のパスも含めて置き換える。`--prefix` を省くと旅行編IDを接頭辞にする。任意の部分（特殊戦B・C、品物つきの道中交流）は `--with-optional` を付けたときだけ複製する。
   - 作った旅行編は準備中（`manifest.json` の `status: "preparing"`、都市は `productionStatus: "prototype"`）で、並び順 `order` は既存の旅行編の最大値の次の10の倍数（見本の予約 9000 は使わない）、観光画像はすべて仮の扱い（`isPlaceholder: true`）。`manifest.json` の `nameJa`・`cities[].nameJa` と都市の `nameJa` は指定した日本語名で、`authoring`（`eventPrefix`・観察資料のパス・画像フォルダ）を必ず持つので、接頭辞の警告と `journey:readiness`・`journey:release`・`city:bundle` がすぐに使える。`journey:scaffold`（観察ポイントからの登録の生成）は観察資料 `authoring/journeys/<旅行編ID>/drafts/observation-cards.json`（`journey:new` はパスだけを決め、ファイルは作らない）に、仮でない JPEG または WebP の観光画像ごとの記録（パスと SHA-256）と出典を確かめた観察ポイントを置いてから、`journey:transit` は、`transportModes` に乗り物を宣言したら都市ごとの交通判断台帳を置いて使う（乗り物を宣言しないうちは徒歩だけで台帳は要らない。上の「乗り物と交通判断台帳」。[JOURNEY_AUTHORING](../authoring/JOURNEY_AUTHORING.md)。見本の画像は PNG なので、そのままでは使えない）。置き換えるものの一覧を `CHECKLIST.md` に書く（`.md` は読み込まれない）。
   - 日本語名（`--name`・`--city-name`）は必須で、省略時の既定値はない。形式に合わないID、見本の名前（上の「予約された名前」）を含むID・接頭辞、既にある旅行編ID（フォルダ）と都市ID、他の旅行編の `authoring.eventPrefix` と同じ接頭辞、既にあるIDが `<接頭辞>_` で始まる接頭辞（接頭辞を宣言していないミラノ編の `milano_…` や `duomo_…`、共通データのIDも含む）を拒否し、作った内容が `content:build` と同じ検証を通らないとき（例：ストーリーIDの重複）も何も書き込まない。書き込みは `content/journeys/.new-…`（ドットで始まるフォルダは読み込まれない）に書いてから名前を変える。
2. `npm run content:build` を実行し、`npm run dev` のタイトル画面に旅行編が「準備中」として並ぶこと、`?debug` で都市が「制作中」として選べることを確認する。`npm run journey:readiness -- --journey <旅行編ID>` で、残っている見本の内容と未完成の項目（仮の画像など）を確かめる。
3. `CHECKLIST.md` に沿って、実在する著名な観光地、実際に確認した出典、権利を確認した画像、新しい文章に置き換える（AGENTS.md、[CONTENT_GUIDE](../authoring/CONTENT_GUIDE.md)。ヒロインの台詞は [キャラクターバイブル](09_HEROINE_CHARACTER_BIBLE.md) を読んでから書く）。旅行編の `currency`・`initialBudget`・`cityPlan` なども決める。タイトルの絵は任意の `titleArt` で後から付けられる（下の「既定背景とタイトルの絵」）。見本の出典（`https://example.com/` のURL）、見本と同じ画像、見本の文章が残っているうちは、readiness が `sample_content_left` として一覧し、`journey:release` は公開を止める（下の「見本の編」）。
4. 都市を増やすときは、都市ごとに `cities/<都市ID>.json`（最初は `productionStatus: "prototype"`。`nameJa` は `manifest.json` の `cities[].nameJa` と同じにする）、`travel/<都市ID>.json`、`travel/<都市ID>-settings.json`（旅行編が乗り物を宣言していれば `travel/<都市ID>-transit.json` も。上の「乗り物と交通判断台帳」）を置く。都市別の作業用JSON（[CITY_BUNDLES](../authoring/CITY_BUNDLES.md)）で作成・反映してもよい。複数の都市を回る旅行編では、各都市の `nextCityId` で同じ旅行編の次の都市をつなぐ（[FUTURE_CITIES](../authoring/FUTURE_CITIES.md) の手順5）。観察資料と画像を用意した後は、観光地・デートの登録に `journey:scaffold`（[JOURNEY_AUTHORING](../authoring/JOURNEY_AUTHORING.md)。手順1の注意）も使える。
5. 背景・行き先・観光画像など、その旅行編が使う項目は、共通データと同じ相対パスのカタログ（`romance/presentation.json`、`romance/date_destinations.json`、`tourism/catalog.json` など）に書く。必要なキーだけでよい。その旅行編だけが使う画像は `content/journeys/<旅行編ID>/public/assets/…` に置き、データには配信時のパス（`assets/tourism/<フォルダ>/<ファイル>`）を書く。全旅行編で共有する画像だけを直下の `public/assets/` に置く。
6. 会話・クイズを登録するときは `stories/**/*.ink`、`quizzes/*.json` と、`progression/journey.json`・`battles/catalog.json`・`romance/date_catalog.json` などの該当カタログに追加する（[JOURNEY_AUTHORING](../authoring/JOURNEY_AUTHORING.md)、[CONTENT_GUIDE](../authoring/CONTENT_GUIDE.md)）。
7. 下書き・調査記録は `authoring/journeys/<旅行編ID>/`、その旅行編だけで使う制作ツールは `scripts/journeys/<旅行編ID>/`、その旅行編の内容・経路・制作ツールを確かめる単体テストは `tests/journeys/<旅行編ID>/` に置く（共通コード・共通ツール・共通のテストからは読み込まない）。テストはフォルダに置くだけで単体テストに加わり、共通のテストや設定は変えない（[旅行編ごとのテスト](10_DEVELOPMENT_CHECKS.md#旅行編ごとのテスト)）。
8. `npm run content:build` を実行し、エラーと警告を直す。最後に出る旅行編ごとの1行で、置いたデータが数えられているかを確かめる。
9. 公開するときは `npm run journey:readiness -- --journey <旅行編ID>` で準備中であること（「旅行編は準備中です。」）以外の問題がなくなってから、`npm run journey:release -- --check --journey <旅行編ID>`、続けて `--apply` で開始都市を `complete`、`status` を `available` にする。`complete` の都市には都市フィナーレが必要。公開前に `npm run verify` とE2E一式を実行する（`boot.spec.ts` は登録済みのすべての旅行編の開始画面を開く）。

`journey:new` を使わずに手作業で作る場合は、見本のフォルダを `content/journeys/<旅行編ID>/` に写し、手順1と同じ置き換えを行う（`README.md` は写さなくてよい）。`manifest.json` には `schemaVersion: 1`、他の旅行編と重ならない整数の `order`、`id`、`nameJa`、`status: "preparing"`、`cities`（都市の順序）、`currency`、`initialBudget`、`intercityModes` などが必要で、制作ツールとIDの接頭辞の検査には `authoring` も設定する（[JOURNEY_AUTHORING](../authoring/JOURNEY_AUTHORING.md)）。

旅行編をやめる場合は、そのフォルダ（と `authoring/journeys/<旅行編ID>/`、`scripts/journeys/<旅行編ID>/`、`tests/journeys/<旅行編ID>/`）を削除して `npm run content:build` を実行する。消した `tests/journeys/` のテストだけが確かめていた共通の規則があれば、先に共通のテストへ移す（[旅行編ごとのテスト](10_DEVELOPMENT_CHECKS.md#旅行編ごとのテスト)）。フォルダの境界の検査（`scripts/content-boundary.test.ts`）と本番ビルドの検査の目印（`scripts/dist-guard.ts`）はどの旅行編も名指ししないので、直す必要はない。生成とゲームはこれで動くが、共通のテストのうちその旅行編・都市を例に使うもの（例：インド編の都市を使う `src/persistence/journey-storage.test.ts`・`scripts/content-ownership.test.ts`、インド編を制作ツールの例に使う `scripts/journey-authoring.test.ts`・`scripts/journey-release-pipeline.test.ts`。E2Eの `boot.spec.ts`・`inter-city.spec.ts` は旅行編を生成されたカタログから選ぶので変更は要らない。ミラノを外す場合はミラノの流れを確かめる `play.spec.ts`・`save-load.spec.ts`・画面一覧の通常の操作も残る旅行編向けに書き直す）と `package.json` の別名（例：`india:*`）も、削除するか残る旅行編向けに更新し、`npm run verify` とE2E一式が通ることを確認する。利用者のブラウザにある `dreamscape.journey.<旅行編ID>.*` の保存データは削除されない。

### 見本の編

`authoring/templates/sample_trip/` は、開発・テスト専用の遊べる最小の旅行編「見本の旅」（旅行編ID `sample_trip`、都市 `mihon`「見本の街」、接頭辞 `smp_`、`order: 9000`）。必須の20ファイル（登録・都市・移動と設定・背景・デートの行き先と通常デート1件・観光地と観察ポイント・進行と報酬・通常戦3問と都市フィナーレ5問・和訳・語の意味・Ink 5本・自作画像1枚）と、任意の特殊戦B・特殊戦C・品物つきの道中交流を持つ。ファイルの一覧と役割、外したときのエラー、任意の部分の外し方はその [README](../authoring/templates/sample_trip/README.md)、各Inkの書き方はファイル冒頭のコメントにある。

- 架空であること：街・人物・言い伝え・出典・画像はすべて架空で、AGENTS.md の実在地と出典の規則の例外として認められている（開発・テスト専用に限る）。出典は `https://example.com/dreamscape-sample`、`claimJa` は「見本用の架空の…」で始め、画像は図形だけの自作PNG（CC0）。本番の旅行編にこれらを残さない。
- 読み込み：`content/journeys/` の外にあるため、通常の `npm run content:build`・`npm run dev`・`npm run build`・制作ツール（`journey:readiness`・`city:bundle`・`journey:release` など）は読まない。`scripts/content-sources.ts` の `loadContentSources(root, { extraJourneyDirectories })` に明示したフォルダだけを旅行編として加え（フォルダ名が旅行編ID。`root` の中で `content/` の外にあり、`content/journeys/` の旅行編と同じ名前でないこと）、統合・所有・画像の検査は `content/journeys/` の旅行編と同じに行う。`npm run content:build -- --with-sample` はこの方法で見本を加え、`src/content/generated/build-info.json` に記録する。`npm run dev:sample` は見本を含めて生成してから開発サーバーを起動する。
- 単体テスト（`pretest`・`pretest:quick`）と `npm run verify` の最初の生成は見本を含め、`verify` は最後の `npm run build` で見本なしに生成し直して本番用の `dist/` を作る。`dist:check` は `sample_trip` の文字列が `dist/` に入ると失敗する。
- E2E：見本の編の段（`npm run test:e2e:sample`、`playwright.sample.config.ts`）が、見本を含めて生成した専用の開発サーバーで、見本を新しい旅から旅の終わりまで画面で遊ぶ（`tests/e2e/sample-journey.spec.ts`）。CIのこの段は、先に `journey:new` で旅行編を1つ作り、それが準備中として開くことも確かめる（[docs/10](10_DEVELOPMENT_CHECKS.md#e2eの段)）。
- テスト：`prepareContentFixture` の一時コピーには見本を含めない（見本は `content/` の外にある）。見本を使うテストは、確かめる場所へ自分で複製する。`src/content/authoring-workflow.test.ts` は一時コピーの `content/journeys/sample_trip/` に置き（その一時コピーの生成には毎回入る）、`scripts/journey-folders.test.ts` は1つのテストの間だけ同じ場所に置いて最後に消し、`tests/journeys/sample_trip/sample-journey.test.ts` と `scripts/journey-new.test.ts` は本来の置き場所 `authoring/templates/sample_trip/` に置く（`extraJourneyDirectories` と `journey:new` を確かめるため）。リポジトリの生成物と一時コピーの生成結果を比べるテストは、見本の有無で食い違わないよう、一時コピー自身の生成結果どうしを比べる。`tests/journeys/sample_trip/sample-journey.test.ts` は、共通データと見本だけでの生成・公開前チェック（readiness）・README の一覧とファイルの一致・必須ファイルを1つずつ外したときのエラー・任意の部分を外した最小構成の生成を確かめる。`scripts/journey-folders.test.ts` は見本を加えた一時コピーで、他の旅行編と並んで公開中・準備中として並ぶことを確かめる。`tests/journeys/sample_trip/route.test.ts` は生成物の見本を、タイトルからエピローグまで実際のゲームの関数で遊び、手順ごとに保存形式の検査を通す（生成物に見本がなければ、`npm run content:build -- --with-sample` を案内して失敗する）。
- ひな形：`npm run journey:new`（`scripts/journey-new.ts`、上の「新しい編を追加する手順」）は見本のファイルを読み、見本の README の一覧（必須のファイルと役割、任意の部分のファイルと項目のID）で最小構成を作り、`authoring/templates/journey-new-checklist.md` から `CHECKLIST.md` を作る。README の一覧と任意の部分の外し方は `scripts/sample-journey.ts` にあり、見本のテストと共有する。
- 見本の内容の残り：`journey:readiness` は、見本以外の旅行編のフォルダに見本の内容が残っていれば `sample_content_left` として1ファイルずつ示す（`scripts/sample-journey.ts` の `sampleLeftovers`。見本自身は対象外）。対象は、JSON の `https://example.com/`（とそのサブドメイン）のURL、見本の画像と同じバイト列の画像（SHA-256）、見本の文章と全体が一致する文字列と行。見本の文章とは、JSON の文字列のうち日本語を含む8文字以上のもの、「見本」「Mihon」を含むもの、クイズの英文（問題 `questionEn` と3語以上の選択肢 `textEn`。「Every hour.」のような短い答えはどのクイズにもありうるので除く）（英単語の意味 `learning/word-meanings.json`、クイズの語注 `vocabularyJa`、報酬 `rewards`、通貨 `currency` は、どの旅行編でも同じ言い回しを使えるので除く）と、Ink の日本語を含む8文字以上の行（書き方の規則を書いた `//` コメントは除く）。`journey:release` は readiness に `sample_content_left` があると「見本の内容が残っているため公開できません」と一覧して止まる。`status` を手で `available` にした場合の備えとして、`content:build` は公開中の旅行編（見本自身を除く）のJSONに `example.com` のURLがあると止まる（`content-validation.ts` の `checkPublishedSources`。画像と文章の一致は readiness と release だけが調べる）。準備中の旅行編の文章・出典は本番の生成物にも入るが、タイトル画面に出るのは旅行編名と都市名だけで、遊べない。「見本」の語そのものは実在の旅行編の文章にも現れる（例：見本市）ため、語ではなく見本の文章との一致で判定する。

### 既定背景とタイトルの絵
- 共通の既定背景は `default_scene`（名前「旅の余白」、説明「旅の余白 ／ 予定のない午後」、色 `#e6d8bb`、`fallback: "neutral"`）。共通データの `content/romance/presentation.json` が定義し、`content:build` は共通データにないとエラーにする（旅行編のフォルダに置いても認めない）。IDはコードでは `src/content/default-background.ts` の `DEFAULT_BACKGROUND_ID` だけで扱う。Inkも都市も背景を指定しない会話の初期背景（`src/story/runtime.ts`）、背景を渡されない `CanalScene`、タイトルの絵がない旅行編のタイトルに使う。色だけの中立な場面で、運河の絵は表示しない。
- `milano_cafe`（運河沿いのカフェ、「ミラノ ／ 予定のない午後」）はミラノ編の背景（`content/journeys/milano/romance/presentation.json`）。IDと意味は以前の共通背景と同じで、運河の絵と同じ空の色（`#e6d8bb`）で表示する。ミラノの会話の初期背景（ミラノの `storyBackgroundId`）として使い、他の旅行編からは参照できない。
- タイトルの絵は旅行編ごとに `manifest.json` の任意の `titleArt` で指定する。`imagePath`（配信時のパス。`assets/` で始まる WebP・PNG・JPEG）、`captionJa`（絵の左下に重ねる短い説明。例「ミラノ ／ 運河の午後」）、任意の `imagePosition`（切り抜くときに残す位置。`x`・`y` を0〜100の％で指定し、省略時は中央）。画像はその旅行編の `content/journeys/<旅行編ID>/public/assets/…`（例：`public/assets/title/<旅行編ID>.webp` → `assets/title/<旅行編ID>.webp`）か、全旅行編で共有するなら直下の `public/assets/…` に置く。作者が用意した絵は、置いた層の `presentation/own-artwork.json`（旅行編の `public/` ならその旅行編の、直下の `public/` なら `content/presentation/own-artwork.json`）に配信時のパスを1行足す（足さないと `content:build` が「出典のない画像」で止まる。上の「画像の出典と自作の絵」）。`content:build` は画像がないとき（`Missing title art image`）と、他の旅行編のフォルダの画像を指すとき（`Reference to another layer`）にエラーにする。`titleArt` がない旅行編と、画像を読み込めなかった場合は、既定背景 `default_scene` の色と説明（絵を読み込めなかった場合は `captionJa`）を表示する。準備中の旅行編の画面（`PreparingJourney`・`UnavailableJourney`）には絵の欄がないので表示されない。`tests/e2e/boot.spec.ts` は公開中の各旅行編のタイトルで、指定した絵と説明（なければ既定背景）が表示され、画像が読み込めることを確かめる。
- タイトルの絵の表示枠（2026年11月、Chromiumで実測）。枠は画面の横幅いっぱい（PCでは最大 878px）で、高さだけが画面によって変わり、画像は枠を覆うように中央（または `imagePosition`）を基準に切り抜かれる。

  | 画面 | 表示枠（CSS px） | 横:縦 |
  | --- | --- | --- |
  | 幅320・360・390px（高さ700px超、例：390×844） | 幅 × 120 | 2.67〜3.25 |
  | 幅430px（高さ700px超） | 430 × 120 | 3.58 |
  | 幅480px以下で高さ700px以下（例：320×568、375×667。ブラウザのツールバーで表示の高さが700px以下になる縦画面も含む） | 幅 × 80 | 4.0〜6.0（幅390なら4.88） |
  | 幅481〜719px | 幅 × 245 | 1.96〜2.93 |
  | 幅720px以上（PCは878pxで頭打ち） | 718〜878 × 280 | 2.56〜3.14 |

- 推奨する画像：**1760×560px（横:縦＝22:7、約3.14:1）**。PCの最大の枠（878×280）の2倍で、PCではほぼ全体が見え、スマートフォン（3倍の画面でも幅390pxなら1170px相当）でも解像度が足りる。WebPで300KB程度までを目安にする。
- 安全域：大事なもの（人物の顔、建物の要、文字）は **中央の 1100×290px（左右から各330px、上下から各135px の内側）** に収める。この範囲は上の全画面で欠けない（幅481pxの枠では横は 330〜1430px だけ、幅480px・高さ80pxの枠では縦は約 135〜425px だけが見える）。幅390px以下のスマートフォンなら、高さ80pxの枠でも縦は中央 360px（上下から各100pxの内側）まで見える。
- 説明（`captionJa`）の帯は表示枠の左下（左22〜30px・下13〜18px、高さ約26〜28px）に重なる。1760×560の画像に置き換えると、スマートフォンと幅720px未満の画面では横約 100〜800px・縦約 280〜520px、幅720px以上では横約 60〜480px・縦約 470〜525px の範囲にかかるので、安全域の左下（左から約4割・下半分）には大事なものを置かない。説明は1行に収まる長さ（全角20字程度まで）にする。
- 主役を中央に置けない構図では `imagePosition` で残す位置を指定できる（例：右寄りなら `{"x": 70, "y": 50}`）。その場合は安全域も同じ方向へずれるので、各画面幅で確認する。

### 共通コードに残るミラノ由来の既定値
- 共通の既定背景はミラノ由来ではなくなった（上の「既定背景とタイトルの絵」）。
- 都市の会話の初期背景は、その都市の `travel/<cityId>-settings.json` の `storyBackgroundId`（ミラノはミラノ編の背景 `milano_cafe`）。未指定の都市は現在地（なければ宿）の背景を使う。
- 所持品のアイコンは道中交流カタログの品物の `iconPath`（未指定なら共通の `assets/items/item.svg`）。品物の `carry: "journey"` は旅の間持ち歩く品物で、出発しても置いていかず、旅の後の都市でも持つ・渡す・使う・`held` の条件に書ける（入手はその都市の場面だけ）。使い道（`Encounter item has no use in its city`）は、次の都市がある都市の、持ち歩く印のない品物にだけ求める。
- 道中交流は観光地の時点で始まる。頭の札を書いた交流（今は見本の編だけ）は、本筋の前（`-1` など）・観察の後（`after observe`）・本筋の後（`+1` など）に置ける（下の「場面の時点と順番」）。札を書かない交流は今の入場ルール（`encounters/entry-rules.json`）のまま、観察を進めたときにカタログの順に始まり、終わると観察に戻る（ミラノ編はシナリオ改稿のときに頭の札へ移す）。自由時間から交流を始める道はない。交流のカタログの `availability`（`tourism`・`dormant`）はセーブ版 v14 でなくなり、書くと `content:build` が止まる（`Unrecognized key`）。使わない交流はカタログから消す。
- 入場ルール（`encounters/entry-rules.json`、`schemaVersion: 2`）は、交流ごとに調べる時点 `at`（今は観察の `["observe"]` だけ）と出会える条件 `when` を持つ。クイズをその観光地のバトルの後まで待たせる道中交流（ミラノのガッレリアの願掛け）は、同じファイルの `quizAfterLandmarkBattle` で指定する（クイズのある交流だけ。観察はこの交流の `when` を調べない）。この印のある交流は最初の観察で会え、その観光地のバトルを一度も戦っていないうちは、クイズなしで話が終わる。バトルを戦った後に始まった場合だけクイズへ進む。ただし今のミラノ編には、ガッレリアのバトルを戦った後に交流が始まる観察がないため、願掛けのクイズ（と展示券の抽選）には遊んでいて届かない（バトルを終えるとガッレリアは地図の行き先に出なくなる。バトルの画面から観察に戻れるが、バトルの途中なので交流は始まらない）。ユーザーの判断（2026-11-08）で、今は起こらないミラノの道中交流は今のまま残し、シナリオの改稿でまとめて見直す（各Inkファイルの先頭のコメントに、今いつ起こるかを書いている。[開発時の確認](10_DEVELOPMENT_CHECKS.md#関数の層のランダムウォーク)）。
- Debugの「仮の場面」は、ミラノ固定ではなく役割で選んだ都市を元にする（上の「Debugの「仮の場面」」の項）。

### 場面の時点と順番

- 道中交流は「時点」（観光地への訪問など）の中で、本筋（案内・観察・バトル）と並んで流れる。並びは頭の札の優先度で決める：負の数は本筋の前、`after observe` は観察で「進む」を押した後（終わると観察に戻る）、正の数は本筋の後。小さいほど先。同じ優先度は、ファイルの名前の順（今は交流ごとに別のファイル。`content:build` が注意を出す）。
- 条件（`when:`・`until:`）は、その交流の番が来た直前に調べる。完了した交流はもう出ない（`repeat: always` を除く）。「また今度」を選んだ交流は、次に同じ時点が来たときにまた出る。
- 運賃・入場料・デートの AP と乱数は、今どおり地図で出発する操作で払い・決める（道中交流の乱数は、その交流を始めるときに引いて保存する）。だから、前の交流の後で、払いが足りずに本筋が断られることはない。
- 本筋のうち案内と観察は、場所ごとに省ける（`guideStoryId` を書かない・`observation: false`）。どちらもない場所では、着いてすぐバトルが始まる。観光地・特殊戦・都市フィナーレが地図に出る条件は `progression/journey.json` の `when` に書け（お金・品物・恋愛の値も）、書かないときは今の決まり（`requiredEpisodeIds` のエピソードと、その都市の特殊戦をすべて終える）。地図に出る条件は出発のときに一度だけ調べるので、前の交流でお金や品物が変わっても、その訪問の本筋は始まる。
- 時点（`at:`）は、観光地の訪問（`visit <観光地>`・`visit any`）のほか、`date <デート>`（デートの前・`after date`＝デートの後で「交際開始」の画面の前・その画面の後）、`finale <都市>`（フィナーレのバトルの前・`after battle`・結果の後）、`epilogue <都市>`（エピローグの前後）、`depart <都市>`（次の都市へ出発する前。使わなかった品物を置いていく前で、まだ渡せる・使える。次の都市のない都市では開かない）、`arrive <都市>`（ロゴの前＝最初の都市ではオープニング・`after logo`・到着の会話の後）、`trip <乗り物>`（`walk` も。`from <場所>`・`to <場所>` で絞れる。出発する場所で、動く前。乗車回数は動いたときに増える）、`ticket <場所>`（入場料のある行き先の窓口。入場料は払った後）、`hotel`（`hotel <場所>` も。「休む」の眠る前と起きた後）。`place <場所>` は、その場所の観光地・デート・フィナーレのどの時点にも合う。その時点に場面が1つもなければ、今までどおりの動き（時点の記録も作らない）。
- 「休む」は、宿へ向かう移動の場面（`trip`。「休む」を押した時刻で読む）→ 宿へ動く（宿に着いた時刻。21時を過ぎることがある）→ 眠る前の場面 → 眠る（次の日の9時）→ 起きた後の場面、の順。`time night` は18時から眠って次の朝になるまで真なので、21時に休むときの眠る前の場面も夜。移動の絵と眠るの絵は、時点の記録の印（動いた・日が進んだ）から流す。
- 到着とエピローグの頭の札・選択肢の札にも `then:` を書ける（その会話を終えた後に進む）。
- フィナーレの結果の画面の「エピローグへ」は、フィナーレの時点の残り（`after battle`・正の数の場面）を流してから、エピローグを開く（エピローグの後に自動で出発する旅でも、フィナーレの後の場面が流れる）。
- 1つの場所の場面は、場所のファイルにまとめて書ける（同じファイルの中の同じ優先度は、書いた順）。観光地の本筋の順は `tourism/catalog.json` の `order` で変えられる（書かなければ案内 → 観察 → 対決）。
- 場面の頭の札か選択肢の札に `then: move <場所>`・`then: epilogue` を書くと、その場面を終えるとすぐ進む。その時点の残りの場面と本筋は流れず、払った運賃・入場料は戻らない（まだ始めていないデートの AP と、まだ終えていない本筋の支払いは払わない。バトルの結果の画面と「交際開始」の画面は先に出す。どちらも、その場面自身（バトル、告白のデート）の `then:` のときだけで、`after date` などほかの場面の `then:` では「交際開始」の画面は出ない。結果の画面の出口は、`then: epilogue` が待つときは「エピローグへ進む」）。`then: move` の運賃は、選択肢なら選んだとき、頭の札なら場面を始めるときに払い、払えないときは、選択肢は選べず、差し込みの場面は出ず、本筋の場面は動かない（時点はそのまま続く）。払えるかは、その場面が `then:` の前に払うもの（その選択肢のお金・AP、差し込みの `on_done:`、今の本筋の初めての支払い）を引いて確かめる。`then:` を決めた後のその場面の選択肢は、`then:` が取り置くもの（動いた先・エピローグを始める場所からの帰りの運賃と、その先の本筋・エピローグの支払い）と、`then:` が動くまでの今の帰りの運賃を残した額で確かめる。`then:` で始めるエピローグの支払い（`then: epilogue` を書いた都市のエピローグの `on_done:` だけ書ける。ゲームが自分で始めるエピローグと到着には書けない）は、読み終えるまで取り置く。もう読んだエピローグへの `then: epilogue` も、時点はそのまま続く。移動の場面（出発する場所で動く前に流れる）の `then:` では、まだしていない元の移動はせず、`then: epilogue` なら、いる場所からの帰りの運賃を取り置く（予算が足りないか、間に合う帰り道がないときは選べない）。`then: move` の移動にも、ほかの移動と同じく移動の場面が流れる（観光地のない場所へ動くときも）。読み直しでは `then:` は動かない。動いた先に開く本筋がなければ、その場所の差し込みだけが流れる（入場料はかからない）。`then: move` は地図の出発と同じく時刻を確かめ（この時点が閉じる時刻に出る）、動いた先の本筋が、着く時刻・開いている時間・休みの日・その日の帰り道のために今は始められないときも、本筋の組が空の訪問として開く（入場料なし。動くこと自体は変わらない。本筋のない訪問は、まだ訪れていない観光地を訪れた記録にしないので、その観光地の最初の本当の訪問で案内が出る）。そこから間に合う帰り道がないときだけ選べない（21時より前に着くなら21時までに宿へ帰れること。セーブの決まり）。`by` のない `then: move` は徒歩で動く（徒歩の道がなければいちばん安い道）ので、徒歩では本筋や帰り道が間に合わないことがある移動には `by <乗り物>` を書く。
- 都市のどこかに `then: epilogue` を書くと、その都市ではゲームが自分でエピローグを始めず、「エピローグへ」も出さない（クリアの前でも始められる）。書かない都市は今の決まり（フィナーレの後）。エピローグの後に自動で出発する旅は、都市のクリアとエピローグの読了がそろったときに出発する。
- お金の増減は、選択肢の `money: -300`・`money: +500` と、選択のない場面の `on_done: money -300` で書く。減らすときは使えるお金（予算 − 帰りの取り置き − 支払いの取り置き。取り置きは、後で必ず払えるように、先に使えない分として分けておく額）で確かめ、足りなければ、選択肢は選べず、差し込みの場面は出ない。本筋の場面の `on_done` の支払いは、出発のときに入場料と合わせて確かめて取り置き、その本筋を初めて終えたときに払う（足りなければ出発できない）。デートの AP も、出発のときに確かめて取り置き、デートを始めるときに払う。
- AP の増減は、選択肢の `ap: -1`・`ap: +2` と、選択のない場面の `on_done: ap -1` で書く（お金と同じ所）。使うときは使えるAP（AP − 取り置き。取り置きは、デートなどで後で必ず払えるように先に分けておくAP。保留APは入らない）で確かめ、足りなければ選択肢は選べず、差し込みの場面は出ない。本筋・デートの knot の `on_done: ap -N` は、出発のときに確かめて取り置き、その本筋を初めて終えたときに払う（足りなければ出発できない）。得るAPは、お金と同じく、選んだとき・場面を終えたときに1回だけ付与され、読み直し・再読込・セーブ再開・連打では付与されない（繰り返す場面や「また今度」の選択肢を新しく遊んだときは、また付与される。上限を超える分は保留AP）。札でAPを使った後は、デートと同じく保留APを自動で受け取る。
- 選択肢の `requires:` の条件を満たさないと、その選択肢は出ない（灰色にせず、理由も出さない。どの条件の部品でも、どの場面でも。`give:`・`use:` の品物を持っていないときも同じ）。上の2つの「選択肢は選べず」は払えるかの決まりで、その選択肢は出したまま選べなくし、払いの理由を出す。
- 物語の進みは、宣言したフラグ（`set:`・`on_done: set`、条件の `flag`）で書く。フラグは、どの都市の場面でも立てられ、どの都市でも読める。
- バトル・デートの地図に出る条件は、Inkの頭の `when:` にも書け、ビルドが同じ `when` に変える（JSON と両方に書くと止まる）。

## レイヤー間の依存
- `screens/components` → アプリ操作サービス → `domain` 純粋関数 → `persistence`
- シナリオアダプタは Ink の `Continue/currentChoices/ChooseChoiceIndex` を包み、画面に表示用のDialogueLine・ChoiceViewを返す。
- シナリオ終了・選択効果はゲームイベントへ変換する。APの残高やイベントの可否はstory runtimeでなくdomainが判定。
- `romance` が `battle` のUIコードを直接呼ばない。クイズ結果は `GameEvent` 経由でAP付与処理へ。
- 初期から巨大なイベントバスやプラグイン基盤は作らない。

## 実装の責務分担

既存の入口を保ちながら、次の単位で処理を分担する。

- `src/app/App.tsx` は旅行編の選択と保存領域のロック、`GameApp.tsx` はゲーム画面と画面間の操作を担当する。`useGameSession.ts` が状態更新・保存・復元・削除時の競合確認をまとめ（1回の操作の反映は `src/domain/player-action.ts` の `applyPlayerAction`。地図の行き先の完了と、クリアした都市からの自動の出発を同じ保存単位にする。ミラノの通しテストも同じ関数で操作する。同じファイルの `listPlayerActions` は、画面が出す操作を画面と同じ判定の関数から並べ、探索テストが使う）、`useTravelEffects.tsx` が成功した移動の演出を扱う。保存と別タブの保護の判定は画面から分けた関数（`src/app/save-recovery.ts`・`unsaved-progress.ts`・`save-deletion.ts`、`src/persistence/journey-lock.ts`）が持つ（[画面の保護を担う関数](10_DEVELOPMENT_CHECKS.md#画面の保護を担う関数)）。
- `src/domain/game.ts` はゲームの状態遷移を扱う。保存形式の定義は `game-state-schema.ts`、デートの条件判定は `date-rules.ts`、保存された進行の整合確認は `game-state-validation.ts` に分ける。既存の公開関数と型は `game.ts` から引き続き利用できる。
- 共通条件管理システム（段階1）：条件の形は `src/content/condition-schemas.ts`（zod だけを読む軽いモジュール。生成したカタログを実行時に読むときも使う）、判定は `src/domain/conditions.ts` の `meets(state, condition)`（今の記録を読むだけで何も書かない）。デートの `when`・`until`（`date-rules.ts`）と入場ルールの `when`（`encounter.ts`）は `meets` だけで判定する。バトルを遊んだか（`battleRecords` の `attempts`）を読むのは同じファイルの `battlePlayed` だけ。セーブの読み込みでは、進行中のデートの条件を調べ直さない（始めたときに満たしていたため。条件を直してもセーブが読めなくならない）。Debugの説明は `src/dev/condition-explain.ts`。
- `src/domain/travel-destinations.ts` は行き先候補と待機時刻を計算する。帰宿候補と宿泊計画は `travel-game.ts` を画面表示と実際の操作で共用し、画面内に同じルールを重複実装しない。
- `scripts/content-pipeline.ts` の `buildContent`（`content:build`）は、読み込み → 検証 → 書き出しの3段階で動く。
  - 読み込み：`content-sources.ts` だけがコンテンツを読む。`readContentTree` が `content/` と `public/` を一度だけ読み（JSONとInkは中身、画像は一覧だけ）、`contentSourcesFromTree` がディスクに触れずに、層、統合したカタログと各項目の出どころのファイル、都市・移動・クイズのJSON、Inkの本文、配信ファイルの一覧（`ContentSources`）を組み立てる。JSONとして読めないファイル、配置の誤り、統合の衝突はここで止まる。制作ツールも同じ `loadContentSources` の結果を使い、都市・移動・クイズ・Inkを読み直さない（旅行編の一覧だけが要るときは、`readJourneyManifests` が同じ処理で `manifest.json` だけを読む）。読み込み全体は約25ミリ秒で、`content:build` の約15秒の大半はInkの会話経路の検証にかかる（2026年11月、4コアで計測。分割の前後で所要時間は変わらない。検証のキャッシュが使えると約3.4秒）。
  - 検証：`content-validation.ts` の `validateContent` は読み込んだ内容だけを受け取る純粋な関数で、ファイルを読み書きしない（Inkのコンパイルもここ）。旅行編フォルダが自分の都市だけを扱い、同じ旅行編か共通データだけを参照することの検査は `content-ownership.ts`、Inkのコンパイルと会話経路の検証は `ink-validation.ts`、クイズ1件の中の検査は `quiz-validation.ts`、都市のつながり（次の都市と旅行編の順序）の検査は `city-links.ts`、背景画像とキャラクターの参照検証は `presentation-validation.ts` が担当する。画像ファイルの中身（形式・寸法・透過）だけは、検証が通った後に `content-images.ts` が読んで確かめる。デートの全分岐検査（`validateStory`。検証時間の大半）は、`buildContent` が渡す `story-validation-cache.ts` のキャッシュで、入力と検査コードが同じ成功結果を再利用する（`validateContent` が読み書きするのはこのキャッシュだけで、渡さなければ毎回すべて検査する。[キャッシュの規則](10_DEVELOPMENT_CHECKS.md#会話の全分岐検査のキャッシュ)）。
  - 書き出し：`content-outputs.ts` が `stories.json`・`quizzes.json`・`scene-conditions.json`・生成ミラー・配信用の画像フォルダを書く。
  - `selectJourneys(sources, [旅行編ID])` は、共通データと指定した旅行編だけの内容を組み立て直す（ほかの旅行編フォルダを外して生成したときと同じ内容）。`contentTreeFromFiles` でメモリ上に作った内容も同じ関数で組み立てて検証できるため、不正なデータを拒否するテストは一時コピーや生成全体なしで書ける（例：`scripts/content-validation.test.ts`）。
  - `content-pipeline.ts` が公開するのは `buildContent` だけで、テストが単独で使う検査関数は上のモジュールから読み込む（単体テストの組の判定のため。[開発時の確認](10_DEVELOPMENT_CHECKS.md#単体テストの組と所要時間)）。
- `scripts/city-bundle.ts` は都市編集の公開APIと検証手順を担当する。編集形式は `city-bundle-schema.ts`、経路の圧縮・展開は `city-bundle-routes.ts`、共有カタログの統合は `city-bundle-catalogs.ts`、競合確認と原子的なファイル更新は `city-bundle-files.ts` が担当する。交通判断台帳は、乗り物を宣言した旅行編の都市ごとの `travel/<cityId>-transit.json`（その都市の旅行編フォルダ）を使い、旅行編専用のツールは読み込まない。

機能を追加するときは該当する責務へ実装し、画面や入口のファイルへ個別の保存・進行・検証ルールを戻さない。分離したモジュール間で型だけが必要な場合は `import type` を使い、実行時の循環参照を避ける。

## 開発中の保存とシナリオ更新

開発中は、更新後に以前のセーブを利用できることや、自動移行を保証しない。現在のゲームセーブはv16（統一イベント設計の段階3で、時点の記録などを加えた。[データとテスト](07_DATA_AND_TESTS.md)）で、v1〜v15の自動移行は行わず読み込み対象外とする（元のデータは消さず、旧版として案内する）。セーブは旅行の日数・時刻・現在地と活動中の時間枠を保持し、デートの章はエピソードの記録から求めて保存しない。共通条件管理システムが読む記録（見た道中交流 `seenEncounterIds`、品物を渡した・使った交流と選択肢 `itemUses`、乗り物に乗った回数 `travel.rideCounts`）も保存し、物語の状態（`storyProgress`・`travel.temporaryFlags`）とツアーの記録（`tour`・`completedTourIds`）は空のまま持つ（v14・v15で変えたことは [セーブの版](07_DATA_AND_TESTS.md#セーブの版)、記録の意味は [共通条件管理システムの記録](07_DATA_AND_TESTS.md#共通条件管理システムの記録)）。保存先は旅行編ごとに分かれ、ミラノ編を含むすべての旅行編が `dreamscape.journey.<旅行編ID>.save.v1`（ゲーム進行）と `dreamscape.journey.<旅行編ID>.learning.v1`（英語ノート）を使う。以前のミラノ編の `dreamscape.save.v1` / `dreamscape.learning.v1` は読み込まず、ゲームが自動で消すこともない（設定の「古い保存データの整理」で利用者が選んで消せる。[古い保存データの整理](07_DATA_AND_TESTS.md#古い保存データの整理)）。各旅行編はWeb Locksで別タブからの同時編集を防ぐ。`schemaVersion` と保存された場面の指紋・状態を検証し、内容が異なる脚本や問題を無理に復元しない。誤字修正や改稿のたびに旧セーブ再開用のInk・定義を残すことは必須ではない。一方、読み込めるデータを更新のたびに無条件で無効化しない。

安全に読めないデータは自動削除・上書きせず、原因を断定できない場合もその旨を案内する。利用者が確認した場合だけ対象のDreamscape管理キーを消去できるようにし、別タブ競合と他アプリ・バックアップの保護を維持する。現在のバージョン内の保存・再開と二重適用防止は維持する。一般公開時には必要に応じて互換性方針を再検討する。

## UX/スマホ
- 縦画面最優先（約360〜430px幅）。PCでは適切な最大幅を設定。
- 選択肢は大きなタップ領域、文字切れ防止。読みやすい文字送り・戻れない選択時の確認・スキップ機能は段階的に実装。
- 会話の場面（観光案内・デート・道中の交流・到着とエピローグ・バトルの会話と反論）では、場面のどこを押しても台詞を押したのと同じく、書きかけの行を最後まで表示し、次の1回で先へ進む。場面より広い画面では `<main>` 自身の余白（`data-page-margin`。その中の通知などは含めない）も場面と同じに扱う。ただし操作（ボタン・リンク・入力欄・`summary`・ダイアログ（`role="dialog"` を含む）、操作の `role`、編集できる要素、`data-no-advance` の付いた範囲。会話枠の頭の「隠す」（観光案内では「閉じる」）「ログ」「高速送り」の並び、デートの訪問先の写真欄、場面の名前の札の行（下）はこの印で除く）の上とその中、場面の外（画面上部の旅の情報と操作など）、ログ・ゲームの設定・英語ノートなどが開いている間と、上の帯の⚙設定の一覧と所持アイテムの詳細（`role="dialog"`）が開いている間（`dialogueObstructed`。開いた `dialog` と、一覧や詳細を開いている間だけ上の帯の下でページ全体を覆う透明な層（`src/components/DismissLayer.tsx`、`data-obstructs-dialogue`）。キーボード・文字送り・自動送りも止まる。層のタップは一覧や詳細を閉じるだけで、場面の外なので台詞も進まず下のものも押さない）と、移動の演出（`TravelTransition`）と時間が過ぎる演出（`TimePassage`）が出ている間（タップだけ。UI 段階1.6から、演出は出ている間ポインターのタップを受けて何もしない（UI 再設計 H22。`pointer-events: auto`、どちらも `aria-hidden`）。行き先の二重タップの2回目は演出に当たり、始まった場面を読み進めない。演出が消える瞬間に中央の絵の上で下ろした指は、`tapsObstructed` が指を下ろした位置で除く。それまでは演出がタップを下の場面へ通し、中央の絵の外のタップは場面を読み進めた）、隠したウィンドウを戻す1回、選択肢が出ている間（書きかけの行を表示し終えるだけ）は進まない。ウィンドウを隠せる場面では、隠している間は「タップして会話を表示」が場面全体を覆う（観光案内の「閉じる」は案内そのものを閉じるので、余白の横でウィンドウが隠れていることはない）。観光案内・バトル・デート・道中交流では、上の帯のすぐ下に「場面の名前の札の行」がある（UI 再設計 §3.2。`src/components/SceneLabelLine.tsx`。観光地名・バトルの場所（都市フィナーレでは対決の題）・デートの行き先（行き先のないデートは「デート」）・道中交流の場所の札と、「出典」「手がかり帳」）。観光地のない場面（宿・出発・移動・デートの後などの場面）の札は、場面の `# background:` が出典つきの写真なら、その背景の `nameJa`（`romance/presentation.json`）で、「出典」はその写真の出典を開く。写真のない背景なら、今いる地点の名前で、「出典」は出さない（`src/features/journey/travel-labels.ts` の `sceneBackdropPhoto`）。札の言葉は背景の `nameJa` で決まるので、場所の名前にしておく。札は折り返し、切らない。ボタンの横に札が6em（札の字でおよそ4字）も取れないとき（狭い画面で文字を大きくしたとき）は、ボタンを札の下の行の右へ回す（UI 再設計 §5.1）。行は場面の中にあるが `data-no-advance` の範囲で、札を押しても、札とボタンの間を押しても進まない（上の帯と同じ）。**UI 段階1.3で変わった点**：それまではバトルの場所の札とデートの行き先の札（場面の中の札）と、観光案内の見出し（観光地名）は、押すと台詞が進んだ。台詞そのものはボタンなので、1回の操作で進むのは1歩だけ。道中の交流の英語3択の判定と解説は会話の行ではなく、バトルの解説と同じく、ボタン（「続きを読む」）だけで進む（解説と訳・語句を読む画面で、場面を押しても進まない）。判定は `src/components/scene-tap.ts` の `shouldAdvanceOnTap`（単体テストあり）、場面への取り付けは `useSceneTap`。キーボードと読み上げでは今までどおり台詞と各ボタンを使う（移動の演出が出ていても台詞のEnterや読み上げの操作で進み、文字送りと自動送りも止まらない。ポインターのないクリック（`detail` が0。読み上げの操作、ボタンのEnter）は上にあるものの上からのタップとして扱わない）。場面にボタン以外の操作を足すときは `data-no-advance` を付ける。
- 二重タップの2回目（`src/components/double-tap.ts` の `DOUBLE_TAP_WINDOW_MS`＝350ms以内）は、押した操作で画面が変わった後に別のものへ当たるので無視する（選択肢の誤タップ防止）。その時間に、先に押した点の近く（24px以内。`DOUBLE_TAP_SLOP_PX`）で会話枠の頭の操作（「隠す」「閉じる」「ログ」「高速送り」）に当たったタップも、先に押したものと同じ操作でなければ何も押さない（返答を選ぶと会話枠が縮み、ログを閉じると会話枠が現れて、2回目のタップの下に会話枠の頭が来ることがあるため。`src/components/scene-tap.ts` の `windowToolAt`・`ignoresWindowToolTap`、単体テストあり）。回答ボタンの後のバトル画面（`data-answer-settling`）に加え、会話の場面が出ている間は、ページの操作（場面の返答・選択肢・会話枠のボタン・隠したウィンドウを戻す操作・リンクと、場面の外の画面上部の操作・ダイアログの「閉じる」やダイアログそのもの。台詞・絵・`data-no-advance` の範囲・ただの文字は含めない。判定は `pressesControl`。`useSceneTap` が文書全体でキャプチャして受ける）を押した後と、場面の上にあるもの（`tapsObstructed`。ログ・所持アイテムの詳細・移動の演出の中央の絵など）の上からのタップ（指を下ろしたときにその位置にあった。それを閉じるタップを含み、パンで取り消された指とポインターのないクリックは含めない）の後のその時間、場面のタップでも台詞のタップでも進まない（場面に `data-tap-settling` が付き、台詞はポインターを受けない）。場面の上からのタップそのものも、台詞の上なら台詞に届かない（台詞は自分のクリックで進むので、`useSceneTap` がキャプチャで止める）。会話の場面が始まったとき（行き先から始まるデート・観光案内、「進む」で始まるバトルの会話、「敵の反応を見る」、「エピローグへ進む」など）と終わったとき（デートの終わり、観光案内から観察へ、「問題へ進む」、エピローグ・道中交流の終わり、特殊戦の反論の終わり）と、ロードで保存した場面に戻ったとき（同じ場面でも、デート・バトル・道中の交流は新しく作り直される）、旅行編の切り替え（「切り替える」など）と別タブの案内の「再試行」で画面を作り直したとき（新しい `GameApp` は保存した場面を最初から出すので、場面の始まりとしては見つからない）は、新しい画面が指の下に出るので、その時間はページのどのタップも受け付けない（`GameApp` が `src/app/story-scene-change.ts` の `storySceneOnScreen`・`storySceneChanged` で場面の始まりと終わりを見つけ、ロードでは `loadSavedGame` が、切り替えと再試行では `App.tsx` の `switchJourney`・`retryLock` が、押したときに `src/components/tap-hold.ts` の `holdTaps` でルート要素に `data-tap-hold` を付けてポインターを止める。キーボードは止めない）。行き先から始まる場面では移動の演出がこの時間より長く出るが、演出が出ている間のタップは演出が受け、下の場面を読み進めない（上のとおり。キーボードと読み上げは止めない）。
- 会話の窓（UI 再設計 §3.3）：話し手の名前札と窓の操作を、窓の上の縁に半分（22px）またがる1行（窓の頭。`src/components/DialogueControls.tsx` の `DialogueWindowHead`）に並べる。長い名前は操作の手前で折り返し、頭は窓の中へ下に伸びる（操作の下に潜らない。決定H）。操作は観光案内では「閉じる」（案内を閉じて観察へ）、ほかの場面では「隠す」（窓を隠すだけ。U6）、「ログ」「高速送り」。窓の幅が窓の字で24字ぶん（ふつうの文字の大きさで360px）未満では字だけ、それ以上は印と字（字は消さない。字を大きくすると広い画面でも字だけになる）。名前札が操作の横に5.5em（札の字でおよそ4字）も取れないとき（狭い画面で文字を大きくしたとき）は、操作を札の下の行の右へ回す（頭は下へ伸びるだけ）。▼は窓の右下に置き、文字送り中と完了後で行の折り返しは変わらない。窓は上の帯と場面の名前の札の行の8px下まで伸びられ、長い文や大きくした文字は窓の中でスクロールして読む（バトルの会話の窓は今までの置き方のまま。ただし人物の顔のために空ける高さより、窓の高さ9em（文字200%で頭と台詞およそ2行）を優先し、場面の高さまでは伸びられる。ふつうの文字ではどの画面でも顔の分を空けたほうが高い）。
- 上の帯の⚙設定の一覧の項目を押すと、その指の下にダイアログ（ゲームの設定、「ロード」の確認）が開く。スマートフォンの幅では「ゲームの設定」の位置にゲームの設定の自動保存のチェックがあるので、これらのダイアログは開いてから0.5秒（`src/components/ConfirmActionButton.tsx` の `CONFIRM_SETTLE_MS`）ポインターを受けず、素早い2回目のタップは何も押さない（`Modal` の `settlePresses`。キーボードとはじめのフォーカスは止めない）。ダイアログを開かない「セーブ」は、一覧が指の下から消えると下の場面の操作（観光案内では「手がかり帳」）が出るので、押した後は場面の始まりと同じくその時間ページのタップを受け付けない（`holdTaps`）。
- 上の帯の⚙設定（2行目の右端。名前は「設定」）は、「セーブ」「ロード」「ゲームの設定」の一覧を開く開閉ボタン（UI 再設計 §3.1、段階1.2。`src/app/JourneyHud.tsx`）。キーボードでは、開くと「セーブ」にフォーカスし、上下の矢印で項目を移り、Escで閉じて⚙設定に戻り、Tab・Shift+Tabで一覧の外へ出ると閉じる。一覧の外のタップは上の透明な層が受けて閉じるだけで（下の行き先や台詞は押さず、進めない）、フォーカスは⚙設定に戻る（`preventScroll`）。「ゲームの設定」と「ロード」の確認を閉じた後も⚙設定に戻る。一覧は `<main>` の外にあり、モンキーは押さない。
- ダイアログの枠（UI 再設計 段階2.3）：どのダイアログも `src/components/Modal.tsx` の `Modal`（羊皮紙の地・細い線・角16px）で、見出しは `ModalTitle` の帯（ダイアログをスクロールしても上に残る）。もともと上に「閉じる」があったダイアログ（旅の記録・英語ノート・手がかり帳・写真の出典・乗り物を借りる）は帯の右に44pxの「× 閉じる」（名前は「閉じる」のまま）を置き、下に「閉じる」「戻る」などがあるダイアログ（ゲームの設定・会話ログ・背景画像・次の街への出発・ロードと消去の確認・旅行編の切り替え）は下のままにする（親指の届く位置。上の角の「閉じる」を素早く2回たたくと、閉じた後の2回目が上の帯の⚙設定に当たるので、閉じる位置を上へ移さない）。余白は `--modal-pad-top`・`--modal-pad-inline` で決め、帯がダイアログの端まで届く。押せる物の形と色（`.primary`・`.secondary`・無効の色・2色のフォーカスの枠）は段階2.1から全画面で共通。
- 上の帯の1行目（現在地と時刻、予算とAP）は押すものを置かない。地名は、どの文字の大きさでも、どの画面の向きでも切らない（2026-11-09のユーザー判断。末尾を「…」にしない）：1行に入らないとき（長い地名、横の長い金額、文字の拡大、狭い画面）は、予算・APを地名の下の行へ回し、帯の幅より長い地名は折り返す（ふつうは2行。2026-11-09に測った中では、CIと同じフォント・320px幅・文字200%のウズベキスタン編の最も長い地名だけが3行）。横向きや広い画面の1行の帯では、まず操作のボタンを次の行へ回す。地名が1行に入る帯は今までと同じ形のまま（`src/app/JourneyHud.tsx` の `useWholePlaceName` が、帯の大きさ・地名・金額・Webフォントが変わるたびに、地名の1行の切り詰めが地名の1行以上を隠すか（`placeNameIsCut`。字の形が行から1〜2pxはみ出すだけなら隠したとしない）を確かめ、隠すときだけ帯に `data-place-wraps` を付ける。`src/app/journey-hud.css`。帯の高さは測って場面の余白に使う）。縦向きの画面で文字を大きくし、帯の幅に帯の字がおよそ25字入らないとき（UI段階1.2からの `@container journey-hud (max-width: 25em)`。ふつうの文字では320px幅でも当てはまらない）は、地名の長さによらず、札を地名の幅にして地名を切り詰めない（札の最小幅9字ぶんのままだと、短い地名でも予算・APが下の行へ回るため）。
- 上の帯から開くもの（⚙設定の一覧、所持アイテムの詳細、自由時間の「待機」の一覧）は同時に1つだけ開く（一覧や詳細を開くと、開いている「待機」の一覧は閉じる。一覧と詳細は外を押すと閉じる）。所持アイテムの詳細も⚙設定の一覧と同じく、フォーカスがその外へ移る（Tabで詳細の先へ、Shift+Tabでボタンの前へ）と閉じ、フォーカスは移った先に残る。詳細の高さは、上の帯の下から画面の下端までに収め、長いときは中でスクロールする（自由時間のサイトの見出しが上の帯の上にある横向きの画面でも）。
- 自由時間の画面（UI 再設計 §3.4、段階1.5）：上の帯の下に見出し「{都市}の行き先」（地図帳の帯の形。押すものではない）、エピローグを読む操作、行き先の区画（帰路用の予算の注記、小さな地図、凡例、近くの行き先と「ほかの行き先を見る」）、ほかの操作、「写真の出典」が並び、背景は都市の写真（下の `backdropAssetId`）か無地。**上に残る地図と重なり順**：地図は行き先の区画の中で、スクロールしても上の帯のすぐ下に残る（`position: sticky`、z-index 3、地図の下の余白まで不透明。下に入った行は見えず、押せない）。地図の枠の高さは見える高さ（`svh`。アドレスバーの出入りでは変わらないので、スクロールで地図が作り直されない）から決め、140〜210px。残った地図と下の帯の間に行がおよそ2つ（150px。`src/features/journey/free-time-layout.ts` の `MAP_STICKY_MIN_LIST_PX`）入らない画面（文字を大きくした低い画面など）では、地図を残さずページと一緒に流す（`data-map-sticky="false"`）。横向きの低い画面では地図と一覧を左右に並べる。下の帯（「待機」「休む」）は不透明で画面の下に固定（z-index 10）、上の帯は z-index 20、⚙設定の一覧・所持アイテムの詳細を開いている間の透明な層は19、移動と時間の演出はその上。自由時間の間はページの `scroll-padding` に上の帯と残った地図の高さ（上）と下の帯の高さ（下）を入れ、フォーカスの移動や画面に入れるスクロールが操作をそれらの下に置かない。行・選択肢・帯は `touch-action: manipulation`（iOSが素早い2回の押下を拡大と取らない）。
- **自由時間の行き先は2段階で選ぶ**（UI 再設計 §3.5、段階1.6）：行き先の名前（一覧の行）・地図の印・下の帯の「休む」を1回押すと、その場所を選ぶだけで出発しない。小さな地図がその場所へ寄り（`src/features/journey/map-focus.ts`。行き先を中心に、現在地が地図の操作（拡大・縮小、「大きく」、地図の出典）に重ならない範囲で最も近く。少なくとも全体表示より1段近く）、印は黒い円の上の黄色になって名前が付き（読み上げの名前に「、選択中」）、行は選んだ形になる。行き方が1つ（見える出来事が1つ・経路が1つ・今行ける）なら行に「もう一度押すと出発」が出て、同じ名前をもう一度押すと出発する。移動手段が複数（インドなど）・出来事が複数（ミラノのガッレリアなど）なら、選択肢が行の中に出て（出来事→移動手段の順）、選択肢を押すと出発する（名前をもう一度押しても出発せず、選択肢を画面に入れ直すだけ。U25）。行けない場所も選べるが、もう一度押しても出発せず、理由をもう一度知らせる。「休む」は宿を選んで帰り方を下の帯の上に出し、帰り方が1つなら「休む」をもう一度押すと休む（ほかは帰り方を押す）。地図の印は選ぶだけで出発しない（重なった印の押し違いと、地図のドラッグ・拡大で出発しないため）。ウィンドウは開かない（大きな地図でも、ダイアログの中の「選んだ行き先」に同じ行が出る。「地点を名前で探す」でも選べる）。選んだことは画面だけの状態で保存しない。待機などで行き先がなくなれば外れ、選択肢が変われば知らせ直す。外すのは × 「選択を解除」かEsc（Escは開いている「待機」の一覧を先に閉じる）。「待機」の一覧と「休む」の帰り方は同時に開かない（「待機」を開くと「休む」の選択が外れ、「休む」を押すと「待機」の一覧が閉じる）。選んだこと・出せる選択肢・外したことは、いつも置いてある読み上げの欄（`travel-announce`）が伝え、行の名前は選んでも変わらない。判定は純粋関数の `src/features/journey/travel-selection.ts`、選べるものは `src/domain/travel-destinations.ts` の `getDestinationChoices`・`getTravelSleepChoices`（`listPlayerActions` の移動・休む操作と一致することを単体テストが確かめる）、画面への取り付けは `useTravelSelection`。
  - **二度押しの守り**：2回目の押下（名前・「休む」・選択肢）は、選んだ（または選択肢を出した）押下から300ms（`ARMING_MS`）と地図が寄り終わる時（400ms。動きを減らす設定では0）の遅いほうまで無視する（素早い二重タップは1回の選択になり、地図に場所が出る前に出発しない）。押せるようになると行と帯に `data-armed` が付く（E2Eが待つ印。見た目には使わない）。U25の2回目の押下・選択肢が変わったとき・出来事の移動手段を開いたときは、その時間を数え直す。押し続けたキーの繰り返しは無視する。出発の後は、移動と時間の演出がタップを受け（上の「会話の場面」の項）、同じ版での二度目の移動は `useTravelEffects` とゲーム関数の版の確認が断る。
  - **指の下を動かさない**：ポインター（指・マウス）の押下の後は、押した所の下でページを動かさない。前に選んだ上の行が縮むときは、押した行を同じ画面の位置に保つ。行の中に出るものは押した名前の下に出る。選択肢を出す押下ではスクロールせず、選択肢が下の帯に隠れたら、遊び手がスクロールするか名前をもう一度押す（そのときだけ選択肢を画面に入れ、数え直すので、指の下に来た選択肢はすぐには押されない）。行き方が1つの行では、「もう一度押すと出発」の帯が下の帯に隠れるときだけ、その分（42px以内）スクロールする（押した点は同じ行の名前の上に残る）。地図の印の押下でスクロールするのは、地図が上に残っているときだけ（行を地図の下に入れる）。「休む」の押下は、帰り方に場所が要るとき、先に地図が上に残るまでページを送ってから帯を伸ばす（帯は画面の下に固定なので、指の下は動かない。宿の印の押下ではしない）。帯は地図の枠と出典の表示に重ならない（伸びる上限は地図の下端の位置をスクロールのたびに測る）。キーボードの押下（`detail` が0のクリック、印のキー）では出たものを画面に入れ、フォーカスは名前に残る。印をキーボードで選ぶと、フォーカスは行の名前へ移る（Enterはキーを押したとき、Spaceは離したとき。離したキーで行が押されないように）。
- **画面が変わったときのフォーカス**（UI 再設計 §3.7 の決定E・K、段階1.7）：押した操作が新しい画面で消え、フォーカスが失われた（ページ全体か `<main>` にある）とき、新しい画面の見える見出し（`h1`、`tabIndex={-1}`。Tabの止まり先にはしない）へ移す。観光案内・バトル・デート・道中交流は場面の名前の札、到着・エピローグは会話の窓の中の見出し、自由時間は「{都市}の行き先」、交際開始の画面はその見出し。見出しのない画面（観察）と、到着の題字の下で会話の窓がまだ押せない間は `<main>`（題字が終わると見出しへ）。画面の区切りは `src/app/story-scene-change.ts` の `screenOnShow`（単体テストあり）、移すのは `src/components/scene-focus.ts` の `focusSceneHeading`。場面やダイアログが自分で置いたフォーカス（バトルの解説、特殊戦の題字の「スキップ」、ロードの後の⚙設定、旅行編の切り替えと「再試行」の後の選択欄）は動かさない。キーボードの後は2色の枠（`--ds-focus` の線と `--ds-slate-900` の縁）が見え、指やマウスの後は見出しにフォーカスがあっても枠を出さない（`data-quiet-focus`）。自由時間は前の画面のスクロール位置ではなく、ページの一番上から開く（タイトルを短い画面で「旅をはじめる」までスクロールした後も）。別のタブで開いている旅行編の案内（`App.tsx` の `JourneyLockScreen`）は旅行編の名前の見出しを持ち、ページを開いたときにフォーカスを受ける（Tab 1回で「再試行」）。
- タイトルの名前欄（準備中の旅行編の名前欄も同じ）は空欄で始まり、既定の名前（`content/romance/balance.json` の `defaultPlayerName`・`defaultHeroineName`）を薄い見本の字（placeholder）と欄の下の一文で示す。空欄（空白だけを含む）のまま始めると既定の名前になる（`src/domain/player-names.ts` の `nameOrDefault`）。設定での名前の変更は今の名前を入れた欄で行い、空欄では保存しない。
- タイトルは、この端末で最後に開いた公開中の旅行編を開く。旅行編の選択欄で切り替えたときに `dreamscape.last-journey.v1` へ旅行編IDだけを記録する端末ごとの好みで、セーブ・バックアップ・英語ノート・表示設定とは別（準備中の旅行編は記録しない）。記録がない・この版にない・準備中になった・読み取れない場合は既定の旅行編を開き、書き込めなくても遊び方は変わらない。Debugは読み書きしない（`src/app/last-journey.ts`）。
- Debugモード（2026-11-08のユーザー判断）：誰でも、旅を始めた後の上の帯の⚙設定→「ゲームの設定」→「Debugモード」で、パスワード `adminmode` を入れてオンにできる（オフにするのはパスワードなし）。**このパスワードは秘密ではない**（ユーザーの判断「見られても全然構わない」。コード・ビルド・文書・PRに書いてあり、誰が見てもよい）。誤ってオンにしないための確認で、守るための仕組みではないため、ハッシュにせず定数とそのまま比べる（NFKC・前後の空白を除く・小文字にしてから。スマートフォンの先頭の大文字や全角の入力も通す）。オン・オフは端末ごとの好みとして `dreamscape.debug-mode.v1`（値 `on`、なければオフ）に置き、セーブ・バックアップ・英語ノート・表示設定・Debugのメモリ上の保存とは別（「保存データの消去」も「古い保存データの整理」も触れない）。読めないときはオフ、書けないときは理由を出して状態を変えない。ほかのタブとは同期せず、「ゲームの設定」を開いたときに読み直す（`src/app/debug-mode.ts`。旅行編ごとの保存領域 `journeyStorage` はこのキーを旅行編で分けずにそのまま通す）。オンの間は：(1) 本番ビルドでも `?debug`・Debug起動URL・`?character-preview` が開く（`src/main.tsx`。オフの間は通常のタイトルを開き、開発サーバーでは常に開く）。ゲームの設定の「場面の確認を開く」はDebugへのリンクで、ページごと移る（未保存の進行は離脱の確認が守る）。Debugでの遊びは今までどおり通常の保存・英語ノート・表示設定を変えない。Debugの中の「ゲームの設定」にはこの欄を出さない。(2) 遊びの中で、関係の値が変わった操作のあと、会話の場面の上（`<main>` の最初、場面の外）に「Debug」の印付きで、各軸の増減と前後の値、デートの返答の反応と噛み合う確率（道中交流では反応の結果だけ。道中交流のセーブは確率を持たないが、保存した反応の設定・選ぶ前の値・抽選値から、保存の検査（`src/domain/encounter.ts`）と同じ `resolveRomanceChoice` でセーブを変えずに求め直せる。今は求め直さない。また今の道中交流には反応の設定（`responseProfileId`）を持つ選択肢がないので、交流では表示が出ない）を出す（`src/components/RelationshipChangeNote.tsx`。上の帯が場面に重なる画面では、上の帯（観光案内・バトル・デート・道中交流では場面の名前の札の行も）のすぐ下に置き、表示の高さ（`--change-h`）だけ場面の上の余白（`--scene-top`）を広げるので、上の帯に隠れず、場面の操作（訪問先の写真など）も、札の行の「出典」も隠さない。会話枠は下に残る。表示の `role="status"` の枠はDebugモードがオンの間ずっと置き、変化をその中に入れるので、読み上げが変化を伝える）。値の差は `src/domain/relationship-change.ts` の純粋関数が操作の前後の状態から求め（内容を読まないので、今後どの場面が値を変えても同じに出る）、`useGameSession` の `commit` の後に呼ぶ（ロード・新しい旅・消去では出さない）。表示は場面の終わり・次の変化・オフ・ロードで消え、会話ログにもセーブにも入らない。オフの間の操作は覚えないので、同じ場面でオンにしても前の変化は出ない。Debugのページでは常に出す。高さが500px未満の縦向きの画面（上の帯と場面がページの流れに沿ってスクロールする）では、返答の後にこの表示が画面の上の外に出ることがある（2026-11-09のユーザー判断で、Debugだけの既知の制限として残す。スクロールを戻すと見える）。
- 台詞表示は行をまとめて同時に見せすぎず、状況説明→会話→選択のテンポを設計。
- 本番は静的WebサイトとしてURLでアクセス（HTML添付をiPhoneで開かせる方式に依存しない）。

## 品質
- `npm run dev` / `npm run build` / `npm run test` を初期導入。TypeScript型チェック、ユニットテスト、Inkコンパイル失敗時の検出。
- `content/` にあるサンプルは検証されるまで試作扱い。実際の実装でサンプルの見た目や数値を固定しない。
- 実際の依存バージョン、Inkコンパイラ方法、ライセンス、Vite対応をCodexが公式資料から確認し、手元で動く手順をREADMEに記録する。
