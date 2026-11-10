# 見本の旅（sample_trip）

開発・テスト専用の、最初から最後まで遊べる最小の旅行編です。架空の「見本の街」（都市ID `mihon`）で、観光案内 → 通常戦（3問）→ デート → 都市フィナーレ（5問）→ エピローグを一通り遊べます。新しい旅行編を作るときの最小の例として、各ファイルの書き方を示します。

- 置き場所は `authoring/templates/sample_trip/` で、`content/journeys/` には置きません。そのため `npm run dev`・`npm run build`（本番）・公開サイトには含まれません。本番ビルドの検査（`npm run dist:check`）は `sample_trip` の文字列が `dist/` に入るとビルドを失敗にします。
- 読み込むのは、明示したときだけです。
  - `npm run dev:sample`：見本を含めて生成し、開発サーバーを起動します（タイトル画面に「見本の旅」が並びます）。`npm run dev` に戻すと見本は消えます。
  - `npm run content:build -- --with-sample`：見本を含めて生成します。`src/content/generated/build-info.json` に読み込んだフォルダが記録されます。単体テスト（`npm test`・`npm run test:quick`）と `npm run verify` の最初の生成はこの形です。
  - テストの一時コピー（`prepareContentFixture`）には入りません。見本を使うテストは、このフォルダを自分で複製します。
  - `npm run test:e2e:sample`：見本を含めて生成した専用の開発サーバー（4175番）で、見本を新しい旅から旅の終わりまで画面で遊ぶE2Eです（`tests/e2e/sample-journey.spec.ts`）。終わると見本なしで生成し直します。
- 生成物（`src/content/generated/`）は1つなので、`npm run dev` を起動したまま単体テスト（`npm run test:quick`・`npm test`）を実行すると、テストの前の生成で見本が加わり、開いている開発サーバーのタイトル画面にも「見本の旅」が出ます。次に見本なしで生成する（`npm run content:build`、`npm run dev` の起動し直し、`npm run build`。`npm run verify` は最後に行う）まで残ります。
- 旅行編ID `sample_trip`、ID の接頭辞 `smp_`（`manifest.json` の `authoring.eventPrefix`）、都市ID `mihon`、並び順 `order: 9000` は見本のために予約されています。

## 架空であること

見本の街・人物・言い伝え・出典・画像はすべて架空です。開発・テスト専用の見本に限り、AGENTS.md の「実在する著名な観光地を主舞台にする」「出典を捏造しない」の例外として認められています。どこを見ても架空と分かるように、次のとおりにしています。

- 出典はすべて `https://example.com/dreamscape-sample`、発行者は「Dreamscape 見本の旅（架空）」、`claimJa` は「見本用の架空の…」で始まります。クイズの出典の区分は `legend`、地点・徒歩時間は `hypothesis` です。
- 画像は図形だけで描いた自作のPNG（240×160、CC0）です。地点の座標は海上の 0,0 付近です。
- 本番の旅行編にこの文章・出典・画像を残さないでください。複製して使うときは、実在の観光地、確認した出典、権利を確認した画像に置き換えます。

## 必須の18ファイル

どれか1つを外すと `content:build` が止まります（`tests/journeys/sample_trip/sample-journey.test.ts` が、任意の部分を外した最小の構成から1つずつ外して確かめます）。エラーの「…」は省いた部分で、パソコンごとに違う絶対パスを含みます。

