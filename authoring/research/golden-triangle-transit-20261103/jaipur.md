# ジャイプール：地下鉄・市内バス調査

確認日：2026-11-03。これはゲーム制作の調査メモであり、現地向けの経路案内ではない。料金・所要時間・路線の運行は変動する。駅と施設の実際の出入口、バス停の正確な位置、運行日・運行方向・運休・歩行可能な通路の現地確認はしていない。架空宿は駅周辺に配置したゲーム上の地点であり、実在する宿ではない。

## 確認したバス路線と資料

- [ラージャスターン州交通局の路線一覧](https://transport.rajasthan.gov.in/content/dam/transport/jaipurbus/pdf/Sheet2.pdf) は、AC1について Sanganer → Ajmeri Gate → Sanganeri Gate → Badi Chopar → Ramgarh Mode → Jal Mahal → Amber Fort → Kukas を記載する。公的資料だが、発行時点と現在の運行状況は別に確認が必要。
- [City of Jaipur のAC1路線](https://www.cityofjaipur.com/jaipur-travel-and-transportation/getting-around-jaipur/public-transport/jaipur-low-floor-bus/bus-routes/jaipur-low-floor-bus-route-no-ac1-sanganer-to-kukas/)も上記の主要区間を示す。別の民間情報のため最新運行を保証しない。
- [JaipurBus のAC1逆方向](https://jaipurbus.in/routes/ac1?dir=ac1%3Adown)はKukasからSanganer方面の順にAmer Fort、Jal Mahal、Badi Chaupar、Sanganeri Gateを掲載する。頻度・時刻の欄は未掲載であり、現行の運行状況を保証しない。
- [Badi Chaupar–Jal Mahal](https://www.rome2rio.com/s/Badi-Chaupar-Station/Jal-Mahal-Station) はAC1について、片道一人あたり₹14–17・約16分の参考値を掲載。[Amber Fort–Badi Chaupar](https://www.rome2rio.com/s/Amber-Fort/Badi-Chaupar-Station) は₹21–26・約33分、[Jal Mahal–Amber Fort](https://www.rome2rio.com/s/Jal-Mahal/Amber-Fort) は₹14–17・約21分の参考値を掲載する。これらは民間サイトの概算で、公式運賃や運行保証ではない。往復方向の値の厳密な一致も確認していない。
- アルバート・ホールは[Ajmeri Gate 停留所から徒歩の案内](https://haydenrue.com/india/rajasthan/albert-hall-museum-in-jaipur/)がある。[Panna Meena ka KundはAmer Fort周辺から徒歩または短距離移動](https://www.jaipurtourplanner.com/destination/panna-meena-ka-kund/)の案内がある。接続の実際の道路・入口は未検証であり、後者は施設前にバスが来るという意味ではない。
- [州交通局のバス運賃表ページ](https://transport.rajasthan.gov.in/content/transportportal/en/jaipur-bus/fares-tickets/fare-chart.html)は画像形式で、今回テキストとして運賃表を確認できなかった。[民間AC1案内](https://jaipurinsider.com/bus-routes/route-ac1)は距離別AC運賃を示すが、運賃表の現行性は別途確認が必要。制作値を公式の現行運賃としない。

## 地点ごとの判定

| 地点 | 調査結果とゲーム上の扱い |
|---|---|
| ハワー・マハル、シティ・パレス、ジャンタル・マンタル、ジョーハリー・バザール | Badi Chaupar周辺の施設として、遠方へのAC1を候補にする。入口と停留所の接続時間はゲーム用推定。 |
| 架空宿 | 地図上でBadi Chaupar近辺に置いた架空の位置を用いてAC1へ接続するゲーム上の仮定。実在ホテルの停留所とは扱わない。 |
| ジャル・マハル | AC1のJal Mahal停留所を利用する候補。 |
| アンベール城 | AC1のAmber Fort停留所を利用する候補。城の入口までの接続は推定。 |
| パンナ・ミーナー・クンド | Amer/Amber Fort地域までバスを使い、さらに徒歩を含める候補。施設入口に停車する路線として扱わない。 |
| アルバート・ホール | Ajmeri GateまでAC1と徒歩の組み合わせを遠方との移動候補にする。 |
| ジャイガル城 | [民間の現地案内](https://jaigarhforttickets.com/)はアンベール城方面のバス後に車で坂を上る接続を案内する。AC1の停留所とゲーム内の車移動を組み合わせ、車の費用も含めた選択肢を登録。直通バスとは扱わず、乗換を表示する。アンベールとの連絡トンネルは公開状況に食い違いがあり、通れると断定しない。 |
| ナハルガル城 | [州観光局](https://www.tourism.rajasthan.gov.in/nahargarh-fort.html)は要塞への公共交通がないと記載し、往復に車を推奨。下記の再調査ではAmer方面のAC1と車を乗り継ぐゲーム用候補を追加した。直通バスは存在すると扱わない。 |

## 登録したゲーム用の参考値

運賃は常に**２人合計のゲーム用推定額**。所要時間はバス乗車だけでなく、モデル上の待ち時間と停留所までの接続を含む概算。停留所や歩道の現地実測ではない。同じモデル値を両方向に使うことも、現実の対称性や時刻表を保証しない。

| 区間 | 所要時間 | ２人合計 |
|---|---:|---:|
| Badi Chaupar周辺 ↔ アルバート・ホール | 30分 | ₹40 |
| Badi Chaupar周辺 ↔ ジャイガル城（アンベールでバスと車を乗換） | 60分 | ₹170 |
| アルバート・ホール ↔ ジャイガル城（同上） | 80分 | ₹190 |
| ジャル・マハル ↔ ジャイガル城（同上） | 45分 | ₹150 |
| Badi Chaupar周辺 ↔ ジャル・マハル | 30分 | ₹40 |
| Badi Chaupar周辺 ↔ アンベール城 | 45分 | ₹60 |
| Badi Chaupar周辺 ↔ パンナ・ミーナー・クンド | 60分 | ₹60 |
| アルバート・ホール ↔ ジャル・マハル | 50分 | ₹60 |
| アルバート・ホール ↔ アンベール城 | 65分 | ₹80 |
| アルバート・ホール ↔ パンナ・ミーナー・クンド | 80分 | ₹80 |
| ジャル・マハル ↔ アンベール城 | 30分 | ₹40 |
| ジャル・マハル ↔ パンナ・ミーナー・クンド | 45分 | ₹40 |

モデル上のBadi Chaupar周辺は上表の４施設と架空宿をいう。旧市街↔アルバート・ホールは民間案内の[往路](https://www.rome2rio.com/s/Hawa-Mahal/Albert-Hall-Museum)・[復路](https://www.rome2rio.com/es/s/Albert-Hall-Museum/Hawa-Mahal)にAC1が載り、片道１人あたり参考価格は資料と方向によって₹12〜25程度。最新・確定運賃ではない。ジャイガル城行きは既存のAC1モデル時間・2人運賃にアンベール↔ジャイガルのゲーム用車時間・費用を合算し、車とバスの接続を表示する。後者は[現地案内](https://jaigarhforttickets.com/)に基づくが、待ち時間や現地価格、車を確実に利用できることまでは保証しない。旧市街内部・アンベール周辺内部は同じ停留所を使う近距離としてバスは不採用。ナハルガルは直通公共交通がないという州観光局の案内を確認した後、下記の再調査で車を含む乗継候補を追加した。

## 地下鉄：確認済みと未確認を区別する

[州交通局の地下鉄運賃ページ](https://transport.rajasthan.gov.in/content/transportportal/en/metro-portal/passanger-information/metro-fares.html)には2025年の改定告示があるが、添付PDFを取得できず、今回その表の数値を確認していない。[民間の地下鉄ガイド](https://ilovejaipur.city/metro/)や[シティ・パレス](https://jaipurmetro.org/how-to-get-to-city-palace-jaipur-by-metro/)、[ジャンタル・マンタル](https://jaipurmetro.org/how-to-get-to-jantar-mantar-by-metro/)の案内はBadi Chauparを主要な徒歩圏としている。

ハワー・マハル、シティ・パレス、ジャンタル・マンタル、ジョーハリー・バザールと架空宿はBadi Chaupar周辺として扱い、これら相互の地下鉄乗車は今回採用しない。ジャル・マハル／アンベール／パンナ・ミーナー／ジャイガルはPink Line終点より東・北側で、[地下鉄案内](https://mapa-metro.com/en/india/jaipur/jaipur-metro-map.htm)もジャル・マハルとアンベールへの地下鉄直通がないとしている。旧市街側やそれら近隣の地点間では終点から目的地方向に駅間乗車が進まないため、地下鉄のみの有用な区間として採用しない。AC1と車による接続は別に登録済みであり、鉄道の存在や他の乗継経路の可能性を否定しない。

Albert Hallは[Chhoti Chauparからの接続を示す案内](https://jaipurmetro.org/jaipur-attractions-near-the-metro/)と[Badi Chauparも同程度とする直線距離の案内](https://metrodost.com/jaipur/places/albert-hall-museum/)で候補が異なり、地点間の有用な駅接続を特定できない。ナハルガルのChandpoleを使う候補については、下記の再調査と採用判断を参照。確認できない地点間は、不可能とは断定せず「特定できず」とする。

## 再調査：ナハルガル城への乗継候補（2026-11-03）

[AC1の往路](https://jaipurbus.in/routes/ac1)と[復路](https://jaipurbus.in/routes/ac1?dir=ac1%3Adown)はJoravar Singh GateとAmer Fortを掲載している。民間経路案内は[ナハルガル城から門まで車、その先AC1](https://www.rome2rio.com/s/Nahargarh-Fort/Jaigarh-Fort)、[逆方向のAC1と門から城への車](https://static.r2r.io/s/Jaigarh-Fort/Nahargarh-Fort)を掲載する。これらの資料の目的地はジャイガル城だが、両者が示す**門〜Amer Fort間のバスと門〜ナハルガル城間の車のみ**を参照し、ジャイガル城への徒歩・トンネル接続は採用しない。パンナ・ミーナー・クンドは[Amer地区でアンベール城近くにある](https://www.elephantvillageamer.com/blog/our-blog-1/panna-meena-ka-kund-jaipur-36)ため、Amer Fort停留所からの接続を別途含めるゲームモデルとし、施設前までバスが来ると扱わない。

アンベール城↔ナハルガル城は片道75分・２人₹220、パンナ・ミーナー↔ナハルガル城は片道90分・２人₹220のゲーム設定を追加した。いずれも車とAC1の双方、待ち時間、地点・停留所間の接続を含める推定であり、実際の道路・時刻・運賃を示さない。方向ごとに「ジョラワール門でバスへ／車へ乗換」を表示する。Rajasthan Tourismの「城への公共交通はない」という案内と矛盾しないよう、城まで直通バスがあるという表現はしない。

地下鉄については、[Badi Chaupar→Chandpoleの列車](https://www.rome2rio.com/s/Badi-Chaupar-Station/Nahargarh-Fort)と[逆方向の候補](https://www.rome2rio.com/s/Nahargarh-Fort/Badi-Chaupar-Station)、[Chandpole駅から城への車接続](https://jaipurride.vercel.app/explore-jaipur/nahargarh_fort)を確認した。旧市街の５地点との10方向では、現在のゲーム内の直通タクシー18〜22分・₹150〜170に比べ駅と車への乗換が増え、選択肢としての便益を確認できないため今回は採用しない。これはゲームの設定に基づく判断であり、実際の時間・運賃の比較や他の経路の不存在を意味しない。Albert Hallの候補駅や他の地点の地下鉄利用については引き続き未確定とする。

## 公共交通の残る候補の再確認（2026-11-03）

アルバート・ホール博物館は [Chhoti Chauparを利用する候補の案内](https://www.rome2rio.com/s/Albert-Hall-Museum/Mansarovar) があり、ナハルガル城からは [Chandpole駅への車接続](https://www.rome2rio.com/s/Nahargarh-Fort/Mansarovar) が案内されている。両駅間は地下鉄が運行しており、逆方向についてもそれぞれ別の案内を確認した。２地点を接続した現実の単一行程を確認したものではなく、資料にある区間を組み合わせたゲーム用モデルとして、ナハルガル城↔アルバート・ホールを60分・２人₹180で登録した。地下鉄と車の乗換を表示し、現地の入口・通路・運行や時刻、実費は保証しない。地下鉄駅の唯一の最寄りを断定するものでもない。

ナハルガル城と旧市街・ジャル・マハル・アルバート・ホールの14方向では、[AC1と車の乗換候補](https://www.rome2rio.com/s/Nahargarh-Fort/Jaigarh-Fort)と逆方向の案内を調べ、対象地点付近の停留所と結び付けた。車₹160・バス２人₹40に待機と接続を足すゲーム用モデルは、各地点の登録済みタクシーより遅く高額になるため、今回はバスの選択肢として採用しない。これは公共交通や別の乗り継ぎが存在しないという意味ではない。

その他の地下鉄候補は、[Badi Chaupar↔Chandpole](https://www.jaipurmetro.com/route/badi-chaupar-to-chandpole) または [Chhoti Chaupar↔Chandpole](https://www.jaipurmetro.com/route/chhoti-chaupar-to-chandpole) と、登録済みのAC1・車・徒歩を組み合わせたゲーム用の時間と２人分費用を比較した。登録済みの直接移動やバス・車が同額以下かつ短時間の地下鉄26方向は、今回は重複候補を不採用とした。比較はゲーム内の仮定であり、実在する駅、運行、他の移動手段や現地の費用・時間を否定するものではない。詳細な方向ごとの理由・出典は `decisions.json` を参照する。
