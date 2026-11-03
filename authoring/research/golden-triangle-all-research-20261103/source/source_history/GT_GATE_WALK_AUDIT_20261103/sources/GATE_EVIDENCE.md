# 現地入口・歩行アクセスの根拠（2026-11-03）

**注意**：以下の「門名・入場ルールが確認できた」と「公式GPSで入口が確定した」は別。**すべての門の正確な入場座標は未検証**。

## デリー

| 地点 | 現地調査で確認できたこと | ゲーム位置／経路への影響 | 根拠 |
|---|---|---|---|
| レッド・フォート | 中央政府観光サイトはラホール門から内部へ入る順路を紹介。 | 城砦の建物中心へ直線で向かわず、ラホール門近傍を通る道路側の歩道接続をさらに確認。保安検査・券売所GPSは未確認。 | <https://www.incredibleindia.gov.in/en/delhi/delhi/red-fort> |
| フマユーン廟 | デリー政府の地区ページは主入口を西側と説明。 | 墓廟の中心点でなく西入口付近の候補を別に持つ。現行の入退場可否は現場確認。 | <https://dmsoutheast.delhi.gov.in/tourist-place/humayun-tomb/> |
| ジャーマー・マスジド | デリー観光局は北門に衣類の貸出があると案内。大門は複数。 | 北門を唯一の入場口と断定しない。宗教行事・礼拝時の一般観光制限を別途確認。 | <https://delhitourism.gov.in/tourist_place/jama_masjid.html> |
| アグラセン・キ・バオリ | Delhi Tourismの観光行程はHailey Roadから分かれる路地にあると案内。 | 井戸の中心座標ではなく路地の路上入り口を再確認。 | <https://delhitourism.gov.in/itinerary/one_day_itinerary.html> |
| ロディ・ガーデン | Delhi TourismはLodi Roadからのアクセスを説明。 | 複数の園門があるため単一公式GPSは確定できない。 | <https://www.delhitourism.gov.in/entertainment/lodhi_garden.html> |
| ロータス寺院 | バハイ礼拝堂公式サイトは正門向かいの駐車施設、Kalkaji Mandir/Okhla NSIC駅から各徒歩5分を案内。 | 寺院本体中心と門は別。正門から入る歩行路を明示する必要がある。 | <https://bahaihouseofworship.in/plan-a-visit/> |
| インド門・チャンドニー・チョーク | 広場／商店街であり、原則として単一の券売入場門ではない。 | **合法的に歩ける道路／歩道の観察地点**を選ぶ。建造物の中心点にスナップしない。 | <https://delhitourism.gov.in/itinerary/one_day_itinerary.html> |
| クトゥブ・ミナール、バングラ・サーヒブ | 今回の情報では現行の観光客用入場口GPSと通行ルールを確定できず。 | 優先的に運営者の地図・現地写真／OSMの入口タグを確認。 | 確認待ち |

## アーグラ

