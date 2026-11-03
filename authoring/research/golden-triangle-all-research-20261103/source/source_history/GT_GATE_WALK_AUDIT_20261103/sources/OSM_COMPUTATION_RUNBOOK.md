# 再現可能なOSM歩行ネットワーク計算手順

この資料は**再計算のための手順**であり、今回実際にOSM道路を取得して計算を完了したという記録ではありません。

## 0. なぜ再計算が必要か

照合元の `WALK_ROUTES.csv` には有向147行がありますが、同地点21行を除く126行に道路網実測結果はありません。102行は「直線距離×迂回係数」、24行はアーグラのヤムナー川横断が未検証です。道路形状と橋の通行条件が欠けているので、数値をそのまま現実の徒歩時間と呼べません。

## 1. データの取得（インターネット利用可能な開発環境で実施）

OpenStreetMapの最新の地図データが必要です。**Geofabrikの Northern Zone** など、デリー／アーグラ／ジャイプールをカバーする実在のOSM PBFを確認して利用してください。

- データ源：<https://download.geofabrik.de/asia/india.html>
- OSMライセンス：<https://www.openstreetmap.org/copyright>
- 記録必須：取得日、抽出範囲、PBF SHA256、抽出手段のバージョン、タグフィルタ、ソースのクレジット。

実行例（提供するPBFの適用範囲と都市が含まれているか確認すること）：

```bash
# Linux/macOS上に osmium-tool と Pythonをインストール
# Northern Zone PBFは大きいため、自治体・都市別の合法的な小区間を切り出しても可
# 取得したファイルの完全性は SHA-256で記録する
sha256sum northern-zone-latest.osm.pbf

osmium extract -b 77.14,28.49,77.30,28.68 northern-zone-latest.osm.pbf -o delhi.osm.pbf --overwrite
osmium extract -b 77.63,27.05,78.10,27.25 northern-zone-latest.osm.pbf -o agra.osm.pbf --overwrite
osmium extract -b 75.78,26.88,75.90,27.03 northern-zone-latest.osm.pbf -o jaipur.osm.pbf --overwrite

osmium cat delhi.osm.pbf -o delhi.osm -f osm --overwrite
osmium cat agra.osm.pbf -o agra.osm -f osm --overwrite
osmium cat jaipur.osm.pbf -o jaipur.osm -f osm --overwrite

python -m pip install -r scripts/requirements.txt
python scripts/route_on_osm_xml.py --city delhi --osm-xml delhi.osm --points data/core_routing_points.csv --out result
python scripts/route_on_osm_xml.py --city agra --osm-xml agra.osm --points data/core_routing_points.csv --out result
python scripts/route_on_osm_xml.py --city jaipur --osm-xml jaipur.osm --points data/core_routing_points.csv --out result
```

**重要：** `core_routing_points.csv` は実在門の公式GPSではなく、現行研究に収録された**仮の地理アンカー**です。OSM道路から経路が得られても、本番の乗降・入場地点として登録する前に公式門と現地歩道を確認します。

## 2. スクリプトの保守的な安全ルール

`route_on_osm_xml.py` はローカルOSM XMLの `highway`、`foot`、`access`、`oneway:foot` などのタグから有向歩行グラフを組みます。

- `foot=no/private`、`access=no/private` などを除外。
- 車両専用道路や明示的に歩行可と書かれない主要幹線道路を除外。
- 一方通行の車道規制 (`oneway=yes`) をそのまま歩行一方通行にしない。
- 道路にない仮アンカーから最寄り歩道へのスナップが60m超なら経路を作らない。
- 経路の入力端と道路スナップ点間の**直線接続**を含む結果には `includesUnverifiedStraightConnectors=true` を付ける。
- 便宜上の経路算出速度は `75m/分`（4.5km/h）。信号、混雑、日射、入口の待ち時間は別管理。
- アーグラの24区間については経路が見つかっても**橋の徒歩通行を人手確認するまで本番へ公開しない**。
- `operatorGateGpsVerified=false` は全地点で維持している。OSM経路が求まっても `productionReady=false` のまま。

今回のOSM解析コードは**外部道路データなしで精度を検証できません**。同梱の試験用OSMネットワークではアクセス制限と経路分割の機能だけ確認しています。

## 3. 地理的な落とし穴

- アーグラ：ヤムナー川の橋。Mehtab Baghはアーグラ城からAmbedkar Bridge経由で車約8kmとの政府記載あり。しかし橋の歩行アクセス証明にはならない。
- タージ：東／西門、南は退出のみ。入場前の電動シャトルと車両規制を分離。
- アーグラ城：Amar Singh Gateのみ一般入場。
- ファテープル・シークリー：遠隔駐車場から電動バスで入場門まで移動。
- アンベール城：徒歩入口Suraj Pol、車入口Chand Pol。
- ハワー・マハル：正面と背面の入場経路を区別。
- ジャル・マハル：湖岸の観察地点のみ、建物への経路は禁止。

## 4. 本番に切り替える受け入れ基準

1. 12の主要候補地について最低限、現地運営による入口案内と**門の座標**を突き合わせる。
2. 21地点の道路へのスナップが過大でないことを目視レビュー。60mを許容しても壁越えや河川越えは不可。
3. 126方向を道路網で再計算、利用できない経路は `NO_ROUTE` のまま残す。
4. アーグラの24対岸候補は、橋ごとの歩行者通行が確認できるまで無効扱い。
5. 最終的な無料の帰宿ルートが存在しない場合も、無理に徒歩経路を生成しない。利用できる交通手段と予算不足の回復仕様を検証する。
6. 取得・生成データの著作権、ODbL、クレジット、道路更新日を保存する。

## 5. ネットワークの抽出範囲の注意

上の bounding box は資料中の全33地点のうち主な市街地と遠方のファテープル・シークリーを含めるための**抽出例**です。観光地点の新規採用、橋の迂回経路、長い遠回りがある場合、元のバウンディングボックスでは経路を切断してしまうため十分な余裕をもった抽出・追加レビューが必要です。OSMファイルは、歩行道路の実在と合法性を自動的に保証するものではありません。
