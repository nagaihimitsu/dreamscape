# コンテンツ制作ガイド

Dreamscapeの正式データは `content/` です。文章はInk、クイズ・設定はJSON、画像は `public/assets/` に置きます。テキストエディタで直接編集できます。人間の原稿も、どのAIの出力も、同じファイル形式・同じ検証を使います。AIや外部APIは不要です。任意の作業途中原稿は `authoring/drafts/` などに置けますが、必須ではありません。Gitの差分とレビューで採用を決めます。

## Inkで会話と演出を作る

新しい会話の本文、選択肢、話者、背景、表情、漫符はInkに書きます。既存の外部表情・リアクションJSONは旧脚本との互換用に残しますが、新しい行の登録には不要です。`reaction` はその一行だけに適用され、話者とは別の人物にも指定できます。

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

## 簡単な道中交流を追加する

`content/stories/encounters/duomo_new_event.ink` を作り、名前用変数、会話、3択と分岐を書きます。英文はInkを正とします。訳を付ける場合は **選択肢の角括弧の中** にタグを置きます。

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

`content/encounters/catalog.json` の `encounters` に、既存の観光地IDを使って次のように追加します。都市は観光地から導かれ、説明はタイトル、各選択肢の費用は0、再プレイ不可が標準です。新しい事実を扱う場合は、確認した出典も `sources` に追加します。

```json
{
  "id": "duomo_new_event",
  "landmarkId": "duomo_milano",
  "titleJa": "ドゥオモの新しい出会い",
  "storyId": "encounters/duomo_new_event"
}
```

購入やアイテム使用など選択肢ごとのルールがある場合は、カタログに `options` を3件追加し、各選択肢に `* [Tea # option: tea # translation: お茶を頼む。]` のような安定IDを指定します。カタログ側は `{ "id": "tea", "costEuro": 4 }` のようにルールだけを記述し、英文は重複させません。選択肢の順序を変えてもIDで対応します。所持金・アイテムの変更はゲーム側が処理します。

## 簡単な通常デートを追加する

新しいInkに既存の通常デートと同様の変数、2回の3択、結果別の反応を記述します。各分岐では、1回目に `# effect: common_date_first_attentive`、2回目に `# effect: common_date_second_attentive` のような共通効果を使えます。末尾は `attentive`、`playful`、`honest`、`bold`、`provocative` から、その返答に合う既存の確率特性を選びます。結果は `romance_result` の `positive` / `negative` で描き分けます。共通効果は個別の思い出を保存しません。場所固有の思い出が必要な場合は従来どおり固有effectとmemoryを追加します。

`content/romance/date_catalog.json` の `dates` には、例えば次の最小設定を追加できます。都市クリア後に解放、2 AP、一度限り、交際後も利用可能が標準です。旅の途中で解放したい場合は既存の `destinationId` と `requiredCompletedEpisodeIds` などを明示してください。

```json
{
  "id": "milano_new_date",
  "chapterId": "milano",
  "titleJa": "新しいデート",
  "storyId": "milano/new_date",
  "backgroundAssetId": "milano_cafe"
}
```

公開済みInkを編集・差し替えると途中セーブの指紋が変わります。新旧の脚本と必要なカタログを旧脚本保存機構で保持し、再開を確認してください。古い外部演出の行や脚本がなくなった場合は警告されます。登録後は `npm run content:check` で参照と分岐を検証します。

## この雛形について

[`templates/`](templates/) は現在のミラノ編から抜き出した**記入例**です。実際に使われているID・文章・出典を含むので、コピーしてそのまま追加するとIDが重複します。新作には各ID、参照先、文章、実際に確認した出典・画像情報を更新してください。実在する記述を雛形として示しているだけで、別の題材の根拠や使用許諾にはなりません。`tourism.json`、`battle_*.json`、`date.json` は対応する既存カタログの配列に**項目を追加するための例**です。既存カタログを例で上書きしないでください。`date_presentation_parts.json` はカタログ全体ではなく、`presentation.json` の各オブジェクトに追加する部品です。

