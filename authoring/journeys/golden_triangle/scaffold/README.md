# ゴールデントライアングル編の制作補助

このツールは、既存の旅行地点と検証済み観察カードを正本として、公開時に必要なカタログの機械的な部分を組み立てる。脚本、クイズ、人物、根拠や回答は作らない。未制作都市を公開可能にする操作でもない。

現在はデリー・アーグラ・ジャイプールの3都市を登録済み。今の場面・クイズ・デートの数は [JOURNEY_AUTHORING](../../../JOURNEY_AUTHORING.md) の冒頭にある。初期登録のときの構成（脚本48本・クイズ51問・デート18件・都市フィナーレ3件）は [制作記録](../drafts/scenario/README.md)。以後のInkの正本は `content/journeys/golden_triangle/stories/`、クイズは `content/journeys/golden_triangle/quizzes/`、定義は同じフォルダの各カタログ。下記は初期登録の手順であり、保存してある `narrative.json` を更新しても登録済み都市へ自動同期はしない。登録状態の `available` とWebサイトへのデプロイは別。

## 都市ごとの制作

1. `npm run india:scaffold -- --requirements --city delhi` で、デリーの観光4件、デート6件、フィナーレの固定IDと入力雛形を見る。`agra`、`jaipur` も同様。`--city` を省くと3都市分を表示する。
2. 出力の `narrativeTemplate` 部分を別のJSONに保存し、各 `null` を実際の脚本の題名・紹介・クリア時の文・登場人物の情報・デートの思い出に置き換える。フィナーレの `placeId` はその都市の登録済みイベント地点から選び、`activityMinutes` は所要時間を入力する。その地点の入場料は既存イベントから引き継ぐ。入力JSONには雛形以外の `requirements` は含めない。
3. `requirements` に列挙された Ink の案内・対決・デート・エピローグとクイズを作成する。命名、タグ、クイズ形式は [CONTENT_GUIDE](../../../CONTENT_GUIDE.md) と見本の編（`authoring/templates/sample_trip/`）に従う。Inkは場所のファイルの knot に書き、デートの2回の選択の選択肢それぞれに、選択内容に合う反応特性を `# profile:` で書く（場所のファイルのデートに `# effect:` は書けない。一覧の `effectIds` は `journey:release` が登録する反応のIDで、作者は書かない）。思い出は `# memory:`（一覧の `memoryId`）で記録する。クイズの一部として、各問題と選択肢の日本語訳を別JSONに用意する。形式は `{ "schemaVersion": 1, "questions": { "問題ID": { "questionJa": "問題の日本語訳", "optionsJa": { "A": "選択肢Aの訳", "B": "選択肢Bの訳", "C": "選択肢Cの訳" } } } }`。英文の原文は昇格ゲートが実際のクイズから生成し、IDや既存訳との衝突を検証する。
4. `npm run india:scaffold -- --fragments path/to/narrative.json --city delhi` で生成される内容を確認する。このコマンドは標準出力のみで、ファイルや本番データを書き換えない。`--city` を省略した場合は3都市すべての脚本メタデータが必要。
5. `npm run india:release -- --check --through delhi --narrative path/to/narrative.json --translations path/to/translations.json` で、生成物を既存データに統合した状態を一時領域で検証する。カタログへの反映には `--apply` を使う。初期登録はデリー、アーグラ、ジャイプールの順に行う。たとえばデリーまで登録した段階なら `--through agra` に必要なメタデータと訳は未登録のアーグラ分だけでよい。登録済みの都市は再生成されない。

都市ごとに、主観光の各IDは既存の旅行イベントID、地点IDは観察地点IDに一致する。デートIDは旅行イベントID、背景と目的地は登録済みの地点から取得する。通常の対決報酬と都市クリア報酬、観察カード、思い出と各選択の反応IDは自動生成される。フィナーレは同都市の4観光の完了を必要とし、観光の順番は強制しない。デートはその都市のいずれかの主観光を1件完了した後に利用できる。

観察素材の出典が未確認の場合、または参照画像のハッシュが生成時から変わっている場合は生成を拒否する。画像を差し替えたときは観察位置と出典を再確認し、`scripts/journeys/golden_triangle/prepare-india-observations.ts` の検証（`npm run india:check` に含まれる）に通すこと。

特殊戦B・Cを追加するときは、実在場所のどこを主舞台にするか、どの資料を証拠とし何を尋ねるかを脚本とクイズの制作時に決める。現在の生成器はこの未決定部分を推測して登録しない。特殊戦のカタログとInkは既存の `authoring/CONTENT_GUIDE.md` およびミラノの例に沿って別途制作・検証する。