| ファイル | 役割 | 外したときのエラー |
| --- | --- | --- |
| `manifest.json` | 旅行編の登録。ID・並び順・状態・都市・通貨・開始資金・`cityPlan`・`authoring.eventPrefix` | `Missing journey manifest` |
| `cities/mihon.json` | 都市。制作の状態 `productionStatus`（見本は `"complete"`）、予定の観光地、初回クリア報酬 | `都市ファイル …/sample_trip/cities/mihon.json がありません` |
| `travel/mihon.json` | 地点（宿・時計塔）、全地点間の経路、地図のイベント | `移動データ …/sample_trip/travel/mihon.json がありません` |
| `travel/mihon-settings.json` | 宿の地点・宿泊費・再挑戦の間隔 | `移動の設定 …/sample_trip/travel/mihon-settings.json がありません` |
| `romance/presentation.json` | 背景（宿は画像なしの `neutral`、時計塔は画像つき） | `Unknown date destination background` |
| `romance/date_destinations.json` | デートの行き先（時計塔の広場）と小話 | `Unknown date destination` |
| `romance/date_catalog.json` | 通常デート1件（2回の3択。Inkの場所のファイルの knot を住所で指す） | `Invalid content in romance/date_catalog.json` |
| `tourism/catalog.json` | 画像台帳・観光地・観察ポイント（hotspot） | `Invalid content in tourism/catalog.json` |
| `progression/journey.json` | 観光エピソードと都市フィナーレ（エピローグつき）、報酬 | `Complete city has no city finale` |
| `battles/catalog.json` | 通常戦（3問）と都市フィナーレ（5問）。会話はどちらもInkの1本の流れ（段階5）に書く | `Invalid content in battles/catalog.json` |
| `quizzes/smp_mihon_main_clock_tower_quiz.json` | 通常戦の英語3択3問 | `Unknown battle quizId: smp_mihon_main_clock_tower_quiz` |
| `quizzes/smp_mihon_finale_quiz.json` | 都市フィナーレの英語3択5問 | `Unknown battle quizId: smp_mihon_finale_quiz` |
| `learning/translations.json` | 全問題の和訳（原文の写しと照合される） | `Missing translation` |
| `learning/word-meanings.json` | 共通の辞書（`content/learning/word-meanings.json`）にない英単語だけ | `Missing word meaning` |
| `stories/places/smp_mihon_clock_tower.ink` | 時計塔の場所のファイル：観光案内・通常戦の会話（1本の流れ。段階5）・通常デートの会話と、時計塔で起きる差し込みの場面（任意の部分） | `Unknown storyId: places/smp_mihon_clock_tower.smp_mihon_date_tower_square` |
| `stories/battles/smp_mihon_finale.ink` | 都市フィナーレの会話（1本の流れ。1行目は `INCLUDE modules.ink`） | `Unknown battle storyId: battles/smp_mihon_finale` |
| `stories/epilogues/mihon.ink` | 都市エピローグ | `Unknown epilogue story: epilogues/mihon` |
| `public/assets/tourism/sample_trip/mihon_clock_tower.png` | 時計塔の自作画像（観察・背景） | `Missing public file: assets/tourism/sample_trip/mihon_clock_tower.png (searched public/ and authoring/templates/sample_trip/public/)` |

各Inkの冒頭の `//` コメントに、その種類の脚本の規則を書いています。場所のファイル（`stories/places/`）は、1つの場所の場面を knot ごとに1本にまとめる形です（knot の頭の札で種類・時点・順番を決め、カタログは「ストーリーID.knot」の住所で本筋を指す）。ほかの観光地（朝市・図書室）とフィナーレ・エピローグは、今の1場面1ファイルの形のまま書いています。

