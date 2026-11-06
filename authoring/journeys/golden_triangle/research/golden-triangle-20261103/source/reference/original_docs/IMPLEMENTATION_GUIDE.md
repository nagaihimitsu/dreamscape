# Codexへの導入ガイド（本番コードは未編集）

## 参照コミット
`main = 9eaab68e4395b51f287acbe0f16acc8e71bd6f4b`。`feature/multi-city-foundation` はこのmainから1コミット進み、都市登録 `src/content/index.ts`、都市移動 `src/domain/city-travel.ts`、動的旅行データ `src/domain/travel-game.ts`、都市ごとにコンテンツを検証するパイプラインを導入。featureは**mainには未マージ**。

## データ適用方針
1. `data/` と `research/` を実装プロジェクトの調査保管場所（例 `content/travel/research/golden_triangle/`）へ移せる。確定した史実と推測を区別。
2. `cities/*.json` は `citySchema`に形状準拠（`productionStatus=prototype`、`firstClearReward.ap=0`仮）だが、ストーリーIDが空のため公開不可。`content/cities/` への移動は必要な脚本・イベントが完成してから。
3. `travel/*.json` は `travelCatalogSchema`、`travelSettingsSchema`のフィールドの形状に合わせた草案。**背景IDが未登録**、イベント未確定、徒歩経路なし、予算0仮設定で、現在の検証 `validateTravelContent` を通せない。実装できたという主張をしない。
4. 地点IDは `delhi_*`, `agra_*`, `jaipur_*` とし、観光場所の一意IDと事件・クイズ・デートIDを**混同しない**。`golden_triangle` は新規旅スコープのIDで都市IDではない。
5. 緯度経度は `ALL_LOCATIONS.json`、代表点の出所は `SOURCES.json`。入場ゲートは未確認のため必ず再調査。
6. `WALK_ROUTES.csv` から「未確認」をそのまま旅行経路へ取り込んではいけない。正式路線が届くまで旅行システムの到達可能性は未保証。
7. `jaipur_jal_mahal` の歩行到着点は湖の**西岸バス停代表点**（26.95367,75.84233）。本来の湖中建物代表点（26.95343,75.84615）は `ALL_LOCATIONS.json` の `landmarkRepresentativeLatitude/Longitude` に分離。湖中へ歩行ルートを結んではいけない。
7. 画像は `IMAGE_ASSETS.csv` を使い、各Commons画像の実ファイルURLと利用条件を公開時に再確認した上で `public/assets` と`content/tourism/catalog.json` に登録。ブラウザ背景に帰属表示が必要。
8. 都市間の切り替えは「デリークリア→アーグラクリア→ジャイプール」までで固定。ミラノ編から所持金や関係値を移さず新規ゲームとして開始。インド内は再支給なし。

## 修正対象のファイルと理由
- `src/content/index.ts`, `scripts/content-pipeline.ts`：主旅を選ぶコンテンツスコープの登録、毎都市コンテンツとルート検証。featureの変更を評価してから利用。
- `src/content/schemas.ts`：`city.nextCityId`と進行所属、`productionStatus`を採用する際の検証。
- `src/content/travel-schemas.ts`：現行 `travelRoute.mode` は walk/rail/tram/bus/taxi。オートリキシャ新規区分、INR通貨、曜日ごとの施設開館、都市間料金と所要時間が未対応。
- `src/domain/city-travel.ts`：featureは日数9時リセット＋無料の次都市切替。コスト/列車時間/日付遷移/物語完了前の滞在を混同しない。プレイヤーの明示出発が必要。
- `src/domain/travel.ts`：DAY_START=09、NIGHT_START=18、DAY_END=21 の定数を旅行編設定で差し替える。Milanoデフォルト維持。
- `src/domain/travel-game.ts`, `src/domain/travel-routes.ts`：帰路リザーブ/必要時間、人数と乗車単価、複数都市でのrouteId、一部行き先の未到達状態。
- `scripts/travel-validation.ts`：**全place間の徒歩片道経路（自己含む）を要求**。遠方施設に徒歩必須の制約は交通バランスに合わず、帰宿可能性と到達可能性を交通網で検証する修正を検討する。脚本と照合する現在のイベント必須制約は物語完成まで不適用。
- `scripts/content-pipeline.ts`：既存MilanとのID衝突を検出、trip単位のインド登録を確認。
- 新規の `trip` 選択：ミラノ既存セーブには触れず、`golden_triangle`専用の新規セーブ作成。スタート時の旅状態と行き先選択を明確化。

## 本番データと未完成を混同しない
当ZIPからそのまま使えるもの：観光地候補の代表座標付き台帳、公式裏付けがある料金（ただし詳細条件照合は必須）、建築・歴史の検証付き素材、画像候補クレジット。
追加取得が必須なもの：歩行ネットワーク+門、鉄道の旅行日料金、安定した背景、物語連動イベント、曜日・季節の特別処理と予算値。

## 検証
`scripts/validate_research.py`でZIP内整合を検証。ゲームへ移す段階では npm run content:check / npm run typecheck / npm test / npm run build。旅行3都市それぞれの昼夜、宿泊、時間切れ、予算不足、帰路、逆方向、セーブをテストする。
