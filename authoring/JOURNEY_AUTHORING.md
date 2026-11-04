# 旅行編へシナリオとクイズを取り込む

都市の地点・旅行データ・背景・観察資料が用意された旅行編に、脚本とクイズを追加する手順です。インド編とウズベキスタン編は同じ生成・検査・反映処理を使います。都市数や都市の順序は `content/journeys/catalog.json` に従います。

## 編集するもの

- 都市の施設・営業時間のゲーム設定・料金・交通・写真・出典：既存の [city:bundle](CITY_BUNDLES.md) で都市単位に編集。
- 旅行編全体の通貨・開始予算・都市順・都市クリア報酬：`content/journeys/catalog.json`。
- 写真に対応する観察ポイント：各旅行編の `authoring/drafts/<旅行編>/observation-cards.json`。画像変更時には実画像を確認し、領域とSHA-256を更新。
- シナリオ：Ink、紹介・クリア文・登場人物・思い出のメタデータJSON。
- クイズ：既存スキーマのクイズJSONと問題・選択肢の和訳JSON。

機械的なエピソード・対決・報酬・デート条件・反応ID・思い出IDの登録は生成器が行います。人物、質問、解答、根拠となる新しい事実を自動で創作するものではありません。

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

`requirements` の `narrativeTemplate` 部分を別のJSONへ保存し、各 `null` を実際の脚本メタデータに置き換えます。Inkとクイズは指定のIDで `content/stories/`、`content/quizzes/` に追加します。和訳の形式は [インド編の制作手順](india-scaffold/README.md) と共通です。脚本の命名・タグ・クイズの内容規約は [CONTENT_GUIDE](CONTENT_GUIDE.md) に従ってください。

通常対決は3問、都市フィナーレは5問、通常デートは2回の3択を使います。観察の根拠と `factId` は各旅行編の `observation-cards.json`、場所・画像・出典は都市の編集用JSONから確認できます。問題や恋愛の台詞はこれらの資料を参考に制作し、検証用の仮文を本番の脚本に混ぜないでください。

`--check` の成功後に `--apply` で関連カタログへ反映できます。これはGitへのコミット・プッシュやサイトのデプロイではありません。後続都市を先に公開することはできず、既公開都市を保持して次都市まで順番に反映します。未制作脚本、クイズ・和訳の欠落、都市所属不一致、画像差替え、途中の編集競合がある場合は反映を拒否します。

通常観光は順不同で訪問でき、案内初読了・初完了・初好成績・エピソードクリアが各1APです。フィナーレは同じ都市の主観光を参照し、都市クリア報酬は旅行編の設定を使います。特殊戦B/Cの場所・証拠・対戦人物は脚本とクイズの制作時に決め、ミラノの既存形式で追加してください。

インド編には `--journey golden_triangle` を指定します。従来の `india:scaffold`、`india:readiness`、`india:release` も使えます。
