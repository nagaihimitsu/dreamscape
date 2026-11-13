# 旅行編へシナリオとクイズを取り込む

都市の地点・旅行データ・背景・観察資料が用意された旅行編に、脚本とクイズを追加する手順です。旅行編フォルダそのものは `npm run journey:new` で見本の編から作れます（[技術設計](../docs/02_TECH_ARCHITECTURE.md#新しい編を追加する手順)）。作った旅行編は `authoring`（`eventPrefix` など）を持つので、`journey:readiness`・`journey:release` と都市データの [city:bundle](CITY_BUNDLES.md) はすぐに使えます。`journey:scaffold` は、観察資料（`authoring.observationFile`。`journey:new` はパスだけを決め、ファイルは作りません）に仮でない JPEG（`.jpg`）または WebP（`.webp`）の観光画像ごとの記録と出典を確かめた観察ポイントを置き、背景の画像を差し替えてから（見本の画像は PNG で仮の扱い）、`journey:transit` は、`manifest.json` の `transportModes` に乗り物を宣言したら、都市ごとの交通判断台帳 `travel/<都市ID>-transit.json` を置いて使います（乗り物を宣言しないうちは徒歩だけで、台帳は要りません。下の「編集するもの」）。見本の出典・画像・文章が残っているうちは `journey:readiness` が「見本の…が残っています」と示し、`journey:release` は止まります。インド編、ウズベキスタン編、ルアンパパーン編は同じ生成・検査・反映処理を使います。都市数や都市の順序は各旅行編の `content/journeys/<旅行編ID>/manifest.json` に従います。

インド3都市は脚本51本（どれも場所のファイルの knot：観光案内・到着・エピローグ・デート・バトル）・クイズ51問・デート24件（宿の屋上の告白と「待って」の後の6件を含む）・都市フィナーレ3件を登録済みです。[完成版の構成と制作記録](journeys/golden_triangle/drafts/scenario/README.md)を参照できます。登録済みInkは `content/journeys/golden_triangle/stories/` のみを編集し、クイズは同じフォルダの `quizzes/` と対訳、メタデータは対応するカタログを更新します。制作時の `narrative.json` は初期登録入力として残し、更新内容を自動同期する正本にはしません。以下の新規登録手順は、未制作のウズベキスタン編などにも利用できます。

## 編集するもの

- 都市の施設・営業時間のゲーム設定・料金・交通・写真・出典：既存の [city:bundle](CITY_BUNDLES.md) で都市単位に編集。
- 旅行編全体の通貨・開始予算・都市順・都市クリア報酬：`content/journeys/<旅行編ID>/manifest.json`。
- 制作ツールの設定（イベントIDの接頭辞、観察資料のファイル、画像フォルダ）：同じ `manifest.json` の `authoring`。`authoring` がない旅行編（ミラノ編）は、この生成・検査・反映ツールの対象外です。観察資料のパスは、`/` 区切りのリポジトリからの相対パスで、その旅行編の `authoring/journeys/<旅行編ID>/` の中に置きます（`..` や絶対パス、他の旅行編のフォルダは `content:build` がエラーにします）。`eventPrefix` を設定した旅行編では、接頭辞のないIDを `content:build` が警告します（[IDの名前空間](../docs/02_TECH_ARCHITECTURE.md#ストーリーidとidの名前空間)）。
- 乗り物：`manifest.json` の `transportModes`（徒歩のほかに2つまで）と、都市ごとの交通判断台帳 `content/journeys/<旅行編ID>/travel/<都市ID>-transit.json`（[技術設計](../docs/02_TECH_ARCHITECTURE.md#乗り物と交通判断台帳)）。都市の編集用JSONの `transitDecisions` からも書き出せます。
- 写真に対応する観察ポイント：各旅行編の `authoring/journeys/<旅行編ID>/drafts/observation-cards.json`。画像変更時には実画像を確認し、領域とSHA-256を更新。
- シナリオ：Ink、紹介・クリア文・登場人物・思い出のメタデータJSON。
- クイズ：既存スキーマのクイズJSONと問題・選択肢の和訳JSON。

機械的なエピソード・対決・報酬・デート条件・反応ID・思い出IDの登録は生成器が行います。人物、質問、解答、根拠となる新しい事実を自動で創作するものではありません。

新しい対戦人物の専用立ち絵がない間は `portrait: "abstract"` を生成し、既存の抽象人物表示を使います。別人のミラノ用イラストは流用しません。専用画像を用意したら、その旅行編フォルダの `content/journeys/<旅行編ID>/presentation/characters.json` に人物登録（`characters`）と `battleCharacters` の割り当てを追加し、画像は同じフォルダの `public/assets/` に置きます。共通の `content/presentation/characters.json` には旅行編の人物を登録しません。人物の背の高さや姿勢（前かがみ・座っているなど）で絵が大きく見えるときは、その人物に `"figureScale": 0.88` のように書くと、足の位置はそのままで絵が小さくなります（0.5〜1.2。書かなければ1。例：インド編の `gt_mehr`）。

## ウズベキスタン編の例

```sh
# 固定ID、Inkの置き場所、入力メタデータの雛形を表示（--requirements は省略できます）
npm run journey:scaffold -- --requirements --journey uzbekistan

# タシュケントだけを制作する場合
npm run journey:scaffold -- --requirements --journey uzbekistan --city tashkent

# 不足している実ファイルと参照を確認（未制作時は未完了を報告）
npm run journey:readiness -- --journey uzbekistan

# 都市ごと・乗り物ごとの交通判断の件数と、徒歩の経路がない向き・出典のない経路（注意）を確認（「特定できず」が残ると終了コード1）
npm run journey:transit -- --journey uzbekistan

# 物語・クイズを用意した後、一時領域で実際の統合を検証
npm run journey:release -- --check --journey uzbekistan --through tashkent --narrative path/to/narrative.json --translations path/to/translations.json
```

`requirements` の `narrativeTemplate` 部分を別のJSONへ保存し、各 `null` を実際の脚本メタデータに置き換えます。Inkとクイズは指定のIDで旅行編フォルダの `content/journeys/<旅行編ID>/stories/`、`quizzes/` に追加します。Inkの場面は場所のファイルの knot です：`requirements` の住所 `places/<接頭辞>_<地点>.<knot>` の点の前が `stories/` からのファイル（`stories/places/<接頭辞>_<地点>.ink`）、後ろが knot の名前です。観光案内と通常戦はその観光地の、デートはその地点の、都市フィナーレは会場（`narrative.json` のフィナーレの `placeId`）の、エピローグは宿の場所のファイルに書きます（フィナーレの `battleStoryId` は、会場を `narrative.json` に書くか地図に登録するまで `null`）。knot の頭の札は `# scene: guide`・`battle`・`date`・`epilogue` です（書き方は [CONTENT_GUIDE](CONTENT_GUIDE.md) と見本の編）。和訳の形式は [インド編の制作手順](journeys/golden_triangle/scaffold/README.md) と共通です。脚本の命名・タグ・クイズの内容規約は [CONTENT_GUIDE](CONTENT_GUIDE.md) に従ってください。

通常対決は3問、都市フィナーレは5問です。対決の脚本は1本の流れ（段階5）で書きます：1行目を `INCLUDE modules.ink` にして `VAR` を書かず、`-> quiz(1) ->` 〜 `-> quiz(3) ->`（フィナーレは `quiz(5)` まで）でクイズを呼びます（書き方は [CONTENT_GUIDE](CONTENT_GUIDE.md#対決の会話を1本の流れで書く段階5)）。通常デートはふつう2回の選択（選択肢はふつう3つ）を使います（選択の回数は、デートの定義の `choiceCount` に書き、Inkの噛み合いの選択の数と合わせます。選択肢の数は自由です）。噛み合いの選択肢には `# profile:` を書き、思い出は `# memory:`（`requirements` の `memoryId`）で残します（場所のファイルのデートに `# effect:` は書けません）。観察の根拠と `factId` は各旅行編の `observation-cards.json`、場所・画像・出典は都市の編集用JSONから確認できます。観察資料の観察ポイントは問題より先に書くので `relatedQuestionIds: []` のままにします（問題IDを書いた観察ポイントがあると、`journey:scaffold` はその観察ポイントとファイルを示して止まります）。登録した観察ポイントは、問題と結び付かない観察だけの手がかりとして始まります。都市を公開（下の `--apply`）した後、旅行編の `tourism/catalog.json` で、問題文・正解・解説が本当にその内容を使う観察ポイントにだけ問題IDを書きます。公開済みの旅行編の付け直しは、シナリオ改修のときに行います（[データ契約](../docs/07_DATA_AND_TESTS.md#観察だけの手がかり)）。問題や恋愛の台詞はこれらの資料を参考に制作し、検証用の仮文を本番の脚本に混ぜないでください。

`--check` の成功後に `--apply` で関連カタログへ反映できます。反映先は旅行編の `manifest.json` と、その旅行編フォルダ `content/journeys/<旅行編ID>/` のカタログだけで、その層にまだないカタログや、既存のカタログにないキー（例：`memories`）は、追加する項目があるときだけ作られます。他の層にある同じIDの定義は内容が一致すれば再登録せず、異なれば反映を拒否します。`--check` は `--apply` で書き込むファイルを、`--apply` は書き込んだファイルを一覧で示します。内容が変わらないファイル（公開済みの都市など）は書き直さず、元の書式のまま残します（検証に使ったファイルが検証の途中で編集されていれば、書き直さないファイルでも反映を拒否します）。これはGitへのコミット・プッシュやサイトのデプロイではありません。後続都市を先に公開することはできず、既公開都市を保持して次都市まで順番に反映します。未制作脚本、クイズ・和訳の欠落、都市所属不一致、画像差替え、途中の編集競合がある場合は反映を拒否します。

通常観光は順不同で訪問でき、初完了・初好成績・エピソードクリアが各1AP、案内のある場所では案内初読了も1APです（案内のない場所には、案内のAPはありません）。フィナーレが地図に出る条件は `progression/journey.json` の `when` に書け、書かなければ同じ都市の主観光（`requiredEpisodeIds`）と特殊戦をすべて終えると出ます。都市クリア報酬は旅行編の設定を使います。特殊戦B/Cの場所・証拠・対戦人物は脚本とクイズの制作時に決め、見本の編の特殊戦B・C（[見本の編](templates/sample_trip/README.md) の「任意の部分」）やミラノ編と同じ形式で追加してください。

インド編には `--journey golden_triangle` を指定します。`india:scaffold`、`india:readiness`、`india:release` は `--journey golden_triangle` を付けた同じコマンドの別名です。インド編だけの調査・下書きの検査ツール（`india:check`、`india:draft`）は `scripts/journeys/golden_triangle/` にあります。インド編の交通は、ほかの旅行編と同じく都市ごとの交通判断台帳（`travel/<都市ID>-transit.json`）で、`journey:transit` で確かめます（`india:check` の最後の段も同じ確認）。

## クイズより先に脚本を制作する場合

未登録のInkを `content/journeys/<旅行編ID>/stories/` へ入れると、公開用の検証契約がないためビルドは失敗します。脚本だけを先に仕上げるときは `authoring/journeys/<旅行編ID>/drafts/scenario/<都市ID>/stories/` に、requirementsと同じ相対パスで場所のファイルを保存します（`stories/places/<接頭辞>_<地点>.ink`。その場所の knot をまとめて書く）。各都市に `narrative.json`、scenario直下に各都市を結合した `narrative.json` を置きます。

```sh
npm run journey:scenario -- --journey golden_triangle --directory authoring/journeys/golden_triangle/drafts/scenario
# 制作途中では一都市だけでも確認できます
npm run journey:scenario -- --journey golden_triangle --directory authoring/journeys/golden_triangle/drafts/scenario --city delhi
```

この検査は、場所のファイルを `content:build` と同じく読み、計画の knot を場面として通しで歩きます。ファイルと knot の対応、頭の札、都市内の背景、デートの `# profile:` と思い出、3択の全経路、関係段階と反応、対決のクイズの全部の正誤（クイズを第1問から順に1回ずつ呼ぶか）を確認します。場所のファイルが `INCLUDE modules.ink` と `-> DONE` で始まらないときは止まります。計画にない knot（差し込みの場面など）は、この検査では歩きません（移した後に `content:build` が確かめます）。デートの選択肢でのみ返答する脚本を想定し、主人公の直接台詞（`# speaker: player`）があると注意を出します（止めません）。仮クイズや公開カタログは作りません。成功は脚本の契約検証であり、公開準備完了を意味しません。

クイズ・和訳を用意したら、各都市の `stories/` の中身を `content/journeys/<旅行編ID>/stories/` へ**移動**し、既存の `journey:release --check` で実コンテンツ全体を検証します。以後のInkの正本は旅行編フォルダの `stories/` だけです。脚本検査も同じIDの本番ファイルを読み、draftと本番の両方にある場合は二重管理としてエラーにします。本番の場所のファイル（`stories/places/`）に計画の knot があるとき（インド編の案内・バトル・デート・エピローグ）は、公開済みとして数え（結果の `placeKnots`）、この検査では読み直しません。その knot は `content:build` が場面として通しで確かめます。同じ場面の下書きを置くと、同じく二重管理のエラーです。初期登録入力として残す `narrative.json` は公開後の自動同期元ではありません。公開後の定義変更は既存カタログ・都市bundleを編集します。旅の公開可否は引き続き既存の統合検証で判定します。

## 都市に到着したときの会話

都市定義 `content/journeys/<旅行編ID>/cities/<city>.json` の任意項目 `arrivalStoryId` に、宿の場所のファイルの knot の住所（例：`places/gt_delhi_hotel_hub.gt_delhi_arrival`。頭の札は `# scene: arrival`）を指定します。1場面1ファイル（`arrivals/<city>`、本文は `stories/arrivals/`）も使えます。都市bundleにもこの参照は含まれます。登録された都市フィナーレと、その都市の背景が必要です。

会話として検証します（話者は、ヒロインとナレーションのほか、主人公と、その都市のフィナーレの対戦相手も使えます。日本語の選択肢と効果の札も書けます。お金やAPを減らす `on_done:` は書けません。会話の後の行き先 `then:` も書けます）。旅行編の開始時と次都市への出発時に、都市名のロゴから会話へ進みます。通常のロードで再開以外の新規会話は始めません。既存の都市会話の保存処理を使い、札を書かないかぎり、関係値、AP、予算を変えません。時刻と思い出は変えません。

## ルアンパパーン編

`--journey luang_prabang` で同じ生成・検査コマンドを使えます。市街地の準備状況と交通・画像の根拠は[調査記録](journeys/luang_prabang/research/luang-prabang-20261104/README.md)を参照してください。
