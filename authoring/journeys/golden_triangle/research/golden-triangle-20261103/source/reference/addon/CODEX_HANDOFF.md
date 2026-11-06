# Codex向け — 元ZIPを改変しない追補取り込み指示

対象の元データ: `GOLDEN_TRIANGLE_RESEARCH`（元ZIP）。追補: 本フォルダ `GOLDEN_TRIANGLE_ADDON`。

**今回は既存ゲームに自動実装しない。** IDと出典付で照合・確認する。新規シナリオ/デート/戦闘の生成は含まない。

| 基礎ファイル | 追補ファイル | 突合・処理 |
|---|---|---|
| data/ALL_LOCATIONS.json | ENTRY_ANCHORS.csv, GATE_CANDIDATES.csv | placeIdで対応。実ゲートの緯度経度が確定していない限り実ルーティングへ流さない。 |
| data/WALK_ROUTES.csv | WALK_ROUTES_PROTOTYPE.csv | fromPlaceId+toPlaceIdに対応。prototype値は試作用だけ。本番では元ZIPのOSM再計算手順で実経路を作る。 |
| data/LOCAL_TRANSPORT.csv | LOCAL_TRANSPORT_OVERLAY_19.csv, LOCAL_FARE_PRODUCTS.csv, JAIPUR_METRO_OD_FARES.csv, AGRA_METRO_OD_FARES.csv | 元19行に行番号+cityId+serviceで紐づけ。モード追加時は既存スキーマと互換確認。 |
| data/INTERCITY_TRANSPORT.csv | INTERCITY_TRANSPORT_OVERLAY_9.csv | idで突合。各行 fareStatus を伝播させ仮の費用で決済を行わない。 |
| data/OPENING_HOURS.csv | OPENING_HOURS_OVERLAY_33.csv | placeIdで重複・公式競合を解決。OFFICIAL_CONFLICTの営業時間は未確定として扱う。 |
| data/ENTRANCE_FEES.csv | ENTRANCE_FEES_OVERLAY.csv | placeId+visitorClass+券種で追加。0 と空欄は厳格に区別、国籍別金額を間違えない。 |
| data/ACCESS_AND_PHOTO_RESTRICTIONS.csv | ACCESS_AND_PHOTO_OVERLAY_33.csv | 各施設固有の規制を追加。UNKNOWN は許可ではない。 |
| data/IMAGE_ASSETS.csv | WIKIMEDIA_ASSET_DOWNLOAD_MANIFEST.csv | カスタム assetId の候補情報のみ。実バイナリ未収録、取得後ライセンス再照合。 |
| data/BUDGET_PROPOSALS.json | ACCOMMODATION_PRICE_EXAMPLES.csv, GAME_LODGING_SCENARIOS_NOT_DECIDED.csv | real quote vs scenario 別管理。初期所持金の確定は今回行わない。 |

必ず `python GOLDEN_TRIANGLE_ADDON/scripts/validate_addon.py` を先に実行。

強制禁止: `sourceGrade=secondary`から「確定済」推論、メーター料金をアプリ配車料金として反映、外国人チケット料金不明を0に補完、直線距離を徒歩道路距離として使う、川/湖を直線横断、Commons画像を無断転載すること。
