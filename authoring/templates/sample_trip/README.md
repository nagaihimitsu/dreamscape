# 見本の旅（sample_trip）

開発・テスト専用の、最初から最後まで遊べる最小の旅行編です。架空の「見本の街」（都市ID `mihon`）で、観光案内 → 通常戦（3問）→ デート → 都市フィナーレ（5問）→ エピローグを一通り遊べます。新しい旅行編を作るときの最小の例として、各ファイルの書き方を示します。

- 置き場所は `authoring/templates/sample_trip/` で、`content/journeys/` には置きません。そのため `npm run dev`・`npm run build`（本番）・公開サイトには含まれません。本番ビルドの検査（`npm run dist:check`）は `sample_trip` の文字列が `dist/` に入るとビルドを失敗にします。
- 読み込むのは、明示したときだけです。
  - `npm run dev:sample`：見本を含めて生成し、開発サーバーを起動します（タイトル画面に「見本の旅」が並びます）。`npm run dev` に戻すと見本は消えます。
  - `npm run content:build -- --with-sample`：見本を含めて生成します。`src/content/generated/build-info.json` に読み込んだフォルダが記録されます。単体テスト（`npm test`・`npm run test:quick`）と `npm run verify` の最初の生成はこの形です。
  - テストの一時コピーでは `prepareContentFixture(フォルダ, { withSample: true })` で `content/journeys/sample_trip/` に複製されます。
- 旅行編ID `sample_trip`、ID の接頭辞 `smp_`（`manifest.json` の `authoring.eventPrefix`）、都市ID `mihon`、並び順 `order: 9000` は見本のために予約されています。

## 架空であること

見本の街・人物・言い伝え・出典・画像はすべて架空です。開発・テスト専用の見本に限り、AGENTS.md の「実在する著名な観光地を主舞台にする」「出典を捏造しない」の例外として認められています。どこを見ても架空と分かるように、次のとおりにしています。

- 出典はすべて `https://example.com/dreamscape-sample`、発行者は「Dreamscape 見本の旅（架空）」、`claimJa` は「見本用の架空の…」で始まります。クイズの出典の区分は `legend`、地点・徒歩時間は `hypothesis` です。
- 画像は図形だけで描いた自作のPNG（240×160、CC0）です。地点の座標は海上の 0,0 付近です。
- 本番の旅行編にこの文章・出典・画像を残さないでください。複製して使うときは、実在の観光地、確認した出典、権利を確認した画像に置き換えます。

## 必須の20ファイル

どれか1つを外すと `content:build` が止まります（`scripts/sample-journey.test.ts` が、任意の部分を外した最小の構成から1つずつ外して確かめます）。

| ファイル | 役割 | 外したときのエラー |
| --- | --- | --- |
| `manifest.json` | 旅行編の登録。ID・並び順・状態・都市・通貨・開始資金・`cityPlan`・`authoring.eventPrefix` | `Missing journey manifest` |
| `cities/mihon.json` | 都市。`productionStatus: "complete"`、予定の観光地、初回クリア報酬 | `Travel file without a city in the same layer` |
| `travel/mihon.json` | 地点（宿・時計塔）、全地点間の経路、地図のイベント | `Cannot read JSON …/sample_trip/travel/mihon.json` |
| `travel/mihon-settings.json` | 宿の地点・宿泊費・再挑戦の間隔 | `Cannot read JSON …/sample_trip/travel/mihon-settings.json` |
| `romance/presentation.json` | 背景（宿は画像なしの `neutral`、時計塔は画像つき） | `Unknown date destination background` |
| `romance/date_destinations.json` | デートの行き先（時計塔の広場）と小話 | `Unknown date destination` |
| `romance/date_catalog.json` | 通常デート1件（2回の3択、共通効果） | `Invalid content in romance/date_catalog.json` |
| `tourism/catalog.json` | 画像台帳・観光地・観察ポイント（hotspot） | `Invalid content in tourism/catalog.json` |
| `progression/journey.json` | 観光エピソードと都市フィナーレ（エピローグつき）、報酬 | `Complete city has no city finale` |
| `battles/catalog.json` | 通常戦（中間2場面）と都市フィナーレ（中間4場面） | `Invalid content in battles/catalog.json` |
| `quizzes/smp_mihon_clock_tower_quiz.json` | 通常戦の英語3択3問 | `Unknown battle quizId: smp_mihon_clock_tower_quiz` |
| `quizzes/smp_mihon_finale_quiz.json` | 都市フィナーレの英語3択5問 | `Unknown battle quizId: smp_mihon_finale_quiz` |
| `learning/translations.json` | 全問題の和訳（原文の写しと照合される） | `Missing translation` |
| `learning/word-meanings.json` | 共通の辞書（`content/learning/word-meanings.json`）にない英単語だけ | `Missing word meaning` |
| `stories/tourism/smp_mihon_clock_tower_guide.ink` | 観光案内 | `Unknown tourism guideStoryId: tourism/smp_mihon_clock_tower_guide` |
| `stories/battles/smp_mihon_clock_tower.ink` | 通常戦の会話 | `Unknown battle storyId: battles/smp_mihon_clock_tower` |
| `stories/battles/smp_mihon_finale.ink` | 都市フィナーレの会話 | `Unknown battle storyId: battles/smp_mihon_finale` |
| `stories/epilogues/mihon.ink` | 都市エピローグ | `Unknown epilogue story: epilogues/mihon` |
| `stories/dates/smp_mihon_date_tower_square.ink` | 通常デートの会話 | `Unknown storyId: dates/smp_mihon_date_tower_square` |
| `public/assets/tourism/sample_trip/mihon_clock_tower.png` | 時計塔の自作画像（観察・背景） | `Missing public file: assets/tourism/sample_trip/mihon_clock_tower.png` |

