# コンテンツ制作ガイド

Dreamscapeの正式データは `content/` です（全旅行編で共有する共通データは `content/` 直下、各旅行編のデータは `content/journeys/<旅行編ID>/`）。文章はInk、クイズ・設定はJSON、画像は旅行編の `content/journeys/<旅行編ID>/public/assets/`（全旅行編で共有する画像は `public/assets/`）に置きます。テキストエディタで直接編集できます。VS Code では、JSON の項目の候補・型・書き間違いが出ます（`authoring/schemas/` のスキーマを `.vscode/settings.json` で結び付けています。データの書式を変えたら `npm run schemas:build`。検査は `npm run content:build`）。人間の原稿も、どのAIの出力も、同じファイル形式・同じ検証を使います。AIや外部APIは不要です。任意の作業途中原稿は `authoring/journeys/<旅行編ID>/drafts/` などに置けますが、必須ではありません。Gitの差分とレビューで採用を決めます。

## Inkで会話と演出を作る

新しい会話の本文、選択肢、話者、背景、表情、漫符はInkに書きます。既存の外部表情・リアクションJSONに指定された現行会話はその設定も参照しますが、新しい行の登録には不要です。`reaction` はその一行だけに適用され、話者とは別の人物にも指定できます。

```ink
# speaker: enemy
# reaction: heroine,exasperated,sigh
「これは絶対に本物です」
# speaker: heroine
# emotion: serious
# reaction: enemy,sweat
「根拠を見せてください」
```

`# reaction: heroine,sigh` のように漫符だけ、`# reaction: heroine,smile` のように表情だけも指定できます。対象は現在の表示に対応する `heroine` または `enemy` です。両者に指定する場合は別々のタグにします。明示したInkの表情・リアクションが旧外部指定より優先されます。人物が画面に表示されない場面では、その人物の漫符は表示されません。

行の見せ方も、その行の札で決められます（どれも任意で、書いた行だけに効きます。書かなければ今までどおり）。どの会話の場面（観光案内・バトル・デート・道中交流と会話・到着とエピローグ）でも使えます。例は見本の編の `stories/places/smp_mihon_clock_tower.ink`（バトルの `# pause:`、鐘の会話の `# shake:` と `# size:`）。

```ink
# speaker: heroine
# pause: 600
「……え？」
# shake: window
# size: large
「そんなの、聞いてない！」
```

- `# pause: 600`：その行の字が出る前に、書いたミリ秒だけ間を置きます（100〜3000。0.6秒なら `600`）。間の途中でタップすると、すぐに行が全部出ます。文字送りの「一括表示」と「高速送り」では間を置きません。自動送りは、間の後に行を読み終えてから進みます。
- `# shake: window`：その行の字が出始めるときに、会話の窓が1回だけ小さく横に揺れます。動きを減らす設定（端末の設定と「演出を短縮する」）では揺れません。
- `# size: large`：その行の字を大きく出します。
- 範囲の外の数や小数（`0.6`・`600ms`）、`window`・`large` 以外の値、1つの行に同じ札を2つ書いたときは、`content:build` が止めます。

## 簡単な道中交流を追加する