4本の対決は、どれも1本の流れ（統一イベント設計の段階5）です。上から流れ、`-> quiz(1) ->` などでクイズの画面を出し、特殊戦は `-> reasoning ->` で資料を選ぶ画面に止まります（主張は手伝いの knot `<バトル>_claim`、追及は `<バトル>_press`。追及と違う資料の後は `-> stop` で止まる所へ戻る形）。書き方は [制作ガイド](../../CONTENT_GUIDE.md#対決の会話を1本の流れで書く段階5)。

## 任意の部分

ゲームの仕組みを一通り試せるように、次の部分も入っています。なくても旅行編として成立し、外した最小の構成もビルドが通ります（`tests/journeys/sample_trip/sample-journey.test.ts` が確かめます）。外すときは、下の「ファイル」を消し、必須のファイルから下の「項目のID」の項目を消します（そのIDを値に持つ配列の要素、そのIDの文字列、そのIDのキー。例：経路は出発地か到着地が消す地点の要素）。

### 特殊戦B（矛盾追及）

朝市でパン屋のサラの「誰も時間を守らない」という断言に、資料を1枚突きつけます（全3問のうち第2問）。

- ファイル：`quizzes/smp_mihon_special_b_market_quiz.json`、`stories/battles/smp_mihon_special_b_market.ink`、`stories/tourism/smp_mihon_market_guide.ink`、`public/assets/tourism/sample_trip/mihon_market.png`
- 項目のID：`smp_mihon_special_b_market`、`mihon_market`、`smp_bg_mihon_market`、`smp_img_mihon_market`、`smp_obs_mihon_market_rain`、`smp_obs_mihon_market_timer`、`smp_obs_mihon_market_rows`、`smp_mihon_market_b_q1`、`smp_mihon_market_b_q2`、`smp_mihon_market_b_q3`

### 特殊戦C（証拠連結）

図書室で、司書のイオに資料を2枚組み合わせて示します（全3問のうち第3問）。

- ファイル：`quizzes/smp_mihon_special_c_library_quiz.json`、`stories/battles/smp_mihon_special_c_library.ink`、`stories/tourism/smp_mihon_library_guide.ink`、`public/assets/tourism/sample_trip/mihon_library.png`
- 項目のID：`smp_mihon_special_c_library`、`mihon_library`、`smp_bg_mihon_library`、`smp_img_mihon_library`、`smp_obs_mihon_library_diary`、`smp_obs_mihon_library_letters`、`smp_obs_mihon_library_weather`、`smp_obs_mihon_library_hours`、`smp_mihon_library_c_q1`、`smp_mihon_library_c_q2`、`smp_mihon_library_c_q3`

### 道中交流・会話と品物（場所のファイルの差し込み）

時計塔に着くとすぐ（観光案内の前）、子どもから「三時のしおり」を受け取り（入手）、対決の後の交流でヒロインに渡せます（贈与）。受け取る交流と渡す交流の2件で1組です（使い道が要るのは、次の都市がある都市の、持ち歩く印のない品物だけです。見本の街は旅の最後の都市ですが、使い道のある形を手本にしています）。観察の後の会話（近道を教わり、APを1得る）と、対決の後の鐘の会話（APを1使って鐘楼に上がると、ときめきが上がる）、デートの中でしおりを渡すかの「場面の中の選択」もあります。どれも時計塔の場所のファイルの knot で、起きる時と順番は knot の頭の札（`at:`・`priority:`・`when:`）で決めています（`-1` は本筋の前、`after observe` は観察の後、`+1`・`+2` は本筋の後）。品物は `encounters/catalog.json` の `items`、フラグ・人物・名前付きの条件は `progression/story.json` に宣言します。

- ファイル：`encounters/catalog.json`、`progression/story.json`
- 項目のID：`smp_mihon_bookmark_stall`、`smp_mihon_bookmark_gift`、`smp_mihon_clock_gears`、`smp_mihon_clock_bell`、`smp_mihon_date_bookmark_aside`、`smp_mihon_three_bookmark`、`smp_mihon_bookmark_before_leaving`、`smp_mihon_lili_seeoff`（場所のファイルからは、その knot と、その ID を書いた行を消す。最後の2つは下の「ほかの時点の場面と都市の終わり」のエピローグの前の場面で、ここで宣言するリリとフラグを使うので、この部分と一緒に外す）

### ほかの時点の場面と都市の終わり（段階4）

観光地の訪問のほかの時点（デート・フィナーレ・エピローグ・移動・宿）に置いた場面の例です（統一イベント設計 段階4）。

- デートの前（`at: date`、昼だけ）：ベンチを塗る男の人（英語の3択。手伝うと少しお金を得る）。露店（`at: place`）は「また今度」の後、デートやフィナーレの前にもう一度出ます。
- 移動（`at: trip rental_bicycle from mihon_hotel`）：宿から初めて貸し自転車で出るとき、宿を出る前に（借りた後、先にほかの場所から乗ったときは、もう出ない）。
- 宿（`at: hotel mihon_hotel`）：鐘を聞いた日の眠る前（`-1`）と、時計塔へまだ行っていない朝（`+1`）。
- エピローグの前（`at: epilogue mihon`）：デートで「もう少し持っていたい」と答えたしおりを、街を出る前に渡すか（`-2`。設計の「街を出る前の砂時計」を見本のしおりで書いたもの）と、露店のリリの見送り（`-1`）。
- 都市の終わり（`stories/places/smp_mihon_city_end.ink`。設計 3.9 の (d)）：フィナーレの前の砂糖菓子（`# on_done: money -20`）、結果の後の広場（「今日は、ここまでにしよう」の `then: epilogue`）、「もう少し、歩こう」を選んだ人の受け皿の翌朝（宿の `+2`、`then: epilogue`）。この都市は `then: epilogue` を書いたので、ゲームは自分ではエピローグを始めず、「エピローグへ」も出しません。

- ファイル：`stories/places/smp_mihon_city_end.ink`
- 項目のID：`smp_mihon_date_bench_painter`、`smp_mihon_hotel_bell_night`、`smp_mihon_hotel_morning`（場所のファイルからは、その knot と、その ID を書いた行を消す。エピローグの前の2つの場面は「道中交流・会話と品物」の、移動の場面は「乗り物（貸し自転車）」の項目のIDにあり、それぞれの部分と一緒に外れる）

### 乗り物（貸し自転車）

徒歩のほかに、宿で借りる貸し自転車で街を回れます。借りるまでは自転車の経路に乗れず、借りなくてもどこへでも歩いて行けて、宿に帰れます。宿で一度払うと、見本の街にいるあいだ乗れます（次の都市へ出発すると返したことになります）。乗り物の宣言（`manifest.json` の `transportModes`、`"rental": true`）、自転車の経路、宿の貸し出し（`travel/mihon-settings.json` の `rentals`）、都市ごとの交通判断台帳（`travel/mihon-transit.json`）の書き方を示します。宿から初めて乗るときの会話（移動の時点の場面）は、上の「ほかの時点の場面と都市の終わり」で説明しています。

- ファイル：`travel/mihon-transit.json`
- 項目のID：`rental_bicycle`、`smp_mihon_first_bicycle`（場所のファイルからは、その knot と、その ID を書いた行を消す）

任意の英文だけが使う語は `learning/word-meanings.json` に残ります。使われない語はエラーではなく、`npm run content:build -- --verbose` で一覧できます。

## 遊び方の流れとAP

1. 宿から時計塔へ移動し、観光「止まった針の理由」を選ぶ。観光案内を読み、観察ポイントを見て、時計番のトーマと通常戦（3問）。初回の読了・完了・2問以上正解でAPが1ずつ入る。
2. 都市の最初の観光を終えると、デート「三時までの席」（2 AP）を始められる。
3. （任意）時計塔の道中交流は、手順1で時計塔に着いたとき（観光案内の前）と、対決の後に起きる（観察の後と、対決の後の最後に会話もある）。朝市の特殊戦B・図書室の特殊戦C（初回完了で1 APずつ）は、初めて訪ねると観光案内のあとに始まる。特殊戦がある都市では、都市フィナーレの前に特殊戦を終える（見本のフィナーレは、地図に出る条件 `when`（`progression/journey.json`）に、時計塔・朝市・図書室の3つの対決を全部書いている。`requiredEpisodeIds` は空）。
4. 時計塔で都市フィナーレ「時計を動かす日」（5問）。完了・3問以上正解で1 APずつ、都市クリアで2 AP。
5. エピローグを読んで旅が終わる（2都市目はない）。

`tests/journeys/sample_trip/route.test.ts` が、この流れを実際のゲームの関数で進め、手順ごとに保存と復元を確かめます。

## IDの付け方

- 地点・観光地・デートの行き先：都市IDで始める（`mihon_clock_tower`、`mihon_tower_square`）。観光地の地点IDは観光地IDと同じにする。
- それ以外のID（エピソード・対決・クイズ・問題・報酬・背景・画像・観察ポイント・デート・品物・交流）とストーリーのファイル名：接頭辞 `smp_` で始める。都市ごとに1本のストーリーは都市IDをファイル名にしてよい（`epilogues/mihon`）。
- 地図のイベントのIDは、対応するエピソード・特殊戦・デートのIDと同じにする。
- 乗り物のID：旅行編の中だけで使うので、接頭辞 `smp_` を付けない（`rental_bicycle`）。`walk` は使えない（徒歩は最初からある）。セーブデータ（借りた乗り物）に入るので、公開したあとは変えない。見本では、任意の部分を外すときにIDと同じ文字列を消すので、絵の種類の名前（`kind` の `bicycle`）と違うIDにしている。

会話（ストーリー）・クイズ・問題の名前は、すべての旅行編で「頭 ＋ 役割 ＋ 場所・話題」の形にします（[技術設計の「IDの付け方」](../../../docs/02_TECH_ARCHITECTURE.md#idの付け方) と同じ決まり）。頭は `<接頭辞>_<都市ID>` で、見本では `smp_mihon` です。

| 種類 | ストーリーID（`stories/` の下の場所と同じ） | クイズID（ファイル名も同じ） | 見本の例 |
| --- | --- | --- | --- |
| 通常戦 | `battles/<頭>_main_<観光地>` | `<頭>_main_<観光地>_quiz` | `places/smp_mihon_clock_tower.smp_mihon_main_clock_tower`（場所のファイルの knot）、`smp_mihon_main_clock_tower_quiz` |
| 特殊戦B・C | `battles/<頭>_special_b_<観光地>`（Cは `special_c`） | `<頭>_special_b_<観光地>_quiz` | `battles/smp_mihon_special_b_market`、`smp_mihon_special_c_library_quiz` |
| 都市フィナーレ | `battles/<頭>_finale` | `<頭>_finale_quiz` | `battles/smp_mihon_finale`、`smp_mihon_finale_quiz` |
| 観光案内 | `tourism/<頭>_<観光地>_guide` | なし | `tourism/smp_mihon_market_guide` |
| 場所のファイル（その場所の場面をまとめる） | `places/<頭>_<場所>`（場所は観光地・デートの行き先・地図の地点のIDから都市名を除いた名前。場面の住所は「ストーリーID.knot」。一つの場所の場面は、`_<内容>` を付けた別のファイルに分けてもよい） | なし | `places/smp_mihon_clock_tower`（`places/smp_mihon_clock_tower.smp_mihon_clock_tower_guide`） |
| デート・恋愛の出来事 | `dates/<頭>_date_<行き先・出来事>` | なし | `places/smp_mihon_clock_tower.smp_mihon_date_tower_square`（場所のファイルの knot） |
| 道中交流 | `encounters/<頭>_<交流>`（くじの結果は `_won`・`_lost`・`_already`） | なし | `places/smp_mihon_clock_tower.smp_mihon_bookmark_stall`（場所のファイルの knot） |
| 到着・エピローグ | `arrivals/<都市ID>`、`epilogues/<都市ID>` | なし | `epilogues/mihon` |
| 英語ノートの解説 | `learning/<頭>_english`（編に1本だけなら `learning/<接頭辞>_english` でもよい。2本目からは `learning/<頭>_<話題>_english`） | なし | （見本にはない） |

- 使う文字は英小文字・数字・`_` だけ。英語のレベル（`B1`）や連番（`_01`）は名前に入れない。番号で区別せず、違いを表す語を選ぶ。
- 会話の名前の「観光地」は、観光地IDから都市名を除いた名前（`mihon_clock_tower` → `clock_tower`）。デートの「行き先・出来事」は、行き先IDから都市名を除いた名前（`mihon_tower_square` → `tower_square`）。2つのデートが同じ行き先を使うときや行き先がないときは、出来事を表す語にする。
- 通常戦・特殊戦の会話の名前は、その対決の出来事（エピソード・地図のイベント）のIDと同じにする（`smp_mihon_main_clock_tower`、`smp_mihon_special_b_market`、`smp_mihon_special_c_library`）。
- クイズのファイル名はクイズIDと同じにする（`quizzes/<クイズID>.json`、例のクイズは `quizzes/<クイズID>.example.json`）。違うと `content:build` が止まる。

問題ID ＝ `<頭>_<観光地>_<要点>`。対決のクイズ・例のクイズ・道中交流のクイズに使う。

- 問題IDの「観光地」は、もっと短くしてよい。観光地IDの中の続いた語を使う（例：`agra_fort` → `fort`、`taj_mahal` → `taj`、`city_palace` → `palace`）。1つのクイズの中では同じ名前を使う。都市フィナーレは `finale`。
- 特殊戦B・Cの問題は、観光地のあとに `b`・`c` を付ける（例：`milano_last_supper_b_slow_revision`、`smp_mihon_market_b_q1`）。同じ観光地に対決が3つあっても分けられる。
- 例のクイズの問題は、観光地のあとに `example` を付ける（例：`milano_last_supper_example_dry_technique`）。
- 道中交流のクイズの問題も同じ形（例：`milano_galleria_bull_city`）。
- 要点は短い英語（1〜3語。数字も使える。例：`gt_delhi_qutb_iron_pillar_fence` の `iron_pillar_fence`、`gt_delhi_humayun_1857_arrest` の `1857_arrest`）か、`q1`〜`q5`。
- 問題IDは、すべての旅行編を通して重ならないようにする（本番のクイズと道中交流のクイズの問題は `content:build` が調べる）。問題IDの形そのものは検査しない。

`npm run journey:new` で複製すると、接頭辞 `smp` と都市ID `mihon` が置き換わるので、複製した旅行編の名前もこの決まりに合います（例：`--prefix ky --city kyoto` なら `battles/ky_kyoto_main_clock_tower`、`quizzes/ky_kyoto_main_clock_tower_quiz.json`）。

## 新しい旅行編の元にする

`npm run journey:new -- <旅行編ID> --name <旅行編の日本語名> --city <都市ID> --city-name <都市の日本語名> [--prefix <接頭辞>] [--with-optional]` で、この見本を `content/journeys/<旅行編ID>/` に複製します。旅行編ID `sample_trip`・接頭辞 `smp`・都市ID `mihon`（IDの一部・ファイル名・画像のフォルダ名を含む）を置き換え、準備中（`status: "preparing"`、都市は `productionStatus: "prototype"`、画像は `isPlaceholder: true`）にして、この `README.md` の代わりに置き換えるものの一覧 `CHECKLIST.md` を置きます。任意の部分は `--with-optional` を付けたときだけ複製します（外し方は上の「任意の部分」と同じで、`scripts/sample-journey.ts` が README のこの一覧から行います）。架空の文章・出典・画像が残っているうちは `npm run journey:readiness` が「見本の…が残っています」と示し、`npm run journey:release` は公開を止めます。手順全体は [新しい編を追加する手順](../../../docs/02_TECH_ARCHITECTURE.md#新しい編を追加する手順) を参照してください。

この README の必須ファイルの表と「任意の部分」の一覧は、`journey:new` とテストが読みます。表の行（ファイル・役割・エラーの3列）、`### ` で始まる部分の名前、`- ファイル：` と `- 項目のID：` で始まる行の形を保って編集してください。