各Inkの冒頭の `//` コメントに、その種類の脚本の規則を書いています。

## 任意の部分

ゲームの仕組みを一通り試せるように、次の部分も入っています。なくても旅行編として成立し、外した最小の構成もビルドが通ります（`scripts/sample-journey.test.ts` が確かめます）。外すときは、下の「ファイル」を消し、必須のファイルから下の「項目のID」の項目を消します（そのIDを値に持つ配列の要素、そのIDの文字列、そのIDのキー。例：経路は出発地か到着地が消す地点の要素）。

### 特殊戦B（矛盾追及）

朝市でパン屋のサラの「誰も時間を守らない」という断言に、資料を1枚突きつけます（全3問のうち第2問）。

- ファイル：`quizzes/smp_mihon_market_b_quiz.json`、`stories/battles/smp_mihon_market_b.ink`、`stories/tourism/smp_mihon_market_guide.ink`、`public/assets/tourism/sample_trip/mihon_market.png`
- 項目のID：`smp_mihon_market_b`、`mihon_market`、`smp_bg_mihon_market`、`smp_img_mihon_market`、`smp_obs_mihon_market_rain`、`smp_obs_mihon_market_timer`、`smp_obs_mihon_market_rows`、`smp_mihon_market_b_q1`、`smp_mihon_market_b_q2`、`smp_mihon_market_b_q3`

### 特殊戦C（証拠連結）

図書室で、司書のイオに資料を2枚組み合わせて示します（全3問のうち第3問）。

- ファイル：`quizzes/smp_mihon_library_c_quiz.json`、`stories/battles/smp_mihon_library_c.ink`、`stories/tourism/smp_mihon_library_guide.ink`、`public/assets/tourism/sample_trip/mihon_library.png`
- 項目のID：`smp_mihon_library_c`、`mihon_library`、`smp_bg_mihon_library`、`smp_img_mihon_library`、`smp_obs_mihon_library_diary`、`smp_obs_mihon_library_letters`、`smp_obs_mihon_library_weather`、`smp_obs_mihon_library_hours`、`smp_mihon_library_c_q1`、`smp_mihon_library_c_q2`、`smp_mihon_library_c_q3`

### 道中交流と品物

時計塔の観察から対決へ進む前に、子どもから「三時のしおり」を受け取り（入手）、続く交流でヒロインに渡せます（贈与）。品物には同じ都市での使い道が必要なため、受け取る交流と渡す交流の2件で1組です。出会う条件（`encounters/entry-rules.json`）は付けていないので、初めての観察で出会います。

- ファイル：`encounters/catalog.json`、`stories/encounters/smp_mihon_bookmark_stall.ink`、`stories/encounters/smp_mihon_bookmark_gift.ink`
- 項目のID：（必須のファイルには項目がありません）

任意の英文だけが使う語は `learning/word-meanings.json` に残ります。使われない語はエラーではなく、`npm run content:build -- --verbose` で一覧できます。

## 遊び方の流れとAP

1. 宿から時計塔へ移動し、観光「止まった針の理由」を選ぶ。観光案内を読み、観察ポイントを見て、時計番のトーマと通常戦（3問）。初回の読了・完了・2問以上正解でAPが1ずつ入る。
2. 都市の最初の観光を終えると、デート「三時までの席」（2 AP）を始められる。
3. （任意）時計塔の道中交流は、手順1の観察から対決へ進む前に起きる。朝市の特殊戦B・図書室の特殊戦C（初回完了で1 APずつ）は、初めて訪ねると観光案内のあとに始まる。特殊戦がある都市では、都市フィナーレの前に特殊戦を終える。
4. 時計塔で都市フィナーレ「時計を動かす日」（5問）。完了・3問以上正解で1 APずつ、都市クリアで2 AP。
5. エピローグを読んで旅が終わる（2都市目はない）。

`src/domain/sample-journey-route.test.ts` が、この流れを実際のゲームの関数で進め、手順ごとに保存と復元を確かめます。

## IDの付け方

- 地点・観光地・デートの行き先：都市IDで始める（`mihon_clock_tower`、`mihon_tower_square`）。観光地の地点IDは観光地IDと同じにする。
- それ以外のID（エピソード・対決・クイズ・問題・報酬・背景・画像・観察ポイント・デート・品物・交流）とストーリーのファイル名：接頭辞 `smp_` で始める。都市ごとに1本のストーリーは都市IDをファイル名にしてよい（`epilogues/mihon`）。
- 地図のイベントのIDは、対応するエピソード・特殊戦・デートのIDと同じにする。

## 新しい旅行編の元にする

`npm run journey:new` ができるまでは手作業で複製します。フォルダを `content/journeys/<旅行編ID>/` に写し、ID・接頭辞・都市ID・画像のフォルダ名を置き換え、`manifest.json` の `order` を他と重ならない値に、`status` を `"preparing"`、都市の `productionStatus` を `"prototype"` にします。架空の文章・出典・画像は実在のものに置き換えます。この `README.md` は複製しなくてかまいません（`.md` は読み込まれません）。手順全体は [新しい編を追加する手順](../../../docs/02_TECH_ARCHITECTURE.md#新しい編を追加する手順) を参照してください。
