# Codexへの引き継ぎ：本番データへの上書きは禁止

## 今回のデータの位置づけ

本ZIPは **GitHub `feature/golden-triangle-foundation` に追加するための監査結果・再計算用ツール**です。`main` や `content/travel` の本番データを直接変更しません。既存データは `authoring/research/golden-triangle-20261103/source/` に保持されています。

## 差分として利用する場合

1. 新しいサブフォルダ `authoring/research/golden-triangle-20261103/gate-walking-audit/` に本ZIPを展開。
2. `data/gate_audit_33.csv` を `placeId` で照合し、正式な門のGPSに対応するデータを後から別フィールドで登録する。既存 `latitude/longitude` と `routingAnchorLatitude/Longitude` を根拠なしに上書きしない。
3. `data/walking_matrix_audit_147.csv` の `existingModelMinutes` は**元の試算値**の監査。`measuredWalkingMinutes` が空なら**OSMルート未取得**。本番の確定値として扱わない。
4. ネットワーク再計算は `sources/OSM_COMPUTATION_RUNBOOK.md` の手順を利用。`result/` から出る地理ポリラインには仮の直線スナップ接続が含まれるので、後から利用門・敷地内経路を確認してから公開する。
5. `agra_taj_mahal` の門を東・西で区別するなど、必要なら **施設本体IDと入口ノードIDを分ける**。施設の観光イベントIDをむやみに変更しない。
6. 徒歩が使えない目的地は、UIで選べない経路を明示し、実測のない経路を作って穴埋めしない。タクシー運賃も既存モデルであり、実在する当日の料金ではない。
7. 日中・夜間の営業時間等はこのZIPでは編集しない。ストーリー・クイズ・デートを作る作業とは独立。

## 未解決事項

- OSM歩行ネットワーク：未取得。ルート算出実績：0/126件。
- 実際の運営門GPS：0/33件。公式資料による門の名称・運用は一部取得。
- アーグラ河川横断：24方向の徒歩通行未確認。
- 旅行用の宿泊拠点：3点とも架空。出発点が実際のホテル入口ではない。

## 実装に必要なQA

- `gate_audit_33.csv` 33件のIDが元データにすべて存在する
- `walking_matrix_audit_147.csv` が7×7×3、各行に自分の位置と他の地点が混ざっていない
- 道路網由来の経路距離は空欄を維持
- 河川横断が徒歩として公開されていない
- 不要な道路形状（架空のまっすぐな橋）がGeoJSONに含まれない
- ミラノ編の既存セーブ・進行・観光・地図が変わらない
