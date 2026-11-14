# インド編の完成確認と都市の公開

> **記録です。** インド編の3都市を初めて登録・公開したときの手順の控えです（2026-11-06 ごろ）。3都市は公開済みで（`status: "available"`、各都市 `complete`）、この後の手順は使いません。今の公開の手順は [新しい都市を1つ足す手引き](../../../NEW_CITY_GUIDE.md#手順23-公開する) と [JOURNEY_AUTHORING](../../../JOURNEY_AUTHORING.md) にあります。

観光・デート候補の一覧は `content/journeys/golden_triangle/travel/<都市ID>.json` が正本です。完成状況はこの一覧と既存の観光・バトル・クイズ・デート・画像・脚本カタログを照合して求めます。別の「完成済み」一覧を手で更新する必要はありません。

現在は3都市の脚本・クイズを登録済みです。[制作記録](scenario/README.md) と本番カタログを参照してください。以下の反映コマンドは都市の初期登録に使うもので、登録済み都市を制作時のメタデータから再生成する操作ではありません。`available` はビルド登録状態を示し、この作業だけでサイトに配信されることはありません。

```sh
npm run india:readiness
npm run india:readiness -- --json
```

一覧では各候補の脚本、バトル、クイズ、背景、観光・デートの行き先などの不足、都市のフィナーレや報酬の不足を示します。通常観光4件の順序は自由で、都市クリア報酬4APは初回観光の旧互換報酬とは別です。画像は実ファイルと出典台帳を確認します。架空のホテルは写真のない neutral 背景も使えます。観察カードの画像と位置、史実、文章表現の確認は自動検証を通っても制作上必要です。

シナリオ・クイズとその和訳を揃えた後、次のコマンドは既存地点と観察素材から技術的なカタログ定義を生成し、状態を変更せず一時コピーで本番と同じコンテンツ検証を行います。先頭から連続した都市単位で確認でき、未完成の後続都市を同時に公開する必要はありません。脚本メタデータと和訳JSONの形式は [制作補助](../scaffold/README.md) に記載しています。

```sh
npm run india:release -- --check --through delhi --narrative path/to/delhi.json --translations path/to/delhi-translations.json
npm run india:release -- --check --through agra --narrative path/to/agra.json --translations path/to/agra-translations.json
npm run india:release -- --check --through jaipur --narrative path/to/jaipur.json --translations path/to/jaipur-translations.json
```

公開が必要になった時は対応する `--check` を `--apply` に変更します。完全な参照確認と一時コピー上のコンテンツ検証に成功した場合だけ、生成したカタログと対象の都市・イベント、旅行編の状態をまとめて更新します。既存データに同じIDの異なる内容があれば上書きせず中止し、和訳の英文はクイズ本体から生成します。すでに公開済みの先行都市は再生成されません。検証中にコンテンツや画像が変われば中止し、書き込み途中のエラーでは更新済みファイルの復元を試みます。復元も失敗した場合は対象を表示するため、バージョン管理から復旧してください。実際の配信や Git へのプッシュは行いません。

`--through` の省略時は3都市すべてが対象です。インド編は、各都市のクリア後にエピローグを読み終えると、次の公開済み都市へ自動移行する方針です。後続都市が prototype の間や最終都市では現在の都市に滞在します。都市間の地図・交通手段は設けません。
