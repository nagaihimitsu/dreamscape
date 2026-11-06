# Codex 引継ぎ／未確定事項を埋めないこと

## 正本の場所
- 入口／アクセス：`canonical/01_PLACES_AND_ACCESS_33.csv`, `04_GATE_AND_TRANSFER_NODES_18.csv`, `05_ACCESS_OPERATION_FACTS_16.csv`
- 徒歩：`canonical/02_WALKING_ROUTES_147.csv`, `03_YAMUNA_BRIDGE_RESTRICTIONS_24.csv`
- 券種／曜日：`canonical/06_FOREIGN_ADMISSION_FEES_30.csv`, `07_UNRESOLVED_FOREIGN_FEES_6.csv`, `08_OPENING_HOURS_30.csv`, `09_SPECIAL_WEEKDAY_HOURS.csv`
- 交通：`canonical/11_TRANSIT_LAST_MILE_33.csv`, `12_JAIPUR_STATION_FARES_121.csv`, `13_INTERCITY_TRANSPORT_9.csv`
- 画像：`canonical/14_PHOTO_ASSET_AUDIT_30.csv`, `15_PHOTO_ALTERNATIVES_DEDUP.csv`, `16_CAMERA_GEOTAGS_NOT_GATES_10.csv`
- ゲーム試算：`canonical/17_GAME_ITINERARY_STRESS_TEST_54.csv` および18〜20の試算比較（結果は現実の旅行費・行程ではない）
- 残件：`canonical/22_REMAINING_ISSUES_AND_ACTIONS.csv`

## 原則
1. `original_archives/` と `source_history/` の履歴は触らず保持する。変更は `canonical/` の**研究用台帳**に差分提案として行う。
2. `productionReady=false`、`imageBinaryDownloaded=false`、`officialEntranceGPSVerified=false` は**データ不足を表す意味のある値**。trueに変えるには個別の実証が必要。
3. 入口名が確認できても、その門への正確なGPS・通路・入場時刻が確認できるとは限らない。撮影EXIF座標を訪問者入口へ流用しない。
4. `provisionalGameModelMinutes_NOT_MEASURED` は手動で迂回係数を掛けた試算。`actualMeasuredPedestrianMinutes` にコピーせず、道路グラフと歩行規制で再計算する。橋未確認24区間は歩行不可のまま保つ。
5. 鉄道の駅間運賃121件は駅↔門の実経路を含まない。都市間の9案は日付指定の実運行やリアルタイム価格を保証しない。
6. 外国人料金のゲーム用数値・公式券・二次候補は別カラムのままにし、「運営者の現行発券価格」と表示しない。₹表示はゴールデントライアングル編のみ。ミラノの€は変更しない。
7. 画像ページのライセンスを読んだことと、実画像を保存・目視・帰属処理したことは別。採用前に原ファイルを取得して撮影対象・透かし・顔・使う画角を確認する。
8. 現在のGitHubブランチの3都市データはまだ研究資料・準備セーブ段階。**未執筆のメイン・デートを生きた本番イベントとして追加しない**。
9. 独立ゲームは `golden_triangle`、都市順は `delhi → agra → jaipur`。インド内でAP/ルピー/関係値は引継ぎ、ミラノからは引き継がない。

## 推奨する次の作業
A. インド3都市の公式料金・現地入口・画像の取得を独立確認し、各台帳に証拠URL・確認日を追記。B. OSMデータで正しい有向歩行経路を計算。C. 正式な画像を収録。D. 物語・Ink・クイズ・デート等が決まってから `content/` への実装とE2Eを行う。

## このパッケージの内部検査
```
python3 tools/verify_master.py
```