| 作るもの                       | 例                                                               | 正式な配置先                                          |
| ------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------- |
| 観光地・画像・発見・資料       | `tourism.json`                                                   | `content/tourism/catalog.json` の各配列               |
| 英語3択3問                     | `quiz.json`                                                      | `content/quizzes/任意名.json`                         |
| 敵と通常戦、矛盾追及、証拠連結 | `battle_a.json`, `battle_b.json`, `battle_c.json`                | `content/battles/catalog.json` の `battles`           |
| 敵の会話                       | `battle_a.ink`, `battle_b.ink`, `battle_c.ink`                   | `content/stories/battles/`                            |
| デート、効果、思い出・背景     | `date.json`, `date_effects.json`, `date_presentation_parts.json` | `content/romance/` の対応するカタログ                 |
| デートの会話                   | `date.ink`                                                       | `content/stories/milano/`                             |
| 観光案内                       | `guide.ink`                                                      | `content/stories/tourism/`                            |
| 都市・順路・報酬               | `city.json`, `journey.json`                                      | `content/cities/`, `content/progression/journey.json` |

JSONにはコメントを入れず、カンマ、引用符、配列の括弧を保ちます。`schemaVersion` はデータ形式の版で、個々のコンテンツIDとは別です。編集前に対象ファイルを複製し、既存内容を消さずに追加してください。表示名は変更できますが、公開済みIDはセーブ・他データの参照に使うため変更しないでください。新しいIDは英小文字で始め、英小文字・数字・`_` を使います。`storyId` は `tourism/duomo_guide` のように `content/stories/` からの拡張子なしの相対パスです。

## 題材を選ぶ

英文にする前に「話の入口」「問い」「種明かし」を日本語で書き、クイズにしなくても人に話したくなる小話かを確認します。人の願い・失敗・信仰や権力、土地の伝説や文化の接点、絵の人物や表現から見える物語を優先します。材料・運搬・寸法・年号や名前だけの暗記は原則避けますが、人の選択・事件・意外な結末に不可欠なら候補になります。史実・解釈・仮説・伝説を分け、資料の主張を支える箇所を確認します。閲覧できなければ未確認と記録します。

訳は問題文と全選択肢を公平に、原文にない正解の根拠を加えずに書きます。文法・語法の説明は実際の英文に対応させ、辞書や信頼できる教材を確認してください。観光問題の成績から英語力を推定しません。

## 新しい観光地を準備する

1. 事実・解釈・伝説を区別し、各項目の出典と日付を記録します。写真の作者、ライセンス、加工内容と利用条件も確認します。
2. `tourism.json` を見ながら、画像を `assets`、場所を `landmarks`、その発見を `clues` に登録します。画像は `public/` 以下に配置し、`path` に `public/` を除いたパスを書きます。
3. 3問の `quiz.json` と案内 `guide.ink` を作り、対応するIDをそろえます。
4. 敵の `battle_a.json` と `battle_a.ink` を参考に、敵・会話と問題を結びます。演出背景は `content/romance/presentation.json` に登録します。
5. 順路・報酬を `journey.json` の既存配列に追加し、参照関係を確認します。新都市の追加には後述の現行制約があります。
6. 後述の検証と編集者レビューを済ませてからGitで採用します。

### 観光データの項目

- `assets`：`id` は画像の安定ID、`path` は画像ファイル、`width` / `height` は実際のピクセル寸法、`altJa` は画像を見られない人向けの日本語説明、`isPlaceholder` は仮画像かどうか。`sourceUrl`、`licenseName`、`licenseUrl`、`creditJa`、`modificationJa`、`checkedAt` に元画像の所在・権利・作者・加工・確認日を記録します。仮画像を実物の細部の根拠にしません。
- `landmarks`：`id` / `cityId` は場所と都市のID、`nameJa` / `nameEn` は表示名、`descriptionJa` は短い案内。`imageAssetId`、`guideStoryId`、`battleId` はそれぞれ画像、案内Ink、通常戦のID、`clueIds` はその場所の発見ID一覧です。
- `clues`：`id`、`landmarkId`、`titleJa`、`descriptionJa`、`factId`、`relatedQuestionIds`、`sources` は発見と参照、説明、根拠です。`kind: "hotspot"` は写真で見える場所、`kind: "document"` は画像だけでは判断できない資料。後者の `region` は `null` です。hotspotの `region` は画像全体を1とする左上の `x` / `y` と `width` / `height`（各0〜1）で、画像の外には出せません。画像差し替えで構図が変われば座標も見直します。
- `sources` の `publisher` / `title` / `url` / `checkedAt` / `claimType` / `claimJa` は発行者、資料名、URL、確認日、根拠の区分、その資料が裏付ける主張。`claimType` は `documented_fact`、`interpretation`、`legend` を区別します。

