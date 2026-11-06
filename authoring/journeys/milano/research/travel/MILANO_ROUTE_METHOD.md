# 徒歩経路の計算・ライセンス

## 入力と再現
[OpenSidewalkMap Milan](https://github.com/opensidewalkmap/milan/tree/a2fa7e4d1f8aa354034a2382974316f4062b9327/data/routing) の歩行グラフ `network.oswmg`、生成2026-10-29 15:34:44 UTC、SHA-256 `e72f8551fbde9c94998bca26381aa01a686e4e3cc9f28b4d97dc9268a0009277`。59,727入力地物、224,586ノード、490,364有向枝。歩道・横断歩道・歩行路・階段を含む。ルーティング実装は [oswm_codebase](https://github.com/kauevestena/oswm_codebase/tree/44cafc7c0f582ee1732e515446ed11a418b13afa/routing) のdistanceプロファイルを使用。コードはMIT、地図データはOSM由来ODbL。`routing/metadata.json` とコードのライセンスは調査ZIPに含まれる。

ここで「同梱」とある `routing/`、GeoJSON および再計算用ファイルは、調査時に提供されたZIPに含まれます。このリポジトリには含めていません。リポジトリには採用した片道経路データと `MILANO_WALK_ROUTES.csv` を収録しています。

各代表点を最寄りの歩行可能な辺上にスナップし、A*で距離を最小化。元の地点からスナップ位置までの距離を両端とも直線で加え、時速4.5 km＝75m/分で割って分へ切上げ。異地点は最低1分、同じIDは0分。行列はA→BとB→Aを個別に計算し、210方向すべてが到達可能。`MILANO_WALK_ROUTES.geojson` は**スナップ点間のみ**で、出入口への直線接続は含まない。スナップ距離は地点CSVと経路CSVに保持。方角は元の座標間の直線方位、道順とは別。

提供ZIPを展開した場合の再計算：`node routing/calculate_matrix.cjs`。結果は `routing/network_results_recalculated.json`。調査時はZIP内の `network_results.json` と225組について数値一致を確認済み。ZIP内の `points.json` は地点データの座標スナップショット。生成ルートを使う場合はCSVの追加スナップ距離を合算し、GeoJSONだけの長さを時間に使わない。

上記の地点数・組数（225組、210方向）は調査時の15地点の値です。2026-11に彫刻L.O.V.E.（`p_love`）をゲームから削除し、その地点・営業時間・徒歩経路の行も各CSVから除きました（現在14地点）。

## 選定地点
スカラ座は劇場建物でなくPiazza della Scalaの代表点。城はFilarete門。最後の晩餐は美術館代表点。ブレラは美術館代表点。ダルセナはPonte dello Scodellinoで水際近くの橋という具体的なゲーム位置を採り、告白の橋にも共有。洗濯屋小路は別地点。ホテルはCordusio駅代表点に置いた架空の宿で、駅や実在ホテルをホテル扱いする主張ではない。

## 注意
未登録の横断、立入制限、工事、施設の敷地内導線や信号待ちはグラフで保証できない。たとえば美術館の展示室・閉門時間・通行許可をルート値だけで判定しない。座標には広場／建物代表点が残り、数メートル〜十数メートルのスナップは仮想の直線である。結果は実歩行実測でも現在時刻の交通情報でもない。現在時点の道路変更や特定の入口の確定を要する場合は更新する。

`MILANO_WALK_REFERENCE.csv` に外部公開の4例を別記。始終点が一致しないため数値が違っても矛盾と断定できない。例：広場→城門はネットワーク約1.20km・17分、別サイトは城の範囲への約1.3km・15分。広場→財団は約3.14km・42分（速度4.5km/h）、別サイトは地下鉄駅起点で3.3km・39分。

© OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright 。OpenSidewalkMapの帰属も併記し、派生した経路・データベースの公開条件を順守。地図タイルは含まない。道路網からのデータと生成図形は自由利用条件が異なることがあるため、公開時はOSMFライセンスを確認。外部経路検索の大量取得は行っていない。
