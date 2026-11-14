# ゴールデントライアングル編「三分間の旅」

> **旧稿です。** 2026-11-07にインド編の脚本・クイズを「言わなかった言葉」へ全面改稿しました。現行の設計は[インド編改稿の設計](../SCENARIO_REWRITE.md)、本文は `content/journeys/golden_triangle/` のInkとクイズが正本です。以下は旧稿「三分間の旅」の制作記録として残しています。

デリー、アーグラ、ジャイプールを巡る二人が、旅先で誘われた小さな上映会に向けて、三分間の旅行映像を作る。主人公の台詞はデート選択肢に限り、ヒロイン、街の人々、ナレーションで進める。

2026-11-04の全面改稿は[改稿記録](REWRITE.md)を参照。以下の収録・進行の契約を保ち、出会いとデート、撮影から上映までの出来事を改稿した。都市別 `narrative.json`・`quiz-hooks.json` 等は初期登録当時の制作記録であり、改稿後の人物紹介やあらすじを再生成する入力には使わない。最新の文章は本番Inkと対応するカタログが正本。

## 三都市の物語

| 都市 | 本編の動き | ボスと結末 |
| --- | --- | --- |
| デリー | 到着時から撮影を試し、塔を追い越した空と笑い声が残る。盤面に執着するターラー、完成品にこだわる電器店員など、異なる目的の人と出会う。 | ニールとの字幕の確認を経て、ヒロインが三分の作品を作ると決める。上映会を知るのはこの時点。 |
| アーグラ | 菓子店主の行き違い、学生の反論、仕立て屋の休日などを経験する。実際に歩いて撮った数秒を、サナの整った編集案と比べて迷う。 | サナの案の良さを認めながら、歩く場面を残す。好みの不一致を解消せず、作品を見せ合う関係を続ける。 |
| ジャイプール | 撮影を断られた会話、切る場面、並べ方、声を入れる迷いを描く。 | ラヴィとの字幕の確認から小さな上映会へ。三都市の映像と、観客が気に入った予想外の瞬間が、旅を話すきっかけになる。 |

上映会、登場する現代の人物、出会いは創作。実在の公式催事ではない。動画は脚本内の描写であり、撮影アプリや動画ファイルの提出をプレイヤーに要求しない。

## 収録と進行

- 51本のInk：到着会話3、観光案内12、通常戦12、通常デート18、都市ボス3、都市エピローグ3。
- 英語クイズ51問：通常戦36問、都市ボス15問。日本語対訳、ヒント、解説、語義、出典付き。
- 各都市の開始時に短い都市ロゴと到着会話を表示。デリーは旅の始まり、アーグラは到着の喜び、ジャイプールは最後の街への期待を描く。数値や時刻は変わらず、ロゴ完了・会話途中の保存と再開に対応する。
- 都市内の観光順は自由。任意の主観光1件を終えるとその都市の6件のデートが選べる。デートは本編や次都市への進行条件にしない。
- 主観光4件を完了すると都市ボスが開く。結果を確認し、エピローグを読み終えるとデリー→アーグラ→ジャイプールへ自動移動する。最終都市はエピローグ後も滞在できる。
- 既存の観光完了規則に従い、クイズが低得点でも物語は止まらない。高成績のAP報酬は別に判定する。
- 名前、関係、予算、AP、思い出、履歴を都市間で維持する。都市移動の手動経路、料金、所要時間を追加しない。
- 新規ゲームはミラノと別の保存領域から始める。専用の街の人物立ち絵は未制作のため、既存の抽象表示を使う。

## 編集元

公開用データへの取り込み後、Inkの正本は旅行編フォルダの `content/journeys/golden_triangle/stories/` だけに置く。このフォルダの `narrative.json`、都市別メタデータ、対訳・語義fragment、quiz-hooksは初期登録と編集確認の記録であり、並行更新する本番データではない。

