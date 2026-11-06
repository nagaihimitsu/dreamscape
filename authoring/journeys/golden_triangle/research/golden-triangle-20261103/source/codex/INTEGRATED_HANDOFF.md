# Codex引継ぎ：Golden Triangle 統合資料（本体のGitHub変更なし）

対象 `nagaihimitsu/dreamscape`。既存ミラノへの影響なし、インド `delhi→agra→jaipur` はミラノと独立開始、インド内はAP/お金/関係状態を引き継ぐ（初期支給は1回のみ）。

## 読む順番
`README.md` → `data/GAME_POLICY.json` → `data/ALL_LOCATIONS.json` → `data/GAME_ENTRANCE_COSTS.csv` → `data/WALK_ROUTES.csv` → `data/TAXI_ROUTES_GAME_MODEL.csv` → `travel/*.json` → `data/EVENT_BLUEPRINTS.csv` → `OPEN_ISSUES.md`。

## 統合済みでモデル値が確定した点
- 2名用のインド編初期資金：₹30,000、宿泊時にお金/APを**減らさない**（ゲーム仕様）。
- 時間：09:00開始、18:00夜扱い、22:00就寝。途中イベントは強制終了しない。特殊営業時間は通常と別表で管理。
- デリーの`initialBudget`のみ30000、それ以外0の意味は「追加支給なし」。都市クリアAP4（各都市）、デートAP2、再挑戦15分。
- 優先観光：各都市メイン4・デート6候補、計30。**未執筆のシーンを本番の完了フラグにはしない**。
- タクシーは2人で1台の料金、公共交通は2人の片道運賃。現地見積ではない。
- 橋の安全性が未検証の徒歩24行はルートとして登録しない、タクシーのみ試作。

## 本番投入前の必須作業
1. `src/content/travel-schemas.ts` などの仕様確認。元の`travel/*.json`はZod shapeとしての設計骨組みで、実際の`journey/episodes`, `date_catalog`, `battles`とはID対応がない。すでにある登録コードに*そのまま*つなぐと検証エラーになるため仮イベントを本番へ公開しない。
2. `src/content/index.ts` 、`scripts/content-pipeline.ts` 、保存レイヤーを旅行スコープ別に分離する。ユーザーは都市ごとに新規ゲーム開始ではなく、インド三都市を一本の旅として進める。
3. 外国人券種に未公表・矛盾がある施設は、ゲーム編集モデルと実料金を画面で混同させない。所持金不足で宿に戻れない場合の復旧導線を設ける。
4. 画像を適法取得して本人のライセンス条件に従い`presentation.backgrounds`を作成。現ZIPに背景写真はない。
5. 道路ネットワーク未収録。OSMファイルがあれば`scripts/recompute_walk_routes.py`を使って歩道/橋の検証を別途実施。試作値は`GAME_MODEL`表記維持。
6. 実旅の切替、AP/好感度、日時・曜日、セーブ互換性、駅乗継、帰宿可能性テストを追加する。

## スキーマ適合性
- City JSON: cityId、`firstClearReward`、landmarkIdsPlannedは研究値を設定、`productionStatus=prototype`を維持。
- Travel JSON: `travelCatalogSchema`（places, routes, events）はフィールド/enum面で一致する構成。全徒歩地点間要件には24橋不明で一致しない。**安易に全徒歩を創作してテスト回避しない。**
- `GAME_POLICY.json`、統合CSVは新たな調査資料で本番ランタイムのスキーマではない。生データをランタイム定義に直接混ぜない。
