# 統合変更履歴（2026-11-03）

## 変更した既存データ

| ファイル | 実際の変更 |
|---|---|
| data/ALL_LOCATIONS.json と各 *_LOCATIONS.csv | 33地点の試作ルート座標・由来・入口未確認を追加。verified門の偽装なし。 |
| data/WALK_ROUTES.csv | 同地点21件0分、102件は試作徒歩分、橋不明24件は歩行禁止。 |
| data/LOCAL_TRANSPORT.csv | 19行を公定/報道運賃帯/未検証で明確化、2人合計の列を追加。 |
| data/INTERCITY_TRANSPORT.csv | 9行の予算/所要時間を追加。すべて試算で予約実績なし。 |
| data/OPENING_HOURS.csv | 33地点のゲーム適用枠を選定し、公式実際時刻と誤認しない状態へ。元の多重掲載は別表へ保管。 |
| data/ENTRANCE_FEES.csv | 追加25行を重複排除して統合。元の価格不明7行は「ゲーム用仮金額」と明記して置換。 |
| data/ACCESS_AND_PHOTO_RESTRICTIONS.csv | 詳細39行の規制を保持し、写真からゲーム利用許諾を推定しないルールを追加。 |
| data/IMAGE_ASSETS.csv | 30観光地のCommons候補へ連結。写真ファイルなし/権利チェック必須。 |
| data/BUDGET_PROPOSALS.json | 2人合計ゲーム予算30,000ルピー、宿泊費ゲーム内0を正式な編集上の選択に。 |
| cities/*.json | 都市名見出し、クリア時4AP、メイン観光4地点を設計。依然prototype。 |
| travel/*.json | 座標・営業時間・徒歩/タクシー・イベント骨組みを入力。背景とscripts未接続。 |
| travel/*-settings.json | デリーのみ初期資金、各都市の宿泊無料、再挑戦時間を明記。 |

## 追加した実用表

- data/TAXI_ROUTES_GAME_MODEL.csv — 330件（乗車手段の概算・2人分）
- data/GAME_ENTRANCE_COSTS.csv — 外国人2名のゲーム採用30料金（任意主廟料金は別列）
- data/GAME_POLICY.json — セーブ分離、日付・金銭・AP・都市移動の編集仕様
- data/EVENT_BLUEPRINTS.csv — 主12・デート18の骨組み
- data/OPENING_HOURS_HISTORICAL_AND_CONFLICTS.csv — 差し替え前の出典別時刻
- data/SPECIAL_OPENING_EVENTS.csv — 夜間タージ鑑賞など例外で通常営業時間と別
- data/ENTRY_ANCHORS.csv、data/GATE_CANDIDATES.csv — ゲート候補と未検証の品質表示
- data/AGRA_METRO_OD_FARES.csv(36)、data/JAIPUR_METRO_OD_FARES.csv(121)、data/DELHI_METRO_FARE_BANDS.csv
- data/ACCOMMODATION_PRICE_EXAMPLES.csv — 現地宿の実例。ゲーム内0円設定とは別。
- data/IMAGE_DOWNLOAD_MANIFEST.csv、data/BACKGROUND_ASSET_PLAN.csv — 画像の取得候補と仮背景ID。
- maps/*schematic_links_DO_NOT_USE_FOR_STREETS.geojson — 幾何プレビューのみ。道路GeoJSONは原本同様空。

## 品質管理

`original_data/` や `reference/addon/` は監査用で、本番の取り込み元は `data/` / `cities/` / `travel/`。
数値の「ゲームモデル」は**現地での観光ルート・運賃・営業時間の事実を証明しない**。

