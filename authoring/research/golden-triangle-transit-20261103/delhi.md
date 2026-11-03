# デリー：地下鉄・バスの調査メモ

## 未確定３方向の再調査

架空宿付近からアグラセン・キ・バオリへは [433LINK STL](https://www.dtcbusroutes.in/bus/route/3031/new-delhi-railway-station-gate-2/to/sunehari-pulla-depot/) の Super Bazar → Max Mueller Bhawan、帰路は [85A Ext](https://www.dtcbusroutes.in/bus/route/3307/isbt-anand-vihar-terminal/to/shivaji-stadium-terminal/) の Barakhamba → Shivaji Stadium を、それぞれ停留所への接続を含むゲーム用経路として登録した。架空宿は Rajiv Chowk 付近という仮定で、実在の宿の入口ではない。

クトゥブ・ミナールからバングラ・サーヒブへは [725UP](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnfs-725up) の Kendriya Terminal / Gurudwara Rakab Gunj で降り、寺まで徒歩接続する候補を登録した。寺前への直通とは扱わない。所要時間と運賃は接続・待ち時間を含む**２人分のゲーム設定**であり、実運行や通行可能な経路の保証ではない。

確認日：2026-11-03。これはゲーム制作のための公開情報調査であり、現地の運行や入口を実測した資料ではありません。ゲーム内の宿は Rajiv Chowk 付近という架空設定です。各区間はゲーム内の地点間移動であり、駅・停留所までの接続、待ち時間を含む所要時間はゲーム用に設定しています。駅間の距離を施設の入口までの実際の歩行距離として扱いません。

## 運賃の参考

- [DMRCの2025年改定を報じたET Infra](https://infra.economictimes.indiatimes.com/news/urban-transportation/service-disruption-alert-delhi-metro-train-delays-between-sultanpur-and-millennium-city-centre/123634395) は通常運賃を0–2km ₹11、2–5km ₹21、5–12km ₹32、12–21km ₹43、21–32km ₹54、32km超 ₹64と説明。日曜・祝日には別の割引がある。サイトによって旧運賃や駅間距離に食い違いがあるため、本稿の駅間額は路線案内の参考値、ゲーム額は単純化した**大人２人合計の推定値**とする。運賃と日曜・カード割引を保証しない。
- [Delhi Tourismのバス運賃表](https://delhitourism.gov.in/transport/city_bus.html) は通常バスの大人片道を距離帯で₹5／₹10／₹15、冷房バスを₹10／₹15／₹20／₹25と記載。ページの掲載時期・運賃改定と、400系統の車両条件や区間距離は確認しきれていない。ゲームのバス料金₹30はその表を参考にした**２人のゲーム値**で、現地の確定料金ではない。
- [DTCの2026年時刻表](https://dtc.delhi.gov.in/sites/default/files/DTC/dtc_all_time_table_jan_2026.pdf) に400系統の Minto Road Terminal と Okhla Extension / Abul Fazal Enclave を結ぶ便が掲載されている。下記の停留所は両方向の民間路線案内を別々に確認した。

## 地点とアクセスの確認状況

| ゲーム地点 | 確認した駅・停留所と扱い |
|---|---|
| `delhi_hotel_hub` | 架空宿。Rajiv Chowk駅付近という設定。実在宿・出入口・駅までの道は未確定。 |
| `delhi_red_fort` | [Lal Quila駅付近](https://www.dtcbusroutes.in/bus/stop/14229/red-fort/)。地下鉄をゲームに採用。 |
| `delhi_jama_masjid` | [Jama Masjid駅出口案内](https://yometro.com/from-lal-quila-metro-station-delhi-to-jama-masjid-metro-station-delhi)。[Delhi TourismはChawri Bazaar駅](https://delhitourism.gov.in/tourist_place/jama_masjid.html)を挙げる。いずれも入口までの実歩行経路は未確認。 |
| `delhi_chandni_chowk` | Chandni Chowk駅。 [Delhi Tourism](https://www.delhitourism.gov.in/itinerary/metro_itinerary.html) は同駅の周辺に旧市街の観光名所を挙げる。商店街の地点は広がりがあり代表点は厳密な駅入口ではない。 |
| `delhi_qutb_minar` | Qutab Minar駅。 [民間案内](https://housing.com/news/which-is-the-nearest-metro-station-to-qutub-minar/) は駅から記念物まで約2.8kmとしているため駅前にあると扱わない。 |
| `delhi_humayun_tomb` | [Delhi TourismはJLN Stadium駅](https://delhitourism.gov.in/tourist_place/humayun_tomb.html)を挙げる。駅から目的地までは別途接続が必要で、入口までの実経路は未確認。 |
| `delhi_lodhi_garden` | [Jor Bagh駅](https://www.delhitourism.gov.in/dt/explore_the_city/lodi_gardens_lake.html)。[400系統](https://www.dtcbusroutes.in/bus/route/201/vivekanand-marg-minto-road/to/okhla-extension-abul-fazl-encalve-1/) の Lodhi Garden / Mousam Bhawan 停留所。地下鉄・バスを採用。 |
| `delhi_india_gate` | [Delhi TourismはCentral Secretariat駅](https://www.delhitourism.gov.in/dt/explore_the_city/india_gate.html)を挙げる。出口からインド門まで別途接続が必要。 |
| `delhi_lotus_temple` | [Kalkaji Mandir駅](https://moovitapp.com/index/en/public_transit-LOTUS_Temple-Delhi-site_44535667-3801)。寺院のアクセス情報として複数候補があり、入口までの実経路は未確認。 |
| `delhi_agrasen_baoli` | [Barakhamba Road駅](https://housing.com/news/agrasen-ki-baoli-nearest-metro-stations/)と[Rajiv Chowkからの徒歩](https://www.rome2rio.com/s/Rajiv-Chowk/Agrasen-Ki-Baoli)が案内されている。ゲームでは架空宿との地下鉄移動を今回は不採用。 |
| `delhi_bangla_sahib` | [Delhi Tourism](https://www.delhitourism.gov.in/itinerary/metro_itinerary.html) はRajiv Chowk駅のアクセス先として挙げる。架空宿も同駅付近のため、地下鉄の駅間移動を無理に設定しない。別の経路やバスがないという意味ではない。 |

## ゲームに採用した区間

いずれも両方向を別データとして登録。時間は駅・停留所までの移動や待ち時間を含めて丸めた**ゲーム用推定**、運賃は**２人合計のゲーム用推定**。日による運休、交通事情、施設の入口、正確な乗換時間や現地料金は再現しない。

| 架空宿 ↔ 地点 | モード・参考駅 | 片道・２人のゲーム設定 | 駅間参考出典 |
|---|---|---:|---|
| レッド・フォート | 地下鉄 Lal Quila | 30分・₹64 | [Rajiv Chowk–Lal Quila](https://delhi.metro.org.in/route/rajiv-chowk/lal-quila/) |
| ジャーマー・マスジド | 地下鉄 Jama Masjid | 30分・₹64 | [Rajiv Chowk–Jama Masjid](https://delhi.metro.org.in/route/rajiv-chowk/jama-masjid/) |
| チャンドニー・チョーク | 地下鉄 Chandni Chowk | 22分・₹42 | [Rajiv Chowk–Chandni Chowk](https://yometro.com/from-rajiv-chowk-metro-station-delhi-to-chandni-chowk-metro-station-delhi) |
| クトゥブ・ミナール | 地下鉄 Qutab Minar | 75分・₹86 | [Rajiv Chowk–Qutab Minar](https://delhi.metro.org.in/route/rajiv-chowk/qutab-minar/) |
| フマユーン廟 | 地下鉄 JLN Stadium | 50分・₹64 | [Rajiv Chowk–JLN Stadium](https://trainlivestatus.com/metro/delhi/rajiv-chowk-to-jawaharlal-nehru-stadium) |
| ロディ・ガーデン | 地下鉄 Jor Bagh | 35分・₹64 | [Rajiv Chowk–Jor Bagh](https://delhi.metro.org.in/route/rajiv-chowk/jor-bagh/) |
| インド門 | 地下鉄 Central Secretariat | 45分・₹42 | [Rajiv Chowk–Central Secretariat](https://trainlivestatus.com/metro/delhi/rajiv-chowk-to-central-secretariat) |
| ロータス寺院 | 地下鉄 Kalkaji Mandir | 50分・₹86 | [Rajiv Chowk–Kalkaji Mandir](https://delhi.metro.org.in/route/rajiv-chowk/kalkaji-mandir/) |
| ロディ・ガーデン | バス400系統 | 45分・₹30 | [往路 Super Bazar→Lodhi Garden / Mousam Bhawan](https://www.dtcbusroutes.in/bus/route/201/vivekanand-marg-minto-road/to/okhla-extension-abul-fazl-encalve-1/)、[復路 Lodhi Garden / Mousam Bhawan→Regal](https://www.dtcbusroutes.in/bus/route/3959/okhla-extension-abul-fazl-encalve-1/to/vivekanand-marg-minto-road/) |

次の観光地間も、両地点に対応する駅を使う直通地下鉄として登録した。駅間は引用先の運行案内を参照し、地点と駅の接続、待ち時間を含めた所要時間・大人２人分の合計額はゲーム用推定値。Qutab Minar駅と実際の記念物の間に約2.8kmの接続がある点にも注意する。

| ゲーム地点間 | 使用駅・路線 | 片道・２人のゲーム設定 | 両方向の駅間案内 |
|---|---|---:|---|
| レッド・フォート↔ロータス寺院 | Lal Quila↔Kalkaji Mandir、Violet線 | 55分・₹86 | [往](https://yometro.com/from-lal-qila-metro-station-delhi-to-kalkaji-mandir-metro-station-delhi)・[復](https://yometro.com/from-kalkaji-mandir-metro-station-delhi-to-lal-qila-metro-station-delhi) |
| ジャーマー・マスジド↔ロータス寺院 | Jama Masjid↔Kalkaji Mandir、Violet線 | 55分・₹86 | [往](https://yometro.com/from-jama-masjid-metro-station-delhi-to-kalkaji-mandir-metro-station-delhi)・[復](https://yometro.com/from-kalkaji-mandir-metro-station-delhi-to-jama-masjid-metro-station-delhi) |
| レッド・フォート↔フマユーン廟 | Lal Quila↔JLN Stadium、Violet線 | 65分・₹64 | [往](https://yometro.com/from-lal-qila-metro-station-delhi-to-jawaharlal-nehru-stadium-metro-station-delhi)・[復](https://metroyatra.com/delhi-metro/jln-stadium-metro-station-delhi-to-lal-quila-metro-station-delhi) |
| ジャーマー・マスジド↔フマユーン廟 | Jama Masjid↔JLN Stadium、Violet線 | 60分・₹64 | [往](https://yometro.com/from-jama-masjid-metro-station-delhi-to-jawaharlal-nehru-stadium-metro-station-delhi)・[復](https://yometro.com/from-jawaharlal-nehru-stadium-metro-station-delhi-to-jama-masjid-metro-station-delhi) |
| インド門↔ロータス寺院 | Central Secretariat↔Kalkaji Mandir、Violet線 | 55分・₹64 | [往](https://yometro.com/from-central-secretariat-metro-station-delhi-to-kalkaji-mandir-metro-station-delhi)・[復](https://yometro.com/from-kalkaji-mandir-metro-station-delhi-to-central-secretariat-metro-station-delhi) |
| チャンドニー・チョーク↔クトゥブ・ミナール | Chandni Chowk↔Qutab Minar、Yellow線 | 85分・₹86 | [往](https://yometro.com/from-chandni-chowk-metro-station-delhi-to-qutub-minar-metro-station-delhi)・[復](https://yometro.com/from-qutub-minar-metro-station-delhi-to-chandni-chowk-metro-station-delhi) |
| ロディ・ガーデン↔クトゥブ・ミナール | Jor Bagh↔Qutab Minar、Yellow線 | 75分・₹64 | [往](https://yometro.com/from-jor-bagh-metro-station-delhi-to-qutub-minar-metro-station-delhi)・[復](https://yometro.com/from-qutub-minar-metro-station-delhi-to-jor-bagh-metro-station-delhi) |
| チャンドニー・チョーク↔ロディ・ガーデン | Chandni Chowk↔Jor Bagh、Yellow線 | 40分・₹64 | [往](https://yometro.com/from-chandni-chowk-metro-station-delhi-to-jor-bagh-metro-station-delhi)・[復](https://yometro.com/from-jor-bagh-metro-station-delhi-to-chandni-chowk-metro-station-delhi) |

観光地間は、以下の現実のバス路線も両方向の停留所を確認して登録した。発車間隔、待ち時間や現地の経路を測定したものではなく、片道時間と２人分の費用はゲーム用の値である。料金は上記 Delhi Tourism の距離帯別運賃表を参考にしている。

| ゲーム地点間 | 系統・停留所 | 片道・２人のゲーム設定 | 両方向の停留所一覧 |
|---|---|---:|---|
| レッド・フォート↔クトゥブ・ミナール | 502系統、Red Fort↔Mehrauli / Qutub Minar | 90分・₹30 | [往](https://www.dtcbusroutes.in/bus/route/263/isbt-kashmere-gate-terminal/to/mehrauli-terminal/)・[復](https://www.dtcbusroutes.in/bus/route/4043/mehrauli-terminal/to/kashmere-gate-city-bus-terminal/) |
| ジャーマー・マスジド↔クトゥブ・ミナール | 502系統、Jama Masjid↔Mehrauli / Qutub Minar | 85分・₹30 | [往](https://www.dtcbusroutes.in/bus/route/263/isbt-kashmere-gate-terminal/to/mehrauli-terminal/)・[復](https://www.dtcbusroutes.in/bus/route/4043/mehrauli-terminal/to/kashmere-gate-city-bus-terminal/) |
| レッド・フォート↔フマユーン廟 | 405系統、Red Fort↔Police Station Nizamuddin (Dargah) | 50分・₹30 | [往](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-405up)・[復](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-405down) |
| ジャーマー・マスジド↔フマユーン廟 | 405系統、Jama Masjid↔Police Station Nizamuddin (Dargah) | 45分・₹30 | [往](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-405up)・[復](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-405down) |

[Moovit のクトゥブ・ミナールへのアクセス案内](https://moovitapp.com/index/en/public_transit-Kutub_Meenar_Qutub_Minar-Delhi-site_48297450-3801)は502系統と Mehrauli / Qutub Minar 停留所を挙げる。復路一覧ではこの付近の停留所名が `Qutub Minar` と表記される。[Moovit のフマユーン廟へのアクセス案内](https://moovitapp.com/index/en/public_transit-Humayun_s_Tomb-Delhi-site_46107223-3801)は405系統と PS Nizamuddin (Dargah / Markaz) 停留所を挙げる。いずれも停留所から実際の入場口までの歩行可能経路を保証するものではない。

## 確認済みだが今回は採用しない区間

- 宿↔アグラセン・キ・バオリの地下鉄：Rajiv Chowk↔Barakhamba Road は[地下鉄の駅間運行](https://delhi.metro.org.in/route/rajiv-chowk/barakhamba-road/)が掲載され、Barakhamba Road は[階段井戸へのアクセス候補](https://housing.com/news/agrasen-ki-baoli-nearest-metro-stations/)である。一方[徒歩による案内](https://www.rome2rio.com/s/Rajiv-Chowk/Agrasen-Ki-Baoli)もあり、架空宿の厳密位置を決められない近距離で、地下鉄を選択肢に加える便益は未確認。ゲームでは既存の徒歩移動を使う。地下鉄に乗れないという意味ではない。
- レッド・フォート↔ジャーマー・マスジドの地下鉄：[Lal Quila→Jama Masjid](https://yometro.com/from-lal-quila-metro-station-delhi-to-jama-masjid-metro-station-delhi) と[逆方向](https://yometro.com/from-jama-masjid-metro-station-delhi-to-lal-qila-metro-station-delhi) の案内がある。ゲームでは既存の地点間徒歩を設定済みであり、両端の接続を含めた地下鉄の便益を十分に確認できないため今回は載せない。地下鉄が運行しないという意味ではない。

以下の追加調査で、登録地点の各組み合わせを今回確認した範囲に限って整理した。確認対象の系統以外の運行や、駅・バス停からの現地の通行可能な接続まで確認したものではない。


## 全地点間の追加整理（2026-11-03）

デリーの登録11地点について、レッド・フォート付近の Lal Quila、ジャーマー・マスジド付近の Jama Masjid、インド門の Central Secretariat、フマユーン廟の JLN Stadium、ロータス寺院の Kalkaji Mandir、チャンドニー・チョークの同名駅、クトゥブ・ミナールの Qutab Minar、ロディ園の Jor Bagh、階段井戸の Barakhambha Road を候補駅として駅間案内を往復方向で確認した。バングラ・サーヒブは[Rajiv Chowkが候補](https://www.indiatoday.in/information/story/gurudwara-bangla-sahib-how-to-reach-nearest-metro-station-timings-other-details-1618154-2019-11-12)とされる。Qutab Minar駅は建造物の前ではなく、フマユーン廟もJLN Stadium駅に直結していない。駅まで・駅からの接続はゲーム上の推定であり、実際の徒歩可能な経路と時間は未検証。架空宿のRajiv Chowkへの接続も実在宿を意味しない。

駅間運行と参考額は、[Lal Quila ↔ Central Secretariat](https://yometro.com/from-lal-qila-metro-station-delhi-to-central-secretariat-metro-station-delhi)、[Barakhambha Road ↔ Qutab Minar](https://yometro.com/from-barakhambha-road-metro-station-delhi-to-qutub-minar-metro-station-delhi)、[JLN Stadium ↔ Kalkaji Mandir](https://yometro.com/from-jawaharlal-nehru-stadium-metro-station-delhi-to-kalkaji-mandir-metro-station-delhi)などの民間案内を方向別に参照し、各ゲーム経路の `sources` に該当する駅間案内と両地点のアクセス資料を記録した。実際に乗り継ぐ駅間は選択画面に「地下鉄の乗り継ぎを含む」と表示する。

追加した地下鉄の所要時間は、各駅間案内の参考乗車時間を約1.4倍にし、待ち時間と地点ごとに置いたゲーム上の接続時間を加え、５分単位に丸めたもの。２人分の費用は参考サイトの１人片道参考額の２倍をゲーム値に設定した。これらは、乗り換え時間や地点からの距離を実測した数値でも、現在の確定運賃でもない。

バスは両方向の停留所一覧に加え、地点への接続を次の範囲で確認した。入力した方向別の停留所一覧、地点アクセス資料と推定の内訳は、各 `routes[].sources` を参照する。停留所の表記や位置は方向で異なり、停留所と入口の実通路・待機時間・便の継続運行は未確認。

- [729系統](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-729up)と[260系統](https://www.dtcbusroutes.in/bus/route/147/kendriya-terminal-pt-pant-marg/to/c-block-yamuna-vihar-c4-yamuna-vihar-terminal/)：旧市街、バングラ・サーヒブ、中心部や階段井戸周辺を結ぶ候補。チャンドニー・チョークは広い市場のためRed Fort側の候補停留所へゲーム上の接続を含める。
- [429系統](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-429up)・[26系統](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-26up)：旧市街、インド門、ロータス寺院やロディ園周辺などを結ぶ候補。429のフマユーン廟側はNizamuddin Extension / Delhi Public Schoolの候補であり、別のPolice Station Nizamuddin停留所と混同しない。26は往復の停留所が異なる。
- [433](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-433up)・[440A](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-440aup)・[893](https://www.transit.land/explore/operators/o-ttn-delhiintegratedmulti~modaltransitsystemltd/routes/r-ttnf-893up)・[522A](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-522aup)・[505](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnfs-505up)・[502](https://www.dtcbusroutes.in/bus/route/263/isbt-kashmere-gate-terminal/to/mehrauli-terminal/)：架空宿、階段井戸、インド門、フマユーン廟、ロディ園、ロータス寺院やクトゥブ方面を結ぶ候補。505の階段井戸への復路はEastern Court停留所からの接続を仮定しており、徒歩可能な通路は未検証。

新規バスの時間は既存のゲーム用タクシー時間の約1.6倍にゲーム上の待機・接続15分を加え、５分単位に丸めたモデル。運賃はDelhi Tourismの掲載表を参考に**２人合計₹30のゲーム値**とした。経路や運賃の実測値ではなく、時刻表や実際の便数も再現しない。近接する地点については利用が不向きとして採用せず、上記の系統から両方向の接続を特定できなかった組み合わせは「調査したが特定できず」とした。例えばバングラ・サーヒブ↔クトゥブ方面の725系統は、資料や方向によって停留所の記載に違いがあり、未確定にしている。これらは交通手段が存在しないとの判定ではない。

## 公共交通の未確定方向の再確認（2026-11-03）

次の方向を、地点間の民間経路案内と停留所の路線一覧に基づき追加。待ち時間・地点と停留所の接続を含む時間は、既存のゲーム用タクシー時間の1.6倍に15分を加えて5分単位に切り上げた設定。料金は大人２人合計₹30のゲーム値で、運賃・所要時間の実測値ではない。片方向ずつ照合し、同じ系統や停留所を帰路へ自動複製していない。宿はRajiv Chowk近辺という架空の位置で、実在宿ではない。

| 方向 | 確認したバス区間 | ゲームの時間・２人分 |
|---|---|---:|
| クトゥブ・ミナール → ロディ・ガーデン | [505Down Qutub Minar → Prithvi Raj Road](https://www.rome2rio.com/s/Qutb-Minar/Lodhi-Garden) | 105分・₹30 |
| ロディ・ガーデン → クトゥブ・ミナール | [505Up SJ Madrasa → Qutub Minar](https://www.rome2rio.com/s/Lodhi-Garden/Qutb-Minar) | 105分・₹30 |
| クトゥブ・ミナール → ロータス寺院 | [534Down Qutub Minar → Nehru Place Terminal](https://www.rome2rio.com/s/Qutb-Minar/Lotus-Temple) | 100分・₹30 |
| ロータス寺院 → クトゥブ・ミナール | [534Up Kalkaji Mandir → Qutub Minar](https://www.rome2rio.com/s/Lotus-Temple/Qutb-Minar) | 100分・₹30 |
| ロディ・ガーデン → フマユーン廟 | [794Down Lodhi Garden / Mousam Bhawan → Police Station Nizamuddin](https://www.rome2rio.com/s/Lodi-Gardens/Humayun-s-Tomb) | 55分・₹30 |
| フマユーン廟 → ロディ・ガーデン | [19Up Police Station Nizamuddin → Prithviraj Road Crossing](https://www.rome2rio.com/s/Humayun-s-Tomb/Lodi-Gardens) | 55分・₹30 |
| インド門 → グルドワーラ・バングラ・サーヒブ | [410Down Akbar Road → Gurudwara Bangla Sahib](https://www.rome2rio.com/s/India-Gate/Gurdwara-Bangla-Sahib) | 55分・₹30 |
| グルドワーラ・バングラ・サーヒブ → インド門 | [410Up Gurudwara Bangla Sahib → Akbar Road](https://www.rome2rio.com/s/Gurdwara-Bangla-Sahib/India-Gate) | 55分・₹30 |
| デリーの架空宿（ラジーヴ・チョーク付近） → フマユーン廟 | [CBD2(-)Down Super Bazar → Police Station Nizamuddin](https://www.rome2rio.com/s/Rajiv-Chowk/Humayun-s-Tomb) | 80分・₹30 |
| フマユーン廟 → デリーの架空宿（ラジーヴ・チョーク付近） | [966Up Police Station Nizamuddin → Shivaji Stadium Terminal](https://www.rome2rio.com/s/Humayun-s-Tomb/Rajiv-Chowk) | 80分・₹30 |
| デリーの架空宿（ラジーヴ・チョーク付近） → クトゥブ・ミナール | [505Up Super Bazar → Qutub Minar](https://www.rome2rio.com/s/Rajiv-Chowk/Qutb-Minar) | 140分・₹30 |
| クトゥブ・ミナール → デリーの架空宿（ラジーヴ・チョーク付近） | [505Down Qutub Minar → Indian Oil Bhawan](https://www.rome2rio.com/s/Qutb-Minar/Rajiv-Chowk) | 140分・₹30 |
| ロディ・ガーデン → ロータス寺院 | [47AUp Max Mueller Marg → NSIC](https://www.rome2rio.com/s/Lodi-Gardens/Lotus-Temple) | 85分・₹30 |
| ロータス寺院 → ロディ・ガーデン | [47ADown NSIC → Lodhi Colony](https://www.rome2rio.com/s/Lotus-Temple/Lodhi-Garden) | 85分・₹30 |
| グルドワーラ・バングラ・サーヒブ → フマユーン廟 | [410Up Gurudwara Bangla Sahib → Police Station Nizamuddin](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnf-410up) | 80分・₹30 |
| フマユーン廟 → グルドワーラ・バングラ・サーヒブ | [410Down Police Station Nizamuddin → Gurudwara Bangla Sahib](https://www.rome2rio.com/s/Humayun-s-Tomb/Gurdwara-Bangla-Sahib) | 80分・₹30 |
| グルドワーラ・バングラ・サーヒブ → ロータス寺院 | [47AUp Gurudwara Bangla Sahib → Kalkaji Mandir](https://www.rome2rio.com/s/Gurdwara-Bangla-Sahib/Lotus-Temple) | 115分・₹30 |
| ロータス寺院 → グルドワーラ・バングラ・サーヒブ | [433Down NSIC → PS Parliament / Jantar Mantar](https://www.rome2rio.com/s/Lotus-Temple/Gurdwara-Bangla-Sahib) | 115分・₹30 |
| グルドワーラ・バングラ・サーヒブ → ロディ・ガーデン | [47AUp Gurudwara Bangla Sahib → Lodhi Road Crossing](https://www.rome2rio.com/s/Gurdwara-Bangla-Sahib/Lodhi-Garden) | 65分・₹30 |
| ロディ・ガーデン → グルドワーラ・バングラ・サーヒブ | [47ADown Lodhi Colony → Aakashwani Bhawan](https://www.rome2rio.com/s/Lodhi-Garden/Gurdwara-Bangla-Sahib) | 65分・₹30 |
| デリーの架空宿（ラジーヴ・チョーク付近） → インド門 | [456Up Super Bazar → Baroda House](https://www.rome2rio.com/s/Rajiv-Chowk/India-Gate) | 55分・₹30 |
| インド門 → デリーの架空宿（ラジーヴ・チョーク付近） | [966Up Baroda House → Scindia House](https://www.rome2rio.com/s/India-Gate/Rajiv-Chowk) | 55分・₹30 |
| ロディ・ガーデン → ジャーマー・マスジド | [501Down Prithvi Raj Road Crossing → Darya Ganj Golcha Cinema](https://www.rome2rio.com/s/Lodi-Gardens/Jama-Masjid-Old-Delhi-Delhi-India) | 90分・₹30 |
| ジャーマー・マスジド → ロディ・ガーデン | [501Up Jama Masjid → Prithvi Raj Road](https://www.rome2rio.com/s/Jama-Masjid-Old-Delhi-Delhi-India/Lodhi-Garden) | 90分・₹30 |
| クトゥブ・ミナール → フマユーン廟 | [413Down Qutub Minar → Nizamuddin station](https://www.rome2rio.com/s/Qutb-Minar/Humayun-s-Tomb) | 120分・₹30 |
| フマユーン廟 → クトゥブ・ミナール | [413Up Nizamuddin station → Mehrauli](https://www.rome2rio.com/s/Humayun-s-Tomb/Qutb-Minar) | 120分・₹30 |
| グルドワーラ・バングラ・サーヒブ → クトゥブ・ミナール | [725Down Gurudwara Bangla Sahib → Qutub Minar](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnfs-725down) | 135分・₹30 |

[DIMTSの2025年運行路線一覧](https://dimts.in/Details%20of%20Operational%20Routes.pdf)は413系統、[DTCの運賃段階資料](https://dtc.delhi.gov.in/sites/default/files/DTC/important-news/route_no_410_circular.pdf)は410系統の候補停留所を掲載する。掲載時点以降の運行や実際の通行・入口を保証するものではない。

クトゥブ・ミナール→架空宿は、Rome2Rioが505DownのIndian Oil Bhawan停留所を候補に挙げる一方、[別の505Down一覧](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnfs-505down)ではその名称を確認できない。都心側停留所から架空宿への接続はゲーム上の仮定とし、現地の出口・停留所名は未確定。

725DownはBangla SahibからQutub Minar方面を確認できた。逆方向はRome2Rioと[別の725Up一覧](https://www.transit.land/explore/operators/o-ttn-delhitransportcorporation/routes/r-ttnfs-725up)で到着停留所の表示が食い違うため、経路を登録せず未確定のままとした。架空宿とアグラセン・キ・バオリのバスも未確定のまま。