### 単語の意味

問題文・選択肢の単語には `content/learning/word-meanings.json` の一般的な意味を登録します。大文字・小文字、アクセント、曲がったアポストロフィは照合時に正規化します。その問題の `vocabularyJa` に同じ語句があれば、その文脈での意味を優先します。新しい問題の語に未登録があれば全体検証で知らせます。一般的な意味は文脈によって異なるため、曖昧な語は該当問題の `vocabularyJa` で補ってください。たとえば [court](https://dictionary.cambridge.org/dictionary/english/court) や [secure](https://dictionary.cambridge.org/dictionary/english/secure) の複数の用法はCambridge Dictionaryで確認できます。語義の正確さと文脈への適合は編集者が確認します。外部辞書APIは使いません。

### 対訳・学習説明

公開する問題は `content/learning/translations.json` に問題IDを登録し、`source` に問題文・全選択肢・正解IDの原文をそのまま記録します。`questionJa` と `optionsJa` は正誤の根拠を加えず、選択肢A/B/Cを公平に訳します。原文や正解を変更すると全体検証が不一致を検出するため、訳を確認して `source` を更新してください。既存のバトル保存指紋は学習データを含みません。

詳細が必要な問題だけ `content/learning/details.json` に、原文中の `segments` と `topics`、疑問見出し、説明、実用例文・訳、確認済みの文法資料URLと確認日を追加します。学習会話は `content/stories/learning/english.ink` のtopicに対応し、話者はヒロイン、2〜4行、選択肢やeffectは使いません。現在は『最後の晩餐』の通常戦3問が対象です。意味の自然さ、資料の該当箇所と訳は編集者が確認します。

### クイズの項目

`quiz.json` の `id` は問題セット、`landmarkId` は観光地、`englishLevel` は `A2` / `B1` / `B2`。通常戦の `questions` は3問です。各問の `id`、英語の `questionEn`、`options` の `id` と `textEn`、`correctOptionId` を指定します。選択肢は3つ、正解IDはそのうち一つ。`vocabularyJa` の `word` / `meaning` は英単語と日本語補足、`hintJa`、`correctExplanationJa`、`incorrectExplanationJa` は日本語、`sources` は各問の根拠、`difficulty` は `easy` / `medium` / `hard`。問題と選択肢だけを英語にします。解答前の会話で正解を明かさないようにします。都市フィナーレは `scope: "city_finale"`、`cityId`、`landmarkId: null`、5問です。

### 敵・バトルの項目

`battle_*.json` の `id`、`titleJa`、`descriptionJa`、`enemyNameJa`、`enemyTitleJa`、`enemyDescriptionJa` は対決と人物の識別・表示。`landmarkId`、`storyId`、`quizId`、`backgroundAssetId` は観光地・Ink・問題セット・登録済み背景への参照です。`scenes.intro`、`afterRounds`、`outro` はInkの `battle_scene` に渡される場面名で、通常戦は中間2つ。`format` はAでは省略可能、B/Cは明示。任意の `portrait` は既存で定義済みの表示種別に限られます。新規の立ち絵種類には実装作業が別途必要です。

B/Cの `reasoning` には `kind`（Bは `contradiction`、Cは `connection`）、0から数える `roundIndex`、候補 `caseClueIds`、正解 `correctClueIds`、主張・成功・失敗の `claimScene` / `successScene` / `failureScene` を記入します。Bは `pressScene` も指定し、正解証拠は1つ。Cは異なる2つを順不同で組み合わせます。証拠は未発見でもケース資料として開けるよう候補に含めます。英語3択の正解はクイズ側で別に指定します。

## 恋愛とInk

### デートで訪れる観光地

観光・発見・バトルを持つメイン観光地と、デート中に訪れる行き先は別のデータです。デート先のために敵・クイズ・観光エピソードを作る必要はありません。将来、メイン観光地と同じ場所をデートで再訪する場合も、同じ場所を指すデート先を登録できます。

1. `content/romance/date_destinations.json` の `destinations` に、安定した `id`、`cityId`、日本語・英語の名称、短い `descriptionJa`、`backgroundAssetId`、`facts` を登録します。事実ごとに `publisher`・`title`・`url`・`checkedAt`・`claimType`・`claimJa` を記録し、実際に資料の該当箇所を確認してください。事実・解釈・仮説・伝説は既存の観光資料と同じ区分を使います。
2. 権利を確認した写真を `public/assets/tourism/` に置き、`content/tourism/catalog.json` の `assets` に実寸・作者・出典URL・ライセンス・加工内容を登録します。`content/romance/presentation.json` の背景から `imageAssetId` で参照し、必要なら `imagePosition` の x / y を0〜100で指定します。写真家の権利だけでなく被写体の権利も確認してください。近隣の風景を使う場合は実際の場所を代替テキスト・クレジットに明記します。確認できる画像がない場合は `fallback: "neutral"` を使います。出典は会話中の操作メニューから確認できます。
   背景に訪問対象が写っていないときは、行き先に任意の `referenceImage`（HTTPSの `url`、リンク名 `labelJa`、背景についての `backgroundNoteJa`）を追加し、実物を確認できる公式資料へ案内できます。外部リンクは写真のゲーム内への転載許諾を意味しません。
3. `content/romance/date_catalog.json` の通常デートに `destinationId` と必要に応じて `requiredCompletedEpisodeIds` を指定します。デートの `chapterId`、行き先の `cityId`、双方の背景IDを一致させます。訪問後に開放する通常デートでは、必要エピソードを指定したうえで `requiredCompletedChapters` を空配列にできます。交際後も同じ短編を遊べる場合は `allowAfterEnding` を指定します。
4. Inkには、その場所で見られるものや出典を確認した小話を、ヒロインの関心や会話に自然につなげて書きます。選択にかかわらず観光を楽しめるようにし、既存脚本を更新する際は途中セーブ向けに旧Inkと `legacyStoryIds` を残します。旧脚本に旧行き先があった場合は `legacyDestinationId` または脚本ごとの `legacyStoryDestinationIds` も指定します。3択を2回書き、選択肢には共通または固有の `effect` を指定します。固有の思い出を残す場合は対応する `memory` も登録します。必要な表情は `# emotion:`、無言の反応は `# reaction:` で指定します。既存の恋愛進行に新イベントを必須条件として追加するかは、別途慎重に検討してください。
5. `npm run content:check` でIDの重複、都市・エピソード・背景の参照、出典形式、全分岐と効果を確認し、スマートフォンの画面と脚本をレビューします。

現在の都市読み込みはミラノ前提です。別都市の実装には、後述の都市選択・進行・セーブなどの対応が必要です。

### 関係の空気を会話へ反映する

新しい確率リアクション付き恋愛Inkは `relationship_tone`、`relationship_tone_before`、`relationship_tone_after` を文字列変数として宣言します。使用できる値は `reserved`、`strained`、`comfortable`、`guarded_attraction`、`warm`、`romantic_tension` です。冒頭では `relationship_tone`、選択の反応では `romance_result` と `relationship_tone_after` を使えます。数値や閾値をInkに書かず、共通本文を中心に少数の違いを作ります。旧Inkはそのまま残し、`legacyStoryIds` に登録して進行中セーブの指紋を維持します。内容検証で分岐とIDを確認し、文章と人物らしさは人間がレビューしてください。

### 通常デートのデータ

`date.json` の `id`、`chapterId`、`titleJa`、`descriptionJa`、`storyId`、`backgroundAssetId` はイベント、章、表示文、脚本、背景です。`kind` は通常なら `normal`。`apCost`、`minRomanceStage`、`minAffection`、`requiredCompletedChapters` は開始条件で、`destinationId`・`requiredCompletedEpisodeIds`・`requiredCompletedCityIds` は必要な場合のみ。通常デートの `requiredPlayedDateIds` は空配列とし、他のデートを必須にしません。期間限定イベントには `forbiddenCompletedEpisodeIds` で終了条件を指定でき、`eventLabelJa` で「今だけの出来事」などの種別を表示できます。`repeatable` は再挑戦可否で、通常デートは `false`、告白は再挑戦のため `true` にします。`rewardOnlyOnce` は旧版で再鑑賞を開始済みのセーブを含む効果の重複防止、`needsDeferred` は告白保留後の条件、`choiceCount` / `effectCount` は各経路の選択・効果回数です。旧途中セーブに使用する `legacyStoryIds` は元のInkを残し、変更しないでください。

`effect_catalog.json` の各 `id` と任意の `memoryId` はInkの `# effect:` に対応します。告白を除く恋愛選択には `responseProfileId` を指定し、`content/romance/response_profiles.json` のリスク特性から選びます。固定の `affectionDelta`・`trustDelta`・`sparkDelta` と `stageDeltas` は旧途中セーブの互換用であり、新しい確率効果には重ねません。台詞と選択の性格に合うプロフィールを選び、全段階をレビューしてください。思い出は `presentation.json` の `memories` に同じIDと `titleJa` / `descriptionJa` を登録します。Stage・告白条件は `progression.json` で管理し、特定デートIDを条件にしません。

Inkの `VAR player_name` / `heroine_name` / `player_address` は設定名を受け取ります。`# speaker: narrator` / `heroine` / `player` / `enemy`、`# background: 登録済みID`、`# emotion: 登録済みID` を使い、本文を日本語で書きます。デートの `* [選択肢]` と各分岐直後の `# effect: 登録済みID`、`->` の合流例は `date.ink` を参照。通常デートは3択を2回、各選択直後・最初の発話の前に対応する `# effect:` を1つ置きます。Inkで `romance_result` と `affection_delta`・`trust_delta`・`spark_delta` を宣言し、`romance_result` の positive と negative それぞれで異なる人物らしい反応を書きます。確率計算と乱数はInkに書きません。告白は確定的な別契約です。案内とバトルには恋愛effectを置きません。バトルInkは `battle_scene`、`answer_correct`、`battle_score` で分岐し、各場面を `-> END` で閉じます。特殊戦の主張・追及・証拠成功／失敗の例もB/CのInkにあります。

会話中の無言リアクションは、通常はInkの `# reaction:` で指定します。既存の `content/presentation/dialogue-reactions.json` は、公開済みの脚本を変えずに演出を付けた旧指定として維持します。外部指定では固定台詞の完全一致が必要で、変数を含む行には指定できません。脚本を更新した場合、参照先の消えた旧指定は検証時に警告されます。

漫符IDは `question`、`exclamation`、`interrobang`、`anger`、`sweat`、`blush`、`gloom`、`dizzy`、`music`、`heart`、`sparkle`、`sleep`、`sigh` です。`exasperated` は呆れの表情で、画像が未登録の衣装では同じ衣装の `neutral` を使います。演出は対象人物が表示されている間だけ現れ、ゲームの進行や保存には影響しません。台詞ごとに機械的に付けず、必要な瞬間を選んでください。

順不同のデートで過去の出来事を参照する場合、Inkで `EXTERNAL has_memory(memory_id)` を宣言し、`has_memory("登録済みmemoryId")` を使います。引数は固定の登録済みIDだけで、任意コードを実行せず状態も変更しません。基本本文は思い出がなくても成立させ、`validationContexts` の `memoryIds` で思い出あり・なしの両方を検証します。`romance_stage` と `ending_reached` に応じた反応、告白の `confession_result` も各文脈を登録してください。旧 `has_cafe_memory` は互換性のため残しています。

## 章・都市と報酬

### 道中の交流

現在の小さなミラノの寄り道は `content/encounters/catalog.json` と `content/stories/encounters/` で管理します。カタログには安定した交流・選択・品物ID、観光地、必要な費用や条件、実際に確認した出典を記録し、選択肢の英文と任意の訳はInkに書きます。各品物にも `cityId` を付け、入手・所持条件・贈与・使用・Inkからの参照を同じ都市の交流に限ります。入手都市のクリア後も使える機会を設けてください。価格や展示・人物はゲーム内の設定です。旅の予算、品物、APは別に扱い、購入しなくてもメインの観光と恋愛を続けられるようにします。

旅行予算とAP・保留APは都市別に初期化しない共通残高です。将来、都市からの出発を実装する際には、その都市の未使用品を持ち越せないようにし、過去の入手・贈与・使用や交流の履歴、思い出・関係値は保護します。現在は出発処理がないため、都市クリア時に品物を消しません。将来の実装では、保存形式と品物・報酬の整合性検証も合わせて対応してください。

交流Inkは名前変数を宣言し、JSONと同順・同文の英語3択を一度置きます。選択後の日本語の会話はどの枝も完走させ、効果や残高操作をInkに書きません。正誤のない返答と、正解がある任意の文化クイズを区別します。小さな観光クイズは既存の問題スキーマを使い、事実・伝承・創作を混同せず出典の該当箇所を確認してください。クイズの賞品と当落後のInk、アイテムの贈与・使用、既存報酬と共有するAPの条件はカタログで参照します。

交流Inkから以前の品物を参照する場合は `EXTERNAL has_item_status(id, status)` を宣言し、例えば `has_item_status("galleria_souvenir", "gifted")` のように登録済みIDと `held`・`gifted`・`used` の固定文字列を使います。状態の変更はゲーム側だけが行います。この参照は現時点では道中交流のInkで使用できます。`npm run content:check` は重複ID、参照、選択肢と分岐、出典の形式、アイテム参照を検証します。既存の戦闘・デートInkを改稿する場合には、途中セーブとの互換性を別途確認してください。

`city.json` の `id`、`countryCode`、`nameJa`、`themeJa`、`landmarkIdsPlanned`、`productionStatus` は都市と場所の識別、表示、予定と状態。`firstClearReward` は既存セーブ互換の `rewardSourceId` と `ap` です。`journey.json` の `entryEpisodeId` は最初のエピソード、`episodes` は順路、`rewards` は一度限りの報酬です。各エピソードの `id`、`kind`、`cityId`、`landmarkId`、`battleId`、`legacyChapterId`、`requiredEpisodeIds`、`titleJa` / `descriptionJa` / `clearTitleJa` / `clearDescriptionJa` は識別・参照・順序・表示文。都市フィナーレは `kind: "city_finale"`、`landmarkId: null` と `epilogueStoryId` を指定します。

報酬の `id`、`episodeId`、`trigger`、`ap`、`minScore`、`titleJa` は安定ID、対象、発生条件、付与量、得点条件、表示文です。`trigger` は `guide_read` / `battle_complete` / `battle_score` / `episode_clear` / `city_clear`。`minScore` は `battle_score` のみ正の数、それ以外は `null`。AP上限や報酬IDの重複防止はゲームルール側で処理します。

現行の読み込み・進行はミラノ1都市を前提としており、都市JSONを増やすだけで第2都市が自動的に遊べるわけではありません。現在の `src/content/` と `scripts/journey-validation.ts` の都市選択・順路検証、進行とセーブ移行、画面の都市選択を将来対応する必要があります。詳細な追加手順と制約は [将来の都市追加](FUTURE_CITIES.md) を参照してください。新都市はPhase 9以降に扱い、この段階では実装しません。

## 確認と公開前レビュー

`npm ci` の後、1ファイルを編集中に確認する例です。形式の推測が難しい雛形や下書きは `--type` を指定します。バトルの例は複数項目を含むカタログ形式なので `battle-catalog` です。

```sh
npm run content:inspect -- --type quiz authoring/templates/quiz.json
npm run content:inspect -- --type battle-catalog authoring/templates/battle_b.json
npm run content:inspect -- authoring/templates/date.ink
```

単体検証はJSONの構文・指定形式とInkのコンパイルを調べます。参照先、Inkタグ、分岐の全文脈は単体では検証しません。正式データへ登録したら `npm run content:inspect -- --all` で全コンテンツの構造・参照を検査します。このコマンドは生成ファイルを書き換えません。`npm run content:check` も同じ全体検証を行い、ゲーム用のコンテンツを生成します。`npm run content:compat` は既知の旧セーブ例での互換性テストです。あらゆる実ユーザーの途中データとの互換性を保証するものではありません。

続けて `npm run typecheck`、`npm test`、`npm run build`、必要な `npm run test:e2e` を実行します。検証の詳細はREADMEを参照してください。失敗したらエラーで示されたファイル、ID、フィールドを直して再実行します。Inkやクイズの途中再開は内容の指紋を使うため、公開後の改稿時は既存セーブへの影響を確認し、実データを削除しないでください。

自動検証に加え、編集者が次を確認します。

- 事実と解釈・伝説が混ざっていないか、出典URLを実際に確認したか。
- 写真のライセンス・改変条件・クレジットが対象画像に合っているか。
- 英文が自然で、選択肢に唯一の正解があり、正解の長さや事前会話で答えが露見しないか。
- 敵の価値観が会話を通じて動き、ヒロインに自分の意思があるか。短く読みやすいか。
- スマートフォンで文章・画像・操作が読みやすいか。観察なしでも進めるか。
- 公開済みID、報酬、セーブ途中のInk・クイズ互換性を不用意に変えていないか。

検証は構造や参照の誤りを見つけますが、面白さ・史実・自然な英語・画像の権利を保証するものではありません。人間が書いた場合もAIが補助した場合も、同じ確認を行います。
