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

- `content/`（`content/journeys/` を除く）は全旅行編で共有する基盤データ（共通レイヤー）。置けるのは `romance/balance.json`・`romance/response_profiles.json`・共通デート効果（`common_date_*`）・`romance/presentation.json` の共通部分（保留・エンディング表示、感情、共通の既定背景 `default_scene`）・`romance/progression.json` の段階と告白・`learning/word-meanings.json`・`presentation/characters.json`・`presentation/own-artwork.json`（直下の `public/` が配信する、Dreamscape のために作った絵の一覧。下の「画像の出典と自作の絵」）だけ。都市・移動・Ink・クイズや旅行編専用のカタログは置けず、共通データから都市や旅行編のデータを参照することもできない（`scripts/content-ownership.ts` が検査）。
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
| `romance/presentation.json` | `backgrounds`・`memories` をキーごとに統合。`deferred`・`ending`・`emotions` は共通データのみ |
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
  - `productionStatus: "complete"` の都市に、その都市の `kind: "city_finale"` のエピソード（`progression/journey.json`）がない（`Complete city has no city finale`）。都市クリア・エピローグ・次の都市への出発はフィナーレの後に起きるため。
  - データの画像（観光画像の `path`、背景の `imagePath`、品物の `iconPath`、人物画像、タイトルの絵）が、別の旅行編の `public/` の画像を指す。旅行編のデータが使えるのは自分の `public/` と直下の `public/` の画像、共通データが使えるのは直下の `public/` の画像だけ（`Reference to another layer`）。
  - `manifest.json` の `authoring` のパス（`observationFile`・`transitDecisionLedger.file`）が、`/` 区切りのリポジトリからの相対パスでない（絶対パス、`..`、`\` を含む）か、`authoring/journeys/<旅行編ID>/` の外を指す。`transitDecisionLedger.cities` にその旅行編の都市以外がある。`imageDirectory` は配信時のパス（`assets/` で始まる相対パス）。
  - 配信する画像が、出典つきの観光画像でも自作の絵の一覧にある絵でもない（「出典のない画像」）、その両方である、一覧にあるファイルをその層が配信していない、同じ層の一覧に2回ある（下の「画像の出典と自作の絵」）。
- 統合したカタログのスキーマエラーは、問題の項目を持つファイルごとに `Invalid content in <ファイル>:` で始まるまとまりで示し、位置（`path`）はそのファイルの中での位置にする（例：旅行編の最初の対決なら、統合後の `battles[9]` ではなく `battles[0]`）。統合後の位置は、エラーの `cause` に残る。
- 警告（生成は続ける。件数を表示し、`npm run content:build -- --verbose` で一覧。判定は `scripts/content-report.ts`）。警告があっても、単体テスト（`test:quick`・`npm test`）・CI・`npm run verify`・公開は失敗しない。直すかどうかは制作者が一覧を見て判断する
  - 旅行編フォルダの読み込まれず配信もされないファイル（上の「統合の規則」）。
  - データからもゲームのコードからも参照されない、旅行編の `public/` と直下の `public/assets/` のファイル（参照されないまま公開される）。コードが自分で使う画像（演出の画像・既定の品物アイコン）は `src/content/code-images.ts` に一覧し、`src/content/code-images.test.ts` が、それらが直下の `public/` にあることと、ほかのコードが配信パス（`assets/…`）を直接書いていないことを確かめる（開発サーバーは存在しない画像にもページを返すため、ブラウザでは欠落に気付けない）。直下の `public/` のブラウザのアイコンとWebアプリのマニフェストは `index.html` が参照し、`scripts/app-icons.test.ts` が検査するため対象外。
  - `npm run images:optimize` で軽くできる観光写真：JPEG・PNG の写真と、観察で拡大しないのに幅1600px・高さ1800pxの枠を超える WebP の写真（観察で拡大する写真は、観光地の `imageAssetId` と、公開前の都市の観察資料 `authoring.observationFile` の画像。仮の画像（`isPlaceholder`）と見本の編の画像は対象外。判定は `scripts/image-optimization.ts`。観察資料は `authoring/` にあるので、この判定だけはそれも読む）。
  - `authoring.eventPrefix` を持つ旅行編の、接頭辞の決まり（下の「ストーリーIDとIDの名前空間」）に合わないID。既存の例外は `scripts/content-report.ts` の `UNPREFIXED_ID_EXCEPTIONS` に挙げ、新しいIDは例外に足さず接頭辞を付ける。例外に挙げたIDが実データから無くなると、単体テスト（`scripts/content-report.test.ts`）が失敗する（使われない例外を残さないため）。
  - `manifest.json` の `transportModes` に宣言したのに、その旅行編のどの都市の経路にも使われていない乗り物（`unusedTransportModes`。経路を足すか、宣言を消す）。
- 成功すると、旅行編ごとに1行、そのフォルダが持つ都市・ストーリー・クイズ・配信ファイルの数と、各カタログの項目数（0件の種類は省略）を表示する（例：`Journey uzbekistan (preparing): cities 4, stories 0, quizzes 0, public files 40; destinations 24, backgrounds 44, assets 40`）。置き忘れや、空のまま公開しかけていることに気付くための表示。観光の手がかり（`clues`）の後には、そのうち問題と結び付かない観察だけの手がかりの数を出す（0件なら省略。`clues 29, observation-only clues 29`。[観察だけの手がかり](07_DATA_AND_TESTS.md#観察だけの手がかり)）。
- 語の意味（共通の `learning/word-meanings.json` と旅行編の断片）のうち、どの英文にも出ない語があれば、その数を表示する（一覧は `--verbose`。判定は `scripts/content-report.ts` の `unusedWordMeanings`）。対象の英文は、クイズの問題文・選択肢（例のクイズ `*.example.json` を除く）と、道中交流の問題・選択肢（カタログの `textEn` と、そのInkの選択肢の文）。使われない語は害がないため警告ではなく、消すかどうかは制作者が判断する。

### 画像の出典と自作の絵

- 配信する画像（直下の `public/` と各旅行編の `public/` にある `.png`・`.webp`・`.jpg`・`.jpeg`・`.svg`・`.gif`・`.avif`・`.ico`）は、どれも次のどちらか一方に当たる。判定は `scripts/image-rights.ts` の `checkImageRights`（単体テスト `scripts/image-rights.test.ts`）。
  - 出典つきの観光画像：その旅行編の `tourism/catalog.json` の `assets` に、作者・出典・ライセンス・加工・確認日とともに登録した画像（[CONTENT_GUIDE](../authoring/CONTENT_GUIDE.md)）。共通の `public/` には置かない。
  - Dreamscape のために作った絵：その画像を配信する層の `presentation/own-artwork.json` に、配信時のパスを1行ずつ書いた絵。直下の `public/` の絵は共通データの `content/presentation/own-artwork.json`、旅行編の `public/` の絵はその旅行編の `content/journeys/<旅行編ID>/presentation/own-artwork.json`。形式は `{ "schemaVersion": 1, "artworks": [{ "noteJa": "日本語の説明", "paths": ["assets/…"] }] }`（`src/content/own-artwork-schema.ts`）。ヒロインの立ち絵、仮の立ち絵、漫符、品物のアイコン、ブラウザのアイコン、作者が用意したタイトルの絵がここに入る。
- `content:build` は、どちらでもない画像（「出典のない画像」）、両方である画像（「画像の扱いが二重です」）、一覧にあるのにその層が配信していないファイル（「自作の絵の一覧にあるファイルがありません」。古い行が、後で同じ名前で置いた別の画像を覆わないように）、同じ層の一覧に2回あるファイルを、1つのエラーにまとめて示して止まる。画像でない配信ファイル（`manifest.webmanifest`）は対象外。画像を足す・消す・名前を変えるときは、同じ変更で一覧も直す。
- 自作の絵は、出典の一覧（クレジットの画面）に載せない。観光画像の一覧のために、`content:build` は旅行編ごとの観光画像のIDの一覧 `src/content/generated/image-journeys.json` を書き出し、`src/content/credits.ts` の `photoCredits` が読む。
- ライブラリのライセンス：本番ビルドは `vite.config.ts` の `build.license` で、使っているライブラリの名前・版・ライセンスと本文の一覧 `dist/third-party-licenses.json` を書き出す（開発サーバーにはない）。`npm run dist:check` が、それが読めるJSONの配列で、各項目に名前・版・識別子・本文があり、`package.json` の `dependencies` のすべてが載っていることを確かめる（`scripts/dist-guard.ts` の `checkThirdPartyLicenses`）。

### 乗り物と交通判断台帳

旅行編の移動手段は、徒歩（`walk`。どの旅行編にもあり、宣言しない）と、`manifest.json` の `transportModes` に宣言した乗り物（2つまで）。都市間の移動（`intercityModes`）は別の仕組みで、ここには含めない。

- 宣言：`transportModes` は `{ id, nameJa, movingJa, kind, rental? }` の配列（宣言しない旅行編は `[]`）。`id` は英小文字で始まる旅行編の中だけのID（`walk` 以外。接頭辞は付けない。保存データ（借りた乗り物）に入るので、公開したあとは変えない。絵の種類と同じ名前でもよい（ミラノの `tram`）。ただし見本の編の任意の部分の乗り物は、外すときにIDと同じ文字列を消すので、絵の種類と違うIDにする（`rental_bicycle`。`journey:new` の写しも同じID））、`nameJa` は経路のボタンと行き先の行に出る名前（例「路面電車」）、`movingJa` は移動中の演出の文字（例「路面電車で移動中」）、`kind` は演出の絵（`rail`・`tram`・`bus`・`car`・`three_wheeler`・`bicycle`）。宣言の型は `src/content/transport-schemas.ts`、名前と絵の読み出しは `src/content/transport.ts`（`getTransportModes`・`transportLabel`）、絵は `src/features/journey/transport-art.tsx`。
- 経路：`travel/<cityId>.json` の経路の `mode` は `walk` か宣言した `id`。路線や乗り降りの場所は経路の `transferNote`（例「16番」「24番・ミッソーリから乗る」）に書き、ボタンでは名前の後に（ ）で出る。
- 借りる乗り物（仮の仕組み）：`"rental": true` の乗り物は、借りるまで乗れない。借りる場所と料金は `travel/<cityId>-settings.json` の `rentals`（`{ modeId, placeIds, cost, sources }`）。滞在先などで1回払って借りると、その都市を出発するまで乗れる（保存データ `travel.rentedModeIds`。次の都市へ出発すると返す）。借りなくても、どの地点へも行けて宿に帰れること（徒歩と借りない乗り物の経路で）を `content:build` が確かめる。借りた乗り物は帰りの交通費の確保（`returnReserve`）と宿への帰り道に加わるが、借りるまでは加わらない（`src/domain/transport.ts` の `getUsableRoutes`）。乗り物に乗った回数は都市ごとに保存する（`travel.rideCounts`。徒歩以外の乗り物で場所が変わった移動だけを数え、次の都市へ出発すると空になる）。乗車イベントや、借りる条件の細かい指定は、共通の条件の仕組みで後から扱う。
- 宿への帰り道（「休む」の一覧、帰りの交通費の確保 `returnReserve`、時間内に帰れるかの判定）：直接の経路と、乗り物の後に宿まで歩く経路から作り、同じ乗り物の中では時間か料金で得のある候補だけを残す。さらに、宿まで直接歩けるときは、その徒歩より速くも安くもない乗り物の候補（直通も乗り継ぎも）を出さない（規則a。2026-11-08 のユーザー判断）。比べる相手はその直接の徒歩だけで、ほかの乗り物どうしでは比べない。借りていない乗り物は、もともと候補に入らない。徒歩は無料で、外した候補より遅くないので、帰りの交通費の確保・時間内に帰れるかの判定・宿泊の計画は規則aがないときと同じになる（`src/domain/travel-routes.ts` の `findTravelHomeRoutes`。全旅行編と見本の編の全地点で `src/domain/home-route-rule.test.ts` が確かめる）。ミラノ編の「休む」の一覧は13地点で23件から19件になった。
- 交通判断台帳：乗り物を宣言した旅行編は、都市ごとに `travel/<cityId>-transit.json`（`schemaVersion: 2`、`cityId`、出典の一覧 `sourceRefs`、判断 `decisions`）を置く。判断は、地点の組（向きを区別）×宣言した乗り物ごとに1件で、`status` は `available`（経路あり）・`not_suitable`（使わない）・`not_applicable`（走っていない）・`inconclusive`（特定できず）。`available` と経路の有無は一致させ、`available` 以外には事実の出典（`claimType: "documented_fact"`）を付ける。判断は乗り物を歩く場合と比べるので、台帳のある都市では、すべての地点の組（向きを区別）に徒歩の経路を置く。`checkedAt`（確かめた日）と日本語の理由 `reasonJa` は必須。`inconclusive` は生成を止めないが、`journey:readiness` が公開前の問題（`transit_inconclusive`）として示す。検査は `scripts/transit-ledger.ts`・`scripts/transport-validation.ts`。
- 経路の出典：宣言した乗り物の経路は、ゲーム用の推定の印（`"estimation": "game_model"`）と、事実の出典（`documented_fact`）を1つ以上持つ。
- 移行待ちの印：`authoring.transitDecisionLedger.pendingJa`（例「ツアー機能待ち」）を持つ旅行編（今はインド編）は、旧方式の交通（旅行編全体の判断台帳と専用の制作ツール）のままにする。台帳・2つまでの制限・経路の出典の検査をまだ受けず、借りる乗り物も置けない。印には、そのあいだ旧方式の台帳を確かめるコマンド `inspectCommand`（`npm run <スクリプト名>`。インド編は `npm run india:transit`）も書く。`content:build` の最後の `Transport <旅行編ID>:` の行、`journey:transit`、`journey:readiness`（`交通:` の行。準備の判定には影響しない）が、印の文とそのコマンドを同じ文で出す（`scripts/transport-validation.ts` の `transportWaitingJa`。`content:build` はほかの旅行編について、乗り物と台帳の判断の件数を出す）。
- 制作ツール：`npm run journey:transit -- --journey <旅行編ID>` が、都市ごと・乗り物ごとの判断の件数と、出典のない経路を示す（`--json` も可。「特定できず」か出典のない経路があると終了コード1）。都市別の作業用JSON（[CITY_BUNDLES](../authoring/CITY_BUNDLES.md)）の `transitDecisions` は、その都市の台帳に書き出す。

### 生成物（手動で編集しない）

`src/content/generated/` は `npm run content:build` の出力で、Git管理しない。`npm run dev`・`npm test`・`npm run test:quick`・`npm run build`・`npm run verify` は先に生成する。単体テスト（`npm test`・`npm run test:quick`）と `npm run verify` の最初の生成は見本の編を含め（`--with-sample`、下の「見本の編」）、`npm run dev`・`npm run build` は含めない。

- `stories.json`（コンパイル済みInk）、`quizzes.json`（出題するクイズ）。
- `content/`：統合・検証済みのカタログを、旧 `content/` と同じ相対パス（`battles/catalog.json`、`cities/delhi.json`、`journeys/catalog.json` など）で書き出した写し。都市・移動ファイルは元のバイト列のまま写す。ゲームと参照だけの単体テストはここだけを読む（`scripts/content-boundary.test.ts` が検査）。
- `public/`：直下の `public/` と各旅行編の `public/` を集めた配信フォルダ（`vite.config.ts` の `publicDir`）。
- `image-journeys.json`：旅行編ごとの観光画像のIDの一覧（上の「画像の出典と自作の絵」）。
- `build-info.json`：生成に含めた `content/journeys/` の外の旅行編フォルダ（`{ "extraJourneyFolders": { "sample_trip": "authoring/templates/sample_trip" } }`、なければ空）。

`stories.json`・`quizzes.json` は毎回書き直す。`content/`・`public/` は変更のないファイルを書き直さず、元がなくなったファイルを削除する。JSONや画像を編集した後も、Inkと同様に `npm run content:build` を実行する。

### ストーリーIDとIDの名前空間

- ストーリーIDは、その層の `stories/` からの相対パスから `.ink` を除いたもの（例：`content/journeys/milano/stories/dates/milano_date_cafe.ink` → `dates/milano_date_cafe`）。旅行編フォルダ名は含まない。複数の旅行編が `stories/battles/` のような同じフォルダ名を使えるため、ファイル名（または旅行編専用のサブフォルダ）でIDが重ならないようにする。
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
| 到着・エピローグ | `arrivals/<都市ID>`、`epilogues/<都市ID>` | なし |
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
- 仮の場面（`src/dev/test-cities.ts`）と一部の単体テストは、実在する1都市のデータを役割ごとに複製して試験用の都市を作る。開発用で、通常プレイには影響しない。元にする都市は `src/dev/fixture-template.ts` の `findDebugTemplate` がデータから選ぶ。候補は、見本の編が読み込まれていれば（`npm run dev:sample`・単体テスト）その都市、なければ公開中の旅行編を `order` 順・都市順に見て、必須の役割をすべて持つ最初の都市（今のデータではミラノ）。必須の役割は、案内と対決のある観光地の通常エピソード、その出来事の地点と徒歩の経路、エピローグのある都市フィナーレ。任意の役割（特殊戦B・特殊戦C、品物をくれる道中交流、デート）は元の都市にあるものだけを作り、ないものはDebugの設定画面に注記して、場面の一覧では選べないことを示す（例：ミラノ編がない構成ではインド編のデリーが元になり、特殊戦と道中交流の仮の場面はない）。条件を満たす都市がなければ、その旨を表示して作らない。ミラノのIDを使うテストは `installTestCity({ templateCityId: "milano" })` と元の都市を明示する。仮の場面は準備中で実際のエピソードがまだない旅行編だけに作る。
- 旅行編ID `sample_trip`、接頭辞 `smp_`、都市ID `mihon`、並び順 `order: 9000` は、開発・テスト専用の見本の編（`authoring/templates/sample_trip/`、下の「見本の編」）のために予約する。`content/journeys/` には置かず、本番には含めない。`npm run journey:new` は、`sample_trip`・`smp`・`mihon` を旅行編ID・都市ID・接頭辞のどれに指定しても拒否し（`_` で区切ったIDの一部としても。`sample_trip` はどこに含んでも、本番の `dist/` の検査に掛かるため拒否する）、新しい旅行編に `order: 9000` を使わない。
- 本番ビルド（`npm run build`・`npm run verify`）は `vite build` の後に `scripts/check-dist.ts` で `dist/` を検査し、Debug・プレビュー（`src/dev/`）、テスト用の仮データ（`src/dev/test-cities.ts`・`src/content/test-fixtures.ts`・`tests/fixtures/`）、見本の編の旅行編ID `sample_trip`（画像フォルダ名にも使う）に固有の目印の文字列と、開発・テスト用のファイルのパス（`src/dev/`・`tests/fixtures/`・`tests/journeys/`。ソースマップなどに出る）が、公開されるファイルの名前か内容にあればビルドを失敗にする。ライブラリのライセンス一覧 `third-party-licenses.json` がないか、`package.json` の `dependencies` のどれかが載っていないときも失敗にする（上の「画像の出典と自作の絵」）。検出に使う文字列と由来のファイルは `scripts/dist-guard.ts` にあり、由来のファイルから文字列が消えると `scripts/dist-guard.test.ts` が失敗する。旅行編ごとのテストの補助（`tests/journeys/<旅行編ID>/` の `test-journey.ts` など）は自分の目印を持たない。旅行編を外すときにそのフォルダを消しても、`scripts/dist-guard.ts` を直さずに済むようにするためで、補助は `src/dev/test-cities.ts` の上に仮の都市を作るのでその目印が一緒に現れ、パスには `tests/journeys/` の目印が出る。加えて `scripts/dist-guard.test.ts` が、本番のコードが `tests/` を読み込まないことを確かめる。検出は目印による確認で、開発用のコードが入ったことを必ず見つけるものではない（目印を持たない新しいファイルや、目印の部分が使われずに省かれたコードは見逃す）。`src/dev/` などに開発用のファイルを足したら、そのファイルに固有の文字列も目印に加える（旅行編ごとのテストのフォルダの補助は除く）。

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
- 所持品のアイコンは道中交流カタログの品物の `iconPath`（未指定なら共通の `assets/items/item.svg`）。
- 道中交流は、その観光地を観察しているときにだけ始まる（入場ルールを満たす交流が、観察を進めたときにカタログの順に始まり、終わると観察に戻る）。自由時間から交流を始める道はない。交流のカタログの `availability`（`tourism`・`dormant`）はセーブ版 v14 でなくなり、書くと `content:build` が止まる（`Unrecognized key`）。使わない交流はカタログから消す。
- クイズをその観光地のバトルの後まで待たせる道中交流（ミラノのガッレリアの願掛け）は、`encounters/entry-rules.json` の `quizAfterLandmarkBattle` で指定する（クイズのある交流だけ）。この印のある交流は最初の観察で会え、その観光地のバトルを一度も戦っていないうちは、クイズなしで話が終わる。バトルを戦った後に始まった場合だけクイズへ進む。ただし今のミラノ編には、ガッレリアのバトルを戦った後に交流が始まる観察がないため、願掛けのクイズ（と展示券の抽選）には遊んでいて届かない（バトルを終えるとガッレリアは地図の行き先に出なくなる。バトルの画面から観察に戻れるが、バトルの途中なので交流は始まらない）。ユーザーの判断（2026-11-08）で、今は起こらないミラノの道中交流は今のまま残し、シナリオの改稿でまとめて見直す（各Inkファイルの先頭のコメントに、今いつ起こるかを書いている。[開発時の確認](10_DEVELOPMENT_CHECKS.md#関数の層のランダムウォーク)）。
- Debugの「仮の場面」は、ミラノ固定ではなく役割で選んだ都市を元にする（上の「Debugの「仮の場面」」の項）。

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
- `src/domain/travel-destinations.ts` は行き先候補と待機時刻を計算する。帰宿候補と宿泊計画は `travel-game.ts` を画面表示と実際の操作で共用し、画面内に同じルールを重複実装しない。
- `scripts/content-pipeline.ts` の `buildContent`（`content:build`）は、読み込み → 検証 → 書き出しの3段階で動く。
  - 読み込み：`content-sources.ts` だけがコンテンツを読む。`readContentTree` が `content/` と `public/` を一度だけ読み（JSONとInkは中身、画像は一覧だけ）、`contentSourcesFromTree` がディスクに触れずに、層、統合したカタログと各項目の出どころのファイル、都市・移動・クイズのJSON、Inkの本文、配信ファイルの一覧（`ContentSources`）を組み立てる。JSONとして読めないファイル、配置の誤り、統合の衝突はここで止まる。制作ツールも同じ `loadContentSources` の結果を使い、都市・移動・クイズ・Inkを読み直さない（旅行編の一覧だけが要るときは、`readJourneyManifests` が同じ処理で `manifest.json` だけを読む）。読み込み全体は約25ミリ秒で、`content:build` の約15秒の大半はInkの会話経路の検証にかかる（2026年11月、4コアで計測。分割の前後で所要時間は変わらない。検証のキャッシュが使えると約3.4秒）。
  - 検証：`content-validation.ts` の `validateContent` は読み込んだ内容だけを受け取る純粋な関数で、ファイルを読み書きしない（Inkのコンパイルもここ）。旅行編フォルダが自分の都市だけを扱い、同じ旅行編か共通データだけを参照することの検査は `content-ownership.ts`、Inkのコンパイルと会話経路の検証は `ink-validation.ts`、クイズ1件の中の検査は `quiz-validation.ts`、都市のつながり（次の都市と旅行編の順序）の検査は `city-links.ts`、背景画像とキャラクターの参照検証は `presentation-validation.ts` が担当する。画像ファイルの中身（形式・寸法・透過）だけは、検証が通った後に `content-images.ts` が読んで確かめる。デートの全分岐検査（`validateStory`。検証時間の大半）は、`buildContent` が渡す `story-validation-cache.ts` のキャッシュで、入力と検査コードが同じ成功結果を再利用する（`validateContent` が読み書きするのはこのキャッシュだけで、渡さなければ毎回すべて検査する。[キャッシュの規則](10_DEVELOPMENT_CHECKS.md#会話の全分岐検査のキャッシュ)）。
  - 書き出し：`content-outputs.ts` が `stories.json`・`quizzes.json`・生成ミラー・配信用の画像フォルダを書く。
  - `selectJourneys(sources, [旅行編ID])` は、共通データと指定した旅行編だけの内容を組み立て直す（ほかの旅行編フォルダを外して生成したときと同じ内容）。`contentTreeFromFiles` でメモリ上に作った内容も同じ関数で組み立てて検証できるため、不正なデータを拒否するテストは一時コピーや生成全体なしで書ける（例：`scripts/content-validation.test.ts`）。
  - `content-pipeline.ts` が公開するのは `buildContent` だけで、テストが単独で使う検査関数は上のモジュールから読み込む（単体テストの組の判定のため。[開発時の確認](10_DEVELOPMENT_CHECKS.md#単体テストの組と所要時間)）。
- `scripts/city-bundle.ts` は都市編集の公開APIと検証手順を担当する。編集形式は `city-bundle-schema.ts`、経路の圧縮・展開は `city-bundle-routes.ts`、共有カタログの統合は `city-bundle-catalogs.ts`、競合確認と原子的なファイル更新は `city-bundle-files.ts` が担当する。交通判断台帳は、乗り物を宣言した旅行編では都市ごとの `travel/<cityId>-transit.json`（その都市の旅行編フォルダ）、交通の切り替えを待つ旅行編（インド編）では `manifest.json` の `authoring.transitDecisionLedger` に書いた旅行編全体で1つの台帳を使い、旅行編専用のツールは読み込まない。

機能を追加するときは該当する責務へ実装し、画面や入口のファイルへ個別の保存・進行・検証ルールを戻さない。分離したモジュール間で型だけが必要な場合は `import type` を使い、実行時の循環参照を避ける。

## 開発中の保存とシナリオ更新

開発中は、更新後に以前のセーブを利用できることや、自動移行を保証しない。現在のゲームセーブはv14で、v1〜v13の自動移行は行わず読み込み対象外とする（元のデータは消さず、旧版として案内する）。v14は旅行の日数・時刻・現在地と活動中の時間枠を保持し、デートの章はエピソードの記録から求めて保存しない。共通条件管理システムが読む記録（見た道中交流 `seenEncounterIds`、品物を渡した・使った交流と選択肢 `itemUses`、乗り物に乗った回数 `travel.rideCounts`）も保存し、物語の状態（`storyProgress`・`travel.temporaryFlags`）とツアーの記録（`tour`・`completedTourIds`）は空のまま持つ（v14で変えたことは [セーブの版](07_DATA_AND_TESTS.md#セーブの版)、記録の意味は [共通条件管理システムの記録](07_DATA_AND_TESTS.md#共通条件管理システムの記録)）。保存先は旅行編ごとに分かれ、ミラノ編を含むすべての旅行編が `dreamscape.journey.<旅行編ID>.save.v1`（ゲーム進行）と `dreamscape.journey.<旅行編ID>.learning.v1`（英語ノート）を使う。以前のミラノ編の `dreamscape.save.v1` / `dreamscape.learning.v1` は読み込まず、ゲームが自動で消すこともない（設定の「古い保存データの整理」で利用者が選んで消せる。[古い保存データの整理](07_DATA_AND_TESTS.md#古い保存データの整理)）。各旅行編はWeb Locksで別タブからの同時編集を防ぐ。`schemaVersion` と保存された場面の指紋・状態を検証し、内容が異なる脚本や問題を無理に復元しない。誤字修正や改稿のたびに旧セーブ再開用のInk・定義を残すことは必須ではない。一方、読み込めるデータを更新のたびに無条件で無効化しない。

安全に読めないデータは自動削除・上書きせず、原因を断定できない場合もその旨を案内する。利用者が確認した場合だけ対象のDreamscape管理キーを消去できるようにし、別タブ競合と他アプリ・バックアップの保護を維持する。現在のバージョン内の保存・再開と二重適用防止は維持する。一般公開時には必要に応じて互換性方針を再検討する。

## UX/スマホ
- 縦画面最優先（約360〜430px幅）。PCでは適切な最大幅を設定。
- 選択肢は大きなタップ領域、文字切れ防止。読みやすい文字送り・戻れない選択時の確認・スキップ機能は段階的に実装。
- 会話の場面（観光案内・デート・道中の交流・到着とエピローグ・バトルの会話と反論）では、場面のどこを押しても台詞を押したのと同じく、書きかけの行を最後まで表示し、次の1回で先へ進む。観光案内は見出し（観光地名）も場面に含め、場面より広い画面では `<main>` 自身の余白（`data-page-margin`。その中の通知などは含めない）も場面と同じに扱う。ただし操作（ボタン・リンク・入力欄・`summary`・ダイアログ（`role="dialog"` を含む）、操作の `role`、編集できる要素、`data-no-advance` の付いた範囲。会話枠の「閉じる」「ログ」「高速送り」の並び、デートの訪問先の写真欄、観光案内の手がかり帳の並びと画像の出典欄はこの印で除く）の上とその中、場面の外（画面上部の旅の情報と操作など）、ログ・設定・英語ノートなどが開いている間（`dialogueObstructed`。開いた `dialog` と会話枠の小さなメニュー。キーボード・文字送り・自動送りも止まる）と、所持アイテムの詳細（`role="dialog"`。場面の外のタップで閉じる）が場面の上にある間と移動の演出（`TravelTransition`。タップを下の場面へ通す）の中央の絵の上（タップだけ。`tapsObstructed` が指を下ろした位置で決める。演出の絵の外は場面が見えているので普段どおり）、隠したウィンドウを戻す1回、選択肢が出ている間（書きかけの行を表示し終えるだけ）は進まない。ウィンドウを隠せる場面では、隠している間は「タップして会話を表示」が場面全体を覆う（観光案内の「閉じる」は案内そのものを閉じるので、見出しや余白の横でウィンドウが隠れていることはない）。台詞そのものはボタンなので、1回の操作で進むのは1歩だけ。道中の交流の英語3択の判定と解説は会話の行ではなく、バトルの解説と同じく、ボタン（「続きを読む」）だけで進む（解説と訳・語句を読む画面で、場面を押しても進まない）。判定は `src/components/scene-tap.ts` の `shouldAdvanceOnTap`（単体テストあり）、場面への取り付けは `useSceneTap`。キーボードと読み上げでは今までどおり台詞と各ボタンを使う（所持アイテムの詳細や移動の演出が出ていても台詞のEnterや読み上げの操作で進み、文字送りと自動送りも止まらない。ポインターのないクリック（`detail` が0。読み上げの操作、ボタンのEnter）は上にあるものの上からのタップとして扱わない）。場面にボタン以外の操作を足すときは `data-no-advance` を付ける。
- 二重タップの2回目（`src/components/double-tap.ts` の `DOUBLE_TAP_WINDOW_MS`＝350ms以内）は、押した操作で画面が変わった後に別のものへ当たるので無視する（選択肢の誤タップ防止）。回答ボタンの後のバトル画面（`data-answer-settling`）に加え、会話の場面が出ている間は、ページの操作（場面の返答・選択肢・会話枠のボタン・隠したウィンドウを戻す操作・リンクと、場面の外の画面上部の操作・ダイアログの「閉じる」やダイアログそのもの。台詞・絵・`data-no-advance` の範囲・ただの文字は含めない。判定は `pressesControl`。`useSceneTap` が文書全体でキャプチャして受ける）を押した後と、場面の上にあるもの（`tapsObstructed`。ログ・所持アイテムの詳細・移動の演出の中央の絵など）の上からのタップ（指を下ろしたときにその位置にあった。それを閉じるタップを含み、パンで取り消された指とポインターのないクリックは含めない）の後のその時間、場面のタップでも台詞のタップでも進まない（場面に `data-tap-settling` が付き、台詞はポインターを受けない）。場面の上からのタップそのものも、台詞の上なら台詞に届かない（台詞は自分のクリックで進むので、`useSceneTap` がキャプチャで止める）。会話の場面が始まったとき（行き先から始まるデート・観光案内、「進む」で始まるバトルの会話、「敵の反応を見る」、「エピローグへ進む」など）と終わったとき（デートの終わり、観光案内から観察へ、「問題へ進む」、エピローグ・道中交流の終わり、特殊戦の反論の終わり）と、ロードで保存した場面に戻ったとき（同じ場面でも、デート・バトル・道中の交流は新しく作り直される）、旅行編の切り替え（「切り替える」など）と別タブの案内の「再試行」で画面を作り直したとき（新しい `GameApp` は保存した場面を最初から出すので、場面の始まりとしては見つからない）は、新しい画面が指の下に出るので、その時間はページのどのタップも受け付けない（`GameApp` が `src/app/story-scene-change.ts` の `storySceneOnScreen`・`storySceneChanged` で場面の始まりと終わりを見つけ、ロードでは `loadSavedGame` が、切り替えと再試行では `App.tsx` の `switchJourney`・`retryLock` が、押したときに `src/components/tap-hold.ts` の `holdTaps` でルート要素に `data-tap-hold` を付けてポインターを止める。キーボードは止めない）。行き先から始まる場面では移動の演出がこの時間より長く出るが、演出の中央の絵のタップは上の `tapsObstructed` のとおり下の場面を読み進めない（演出の絵の外のタップは普段どおり。台詞のタップは書きかけの行を表示し、または1行進む）。
- タイトルの名前欄（準備中の旅行編の名前欄も同じ）は空欄で始まり、既定の名前（`content/romance/balance.json` の `defaultPlayerName`・`defaultHeroineName`）を薄い見本の字（placeholder）と欄の下の一文で示す。空欄（空白だけを含む）のまま始めると既定の名前になる（`src/domain/player-names.ts` の `nameOrDefault`）。設定での名前の変更は今の名前を入れた欄で行い、空欄では保存しない。
- タイトルは、この端末で最後に開いた公開中の旅行編を開く。旅行編の選択欄で切り替えたときに `dreamscape.last-journey.v1` へ旅行編IDだけを記録する端末ごとの好みで、セーブ・バックアップ・英語ノート・表示設定とは別（準備中の旅行編は記録しない）。記録がない・この版にない・準備中になった・読み取れない場合は既定の旅行編を開き、書き込めなくても遊び方は変わらない。Debugは読み書きしない（`src/app/last-journey.ts`）。
- 台詞表示は行をまとめて同時に見せすぎず、状況説明→会話→選択のテンポを設計。
- 本番は静的WebサイトとしてURLでアクセス（HTML添付をiPhoneで開かせる方式に依存しない）。

## 品質
- `npm run dev` / `npm run build` / `npm run test` を初期導入。TypeScript型チェック、ユニットテスト、Inkコンパイル失敗時の検出。
- `content/` にあるサンプルは検証されるまで試作扱い。実際の実装でサンプルの見た目や数値を固定しない。
- 実際の依存バージョン、Inkコンパイラ方法、ライセンス、Vite対応をCodexが公式資料から確認し、手元で動く手順をREADMEに記録する。
