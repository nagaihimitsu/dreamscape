# Dreamscape｜インド編・入場口／徒歩経路の再調査 ZIP

**対象**：`nagaihimitsu/dreamscape` のインド3都市、既存調査資料に対する**独立した追加監査**。ストーリーや本番データは変更しない。

**調査日**：2026-11-03  
**照合元**：`feature/golden-triangle-foundation` / `c816d25f3cb638c5ca08f7a6a5d9c84d939ade62`  
**照合元資料**：`authoring/research/golden-triangle-20261103/source/`  
**照合元の原本ファイル**：`data/ALL_LOCATIONS.json`, `data/WALK_PRIORITY_MATRIX.json`, `data/WALK_ROUTES.csv`, `data/ENTRY_ANCHORS.csv`, `source/OPEN_ISSUES.md`。

## 最重要結論

今回できたこと：

- **33地点の入口／観察地点を個別に見直し**。公的機関や運営者のページから、タージ・マハルの東西門、アーグラ城のアマル・シング門、アンベール城の徒歩／車別門、ハワー・マハルの裏側入口などを確認。正式な門の**名称・運用**とその**GPS座標の確認**は分離した。
- **既存の徒歩147行を、同地点21件・直線距離ベースの試作102件・ヤムナー川の橋未検証24件に分離**。モデル時間は`existingModelMinutes`に保存し、別の`measuredWalkingMinutes`には移さない。
- **正式な道路経路再計算用のPythonプログラム**、実行手順、危険な橋24方向のチェック表、GIS用地点GeoJSON、機械検査を同梱。
- 過去の資料が示す「道路網で測定した経路がない」という不足を隠さず、新しい証拠がある入口の**運用**だけを改善した。

今回できていないこと（本番利用上の重要な制限）：

- この実行環境から**OSM歩行道路の実データを取得できなかった**ため、道路ネットワークに沿った徒歩時間は**0件**。歩行ネットワークを実行していない以上、102モデル値を「精密経路」に変えることはできない。
- **33地点とも正規入口のGPS座標を運営機関から確認できていない**。門名と方向が確定しても、施設中心点を正式な入場位置とは扱わない。
- アーグラのヤムナー川横断24方向は、政府の道路アクセス情報がある箇所を含むが、実際の**歩行者の橋通行**までは独立確認できず、現状では徒歩候補として公開しない。

このため、**「徒歩経路の精密化が完了したZIP」ではなく、再調査の成果と誤表示を防ぐための監査・再計算準備ZIP**です。

## ファイル案内

| ファイル | 内容 |
|---|---|
| `data/gate_audit_33.csv` | 33地点の原座標、仮アンカー、入口運用上の証拠、未解決GPS、優先度 |
| `data/original_anchor_snapshot.csv` | 元データの位置とアンカーの比較用スナップショット |
| `data/walking_matrix_audit_147.csv` | 既存徒歩時間と証拠区分の監査。正式な道路経路は空欄 |
| `data/bridge_risk_24.csv` | 歩行不能と扱う対岸の24有向区間 |
| `data/core_routing_points.csv` | 道路網計算に使う既存の21仮アンカー座標（ゲート保証なし） |
| `data/points_33_provisional.geojson` | GISでの地点表示用。道路経路のGeoJSONではない |
| `data/access_evidence_sources.json` | 出典URLと照合日の一覧 |
| `sources/GATE_EVIDENCE.md` | 公的資料で確認した門の運用、入口に見せかけてはいけない地点 |
| `sources/OSM_COMPUTATION_RUNBOOK.md` | 別環境でPBFをダウンロードして道路網計算する手順 |
| `scripts/route_on_osm_xml.py` | OSM道路データから有向徒歩経路を計算するプログラム |
| `scripts/build_audit.py` | CSV・監査データの再作成（元データのスナップショットを同梱したソースコード） |
| `scripts/verify_package.py` | データ整合性と真偽ラベルの検査 |
| `tests/test_synthetic_osm.py` | 試験用の合成道路で通行可否・往復・距離を検査。本物のインド道路は一切含まない |
| `CODEX_INTEGRATION.md` | 実装時の最小限の安全な取り込み手順 |

## 調査資料の誤用を防ぐルール

1. **生の `travel/*.json` に本ZIPを上書きしない**。このZIPは原本の差分監査であり、実際の完成済み都市データではない。
2. `existingModelMinutes` は従来の**直線距離に係数を掛けたモデル値**。道路や橋の通行を保証しない。
3. `gateCoordinateVerified=false` の地点へOSMスナップで経路をつないでも、それは**仮アンカーへの経路**にすぎない。門の物理的位置、入口の開閉、接続歩道は別に検証する。
4. 徒歩以外の交通が利用できても、タクシーが門の真横まで行けると決めつけない。駐車場・入場口間の歩き／構内交通を分離する。
5. 出典は調査日の運用情報。実際の旅行日・時間の臨時閉鎖には対応していない。

© OpenStreetMap contributors / ODbL 1.0：<https://www.openstreetmap.org/copyright>。このZIPにはOSM道路ネットワーク由来の形状を含めない。将来ネットワークを取得・派生物を公開する際は、そのライセンスと帰属義務を別に守る。
