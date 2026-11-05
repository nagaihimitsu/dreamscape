# 旅行編へシナリオとクイズを取り込む

都市の地点・旅行データ・背景・観察資料が用意された旅行編に、脚本とクイズを追加する手順です。インド編、ウズベキスタン編、ルアンパパーン編は同じ生成・検査・反映処理を使います。都市数や都市の順序は各旅行編の `content/journeys/<旅行編ID>/manifest.json` に従います。

インド3都市は脚本51本（到着会話3本を含む）・クイズ51問・デート18件・都市フィナーレ3件を登録済みです。[完成版の構成と制作記録](drafts/golden-triangle/scenario/README.md)を参照できます。登録済みInkは `content/journeys/golden_triangle/stories/` のみを編集し、クイズは同じフォルダの `quizzes/` と対訳、メタデータは対応するカタログを更新します。制作時の `narrative.json` は初期登録入力として残し、更新内容を自動同期する正本にはしません。以下の新規登録手順は、未制作のウズベキスタン編などにも利用できます。

## 編集するもの

- 都市の施設・営業時間のゲーム設定・料金・交通・写真・出典：既存の [city:bundle](CITY_BUNDLES.md) で都市単位に編集。
- 旅行編全体の通貨・開始予算・都市順・都市クリア報酬：`content/journeys/<旅行編ID>/manifest.json`。
- 制作ツールの設定（イベントIDの接頭辞、観察資料のファイル、画像フォルダ、交通判断台帳のフォルダ）：同じ `manifest.json` の `authoring`。`authoring` がない旅行編（ミラノ編）は、この生成・検査・反映ツールの対象外です。
- 写真に対応する観察ポイント：各旅行編の `authoring/drafts/<旅行編>/observation-cards.json`。画像変更時には実画像を確認し、領域とSHA-256を更新。
- シナリオ：Ink、紹介・クリア文・登場人物・思い出のメタデータJSON。
- クイズ：既存スキーマのクイズJSONと問題・選択肢の和訳JSON。

機械的なエピソード・対決・報酬・デート条件・反応ID・思い出IDの登録は生成器が行います。人物、質問、解答、根拠となる新しい事実を自動で創作するものではありません。

新しい対戦人物の専用立ち絵がない間は `portrait: "abstract"` を生成し、既存の抽象人物表示を使います。別人のミラノ用イラストは流用しません。専用画像を用意したら既存の `content/presentation/characters.json` の人物登録と `battleCharacters` で割り当てます。

## ウズベキスタン編の例

```sh
# 固定ID、Inkの置き場所、入力メタデータの雛形を表示
npm run journey:scaffold -- --requirements --journey uzbekistan

# タシュケントだけを制作する場合
npm run journey:scaffold -- --requirements --journey uzbekistan --city tashkent

# 不足している実ファイルと参照を確認（未制作時は未完了を報告）
npm run journey:readiness -- --journey uzbekistan

# 全地点間の交通採否と出典・経路の整合を検査
npm run journey:transit -- --journey uzbekistan

# 物語・クイズを用意した後、一時領域で実際の統合を検証
npm run journey:release -- --check --journey uzbekistan --through tashkent --narrative path/to/narrative.json --translations path/to/translations.json
```

`requirements` の `narrativeTemplate` 部分を別のJSONへ保存し、各 `null` を実際の脚本メタデータに置き換えます。Inkとクイズは指定のIDで旅行編フォルダの `content/journeys/<旅行編ID>/stories/`、`quizzes/` に追加します（ストーリーIDは `stories/` からの相対パス）。和訳の形式は [インド編の制作手順](india-scaffold/README.md) と共通です。脚本の命名・タグ・クイズの内容規約は [CONTENT_GUIDE](CONTENT_GUIDE.md) に従ってください。

通常対決は3問、都市フィナーレは5問、通常デートは2回の3択を使います。観察の根拠と `factId` は各旅行編の `observation-cards.json`、場所・画像・出典は都市の編集用JSONから確認できます。問題や恋愛の台詞はこれらの資料を参考に制作し、検証用の仮文を本番の脚本に混ぜないでください。

