# 都市交通と都市間移動｜乗車時刻・運賃の根拠

## 現実とゲームを分離する
徒歩：`WALK_ROUTES.csv` の各方向は道路網未計算、自己同地点以外の時間は NULL。市内交通：`LOCAL_TRANSPORT.csv` では路線・乗場・待機・乗車・降車後徒歩を列として確保したが、時間の確証がないセルは空白。都市間移動：`INTERCITY_TRANSPORT.csv` で独立管理、非都市内の `travelRoute` に無理に注入しない。

## Delhi → Agra
- 鉄道12050 Gatimaanを第三者時刻資料で確認。Hazrat Nizamuddin NZM 08:10 → Agra Cantt AGC 09:50、188km、100分の例。ただし掲載元の運行曜日欄に矛盾があり、将来の特定日を保証しない。駅はNew Delhi (NDLS)でもAgra Fort (AF)でもない。Source: https://www.confirmtkt.com/train-schedule/12050
- Indian Railways公式の列車検索画面: https://www.indianrail.gov.in/enquiry/SCHEDULE/TrainSchedule.jsp 。照合は日付指定して行う。
- 道路車・長距離バスはオペレーター価格や道路網時間の確認前のため空欄。荷物がある2名の旅では、タクシーなら車両料金を2倍にしない。

## Agra → Jaipur
- 鉄道22988の第三者掲載例 Agra Fort (AF)→Jaipur (JP) 14:35→18:45、約241km、250分。別の時刻掲載には5分差があり運行日は未照合。料金未確認。
- RSRTC公式: https://www.rsrtconline.rajasthan.gov.in/ 。経路と乗り場の情報は検索日に依存する。
- 非公式バス案内の参考目安は約240km/4.5–5.5時間程度だが、事業者保証ではない。固定ルートとしない。
- Fatehpur Sikri：Agraから西へ36–40km、観光90–240分の設計候補。AbhaneriのChand Baori：座標は`WAYPOINTS.json`。両施設への**迂回増分**は道路ネットワーク未計算のため空欄。

## Jaipur city
- RTDC公式の日帰り観光バスには600₹/人の掲載例。複数ページでルート・値段・時刻が異なるので具体的開催回は直接再確認。2名なら基本的に2倍。 https://rtdc.tourism.rajasthan.gov.in/Client/CityTour.aspx
- Jaipur Metro の2025年1月料金告示掲載を確認したが、PDF本文全体の料金を画面で検証できていないため運賃未確定。 https://transport.rajasthan.gov.in/content/transportportal/en/metro-portal/passanger-information/metro-fares.html

## Delhi metro
2025/8/25改定の報道で距離帯別の一般料金は₹11 / ₹21 / ₹32 / ₹43 / ₹54 / ₹64（平日、乗車距離に依存）。**この帯を地点間の運賃として割当てていない**。日祝・カード・Airport Expressは別料金。 https://timesofindia.indiatimes.com/city/delhi/delhi-metro-announces-first-fare-hike-since-2017-minimum-ticket-now-rs-11-maximum-rs-64-airport-express-fares-up-by-rs-5/articleshow/123492444.cms

## オートリキシャ
実料金はアプリ・交渉・メーター・現地規則に依存。現行 `travelRoute.mode` に `auto_rickshaw` がないため追加 enum または `taxi` の表示多態化が必要。**交渉前の金額を固定現地運賃として販売・表示しない**。

## ゲーム化する二案
**現実時間案**：宿→駅までの徒歩・待機・乗車・到着地→宿の徒歩・チェックインを明示、都市間の旅行時刻もゲーム時計に反映。**テンポ優先案**：出発時に交通選択肢と総価格を見せ、長距離移動は一回の確定操作で次都市の朝の指定時刻へ進める。どちらもローカル交通と都市間交通を別モデル化し、ゲーム初期金を都市移動時に再付与しない。