`content/journeys/milano/stories/encounters/milano_duomo_new_event.ink` を作り（名前は [IDの付け方](../docs/02_TECH_ARCHITECTURE.md#idの付け方) の `encounters/<頭>_<交流>`）、名前用変数、会話、英語の選択（ふつうは3択。選択肢の数は自由）と分岐を書きます。英文はInkを正とします。訳を付ける場合は **選択肢の角括弧の中** にタグを置きます。

```ink
VAR player_name = ""
VAR heroine_name = ""
# background: milano_duomo
# speaker: narrator
広場で声をかけられた。
* [Look closer. # translation: 近くで見てみる。]
    # speaker: heroine
    # reaction: heroine,smile,sparkle
    「一緒に見てみよう」
    -> END
* [Ask a question. # translation: 質問する。]
    -> END
* [Keep walking. # translation: 先へ進む。]
    -> END
```

`content/journeys/milano/encounters/catalog.json` の `encounters` に、既存の観光地IDを使って次のように追加します。都市は観光地から導かれ、説明はタイトル、各選択肢の費用は0、再プレイ不可が標準です。新しい事実を扱う場合は、確認した出典も `sources` に追加します。

```json
{
  "id": "milano_duomo_new_event",
  "landmarkId": "duomo_milano",
  "titleJa": "ドゥオモの新しい出会い",
  "storyId": "encounters/milano_duomo_new_event"
}
```

購入やアイテム使用など選択肢ごとのルールがある場合は、カタログに `options` を、Inkの選択肢と同じ数だけ（ふつうは3件）追加し、各選択肢に `* [Tea # option: tea # translation: お茶を頼む。]` のような安定IDを指定します。カタログ側は `{ "id": "tea", "cost": 4 }` のようにルールだけを記述し、英文は重複させません。選択肢の順序を変えてもIDで対応します。金額は所属する旅行編の通貨の整数単位で、選択肢の支払いは `cost`、交流を終えたときに受け取る金額は `completionMoney` に書きます（ユーロ専用だった `costEuro`・`completionMoneyEuro` は v14 でこの2つにまとめ、使えなくなりました）。所持金・アイテムの変更はゲーム側が処理します。

## 簡単な通常デートを追加する

新しいInk（`content/journeys/milano/stories/dates/milano_date_new.ink`。名前は `dates/<頭>_date_<行き先・出来事>`）に既存の通常デートと同様の変数、デートの定義の `choiceCount` の回数（ふつう2回）の選択（選択肢はふつう3つ。数は自由）、結果別の反応を記述します。各分岐では、1回目に `# effect: common_date_first_attentive`、2回目に `# effect: common_date_second_attentive` のような共通効果を使えます。末尾は `attentive`、`playful`、`honest`、`bold`、`provocative` から、その返答に合う既存の確率特性を選びます。結果は `romance_result` の `positive` / `negative` で描き分けます。共通効果は個別の思い出を保存しません。場所固有の思い出が必要な場合は従来どおり固有effectとmemoryを追加します。

`content/journeys/milano/romance/date_catalog.json` の `dates` には、例えば次の最小設定を追加できます。開く条件 `when` は `{ "episodesCompleted": { "city": "milano", "atLeast": 1 } }`（その都市のエピソードを1つ終えたら）が標準で、2 AP、一度限り、交際後も利用可能が既定です。`when` を書かないデートは、進行の条件なしに最初から開きます。特定の観光地を訪れた後に開きたい場合は、`destinationId` と `when: { "episodeCompleted": "<エピソードID>" }` などを書いてください（書き方は[条件の書き方](#条件の書き方)）。

```json
{
  "id": "milano_new_date",
  "chapterId": "milano",
  "titleJa": "新しいデート",
  "storyId": "dates/milano_date_new",
  "when": { "episodesCompleted": { "city": "milano", "atLeast": 1 } },
  "backgroundId": "milano_cafe"
}
```

公開済みInkを編集・差し替えると途中セーブの指紋が変わり、過去のセーブや途中の会話が再開できなくなる場合があります。開発中は誤字修正や改稿のたびに旧セーブ再開用の旧稿を保存する必要はありません。現在のゲームが使っている脚本・データは誤って削除しないでください。安全に読めないデータは勝手に消さず、利用者が案内に従って消去し、最初から始められます。古い外部演出の行や脚本がなくなった場合は警告されます。`npm run content:check` は差分だけでなく全コンテンツの参照と分岐を検証し、ゲーム用データを生成します。

## 見本の編（雛形）

ファイルの書き方の手本は、架空の「見本の街」を舞台にした遊べる最小の旅行編 [見本の編](templates/sample_trip/README.md)（`templates/sample_trip/`、開発・テスト専用）です。観光案内・通常戦・デート・都市フィナーレ・エピローグの必須の20ファイルと、任意の特殊戦B（矛盾追及）・特殊戦C（証拠連結）・品物つきの道中交流があり、各Inkの冒頭のコメントにその種類の脚本の規則を書いています。新しい旅行編は `npm run journey:new` で見本から作れます（[新しい編を追加する手順](../docs/02_TECH_ARCHITECTURE.md#新しい編を追加する手順)）。既存の旅行編に項目を足すときも、見本の同じ種類の項目を写してIDと内容を置き換えます。見本の文章・出典（`https://example.com/dreamscape-sample`）・画像は架空なので、写したら実在の観光地、実際に確認した出典、権利を確認した画像に置き換えます（残っていると `npm run journey:readiness` が示し、`npm run journey:release` は公開を止めます）。カタログのファイルは、既存のカタログの配列に項目を追加します。例でカタログ全体を上書きしないでください。

配置先の `<旅行編>` は `content/journeys/<旅行編ID>/`（ミラノ編なら `content/journeys/milano/`）です。見本の中も同じ相対配置です。

| 作るもの                       | 見本の例（`templates/sample_trip/` の中）                                                        | 正式な配置先                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 観光地・画像・発見・資料       | `tourism/catalog.json`                                                                           | `<旅行編>/tourism/catalog.json` の各配列                  |
| 英語3択（通常戦3問・フィナーレ5問） | `quizzes/smp_mihon_main_clock_tower_quiz.json`, `quizzes/smp_mihon_finale_quiz.json`             | `<旅行編>/quizzes/<クイズID>.json`（ファイル名＝クイズID）   |
| 敵と通常戦、矛盾追及、証拠連結 | `battles/catalog.json`（特殊戦は `quizzes/smp_mihon_special_b_market_quiz.json`・`smp_mihon_special_c_library_quiz.json` も） | `<旅行編>/battles/catalog.json` の `battles`              |
| 敵の会話                       | `stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_main_clock_tower`（場所のファイルの knot）, `stories/battles/smp_mihon_special_b_market.ink`, `smp_mihon_special_c_library.ink`, `smp_mihon_finale.ink` | `<旅行編>/stories/battles/`                               |
| デート、行き先、背景           | `romance/date_catalog.json`, `romance/date_destinations.json`, `romance/presentation.json`       | `<旅行編>/romance/` の対応するカタログ                    |
| デートの会話                   | `stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_date_tower_square`（場所のファイルの knot） | `<旅行編>/stories/dates/` など                            |
| 観光案内                       | `stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_clock_tower_guide`、`stories/tourism/smp_mihon_market_guide.ink` | `<旅行編>/stories/tourism/`                               |
| 都市・順路・報酬               | `cities/mihon.json`, `progression/journey.json`                                                  | `<旅行編>/cities/`, `<旅行編>/progression/journey.json`   |
| 道中交流と品物                 | `encounters/catalog.json`（品物）, `stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_bookmark_stall` | `<旅行編>/encounters/catalog.json`, `<旅行編>/stories/encounters/` |

デート専用の効果と思い出（`romance/effect_catalog.json` の固有effect、`romance/presentation.json` の `memories`）は見本にありません。効果の項目はミラノ編の `romance/effect_catalog.json` を参考にします。選択肢の札（`# profile:`・`# memory:`）で書くデートは、インド編の `romance/presentation.json` の `memories` と場所のファイル（例：`stories/places/gt_delhi_lodhi_garden.ink`）を参考にします（インド編に `effect_catalog.json` はありません）。

JSONにはコメントを入れず、カンマ、引用符、配列の括弧を保ちます。`schemaVersion` はデータ形式の版で、個々のコンテンツIDとは別です。編集前に対象ファイルを複製し、既存内容を消さずに追加してください。表示名は変更できますが、公開済みIDはセーブ・他データの参照に使うため変更しないでください。新しいIDは英小文字で始め、英小文字・数字・`_` を使います。IDはすべての旅行編で共有する一つの名前空間にあるため、新しい旅行編では `manifest.json` の `authoring.eventPrefix` と同じ接頭辞（例：`gt_`、`uz_`）を付けます（地点IDは都市IDを接頭辞にします。付け忘れは `content:build` が警告します）。`storyId` は `tourism/gt_delhi_red_fort_guide` のように、旅行編フォルダの `stories/`（`content/journeys/<旅行編ID>/stories/`）からの拡張子なしの相対パスです。旅行編フォルダ名は含まないため、他の旅行編と同じフォルダ名（`battles/` など）を使う場合はファイル名に接頭辞を付けて重ならないようにします。会話・クイズ・問題の名前（「頭 ＋ 役割 ＋ 場所・話題」）と、クイズのファイル名をクイズIDと同じにする決まりは [技術設計の「IDの付け方」](../docs/02_TECH_ARCHITECTURE.md#idの付け方) にあります。共通データ（`content/` 直下）には都市・移動・Ink・クイズや旅行編専用のカタログを置けません。

## 題材を選ぶ

英文にする前に「話の入口」「問い」「種明かし」を日本語で書き、クイズにしなくても人に話したくなる小話かを確認します。人の願い・失敗・信仰や権力、土地の伝説や文化の接点、絵の人物や表現から見える物語を優先します。材料・運搬・寸法・年号や名前だけの暗記は原則避けますが、人の選択・事件・意外な結末に不可欠なら候補になります。史実・解釈・仮説・伝説を分け、資料の主張を支える箇所を確認します。閲覧できなければ未確認と記録します。

訳は問題文と全選択肢を公平に、原文にない正解の根拠を加えずに書きます。文法・語法の説明は実際の英文に対応させ、辞書や信頼できる教材を確認してください。観光問題の成績から英語力を推定しません。

## 新しい観光地を準備する

1. 事実・解釈・伝説を区別し、各項目の出典と日付を記録します。写真の作者、ライセンス、加工内容と利用条件も確認します。
2. 見本の `tourism/catalog.json` を見ながら、画像を `assets`、場所を `landmarks`、その発見を `clues` に登録します。画像は旅行編の `content/journeys/<旅行編ID>/public/` 以下に配置し、`path` に `public/` を除いたパス（配信時のパス）を書きます。
3. 3問のクイズ（見本の `quizzes/smp_mihon_main_clock_tower_quiz.json`）と、要る場所なら観光案内（`stories/tourism/smp_mihon_market_guide.ink`。場所のファイルなら knot）を作り、対応するIDをそろえます。
4. 見本の `battles/catalog.json` の通常戦と `stories/battles/smp_mihon_special_b_market.ink`（場所のファイルの knot の形は `stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_main_clock_tower`）を参考に、敵・会話と問題を結びます（下の「対決の会話を1本の流れで書く」）。演出背景は `<旅行編>/romance/presentation.json` に登録します。
5. 順路・報酬を `<旅行編>/progression/journey.json` の既存配列に追加し、参照関係を確認します。新都市の追加には後述の現行制約があります。
6. 後述の検証と編集者レビューを済ませてからGitで採用します。

### 観光データの項目

- `assets`：`id` は画像の安定ID、`path` は画像ファイル、`width` / `height` は実際のピクセル寸法、`altJa` は画像を見られない人向けの日本語説明、`isPlaceholder` は仮画像かどうか。`sourceUrl`、`licenseName`、`licenseUrl`、`creditJa`、`modificationJa`、`checkedAt` に元画像の所在・権利・作者・加工・確認日を記録します。仮画像を実物の細部の根拠にしません。配信する写真は WebP（品質80）にします。JPEG・PNG の写真は置いた後に `npm run images:optimize -- --journey <旅行編ID> --write` で変換します（`--write` を付けなければ確認だけ）。観察で拡大する写真（観光地の `imageAssetId` と観察資料の画像）は同じ大きさのまま、ほかは幅1600px・高さ1800pxの枠に収まるよう縮小し、色のプロファイルは残します。このとき `path`・`width`・`height` と観察資料の `path`・`sha256` を書き換え、`modificationJa` の最後に変換の一文（例「さらに同じ寸法のままWebP形式（品質80）に変換。」）を足し、CC BY-SA の写真には変換の一文の後に「変換版もCC BY-SA 4.0で提供。」のように足します（それより前の「この縮小版も…で提供します。」などは、変換する前の版についての記載です）。変換できる写真が残っていると `npm run content:build` が警告で知らせます（生成は止めません）。仮画像（`isPlaceholder: true`）と見本の編の画像は変換しません。
- `landmarks`：`id` / `cityId` は場所と都市のID、`nameJa` / `nameEn` は表示名、`descriptionJa` は短い案内。`imageAssetId`、`guideStoryId`、`battleId` はそれぞれ画像、案内Ink、通常戦のID、`clueIds` はその場所の発見ID一覧です。案内の要らない場所では `guideStoryId` を書きません。観察の要らない場所では `observation: false` を書きます（書かなければ観察あり）。どちらもない場所では、着いてすぐバトルが始まります。案内のない場所には、案内の AP（`guide_read` の報酬）もありません（書くと `content:build` が止まります）。観察のない場所に手がかりを書いたり、バトルの問題や特殊戦の証拠が使う手がかりをどの観察でも見つけられなかったりすると、`content:build` が注意します（生成は止めません）。
- `clues`：`id`、`landmarkId`、`titleJa`、`descriptionJa`、`factId`、`relatedQuestionIds`、`sources` は発見と参照、説明、根拠です。`relatedQuestionIds` には、同じ観光地のクイズの問題のうち、問題文・正解・解説がその手がかりの内容を必要とする問題のIDだけを書きます（ゲームの表示と判定には使わず、`content:build` が同じ観光地のクイズの問題であることを確かめます。都市フィナーレと例のクイズの問題は書けません）。同じ場所の話題というだけでは書きません。どの問題にも結び付かない手がかりは `[]` とし、これを「観察だけの手がかり」として正式に認めます。見え方を変える観察・資料として手がかり帳に残り、表示も同じです。旅行編ごとの数は `content:build` の行（`observation-only clues`）に出ます。公開中の旅行編の観察だけの手がかりを問題へ付け直すのはシナリオ改修のときの作業で、改修する問題と1件ずつ文を照らして決めます。特殊戦の証拠の手がかりを変えるとその特殊戦の途中のセーブは再開できなくなります（[データ契約](../docs/07_DATA_AND_TESTS.md#観察だけの手がかり)）。`kind: "hotspot"` は写真で見える場所、`kind: "document"` は画像だけでは判断できない資料。後者の `region` は `null` です。hotspotの `region` は画像全体を1とする左上の `x` / `y` と `width` / `height`（各0〜1）で、画像の外には出せません。画像差し替えで構図が変われば座標も見直します。
- `sources` の `publisher` / `title` / `url` / `checkedAt` / `claimType` / `claimJa` は発行者、資料名、URL、確認日、根拠の区分、その資料が裏付ける主張。`claimType` は `documented_fact`、`interpretation`、`legend` を区別します。

### 単語の意味

問題文・選択肢の単語には一般的な意味を登録します。複数の旅行編で使う語は共通の `content/learning/word-meanings.json`、1つの旅行編だけで使う語（地名・建造物名など）はその旅行編の `content/journeys/<旅行編ID>/learning/word-meanings.json` に置きます。同じ語を両方に置くときは同じ意味にします（違えば生成時のエラー）。旅行編の辞書にしかない語を別の旅行編の問題で使うと、その旅行編を外した生成（`scripts/journey-folders.test.ts`）で未登録として知らされるため、その語は共通の辞書へ移します。どの英文にも使われない語の一覧は `npm run content:build -- --verbose` で確認できます。大文字・小文字、アクセント、曲がったアポストロフィは照合時に正規化します。その問題の `vocabularyJa` に同じ語句があれば、その文脈での意味を優先します。新しい問題の語に未登録があれば全体検証で知らせます。一般的な意味は文脈によって異なるため、曖昧な語は該当問題の `vocabularyJa` で補ってください。たとえば [court](https://dictionary.cambridge.org/dictionary/english/court) や [secure](https://dictionary.cambridge.org/dictionary/english/secure) の複数の用法はCambridge Dictionaryで確認できます。語義の正確さと文脈への適合は編集者が確認します。外部辞書APIは使いません。

### 対訳・学習説明

公開する問題は `content/journeys/<旅行編ID>/learning/translations.json` に問題IDを登録し、`source` に問題文・全選択肢・正解IDの原文をそのまま記録します。`questionJa` と `optionsJa` は正誤の根拠を加えず、選択肢A/B/Cを公平に訳します。原文や正解を変更すると全体検証が不一致を検出するため、訳を確認して `source` を更新してください。既存のバトル保存指紋は学習データを含みません。

詳細が必要な問題だけ、その問題がある旅行編の `content/journeys/<旅行編ID>/learning/details.json` に問題IDで登録し、学習会話の `storyId`、原文中の `segments` と `topics`、疑問見出し、説明、実用例文・訳、確認済みの文法資料URLと確認日を追加します。対訳と同じく問題IDごとに統合されるため、どの旅行編も自分の問題の詳細を持てます（どの旅行編にもなければ詳細なしとして扱います）。`storyId` は問題ごとに必須で、同じ旅行編の学習会話を指します。学習会話は話題ID（`topic`）ごとに分岐し、話者はヒロイン、2〜4行、選択肢やeffectは使いません。話題IDは全旅行編で重ならないようにし、新しい旅行編では `authoring.eventPrefix` の接頭辞を付けます（例：`gt_which_subject`）。現在はミラノ編の『最後の晩餐』の通常戦3問が対象で、会話は `content/journeys/milano/stories/learning/milano_english.ink` です。意味の自然さ、資料の該当箇所と訳は編集者が確認します。

### クイズの項目

クイズの `id` は問題セット、`landmarkId` は観光地、`englishLevel` は `A2` / `B1` / `B2`。通常戦の `questions` は3問です。各問の `id`、英語の `questionEn`、`options` の `id` と `textEn`、`correctOptionId` を指定します。選択肢は3つ、正解IDはそのうち一つ。`vocabularyJa` の `word` / `meaning` は英単語と日本語補足、`hintJa`、`correctExplanationJa`、`incorrectExplanationJa` は日本語、`sources` は各問の根拠、`difficulty` は `easy` / `medium` / `hard`。問題と選択肢だけを英語にします。解答前の会話で正解を明かさないようにします。都市フィナーレは `scope: "city_finale"`、`cityId`、`landmarkId: null`、5問です。

ヒントは、ヒロインの小さな顔と「（ヒロインの名前）の耳打ち」という吹き出しで出ます。`hintJa` は地の文のままでかまいません（彼女の言葉としてかぎかっこで囲んだりはしません）。問いごとに、次の2つを任意で書けます（書かなければ今までどおり）。例は見本の編の `quizzes/smp_mihon_main_clock_tower_quiz.json`。

- `hintHeroineJa`：ヒントを彼女の言葉で書いたもの。書くと、`hintJa` の代わりにこれが吹き出しに出ます（`hintJa` も必須のまま書きます）。
- `heroineCorrectJa`：正解したとき、解説のすぐ下に、彼女の顔と名前つきの吹き出しで出る短い一言（不正解では出ません）。得点や関係の値は出しません。答えた後の会話（`-> quiz(n) ->` の後の行）とは別で、そちらは「敵の反応を見る」の後に流れます。

どちらも彼女の台詞なので、[キャラクターバイブル](../docs/09_HEROINE_CHARACTER_BIBLE.md)に照らして1〜2文で書きます。吹き出しで彼女の言葉と分かるので、かぎかっこは要りません（書いたとおりに出ます）。名前はベタ書きしません。ヒントで正解そのものを言わないようにします。

答えの後に、対決の観光地の写真で「どこを見れば見え方が変わるか」を示せます（写真の種明かし。2026-11-11、任意）。問いに次の2つを書くと、正誤と解説の下に、その対決の観光地の写真（`landmarks` の `imageAssetId`。対決の背景と同じ写真）が小さな枠で出て、書いた範囲へゆっくり寄り、範囲を枠で囲みます（動きを減らす設定では寄らずに、すぐ囲みます）。写真の下には、手がかり帳の写真と同じく出典の1行（作者・「画像の出典」・「利用条件」）が出ます。正解でも不正解でも出ます。書かなければ今までどおりです。例は見本の編の `quizzes/smp_mihon_main_clock_tower_quiz.json` の第1問。

- `revealRegion`：写真の中の範囲。観察の手がかりの `region` と同じ形で、写真全体を1とする左上の `x` / `y` と `width` / `height`（例 `{ "x": 0.41, "y": 0.23, "width": 0.18, "height": 0.26 }`）。写真の外にはみ出す範囲と、幅・高さが0の範囲は `content:build` が止めます。都市フィナーレの問い（観光地の写真がない）と、観光地の写真が `tourism/catalog.json` にない問いにも書けません（止まります）。範囲が写真の7割より大きいときは寄らずに囲むだけ、小さいときも2.4倍より寄りません。
- `revealCaptionJa`：写真の下の短い1行の説明（例「見本の時計塔の針は、今も三時を指したまま（架空の見本）。」）。`revealRegion` がなければ出ません。解説を写さず、写真のどこを見ればよいかを書きます。

範囲は、解説の内容が写真のその場所で確かめられる所にします（史実・解釈・伝説の区別は解説と出典のとおり）。写真を差し替えて構図が変わったら、範囲も見直します。クイズのほかの項目と同じく、書き足したり直したりすると、その対決の途中のセーブは再開できなくなります。

### 敵・バトルの項目

`battle_*.json` の `id`、`titleJa`、`descriptionJa`、`enemyNameJa`、`enemyTitleJa`、`enemyDescriptionJa` は対決と人物の識別・表示。通常戦（特殊戦B・Cでない対決。都市フィナーレも）の始まりには、最初の行と一緒に、相手の名札（`enemyTitleJa` の役どころと `enemyNameJa` の名前）が少しのあいだ出ます（タップや次の行で消え、操作は止めません）。任意の `enemyQuoteJa` を書くと、名札に相手の一言が1行添えられます（書いたとおりに出るので、台詞ならかぎかっこも書きます。例は見本の編の `battles/catalog.json`）。`landmarkId`、`storyId`、`quizId`、`backgroundId` は観光地・Ink・問題セット・登録済み背景への参照です。対決の会話は1本の流れ（下）で書きます。`format` はAでは省略可能、B/Cは明示。任意の `portrait` は既存で定義済みの表示種別に限られます。新規の立ち絵種類には実装作業が別途必要です。

B/Cの `reasoning` には `kind`（Bは `contradiction`、Cは `connection`）、0から数える `roundIndex`（何問目の前で資料を選ぶか）、候補 `caseClueIds`、正解 `correctClueIds` を記入します。正解証拠はBが1つ、Cは異なる2つを順不同で組み合わせます。証拠は未発見でもケース資料として開けるよう候補に含めます。英語3択の正解はクイズ側で別に指定します。主張・追及・資料の後の台詞は、対決のInkに書きます（下）。

### 対決の会話を1本の流れで書く（段階5）

対決の会話は、上から下へ1本に流れるInkに書きます。見本の編の4本（`stories/places/smp_mihon_clock_tower.ink` の `smp_mihon_main_clock_tower`、`stories/battles/smp_mihon_special_b_market.ink`・`smp_mihon_special_c_library.ink`・`smp_mihon_finale.ink`）が手本です。

- 置き場所は、その場所の場所のファイルの knot（頭の札は `# scene: battle`）か、1場面1ファイル（`stories/battles/<頭>_…`）です。1場面1ファイルは、1行目を `INCLUDE modules.ink` にし、`VAR` を書きません（ゲームが用意する呼び口と変数。Inkyで見るときは、場所のファイルと同じく `src/story/modules.ink` の写しを隣に置く）。
- `-> quiz(1) ->` と書いた所で、ゲームがクイズの画面（ヒント・答え・正誤と解説）を出します。正誤の画面から進むと、`quiz_correct`（その問いの正誤）と `battle_score`（そこまでの正解数）が入って続きます。クイズは第1問から順に、どの道でも1回ずつ呼びます（通常戦は3問、都市フィナーレは5問。順が違う・足りない道は `content:build` が止めます）。最後の `-> END` の後に結果の画面が出ます。
- 呼び口の後の最初の行は、場面の始まりと同じく、話し手と背景（`# speaker:`・`# background:`）を書き直します（書かないと地の文になります）。
- 特殊戦B・Cでは、`-> reasoning ->` が資料を選ぶ画面です。`reasoning.roundIndex` のとおり、`-> quiz(<roundIndex>) ->` の後・次のクイズの前に置きます（`roundIndex: 1` なら第1問の後）。
  - 主張は手伝いの knot `<バトル>_claim` に書き（`=== smp_mihon_special_b_market_claim ===` … `->->`）、止まる所の前に `-> <バトル>_claim ->` で流します。手がかり帳の「主張」は、ゲームがこの knot の相手の台詞を読んで出します。`<バトル>` は、場所のファイルなら対決の knot の名前、1場面1ファイルならファイルの名前です。ゲームは手がかり帳のためにこの knot（と下の `<バトル>_press`）だけを読むので、その中（そこから呼ぶ knot の中も）には選択肢もクイズ・推理の呼び口も書けません（届くと `content:build` が knot の名前を出して止めます）。主張の文の名前（`{player_name}` など）は、流れと同じく設定した名前で出ます。
  - 主張の後に、反論の前置き（ヒロインの「待って」など）をそのまま続けて書けます。ほかの台詞と同じく1行ごとに保存されます。
  - 止まる所は `- (stop)` の次の行に `-> reasoning ->` と書きます。戻ると `reasoning_action` が `"press"`（Bの追及）か `"evidence"`（資料）で、資料なら `evidence_result` が `"success"` か `"failure"` です。追及や違う資料の文の後に `-> stop` と書くと、止まる所へ戻って選び直せます。書かなければ次の問いへ進みます（どちらにするかは作者が決めます。見本は戻る形）。正しい資料の後は `-> stop` を書かずに進みます（戻ってばかりで終わりに届かない流れは `content:build` が止めます）。資料は得点を変えません。
  - 追及の文を手伝いの knot `<バトル>_press` に書いて `-> <バトル>_press ->` で流すと、手がかり帳の「追及で聞いたこと」にもその文が出ます。追及の文を流れの中（`{ reasoning_action == "press": … }` の中）にそのまま書いても遊べますが、そのときは「追及で聞いたこと」に出ません。
  - 画面では、主張の前の最後の行と、反論の前の主張の最後の行に「次へ進む」が出て（自動送りもそこで止まる）、主張と反論の間、手がかり帳の問題は資料で答える問題を出し、反論の行の間は上の帯の手がかり帳を出しません（ゲームが、行が主張の knot から来たかを見て決める）。

```ink
-> quiz(1) ->
# speaker: enemy
{ quiz_correct: 「……そう、三時はただの時刻じゃない」|「三時は三時よ」 }
-> smp_mihon_special_b_market_claim ->
- (stop)
-> reasoning ->
{ reasoning_action == "press":
    -> smp_mihon_special_b_market_press ->
    -> stop
}
{ evidence_result == "failure":
    # speaker: enemy
    「それは今年の帳面よ。昔の話をしているの」
    -> stop
}
# speaker: enemy
「三時の欄……。昔の人も、好きな時間に買いに来てたのね」
-> quiz(2) ->
```

- 会話の中に日本語の選択肢を書けます（`* [「…」 # option: <ID>]` と、そのすぐ次の行の札。書き方は道中交流・会話と同じ「選択肢の札」）。札（関係値・お金・AP・フラグ・品物・噛み合いの `# profile:` など）は、その対決を初めて遊ぶときだけ、1回の対決の中で選択肢ごとに1回だけ当たります（同じ止まる所へ戻ってもう一度選んでも、遊び直しても当たりません）。`# later` は書けません。どの選択の場にも、何も要らない選択肢か、頭の札などで保証された選択肢を1つは置きます（`content:build` が確かめます）。

## 恋愛とInk

### デートで訪れる観光地

観光・発見・バトルを持つメイン観光地と、デート中に訪れる行き先は別のデータです。デート先のために敵・クイズ・観光エピソードを作る必要はありません。将来、メイン観光地と同じ場所をデートで再訪する場合も、同じ場所を指すデート先を登録できます。

1. `content/journeys/<旅行編ID>/romance/date_destinations.json` の `destinations` に、安定した `id`、`cityId`、日本語・英語の名称、短い `descriptionJa`、`backgroundId`、`facts` を登録します。事実ごとに `publisher`・`title`・`url`・`checkedAt`・`claimType`・`claimJa` を記録し、実際に資料の該当箇所を確認してください。事実・解釈・仮説・伝説は既存の観光資料と同じ区分を使います。
2. 権利を確認した写真を `content/journeys/<旅行編ID>/public/assets/tourism/` に置き、`content/journeys/<旅行編ID>/tourism/catalog.json` の `assets` に実寸・作者・出典URL・ライセンス・加工内容を登録します。同じ旅行編の `romance/presentation.json` の背景から `imageAssetId` で参照し、必要なら `imagePosition` の x / y を0〜100で指定します。写真家の権利だけでなく被写体の権利も確認してください。近隣の風景を使う場合は実際の場所を代替テキスト・クレジットに明記します。確認できる画像がない場合は `fallback: "neutral"` を使います。出典は会話中の操作メニューから確認できます。出典のある写真ではなく Dreamscape のために作った絵（品物のアイコン、タイトルの絵など）は `tourism/catalog.json` に登録せず、その旅行編の `presentation/own-artwork.json` に配信時のパスを1行ずつ書きます（共通の `public/` に置く絵は `content/presentation/own-artwork.json`）。配信するどの画像も、どちらか一方に登録されていないと `npm run content:build` が「出典のない画像」で止まります（[技術設計](../docs/02_TECH_ARCHITECTURE.md#画像の出典と自作の絵)）。
   背景に訪問対象が写っていないときは、行き先に任意の `referenceImage`（HTTPSの `url`、リンク名 `labelJa`、背景についての `backgroundNoteJa`）を追加し、実物を確認できる公式資料へ案内できます。外部リンクは写真のゲーム内への転載許諾を意味しません。
3. `content/journeys/<旅行編ID>/romance/date_catalog.json` の通常デートに `destinationId` と開く条件 `when` を指定します。デートの `chapterId`、行き先の `cityId`、双方の背景IDを一致させます。訪問後に開放する通常デートでは、`when` にそのエピソードだけを書けます（例：`"when": { "episodeCompleted": "milano_galleria_episode" }`）。交際後も同じ短編を遊べる場合は `allowAfterEnding` を指定します。
4. Inkには、その場所で見られるものや出典を確認した小話を、ヒロインの関心や会話に自然につなげて書きます。選択にかかわらず観光を楽しめるようにします。選択をデートの定義の `choiceCount` の回数（ふつう2回）書き（選択肢はふつう3つ。数は自由）、選択肢には共通または固有の `effect` を指定します。固有の思い出を残す場合は対応する `memory` も登録します。必要な表情は `# emotion:`、無言の反応は `# reaction:` で指定します。既存の恋愛進行に新イベントを必須条件として追加するかは、別途慎重に検討してください。
5. `npm run content:check` でIDの重複、都市・エピソード・背景の参照、出典形式、全分岐と効果を確認し、スマートフォンの画面と脚本をレビューします。

現在の都市読み込みはミラノ前提です。別都市の実装には、後述の都市選択・進行・セーブなどの対応が必要です。

### 関係の空気を会話へ反映する

新しい確率リアクション付き恋愛Inkは `relationship_tone`、`relationship_tone_before`、`relationship_tone_after` を文字列変数として宣言します。使用できる値は `reserved`、`strained`、`comfortable`、`guarded_attraction`、`warm`、`romantic_tension` です。冒頭では `relationship_tone`、選択の反応では `romance_result` と `relationship_tone_after` を使えます。数値や閾値をInkに書かず、共通本文を中心に少数の違いを作ります。内容検証で分岐とIDを確認し、文章と人物らしさは人間がレビューしてください。

### 通常デートのデータ

デート（`romance/date_catalog.json` の `dates`）の `id`、`chapterId`、`titleJa`、`descriptionJa`、`storyId`、`backgroundId` はイベント、章、表示文、脚本、背景です。`kind` は通常なら `normal`。`apCost`、`minRomanceStage`、`minAffection` と開く条件 `when` は開始条件で、`destinationId` と閉じる条件 `until` は必要な場合のみ（`when`・`until` の書き方は[条件の書き方](#条件の書き方)）。通常デートも、ほかのデートを遊んだことを開く条件（`when`）にできます。条件を書かない通常デートは順不同で、最初に選んでも成立させます。期間限定イベントには `until` で終了条件を指定できます（例：`"until": { "episodeCompleted": "milano_last_supper_episode" }`。一度地図に出た特別な出来事も、`until` が真になると閉じます）。`repeatable` は再挑戦可否で、通常デートは `false`、告白は再挑戦のため `true` にします。`rewardOnlyOnce` は効果の重複防止、`needsDeferred` は告白保留後の条件、`choiceCount` / `effectCount` は各経路の選択・効果回数です。

`effect_catalog.json` の各 `id` と任意の `memoryId` はInkの `# effect:` に対応します。新しい台本では、選択肢の札（`# profile:`・`# memory:`・`# rel:`）で同じことを直接書けます（ビルドが選択肢ごとの表にします。改稿前のミラノ編は `# effect:` のまま。インド編のデートは場所のファイル `stories/places/` の札で書いています。例：`places/gt_delhi_lodhi_garden.ink`）。告白を除く恋愛選択には `responseProfileId` を指定し、`content/romance/response_profiles.json` のリスク特性から選びます。`responseProfileId` を指定した選択の関係値は確率判定で決まり、固定の `affectionDelta`・`trustDelta`・`sparkDelta` は使われません。`affectionDelta` は `0` とし、`trustDelta`・`sparkDelta` は書きません。台詞と選択の性格に合うプロフィールを選び、全段階をレビューしてください。思い出は `presentation.json` の `memories` に同じIDと `titleJa` / `descriptionJa` を登録します。Stage・告白条件は `progression.json` で管理し、特定デートIDを条件にしません。

Inkの `VAR player_name` / `heroine_name` / `player_address` は設定名を受け取ります。`# speaker: narrator` / `heroine` / `player` / `enemy`、`# background: 登録済みID`、`# emotion: 登録済みID` を使い、本文はふつう日本語で書きます（英語の台詞や選択肢も書けます。ビルドは止めません）。デートの `* [選択肢]` と各分岐直後の札（`# option:` と `# profile:`）、`->` の合流例は見本の場所のファイル `stories/places/smp_mihon_clock_tower.ink` のデート `smp_mihon_date_tower_square` を参照（今の1場面1ファイルのデートは、各分岐直後に `# effect: 登録済みID`）。通常デートは3択を2回、各選択直後・最初の発話の前に対応する `# effect:` を1つ置きます。Inkで `romance_result` と `affection_delta`・`trust_delta`・`spark_delta` を宣言し、`romance_result` の positive と negative それぞれで異なる人物らしい反応を書きます。確率計算と乱数はInkに書きません。告白は確定的な別契約です（場所のファイルの告白は `# profile:` も結果の `# effect:` も書かず、始めたときにゲームが関係状態から決めた `confession_result` で返事を分けます。デートの knot の中の選択の回数が `choiceCount` です。例：インド編の `places/gt_delhi_hotel_hub_dates.ink`）。案内とバトルには恋愛effectを置きません。バトルの会話は1本の流れで書きます（[対決の会話を1本の流れで書く](#対決の会話を1本の流れで書く段階5)。`-> quiz(n) ->` でクイズを呼び、戻ると `quiz_correct`・`battle_score` で分岐する）。場所のファイル（`stories/places/`）では、変数はゲームが用意する `modules.ink` が宣言するので、`VAR` を書きません（1場面1ファイルのバトルも、1行目を `INCLUDE modules.ink` にして `VAR` を書かない）。案内にも選択肢と効果の札を書けます（読み直しでは当てない）。特殊戦の主張（`<バトル>_claim`）・追及（`<バトル>_press`）・証拠成功／失敗（`evidence_result` の分かれ道）の例は見本の `stories/battles/smp_mihon_special_b_market.ink`（B）と `smp_mihon_special_c_library.ink`（C）にあります。

会話中の無言リアクションは、通常はInkの `# reaction:` で指定します。既存の `content/journeys/milano/presentation/dialogue-reactions.json` は、公開済みの脚本を変えずに演出を付けた旧指定として維持します。外部指定では固定台詞の完全一致が必要で、変数を含む行には指定できません。脚本を更新した場合、参照先の消えた旧指定は検証時に警告されます。

漫符IDは `question`、`exclamation`、`interrobang`、`anger`、`sweat`、`blush`、`gloom`、`dizzy`、`music`、`heart`、`sparkle`、`sleep`、`sigh` です。`exasperated` は呆れの表情で、画像が未登録の衣装では同じ衣装の `neutral` を使います。演出は対象人物が表示されている間だけ現れ、ゲームの進行や保存には影響しません。台詞ごとに機械的に付けず、必要な瞬間を選んでください。

順不同のデートで過去の出来事を参照する場合、Inkで `EXTERNAL has_memory(memory_id)` を宣言し、`has_memory("登録済みmemoryId")` を使います。引数は固定の登録済みIDだけで、任意コードを実行せず状態も変更しません。基本本文は思い出がなくても成立させ、`validationContexts` の `memoryIds` で思い出あり・なしの両方を検証します。`romance_stage` と `ending_reached` に応じた反応、告白の `confession_result` も各文脈を登録してください。

## 条件の書き方

デートの開く条件 `when`・閉じる条件 `until`（`romance/date_catalog.json`）と、道中交流の入場ルールの `when`（`encounters/entry-rules.json`）は、共通条件管理システムの同じ形の JSON で書きます。ゲームは条件を1つの関数（`src/domain/conditions.ts` の `meets`）で判定し、条件が真になっても何も記録しません。条件を書かなければ「条件なし」です。今使えるのは、今の記録を読む部品だけです（段階1と2a）。場面のInkの中では、同じ部品を文字で書いた `cond("…")` で分岐できます（下の「場面の中の分岐」）。

条件は、キーが1つだけのオブジェクトです。組み合わせは入れ子にできます。

| 組み合わせ | 書き方 | 真になるとき |
|---|---|---|
| すべて | `{ "all": [条件, 条件, …] }` | 全部が真（空にはできない） |
| どれか | `{ "any": [条件, 条件, …] }` | どれかが真（空にはできない） |
| ではない | `{ "not": 条件 }` | 中の条件が偽 |
| いくつ以上 | `{ "atLeast": { "count": 2, "of": [条件, 条件, 条件] } }` | `count` 個以上が真（`count` は1〜`of` の数） |

| 部品 | 書き方 | 読む記録 |
|---|---|---|
| エピソードを終えた | `{ "episodeCompleted": "<エピソードID>" }` | 終えたエピソード |
| 都市のエピソードをいくつ終えた | `{ "episodesCompleted": { "city": "<都市ID>", "atLeast": 1 } }` | その都市のエピソード（フィナーレを含む）の数。`atLeast: 1` がデートの標準（旧「章」） |
| 都市をクリアした | `{ "cityCompleted": "<都市ID>" }` | クリアした都市 |
| バトルを遊んだ | `{ "battlePlayed": "<バトルID>" }` | 一度でも戦ったバトル（勝ち負けは問わない） |
| 観光地を訪れた | `{ "landmarkVisited": "<観光地ID>" }` | 訪れた観光地 |
| 案内を読んだ | `{ "guideRead": "<観光地ID>" }` | 最後まで読んだ観光案内 |
| 交流を終えた | `{ "encounterCompleted": "<交流ID>" }` | 「また今度」以外で終えた交流 |
| 交流を見た | `{ "encounterSeen": "<交流ID>" }` | どの選択肢でも最後まで見た交流（「また今度」も） |
| デートを遊んだ | `{ "datePlayed": "<デートID>" }` | 遊んだデート |
| エピローグを読んだ | `{ "epilogueViewed": "<都市ID>" }` | 読んだ都市のエピローグ |
| 品物 | `{ "item": { "id": "<品物ID>", "is": "held" } }` | 品物の状態（下の表） |
| 時間帯 | `{ "time": "day" }`・`{ "time": "night" }` | `day` は9:00〜18:00、`night` は18:00から眠るまで（21:00の一日の終わりに休むときの、宿へ向かう移動と宿の「眠る前」の場面も夜） |
| この都市の何日目 | `{ "cityDay": { "atLeast": 2, "atMost": 3 } }` | 都市に着いた日が1日目。`atLeast`・`atMost` の片方だけでもよい |
| 旅の何日目 | `{ "journeyDay": { "atLeast": 5 } }` | 旅の暦（旅行編の `startWeekday`）がある旅だけ。暦のない旅ではいつも偽 |
| 曜日 | `{ "weekday": [5, 6] }` | 月曜が0。暦のある旅だけ |
| 乗った回数 | `{ "rides": { "mode": "<乗り物ID>", "atLeast": 2 } }` | この都市で、これまでにその乗り物に乗った回数（徒歩は数えない） |
| 借りた | `{ "rented": "<乗り物ID>" }` | この都市で借りた乗り物 |
| 都市のバトルをいくつ遊んだ | `{ "battlesPlayed": { "city": "<都市ID>", "atLeast": 2 } }` | その都市のバトル（フィナーレを除く。勝ち負けは問わない）を遊んだ数 |
| 関係の値 | `{ "relationship": { "axis": "affection", "atLeast": 3 } }` | 親しさ `affection`・信頼 `trust`・恋愛の意識 `spark` の今の値（`atMost` も。負の数も書ける）。プレイヤーには、値も、条件が満たされたかも見せない |
| 使えるお金 | `{ "money": { "atLeast": 300 } }` | 旅行予算から帰りの交通費の取り置きを引いた額（`atMost` も） |
| 恋愛の段階 | `{ "romanceStage": { "atLeast": 2 } }` | 今の段階（1〜4。`atMost` も） |
| 交際している | `{ "couple": true }` | 告白が成立した |

品物の `is` は5つです。

| `is` | 真になるとき | 読める場所 |
|---|---|---|
| `obtained` | 一度でも手に入れた（今の状態は問わない） | どこでも |
| `held` | 今持っている | その品物の都市の条件だけ。旅の間持ち歩く品物（`"carry": "journey"`）は、同じ旅の後の都市の条件でも読める（ほかの場所では持てないので、ビルドが止める） |
| `gifted` | 渡した | どこでも |
| `used` | 使った | どこでも |
| `left_behind` | 都市を出るときに置いてきた | 同じ旅の、品物の都市より後の都市の条件だけ（品物の都市の中では決して真にならないので、ビルドが止める）。持ち歩く品物は置いていかないので、どこでもビルドが止める |

例（期間限定の特別な出来事。ガッレリアを終えてから、最後の晩餐を終えるまで）：

```json
"when": { "all": [ { "episodesCompleted": { "city": "milano", "atLeast": 1 } }, { "episodeCompleted": "milano_galleria_episode" } ] },
"until": { "episodeCompleted": "milano_last_supper_episode" }
```

- デートは `when` が真で、`until` が偽で、恋愛の欄（`minRomanceStage`・`minAffection`・`needsDeferred`）を満たすときに開きます。一度地図に出た特別な出来事も、`until` が真になると閉じます。始めた後のデートは、セーブを読み込み直しても条件を調べ直しません。
- デートが開かない理由の文は今のままの順です（`when` のすぐ下の部品で、都市のクリア → エピソード → `until` → 告白の待ち時間 → そのほか）。ゲームは条件の中身や関係値を理由に出しません。Debugだけが、満たしていない部品を表示します。
- まだ使えない部品（`flag`・`met`・名前付き条件 `condition`・`ap`、品物の `encounter`・`to`）や、観察以外の時点（`at` の `afterBattle` など）は、ビルドが「まだ使えません（段階…）」で止めます。後の段階で足します。
- `npm run content:build` が止めるのは、形の誤り、存在しないID、旅行編が宣言していない乗り物（徒歩も数えない）、読める場所でない品物の `held`・`left_behind`、入手元のない品物です。止めずに注意として知らせるのは、決して満たされない条件（`never-offered`：観察だけで調べる交流が自分の観光地のエピソードやバトルを条件にしている、同じ旅の後の都市の進行を前の都市で読む、暦のない旅の `journeyDay`・`weekday`、互いを待つデート）と、デートの条件の `time`・`rides`・`money`（`date-condition-trip`：行き先へ向かう移動で変わるので、地図に出ても着くと始まらないことがある。時間や曜日で限るデートは、行き先の時間窓 `startWindows`・`openingWindows`・`closedWeekdays` で書けます）です。

### 場面の中の分岐

場面（案内・到着・エピローグ・対決の会話・道中交流・デート）のInkの中では、`cond("…")` で、条件が今満たされているかを読んで分岐できます（統一イベント設計の段階2a）。文字は、道中交流の頭の札 `# when:` と同じ書き方で、部品を1つ書きます（前に `not` を付けられます）。`cond` は真か偽だけを返し、数はInkに渡りません。読むだけで、何も変えません。

```ink
VAR player_name = ""
VAR heroine_name = ""
EXTERNAL cond(text)

{ cond("rel affection >= 3"): 「また来ようね。」 | 「次は、どこへ行く？」 }
* {cond("money >= 300")} [Let me buy you a coffee.]
  # speaker: heroine
  「じゃあ、窓ぎわの席で。」
* [Let's just walk.]
  # speaker: heroine
  「うん、川のほうまで。」
- -> END

=== function cond(text) ===
~ return false
```

- 今の「1場面1ファイル」のInk（`VAR` で始まる形）で `cond` を使うときは、`VAR` の行の後に `EXTERNAL cond(text)` を1行、ファイルの最後に、Inkyで下書きを見るための代わりの関数 `=== function cond(text) ===` と `~ return false` の2行を書きます（`EXTERNAL has_memory(memory_id)` と同じ書き方）。宣言がないと、`npm run content:build` が直し方を示して止めます。代わりの関数はInkyだけが使い、ゲームは本当の値を渡します。
- 書ける文字：`item <品物> held`（`obtained`・`gifted`・`used`・`left_behind`）、`seen <交流>`・`done <交流>`、`visited <観光地>`・`guide <観光地>`、`battle <バトル>`・`episode <エピソード>`・`city <都市>`、`episodes <都市> >= 1`、`battles <都市> >= 2`、`date <デート>`・`epilogue <都市>`、`time day`・`time night`、`day >= 2`（`<=` も）、`journey_day >= 5`、`weekday 5,6`、`rides <乗り物> >= 1`・`rented <乗り物>`、`rel affection >= 3`（`trust`・`spark`、`<=` も）、`money >= 300`（`<=` も）、`stage >= 2`（`<=` も）、`couple`。それぞれ上の表の部品と同じ意味です。`flag`・`met`・`ap`・名前付き条件は段階3からです。
- 引数は、引用符で囲んだ文字だけです（変数や式は書けません）。
- `npm run content:build` は、`cond` の文字を頭の札と同じ読み方で条件にし、ほかの条件と同じ検査（形・存在しない名前・品物の都市など）をして、誤りがあれば止めます。そのうえで、代表の組み合わせ（全部偽・全部真・1つだけ真）で、全部の道が最後まで進むかを確かめます。全部の組み合わせは確かめません。
- 選択肢を選んだ直後の行の `cond` は、その選択肢の効果（品物を渡した・関係の値が変わった など）の後の状態を読みます。
- 関係の値の条件は制作者が書くものです。プレイヤーには、条件が満たされたかも見せません。Debugモードがオンの間だけ、場面の上に、今の場面の `cond` の文字ごとの真偽を出します。
- 英語ノートの話題の説明（場面ではありません）と、特殊戦の反論（段階5から）では使えません。ビルドが止めます。

## 章・都市と報酬

都市エピローグの `# speaker: enemy` は、そのエピソードの `battleId` が参照する対戦相手の名前で表示します。ほかの登場人物の言葉は、誰の発言かを明記した地の文に含めてください。到着会話でも、主人公（`player`）と対戦相手（`enemy`。その都市のフィナーレの対戦相手の名前で表示）を話者にできます。

### 道中の交流

現在の小さなミラノの寄り道は `content/journeys/milano/encounters/catalog.json` と `content/journeys/milano/stories/encounters/` で管理します。カタログには安定した交流・選択・品物ID、観光地、必要な費用や条件、実際に確認した出典を記録し、選択肢の英文と任意の訳はInkに書きます。各品物にも `cityId` を付け、入手・所持条件・贈与・使用・Inkからの参照を同じ都市の場面に限ります。旅の間持ち歩く品物（`"carry": "journey"`）だけは、入手はその都市のまま、所持条件（`item … held`。`# when:`・`# requires:`・`cond("…")` のどれでも）・贈与・使用を旅の後の都市でも書けます（Inkの `has_item_status` は、今どおりその都市の品物だけ）。入手都市のクリア後も使える機会を設けてください。価格や展示・人物はゲーム内の設定です。旅の予算、品物、APは別に扱います。メイン観光・都市フィナーレ・デートが地図に出る条件に品物やお金を書くかは制作者が決め、書いたときは、どの都市もクリアできる道が残るようにします（`content:build` と探索テストが確かめます）。条件を書かない都市やデートは、購入しなくても続けられます。

道中交流は、観光地の時点で始まります。交流のInkの頭に札（`at: visit <観光地>`・`priority:`・`when:`・`until:`・`repeat:`）を書くと、本筋の前（`-1` など）・観察の後（`after observe`）・本筋の後（`+1` など）に置けます（今使っているのは見本の編だけ。見本の編では、時計塔の場面を場所のファイル `stories/places/smp_mihon_clock_tower.ink` の knot に書いている。1場面1ファイルの交流のInkの頭にも、同じ札を書ける）。

場所のファイルの会話（`# scene: talk`）と道中交流（`# scene: encounter`）は、観光地のほかの時点にも置けます（段階4）。`# at:` に書けるのは次のとおりです。

| 書き方 | 時点 | 負の数（前） | 途中 | 正の数（後） |
|---|---|---|---|---|
| `date <デート>` | デート | デートの前 | `after date`：デートの後、「交際開始」の画面の前 | 画面の後（画面がなければデートの後） |
| `finale <都市>` | フィナーレ | バトルの前 | `after battle`：結果の後 | 結果の後 |
| `epilogue <都市>` | エピローグ | エピローグの前 | — | エピローグの後 |
| `depart <都市>` | 都市の出発（次の都市があるときだけ） | 品物を置いていく前（まだ渡せる・使える） | — | なし（次の都市の `arrive` の負の数に書く） |
| `arrive <都市>` | 到着（最初の都市ではオープニング） | ロゴの前 | `after logo` | 到着の会話の後 |
| `trip <乗り物>`（`walk` も。`from <場所>`・`to <場所>` で絞れる） | 移動 | 出発する場所で、動く前 | — | なし（行き先の時点の負の数に書く） |
| `ticket <場所>` | 窓口（入場料のある行き先だけ） | 入場料を払った後、入る前 | — | なし |
| `hotel`・`hotel <場所>` | 宿（「休む」） | 眠る前（宿に着いた時刻で読む） | — | 起きた後 |
| `tour <ツアー> <行程>` | 参加中のツアーの行程（下の「ツアー」） | 区間：出発の前／見学：訪問の前 | 区間だけ `after leg`：語りの後、動く前（車の中の交流） | 区間：着いた後／見学：結果の「ツアーを続ける」の後 |

- `place <場所>` は、その場所の観光地・デート・フィナーレのどの時点にも合います（「また今度」の場面を、同じ場所のデートの前でもう一度出したいとき）。
- 「休む」は、宿へ向かう移動の場面（「休む」を押した時刻）→ 宿に着く（21時を過ぎることもある）→ 眠る前の場面 → 眠る（次の日の9時）→ 起きた後の場面、の順です。`time night` は18時から眠って次の朝になるまで真なので、21時に休むときの眠る前の場面も夜です。昼に休んでも眠る前の場面は流れるので、夜だけにしたいときは `# when: time night` を書きます。
- 乗車回数（`rides`）は動いたときに増えるので、移動の場面は「初めて乗る」を `# when: not rides <乗り物> >= 1` で書けます（「休む」で宿へ帰る道は、今までどおり乗車回数に数えません）。
- 到着とエピローグの会話にも、頭の札・選択肢の札の `then:` を書けます。
- `then: move <場所>` は、`by <乗り物>` を書かなければ徒歩で動きます（徒歩の道がなければいちばん安い道）。地図の出発と同じく時刻を確かめるので、夕方や遠い場所へ徒歩で動くと、動いた先の本筋が間に合わず本筋のない訪問になったり、帰り道が間に合わずその選択肢が選べなくなったりします。速い乗り物で動かしたいときは `by <乗り物>` を書いてください。
- 例は見本の編の `stories/places/smp_mihon_clock_tower.ink`（デートの前のベンチを塗る人・初めての貸し自転車・宿の眠る前と起きた後・エピローグの前のしおりとリリの見送り）と `stories/places/smp_mihon_city_end.ink`（フィナーレの前後と、エピローグを始める時。統一イベント設計 3.9 の (d)）です。時点の並びは `npm run journey:readthrough -- --journey <旅行編>` で読めます。札を書かない交流は、入場ルール（`encounters/entry-rules.json`）を満たすものが、観察を進めたときにカタログの順に始まり、終わると観察に戻ります。自由時間から始める道はありません。入場ルール（`encounters/entry-rules.json`、`"schemaVersion": 2`）には、交流ごとに `encounterId`、調べる時点 `at`（今は観察の `["observe"]` だけ。省略しても同じ）、出会える条件 `when`（例：`{ "episodeCompleted": "milano_duomo_episode" }`、`{ "battlePlayed": "milano_la_scala_b01" }`。書き方は[条件の書き方](#条件の書き方)）を書きます。入場ルールのない交流や `when` のない交流は、条件なしに出会えます。`quizAfterLandmarkBattle` の印を付けた交流（ガッレリアの親子との会話）は、最初の観察で会えます。同じ観光地の本戦をまだ戦っていないうちはクイズなしで話が終わり、本戦を戦った後に始まった場合だけ、文化クイズと展示券の抽選へ進みます。ただし今は、本戦を戦った後に交流が始まる観察がないため、このクイズと抽選には遊んでいて届きません。本戦を終えるとガッレリアは地図の行き先に出なくなります。バトルの画面から観察に戻ることはできますが、バトルの途中なので交流は始まりません。ミラノの道中交流には、ほかにも今は起こらないものがあります。多くは、条件（その観光地を終えた・特殊戦を戦った）を満たすと、交流が始まる観察がもうないためです（観察だけで調べる交流が自分の観光地のエピソードやバトルを条件にすると、`npm run content:build` が注意 `never-offered` で知らせます）。展示券が要る交流は、券が手に入らないため起こりません。ユーザーの判断（2026-11-08）で、これらは今のまま残し、シナリオの改稿でまとめて見直します。各交流が今いつ起こるか（起こらないならその理由）は、`content/journeys/milano/stories/encounters/` の各Inkファイルの先頭のコメントに書いています。JSONにはコメントを書けないので、カタログと入場ルールには書きません。起こる時を変えたら、そのコメントも直してください。カタログに `availability` は書けません（セーブ版 v14 でなくなりました）。使わない交流はカタログから消してください。既存の会話や賞品を差し替える際は、現在のゲームの参照と獲得・使用の整合性を確認してください。

旅行予算とAP・保留APは都市別に初期化しない共通残高です。次の都市へ出発すると、その都市でまだ持っている品物は「置いてきた」になり、持ち越せません。旅の間持ち歩く品物（`"carry": "journey"`）だけは、持ったまま次の都市へ行きます。置いていくことのある品物（持ち歩く印がなく、次の都市がある都市の品物）には、その都市での使い道が要ります。入手・贈与・使用の履歴、交流の履歴、思い出・関係値は残ります。

ゲームは、交流を最後まで終えるたびに「見た」記録を残し（「また今度」で終えた場合も）、品物を渡した・使ったときは、その交流と選んだ選択肢のIDを品物の状態と一緒に保存します（共通条件管理システムの記録。[データ契約](../docs/07_DATA_AND_TESTS.md#共通条件管理システムの記録)）。そのため、公開した後は交流のIDと、品物を渡す・使う選択肢の `# option:` のIDを変えないでください。変えるとセーブが読み込めなくなります。

交流Inkは名前変数を宣言し、英語の選択を一度置きます（選択肢の数は自由。ふつうは3つ）。選択肢の英文はInkにだけ記述し、費用やアイテム操作がある場合は安定した `option` IDでカタログのルールと結び付けます。選択後の日本語の会話はどの枝も完走させ、効果や残高操作をInkに書きません。正誤のない返答と、正解がある任意の文化クイズを区別します。小さな観光クイズは既存の問題スキーマを使い、事実・伝承・創作を混同せず出典の該当箇所を確認してください。クイズの賞品と当落後のInk、アイテムの贈与・使用、既存報酬と共有するAPの条件はカタログで参照します。

交流Inkから以前の品物を参照する場合は `EXTERNAL has_item_status(id, status)` を宣言し、例えば `has_item_status("blue_pick", "gifted")` のように登録済みIDと `held`・`gifted`・`used` の固定文字列を使います。状態の変更はゲーム側だけが行います。この参照は現時点では道中交流のInkで使用できます。`npm run content:check` は重複ID、参照、選択肢と分岐、出典の形式、アイテム参照を検証します。既存の戦闘・デートInkを改稿した場合、過去の途中セーブを再開できなくなることがあります。

都市（`cities/<都市ID>.json`）の `id`、`countryCode`、`nameJa`、`themeJa`、`landmarkIdsPlanned`、`productionStatus` は都市と場所の識別、表示、予定と状態。`firstClearReward` は都市の初回クリア報酬の `rewardSourceId` と `ap` です（`ap` が正の場合、同じIDの `episode_clear` 報酬を一つの観光エピソードに設定します。0なら設定しません）。`progression/journey.json` の `episodes` は順路（各都市の最初のエピソードは前提なし）、`rewards` は一度限りの報酬です。各エピソードの `id`、`kind`、`cityId`、`landmarkId`、`battleId`、`requiredEpisodeIds`、`titleJa` / `descriptionJa` / `clearTitleJa` / `clearDescriptionJa` は識別・参照・順序・表示文。都市フィナーレは `kind: "city_finale"`、`landmarkId: null` と `epilogueStoryId` を指定します。

報酬の `id`、`episodeId`、`trigger`、`ap`、`minScore`、`titleJa` は安定ID、対象、発生条件、付与量、得点条件、表示文です。`trigger` は `guide_read` / `battle_complete` / `battle_score` / `episode_clear` / `city_clear`（このほかに、ビルドが場面の札 `# ap: +N` から作る `scene_tag` がありますが、作者はこのJSONに書きません。書くと `content:build` が止まります）。`minScore` は `battle_score` のみ正の数、それ以外は `null`。AP上限や報酬IDの重複防止はゲームルール側で処理します。

都市は旅行編の `manifest.json` の `cities` に登録し、その旅行編フォルダに都市・移動・各カタログの項目を置きます。都市の追加手順と制約は [都市の追加手順](FUTURE_CITIES.md)、旅行編そのものを追加する手順は [技術設計](../docs/02_TECH_ARCHITECTURE.md#新しい編を追加する手順) を参照してください。

### 地点の紹介文

自由時間で行き先を選ぶと、下のカードに地点の紹介文が出ます。`travel/<都市ID>.json` の `places[]` に `descriptionJa`（日本語の短い文章。任意）として書きます。どんな場所か、いつ頃からあるか、何が見られ何ができるかといった一般的な観光案内にし、年号・数などの事実は出典で確かめられるものだけを書きます。そこで起きる物語やデートの出来事・人物は書きません（筋を先に明かさないため。出来事の一行の `descriptionJa` はこのカードに出ません）。書かない地点は紹介文の行が出ないだけで、`content:build` の注意にもなりません。自由時間の札の写真は、その場所の最初の観光地の写真か背景の写真です。別の写真にしたいとき（宿など）は、同じ地点に `photoAssetId`（同じ旅行編の `tourism/catalog.json` の観光画像のID。任意）を書きます。宿の札はこの欄の写真だけを出し、書かなければ色の札のままです。

### 自由時間の背景

自由時間の画面の後ろには、都市ごとに1枚の背景を敷けます（任意。なければ地図風の模様）。出典のある写真なら `cities/<都市ID>.json` の `backdropAssetId` に `tourism/catalog.json` の画像のIDを、作者が描いた絵なら `backdropImagePath` に配信時のパス（例 `assets/backdrops/delhi-free-time.webp`）を書きます（どちらか一方）。絵はその旅行編の `public/assets/` に置き、同じ旅行編の `presentation/own-artwork.json` に1枚ずつ登録します（自作の絵は出典の一覧に載りません）。画面は縦長なので、縦長の絵を1080×1920pxの枠に収めたWebPにすると軽く、画面いっぱいに切り抜いて少し暗くして表示します（[技術設計](../docs/02_TECH_ARCHITECTURE.md#画像の出典と自作の絵)）。

### 都市内の移動（乗り物）

- 乗り物は旅行編の `manifest.json` の `transportModes` に、徒歩のほかに2つまで宣言します（名前・移動中の文字・絵の種類。[技術設計](../docs/02_TECH_ARCHITECTURE.md#乗り物と交通判断台帳)）。経路の `mode` には宣言したIDを書きます。
- 経路の `transferNote` は、乗り物の名前の後に（ ）で出る短い補足です。路線の番号や、乗る・降りる場所を書きます（例「16番」「24番・ミッソーリから乗る」「近くの車道から乗る」）。40文字以内を目安にし、時刻表や料金の説明は書きません。
- 乗り物の経路には、ゲーム用の推定の印（`"estimation": "game_model"`）と、事実の出典（`documented_fact`。路線があること、料金の決まりなど）を付けます。所要時間や料金の計算式など、推定の根拠は `hypothesis` の出典として残します。画面の時間・料金は「ゲーム内の推定」と表示されます。その事実がその移動に届いているか（例：市内のオートの運賃は、約40km先へのオートの根拠にならない）は点検で見ます。届く資料がないときは、ほかの資料を事実として付けず、仮説の出典だけにします。事実の出典がない経路は `content:build` の注意に出ます。台帳の理由に、資料がないこと・仮の値であることを書きます。
- 台帳のある都市で徒歩の経路がない向き（歩けるか確かめられない橋、何時間も歩く遠い地点など）は `content:build` の注意に出ます（生成は止めません）。台帳の理由で徒歩と比べる組（「歩いて◯分で着く」）には、徒歩の経路を置きます。
- 都市ごとの交通判断台帳 `travel/<都市ID>-transit.json` に、地点の組と乗り物ごとに、使う（`available`）・使わない（`not_suitable`）・走っていない（`not_applicable`）・特定できず（`inconclusive`）を、確かめた日と日本語の理由とともに書きます。使わない判断は、その乗り物が現実にないという意味ではありません。理由にそう書き分けます。
- 借りる乗り物（`"rental": true`。例：貸し自転車）は、借りる場所と料金を `travel/<都市ID>-settings.json` の `rentals` に書きます。料金は滞在中の分の目安で、実際の1日あたりの料金と違うときは、出典の `claimJa` にゲーム用の値であることを書きます。借りなくても、すべての地点へ徒歩などで行けるようにします。
- 作者や制作者が現地で確かめたことを出典にするときは、`authoring/journeys/<旅行編ID>/research/` に確認メモ（確かめた人・時期・確かめたこと・確かめていないこと・ゲームでの扱い）を置き、そのメモを `documented_fact` として引きます。日付を記録していなければ月までを書き、日付を作りません。`checkedAt` はメモを書いた日にします（例：[ルアンパパーンの確認メモ](journeys/luang_prabang/research/field-check-2026-07/README.md)）。

### ツアー（決まった行程の日帰り）

- ツアーは旅行編の `tours/<ツアーID>.json` に1つずつ書きます（ツアーの段階2a。IDは `<頭>_tour_<場所>`、ファイル名も同じ。形と決まりは[技術設計](../docs/02_TECH_ARCHITECTURE.md#ツアー)）。例：インド編のアーグラの `tours/gt_agra_tour_fatehpur_sikri.json`。
- 行程（`steps`）は宿の9:00から順に進みます。移動（`kind: "leg"`）には、行き先の地点・分・演出の絵（`vehicle.kind`、例 `car`）と移動中の文字、ゲーム用の推定の印 `"estimation": "game_model"` と出典（移動時間の事実 `documented_fact` と、ゲームの値にした理由 `hypothesis`）を書きます。見学（`kind: "event"`）には、その都市の地図の出来事のID（ツアー専用の地点の観光地のエピソードか特殊戦）を書きます。最後は宿か、宿へ歩いて帰れる地点への移動で終えます。
- 販売（`offers`）は、Web予約（`web`）・窓口（`desk`。`placeIds` に売る地点）・紹介（`introduced`。`when` に、会った場面を書きます）ごとに書けます。**値段（`price`）はパーティ全員分で、入場料を含みます**（ツアーの見学では入場料を払いません）。出典には値段の元になった事実と、ゲームの値であることを書いた `hypothesis` を付けます。開けなかったページ・検索結果に出ただけの数字は出典にしません。公開中の旅行編に `<要調査>` などの仮の値を残すと `content:build` が止まります。
- ツアーでだけ行く地点には `"access": "tour"` を付け、同じ地点の徒歩（0分）のほかに経路を書きません（交通判断台帳にもその地点の判断を書きません）。地図の行き先には出ず、ツアーが連れて行きます。
- 行程の場面（ツアーの段階2b・3）は、ツアーIDの名前の場所のファイル `stories/places/<ツアーID>.ink` に knot で書きます（例：インド編の `stories/places/gt_agra_tour_fatehpur_sikri.ink`）。頭の札の `# at: tour <ツアーID> <行程ID>` で行程を指します。
  - 区間の語り（`# scene: tour_leg`）：移動の行程に1つまで。到着・エピローグと同じ画面で読みます（ログ・オート・速さ・窓を隠す・どこでもタップ）。選択肢と効果の札は書けません（`# priority:`・`# when:`・`# on_done:`・`# then:` なども書きません）。`cond("…")` と、`player` を含むどの話し手も使えます。読み終えると「ツアーを続ける」で次へ進みます。
  - 車の中の交流（`# scene: encounter`、`# title:`、`# priority: after leg`）：語りの後、着く前に流れます（語りのない区間では、出発の前の場面の後に）。区間に1つまで。英語の答えと `# translation:`、選択肢の札（`# rel:`・`# set:` など）を書けます。お金（選択肢・`# on_done:`）、得るAP、「また今度」（`# later`）、`# repeat: always` は書けません（ツアーの日に1回だけ流れ、代金に含みます）。
  - 行程の前後の会話・交流（`# scene: talk`・`encounter`、`# priority: -N`・`+N`）：区間なら出発の前（宿・前の見学地にいる）と着いた後、見学の行程なら訪問の前（観光地の訪問の負の数の場面より前）と後（結果の「ツアーを続ける」の後、訪問の正の数の場面より後）。
  - 流れる順：区間の負の数 → 語り → `after leg` → 動く（運賃なし。演出の車の絵）→ 区間の正の数 → 見学の行程の負の数 → 訪問 → 見学の行程の正の数 → 次の区間……。ツアーは一度しか遊べないので、行程の場面も一度きりです。土地の事実を言う語り・場面は、ほかの場面と同じく `scenes/catalog.json` に出典を書きます（言わないなら `# sources: none`）。
  - 背景は `# background:` に登録済みの背景を書きます。車の中や道の絵がなければ、共通の既定背景 `default_scene`（色だけの「旅の余白」）を書けます。
  - 自由散策（ツアーの段階2b の残り）はまだありません。
- `# then:` は、予約したツアーの朝の宿の場面（`# at: hotel` の起きた後、`# priority:` +N）では動かず、ツアーの見学の間（その訪問の場面・案内・対決の頭）と行程の場面（`# at: tour …`）では断られます（ツアーが続きます）。`content:build` はこれらを注意に出します。
- 時間枠の外に着く行程、21:00を過ぎる帰り、行けない窓口、出典の組み合わせは注意に出ます（生成は止めません）。値段は最後のバランス調整で旅の予算と合わせて決め直します（`tests/journeys/golden_triangle/budget.test.ts` が、旅の予算で都市の本筋に必要な額をまかなえるかを確かめます）。

### 夜の一言（任意）

夜の画面と一日の終わりの札には、その日に移った地点を点線でつないだ小さな地図（ゲームが出します）の下に、彼女の短い一言を出せます（2026-11-11）。`travel/<都市ID>.json` の最上位に `nightLinesJa`（日本語の文の配列）として書きます。その都市の1日目に1つ目、2日目に2つ目…と順に出し、最後の次は1つ目に戻ります。書かなければ一言は出ません。名前は `{player_name}`・`{heroine_name}` と書くと設定した名前になります（名前をそのまま書かない）。引用符（「」）は書いたとおりに出ます。関係の段階にかかわらず出るので、どの段階でも自然な一言にし、書く前に [キャラクターバイブル](../docs/09_HEROINE_CHARACTER_BIBLE.md) を読みます。例は見本の編の `travel/mihon.json`（架空）。

```json
"nightLinesJa": ["今日はたくさん歩いたね。足はくたくたなのに、まだ眠くないや"]
```

## 確認と公開前レビュー

`npm ci` の後、1ファイルを編集中に確認する例です（見本のファイルで試せます）。形式の推測が難しい雛形や下書きは `--type` を指定します。対決は複数項目を含むカタログ形式なので `battle-catalog` です。

```sh
npm run content:inspect -- --type quiz authoring/templates/sample_trip/quizzes/smp_mihon_main_clock_tower_quiz.json
npm run content:inspect -- --type battle-catalog authoring/templates/sample_trip/battles/catalog.json
npm run content:inspect -- authoring/templates/sample_trip/stories/epilogues/mihon.ink
```

単体検証はJSONの構文・指定形式とInkのコンパイルを調べます。参照先、Inkタグ、分岐の全文脈は単体では検証しません。正式データの変更後に `npm run content:check` を実行すると、全コンテンツの構造・参照を検証し、ゲーム用のデータを生成します。生成ファイルを書き換えずに全体を確認したい場合は、代わりに `npm run content:inspect -- --all` を利用できます。`npm run test:saves` はコンテンツ生成後に保存関連の単体テスト（`src/persistence/`）を実行します。過去のセーブの更新後の再開を保証するものではありません。

普段は変更内容と影響範囲に応じて、必要な型検査・対象テスト・実画面確認を選びます。全単体テストと全E2Eを毎回実行する必要はありません。公開前や大きな変更時の全体確認は [開発時の確認](../docs/10_DEVELOPMENT_CHECKS.md) を参照してください。失敗したらエラーで示されたファイル、ID、フィールドを直して再実行します。Inkやクイズの途中再開は内容の指紋を使うため、改稿で読めなくなったデータを勝手に削除しないでください。

自動検証に加え、編集者が次を確認します。

- 事実と解釈・伝説が混ざっていないか、出典URLを実際に確認したか。
- 写真のライセンス・改変条件・クレジットが対象画像に合っているか。
- 英文が自然で、選択肢に唯一の正解があり、正解の長さや事前会話で答えが露見しないか。
- 敵の価値観が会話を通じて動き、ヒロインに自分の意思があるか。短く読みやすいか。
- スマートフォンで文章・画像・操作が読みやすいか。観察なしでも進めるか。
- 現在のゲームが使用するID・報酬・Ink・クイズ参照を壊していないか。過去の途中セーブが再開できなくなる場合は、読めないデータを安全に保護できるか。

検証は構造や参照の誤りを見つけますが、面白さ・史実・自然な英語・画像の権利を保証するものではありません。人間が書いた場合もAIが補助した場合も、同じ確認を行います。