`--check` の成功後に `--apply` で関連カタログへ反映できます。反映先は旅行編の `manifest.json` と、その旅行編の都市ファイルがある層（`content/` または `content/journeys/<旅行編ID>/`）のカタログだけで、その層にまだないカタログや、既存のカタログにないキー（例：`memories`）は、追加する項目があるときだけ作られます。他の層にある同じIDの定義は内容が一致すれば再登録せず、異なれば反映を拒否します。これはGitへのコミット・プッシュやサイトのデプロイではありません。後続都市を先に公開することはできず、既公開都市を保持して次都市まで順番に反映します。未制作脚本、クイズ・和訳の欠落、都市所属不一致、画像差替え、途中の編集競合がある場合は反映を拒否します。

通常観光は順不同で訪問でき、案内初読了・初完了・初好成績・エピソードクリアが各1APです。フィナーレは同じ都市の主観光を参照し、都市クリア報酬は旅行編の設定を使います。特殊戦B/Cの場所・証拠・対戦人物は脚本とクイズの制作時に決め、ミラノの既存形式で追加してください。

インド編には `--journey golden_triangle` を指定します。従来の `india:scaffold`、`india:readiness`、`india:release` も使えます。

## クイズより先に脚本を制作する場合

未登録のInkを `content/journeys/<旅行編ID>/stories/` へ入れると、公開用の検証契約がないためビルドは失敗します。脚本だけを先に仕上げるときは `authoring/drafts/<旅行編>/scenario/<都市ID>/stories/` に、requirementsと同じ相対パスで保存します。各都市に `narrative.json`、scenario直下に各都市を結合した `narrative.json` を置きます。

```sh
npm run journey:scenario -- --journey golden_triangle --directory authoring/drafts/golden-triangle/scenario
# 制作途中では一都市だけでも確認できます
npm run journey:scenario -- --journey golden_triangle --directory authoring/drafts/golden-triangle/scenario --city delhi
```

この検査は既存のInkコンパイラ・案内・戦闘・デート・エピローグ検証を使い、ファイル対応、都市内の背景、デート固有の効果、3択の全経路、関係段階と反応、戦績別の場面を確認します。主人公の直接台詞は付けず、デートの選択肢でのみ返答する脚本を対象にします。仮クイズや公開カタログは作りません。成功は脚本の契約検証であり、公開準備完了を意味しません。

クイズ・和訳を用意したら、各都市の `stories/` の中身を `content/journeys/<旅行編ID>/stories/` へ**移動**し、既存の `journey:release --check` で実コンテンツ全体を検証します。以後のInkの正本は旅行編フォルダの `stories/` だけです。脚本検査も同じIDの本番ファイルを読み、draftと本番の両方にある場合は二重管理としてエラーにします。初期登録入力として残す `narrative.json` は公開後の自動同期元ではありません。公開後の定義変更は既存カタログ・都市bundleを編集します。旅の公開可否は引き続き既存の統合検証で判定します。

## 都市に到着したときの会話

都市定義 `content/journeys/<旅行編ID>/cities/<city>.json` の任意項目 `arrivalStoryId` に、`arrivals/<city>` のようなInkのIDを指定します。本文は同じ旅行編フォルダの `stories/arrivals/` に置きます。都市bundleにもこの参照は含まれます。登録された都市フィナーレと、その都市の背景が必要です。

主人公の台詞、選択肢、効果を含まない短いヒロインとナレーションの会話として検証します。旅行編の開始時と次都市への出発時に、都市名のロゴから会話へ進みます。通常のロードで再開以外の新規会話は始めません。既存の都市会話の保存処理を使い、関係値、AP、予算、時刻、思い出を変えません。

## ルアンパパーン編

`--journey luang_prabang` で同じ生成・検査コマンドを使えます。市街地の準備状況と交通・画像の根拠は[調査記録](research/luang-prabang-20261104/README.md)を参照してください。