| 内容 | 正本 |
| --- | --- |
| 到着会話 | `content/journeys/golden_triangle/stories/places/gt_{delhi,agra,jaipur}_hotel_hub.ink` の knot `gt_<都市>_arrival`（都市定義の `arrivalStoryId` から参照） |
| 案内 | `content/journeys/golden_triangle/stories/places/gt_<観光地>.ink` の knot `gt_<観光地>_guide`（`tourism/catalog.json` の `guideStoryId` から参照） |
| 通常戦・ボス | `content/journeys/golden_triangle/stories/places/gt_<観光地>.ink` の knot（バトルID。都市フィナーレは会場の観光地のファイル：レッド・フォート、タージ・マハル、ハワー・マハル。`battles/catalog.json` の `storyId` から参照） |
| デート | `content/journeys/golden_triangle/stories/places/gt_<都市>_<行き先>.ink` の knot（デートID）。宿の屋上の告白・「待って」の後（ジャイプールは彼女の返事も）は `places/gt_<都市>_hotel_hub_dates.ink`（`romance/date_catalog.json` の `storyId` から参照） |
| 都市の締め | `content/journeys/golden_triangle/stories/places/gt_{delhi,agra,jaipur}_hotel_hub.ink` の knot `gt_<都市>_epilogue`（フィナーレの `epilogueStoryId` から参照） |
| 差し込みの場面（宿の夜と朝、デリーの出発、アーグラの到着、ジャイプールのフィナーレの前後、インド門のデートの後） | `content/journeys/golden_triangle/stories/places/gt_{delhi,agra,jaipur}_inserts.ink` の knot（時点は頭の `# at:`・`# priority:`）。土地の事実を言う場面の出典は `content/journeys/golden_triangle/scenes/catalog.json`、ほかは `# sources: none` |
| ファテープル・シークリーの日帰りツアー | 行程は `content/journeys/golden_triangle/tours/gt_agra_tour_fatehpur_sikri.json`、行程の場面（区間の語り・車の中の交流・前後の会話）は `content/journeys/golden_triangle/stories/places/gt_agra_tour_fatehpur_sikri.ink` の knot |
| クイズ | `content/journeys/golden_triangle/quizzes/gt_*_quiz.json` |
| 対訳・語義 | `content/journeys/golden_triangle/learning/translations.json`、語義はインド編だけで使う語を `content/journeys/golden_triangle/learning/word-meanings.json`、ほかの旅行編とも使う語を共通の `content/learning/word-meanings.json` |
| 旅行・画像・地点・出典 | 既存の都市bundleおよび `content/journeys/golden_triangle/` の都市・移動・各カタログ（画像は `content/journeys/golden_triangle/public/assets/tourism/india/`）。編集手順は `authoring/CITY_BUNDLES.md` |

## 検証

```sh
npm run journey:scenario -- --journey golden_triangle --directory authoring/journeys/golden_triangle/drafts/scenario
npm run journey:readiness -- --journey golden_triangle
npm run verify
npm run test:e2e
```

1行目は、2026-11-14 には `--city delhi` を付けたときだけ通る。アーグラとジャイプールの `narrative.json`（都市別とまとめたもの）は、2026-11-07 の改稿でフィナーレの会場を移す前の `placeId`（`agra_agra_fort`・`jaipur_jantar_mantar`）のままなので、計画の knot が公開済みの場所のファイルに見つからず、「下書きの Ink ファイルが要るものと合いません」で止まる。

脚本検査は、案内・バトル・デート・エピローグがどれも場所のファイルの knot なので公開済みとして数え（結果の `placeKnots`）、この検査では読み直さない。その選択肢と関係の分岐、通常戦・都市ボスの正誤と得点、エピローグは `content:build` が場面として通しで確かめる。到着会話3本の効果・選択肢・背景所属と、公開判定も既存コンテンツ検査で行う。

執筆担当とは別のエージェントによる編集レビューでは、6本のボス・エピローグ、18デートの全選択枝、クイズと台詞の対応を通読。都市間の人物紹介、未選択の台詞への依存、同名の別人物、撮影禁止区域の扱い、川の対岸と正面の取り違え、似た導入の重複を修正した。登場人物の意見や恋愛の好みは史実やクイズの正解と区別する。

以下は初期制作時の検証記録であり、全面改稿後の結果は [REWRITE.md](REWRITE.md) に記載する。

初期制作時（2026-11-04）の実装確認では、コンテンツ検査・型検査・本番ビルド、旅行編の公開条件と調査データ検査を通過。脚本検査では249通りの戦闘、31,104通りのデート、24通りの都市エピローグを検証した。全体単体テストは1,030件成功し、到着会話追加で古くなった3件の期待値・フィクスチャを修正して対象の再実行も成功した（計1,033件）。全体の `verify` コマンド自体は修正前の失敗で終了したため、その後に対象テストと本番ビルドを個別実行した。

モバイルE2Eは31件を確認済み（30件成功後、到着会話を読まずに移動メニューを待っていた既存テストを修正し、該当ファイル3件を再実行して成功）。実際の新規ゲームからインド3都市の15戦闘・各都市1デート・エピローグ・自動移動を通し、到着会話とクイズの途中再開、ミラノの全観光・特殊戦・フィナーレ、独立セーブ・別タブ保護、ウズベキスタンの準備画面、都市内交通・Debugを含む。320pxと360pxの表示も確認した。
