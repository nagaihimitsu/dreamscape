# インド編 統合版：取り込み指針

統合済み本体データは `data/` と `travel/` と `cities/`。`reference/addon/` は原データへの差分根拠、`reference/original_data/` は統合前の監査資料。

1. `data/GAME_POLICY.json` の旅行仕様を共有し、既存ミラノのセーブ/進行を保護する。インドは新規スコープ `golden_triangle`。
2. `data/ALL_LOCATIONS.json` のroutingAnchorを利用する場合、実入口ではないことを理解する。`actualGateLatitude/Longitude=null` は本当の未検証である。
3. `travel/*.json` は試作ルート（特に102徒歩と330タクシー）+デート18/メイン12の未接続骨組み。schemaだけ満たす構造であり、既存のシナリオ定義と検証 `validateTravelContent` の連動を満たさない。
4. 本番取込前に背景30枚を適切なライセンスで取得、`public/assets` と `presentation` に登録、イベントIDと実際の戦闘・観光・デート・Inkを対応づける。
5. 現行旅行スキーマは料金の通貨や曜日開館を持たない。0円宿はゲーム仕様であり、現実宿泊費ではない。都市間の手配はゲーム仕様と異なる。
6. 道路網GeoJSONは供給されていない。`*schematic_links_DO_NOT_USE_FOR_STREETS.geojson` は地理構造の確認専用。川渡り24徒歩経路は登録しない。
7. まず `python scripts/validate_integrated.py` を実行し、イベント対応と画像整備の後、GitHubの `npm run content:check`、テスト、ビルドを実行する。

モデル値と現地の事実を同じソース属性で扱わないこと。詳細な引継ぎは `codex/INTEGRATED_HANDOFF.md`。
