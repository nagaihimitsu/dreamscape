# アーグラ歩行ネットワーク試算（制作資料）

2026-11-03に、Geofabrikが配布した[OpenStreetMapのCentral Zone抽出](https://download.geofabrik.de/asia/india/central-zone-261102.osm.pbf)（データ日2026-11-02）を取得し、既存研究の歩行グラフ計算器でアーグラ市街の候補を計算した。OpenStreetMap contributorsへの帰属と[ODbLの条件](https://www.openstreetmap.org/copyright)を維持する。元PBFのSHA-256、抽出XMLのSHA-256、対象範囲と集計は [metadata.json](metadata.json) に記録した。PBF・抽出XML・経路形状はリポジトリに含めていない。

対象は既存の `core_routing_points.csv` にある**7地点**で、7×7の49行。アーグラの候補全11地点を網羅しない。ファテープル・シークリー、アクバル廟、マリアム廟、グル・カ・タールの4地点は今回の範囲外であり、経路が存在しないことや徒歩で行けないことを意味しない。デリー・ジャイプールも今回未計算である。

元研究の `OSM_COMPUTATION_RUNBOOK.md` はNorthern Zoneに3都市が入ると説明するが、Geofabrikの境界ポリゴンを2026-11-03に確認したところ、アーグラ市街とファテープル・シークリーは **Central Zone**、デリー・ジャイプールは **Northern Zone** に位置する。北部抽出は取得を試みたが通信が制限時間内に完了せず、未完成の部分ファイルから結果は作っていない。

## 二つの計算結果

- `agra_conservative_candidates.csv`：元研究の厳格なフィルター。primary/secondary道路などで歩行許可が明示されない場合を除外した結果、同一地点7行を除く42行は経路未検出。**実際に徒歩で通れないという意味ではない。**
- `agra_exploratory_candidates.csv`：明示的な歩行禁止・私有・条件付き規制等を除外したうえで、trunk/primary/secondary/tertiaryの歩行許可が不明な道路も仮に接続した探索結果。30行に道路網の候補が得られ、12行は未検出、7行は同一地点。候補のうち16行は川を渡る経路で、橋の歩行可否を要確認。元の徒歩禁止24方向は解除しない。

探索プロファイルで道路がつながることは、その道路を歩いてよいという証拠ではない。各アンカーは施設の公式入口GPSではなく、最寄り道路への直線スナップも未検証で、壁や敷地境界を越える可能性がある。計算器は節点のバリア、すべての通行条件、交通状況や工事を完全には判定できない。距離は公開地図のグラフ上の推算、分数は仮の75m/分であり、現地実測値ではない。全行 `productionReady=False` で、本番用の徒歩経路に登録しない。

## 再現

次はPython 3と `osmium==4.3.2`、`networkx==3.7`、`shapely==2.2.0`、`pyproj==3.8.0` を用いる例。実行には公開PBFの別途取得が必要。巨大なPBFと抽出XMLは一時フォルダーに保管する。リポジトリルートから実行する。

```sh
points=authoring/research/golden-triangle-all-research-20261103/source/source_history/GT_GATE_WALK_AUDIT_20261103/data/core_routing_points.csv
base=authoring/research/golden-triangle-all-research-20261103/source/source_history/GT_GATE_WALK_AUDIT_20261103/scripts/route_on_osm_xml.py
followup=authoring/research/golden-triangle-followup-20261103/walk-network
python3 "$followup/extract_pbf.py" --pbf /tmp/central-zone-261102.osm.pbf --points "$points" --out /tmp/india-osm --cities agra
PYTHONDONTWRITEBYTECODE=1 python3 "$base" --city agra --osm-xml /tmp/india-osm/agra.osm --points "$points" --out /tmp/india-osm/conservative
PYTHONDONTWRITEBYTECODE=1 python3 "$followup/exploratory_profile.py" --city agra --osm-xml /tmp/india-osm/agra.osm --points "$points" --out /tmp/india-osm/exploratory
```

抽出は対象点の最小外接矩形を各辺0.025度広げ、その範囲に少なくとも1頂点がある `highway` wayを選ぶ。出力を越える迂回経路や、範囲内に頂点がない横断wayは失われ得る。OSMの最新化・抽出範囲・ライブラリの違いで結果は変わる。現地の安全、正式な入口、橋の歩行可否は別途確認が必要。

研究表の行数・対象地点・橋未確認フラグ・非公開状態の整合は、追加ライブラリなしで次を実行して確認できる。これは現地の経路や安全を保証する検証ではない。

```sh
python3 authoring/research/golden-triangle-followup-20261103/walk-network/validate_walk_candidates.py
```
