# ゴールデントライアングル編 制作用ドラフト

ミラノと同じ `citySchema`、`travelCatalogSchema`、`travelSettingsSchema` の形に揃えた研究資料由来の生成ドラフトです。ゲームはこのディレクトリを読み込みません。現在の都市・地点・移動データの正本は `content/journeys/golden_triangle/cities/` と `content/journeys/golden_triangle/travel/` です。ドラフトには後から追加された徒歩のゲーム推定や入場料などがないため、そのまま `content/` に上書きしないでください。

各都市は `cities/<都市ID>.json`、`travel/<都市ID>.json`、`travel/<都市ID>-settings.json` に対応し、生成時の内容と警告は `manifest.json` にあります。都市名と順序、開始資金（今は ₹3,000,000。2026-11-09 のユーザー判断で、最後のバランス調整で本来の額を決めるまでの仮の額にし、遊んでいてお金が足りなくならないようにした。それまでは ₹30,000）、無料宿泊、各都市の都市クリア4APは `content/journeys/golden_triangle/manifest.json`（旧 `content/journeys/catalog.json`）を正とします。デリー以外の `initialBudget: 0` は都市間で追加支給しない意味です。既存の出発処理は前都市の残金を引き継ぎます。

この研究由来の生成ドラフトには各都市にメイン観光4件・デート6件の**候補**があります。その後、3都市のInk・戦闘・クイズ・デート・フィナーレを `content/` に登録しました。現行の脚本の設計は [インド編改稿の設計](SCENARIO_REWRITE.md)、旧稿の構成・編集記録は [scenario/README](scenario/README.md) を参照してください。ここに残る都市・旅行の生成ドラフトは現在のプレイ内容を表さず、完成版へ上書きしてはいけません。

`firstClearReward` は現行スキーマに必要な初回クリア報酬（`episode_clear`）の欄で、未決定を示すため仮ID `gt_<都市ID>_first_clear`（v14で `<都市ID>_legacy_episode_placeholder` から改名）と0 APを置いています。これは初回報酬の決定ではありません。各都市のクリア4APは別途、都市フィナーレの `city_clear` に一意な報酬IDで登録します。

## 座標・時間・料金

- 地点の座標は調査台帳の代表点で、検証済みの入口座標ではありません。住所・ゲート・駅出口や通行可能な道を示すものではありません。
- 施設の `openingWindows` は統合研究資料にある**ゲーム用の時間枠**です。現地営業時間ではありません。`content/` ではゲーム内の定休日を扱えますが、曜日ごとに異なる営業時間や祝日・特別営業時間は未実装です。ゲーム内の行動上限は21:00のままです。
- 異地点間の徒歩は、歩道と橋の通行確認が未完了のため出力していません。同一地点の0分は、移動を伴わないゲーム内操作を表すだけです。
- タクシーの時間と料金は2人用のゲーム推定値です。実際の配車時間・経路・運賃ではありません。`sources` は推定を `hypothesis` として区別しています。
- このドラフトの画像IDは `content/` に登録済みの背景IDと対応します。写真の作者、ライセンス、加工内容は画像台帳で確認してください。

## 情報源と再生成

都市・地点・イベント候補とタクシー推定は[前回統合資料](../research/golden-triangle-20261103/README.md)、代表点とゲーム用時間枠は[全調査統合版](../research/golden-triangle-all-research-20261103/README.md)を使用しています。新たな追加調査は `authoring/journeys/golden_triangle/research/golden-triangle-followup-20261103/` も参照してください。原本は編集せず、追加調査と必要な制作判断を確認してから生成元を更新します。

追補 `venues.json`・`access.json` の各地点の出典は、主張と確認日を保ったまま対応する `places[].sources` に自動で引用します。同一の出典と主張は一度だけ載せ、同じURLの異なる主張は保持します。矛盾する情報や時限的な状況を `openingWindows`、座標、料金などのゲーム値へ自動適用するものではありません。追補の条件・確度を確認してから制作上の値を選んでください。

リポジトリのルートから、次のように構造と生成物の一致を検査できます。

```sh
npx tsx scripts/journeys/golden_triangle/prepare-india-draft.ts --check
```

生成元の変更を確認し、このディレクトリの生成JSONを置き換える場合は `npm run india:draft` を実行します。手編集した生成JSONは上書きされるため、変更は生成元とスクリプト側に反映してください。スキーマ検証は資料の真偽、背景画像の権利、本番コンテンツとの参照整合やゲームとしての完成を保証しません。