| 地点 | 確認できたこと | ゲーム位置／経路への影響 | 根拠 |
|---|---|---|---|
| タージ・マハル | **東門・西門は入場可／南門は入場不可（退出専用）**。東西に券売窓口。自動車は境内500m近くの制限があり、駐車場から電動バス／カートの導線がある。 | `taj_east_entry` / `taj_west_entry` の**別ノード**を将来用意。南門への「入場」ルート禁止。タクシーは駐車場までで区切る。 | <https://tajmahal.gov.in/travel-information.aspx>、<https://tajmahal.gov.in/visiting-hours.aspx/ticketing.aspx>、<https://tajmahal.gov.in/dos-and-donts.aspx> |
| アーグラ城 | **一般入場はアマル・シング門のみ**。軍用区域は立入不可。 | デリー門を観光客入口として選ばない。南側のアマル・シング門に接続する歩道側の候補を検証。 | <https://www.tajmahal.gov.in/agrafort.aspx> |
| ファテープル・シークリー | 車は下部駐車場、許可された電動バスで遺跡の門へ。県政府はDiwan-i-Aam付近に券売所と案内。Agra Gatewayは使用頻度の高い門との記述あり。 | 大きな遺跡の中心点へ車で直行させない。**駐車／乗車ノード→遺跡門**を独立して検証する。 | <https://agra.nic.in/tourist-place/fatehpur-sikri/>、<https://tajmahal.gov.in/fatehpur-sikri.aspx> |
| メヘターブ・バーグ | アーグラ地区政府はアーグラ城からAmbedkar Bridgeを通り約8 kmと説明。門に駐車場がある。 | **車で橋を通る案内であり、橋を歩けることの証明ではない**。24対岸歩行ルートは引き続き禁止扱い。 | <https://agra.nic.in/tourist-place/mehtab-bagh/> |
| イティマード・ウッダウラ廟／アクバル廟／ラム・バーグ | 地区政府は各施設の門に券売所と記載するが、入場座標はない。 | 入り口を正確に測定したと扱わず、チケット窓口・門の道路接続を別途確認。 | <https://agra.nic.in/tourist-place/tomb-of-itimad-ud-daulah-baby-taj/>、<https://agra.nic.in/tourist-place/akbars-tomb-sikandra/>、<https://agra.nic.in/tourist-place/ram-bagh-bagh-i-gul-afshan/> |
| チーニー・カ・ラウザ／マリアム廟／グル・カ・タール | 観光地の道路側の概略位置は政府資料にあるが、訪問者門GPS未確認。グル・カ・タールでは頭部を覆うなど訪問時の慣習がある。 | 公共道路→敷地のゲートと、敷地内部の経路を区別。 | <https://agra.nic.in/tourist-place/chini-ka-rauza/>、<https://agra.nic.in/tourist-place/tomb-of-mariam-uz-zamani/>、<https://agra.nic.in/tourist-place/guru-ka-taal-gurudwara/> |

## ジャイプール

| 地点 | 確認できたこと | ゲーム位置／経路への影響 | 根拠 |
|---|---|---|---|
| アンベール城 | **徒歩で到着：Suraj Pol、車で到着：Chand Pol**。どちらもJaleb Chowkに接続すると州観光局が案内。 | **交通手段により入場ノードが異なる**。城砦の中心点に全交通を接続しない。 | <https://www.tourism.rajasthan.gov.in/amber-palace.html> |
| ハワー・マハル | 中央政府観光省は**有名な正面壁に入口はなく、裏側に入口**があると明記。 | 正面の写真観察ノードと、裏の券売・入場ノードを分離する。 | <https://www.incredibleindia.gov.in/en/rajasthan/jaipur/hawa-mahal> |
| シティ・パレス | 敷地内のJaipur Centre for Art公式はGate 1・Gate 2からアクセス可能で、Gate 2外に駐車場があると明示。 | 城内の全展示室に入れるとは限らない。交通乗降と入口を分離し、適切な券種範囲を確認。 | <https://www.jaipurcentreforart.com/visit> |
| ジャンタル・マンタル | 州観光局は入口／オンラインで券売ができると案内。近隣のCity Palaceと別チケット。 | City Palaceと近くても単一の観光地ノードに統合しない。 | <https://www.tourism.rajasthan.gov.in/jantar-mantar.html> |
| ジャル・マハル | 州観光局によると宮殿内部は一般的な観光客には開放されず、湖岸から外観観察が中心。 | **湖の宮殿内部へ歩行・タクシーを接続しない**。岸辺の合法な観察地点を用いる。 | <https://www.tourism.rajasthan.gov.in/content/rajasthan-tourism/en/tourist-destinations/jal-mahal.html> |
| ナハルガル城 | 州観光局は公共交通がないためタクシー等の車利用を推奨。 | 遠方を徒歩所要時間だけで推奨せず、道路通行や乗降位置を確認。 | <https://www.tourism.rajasthan.gov.in/nahargarh-fort.html> |
| パンナ・ミーナー・クンド | 第三者旅行案内は階段降下が通常制限されると記載。運営側の公式告示は未取得。 | **階段を自由に降りるイベントにしない**。上からの見学のみ仮定。 | <https://www.raahzo.com/city/jaipur/panna-meena-ka-kund> |

## 原本から修正すべき発想

- **門名が判明しても座標の確定にはならない**。正式な入場口GPSを30m単位で勝手に補間しない。
- **「徒歩ルートあり」を直線距離から自動生成しない**。歩行者が通れる橋、車両だけの橋、閉鎖された門、車が入れない公園への経路は明確に違う。
- **施設への到着**と**観光イベントを始められること**を分ける。到着後も入場門、営業時間、宗教上の制限、チケット、保安検査、敷地内交通がある。
