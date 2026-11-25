# 街歩きの「待機」・店・ツアーの札の写真（2026-11-25）

ユーザーの依頼：街歩きの行き先の札のうち、写真のない「待機」と「布地の店」に写真を付ける。待機は「インドの牛が道でくつろいでいる写真」、布地の店は候補を考える。ほかにも写真を付けられる札があれば付ける。

## 決めたこと

- 仕組み：`travel/<都市ID>-settings.json` の任意の `waitPhotoAssetId`・`tourPhotoAssetId`、`shop/catalog.json` の店の任意の `photoAssetId` を足した（観光画像のID。検査と縮小版は地点の `photoAssetId` と同じ）。
- 待機（都市ごとに、その都市の路上の牛）
  - デリー `gt_img_delhi_wait_cows`：McKay Savage「India - Delhi - 009 - cows hanging out on the road」（Flickr 2129391055、CC BY 2.0）。Commons の分類が Paharganj で、デリーの宿のある界隈。牛3頭が通りで立ち止まっている。
  - アーグラ `gt_img_agra_wait_cows`：Bahnfrend「Agra back streets, 2008 (02)」（CC BY-SA 3.0、own work、Nikon D50）。裏通りの牛2頭と、縁台の子どもたち。
  - ジャイプール `gt_img_jaipur_wait_cows`：Kelisi「FreeRangeUrbanCowsJaipur2010」（CC BY-SA 4.0、own work）。街なかの空き地で牛が何頭も座りこんでいる。いちばん「くつろいでいる」写真。
- 布地の店（3都市の店の説明の文に合わせて選んだ。どれもジャイプールの店の写真なので、デリー・アーグラの店の `altJa` には「（〜の店のイメージ）」と書いた）
  - デリー「天井近くまで積み上がった…広げて見せてもらえる」→ `gt_img_delhi_cloth_shop`：Ninara「Textile shop in Jaipur1」（Flickr 49124598956、CC BY 2.0、FlickreviewR 2 済み）。積んだ布の前で店の人2人が布を広げている。
  - アーグラ「畳んだ布を棚いっぱいに並べた」→ `gt_img_agra_cloth_shop`：Ninara「Textile shop in Jaipur」（Flickr 49124785092、CC BY 2.0、同）。
  - ジャイプール「店先に布を吊るして、風に揺らしている」→ `gt_img_jaipur_cloth_shop`：Ninara「Jaipur, India - Clothing shop」（Flickr 49111826176、CC BY 2.0、同）。
- ツアー（アーグラのファテープル・シークリー日帰り）：登録済みの `gt_img_agra_fatehpur_sikri_distant`（アーグラ・ジャイプール道路から見た遠景）。車で向かうツアーに合い、観光地の札の写真（ハーティー門付近）とも重ならない。
- 加工：見知らぬ人の顔（アーグラの子どもたち、デリーの奥の男性、布地の店の店の人2人、ジャイプールの店先の少女）と、デリーの車のナンバープレートをぼかした。ジャイプールの牛は、左下の撮影地と日付の文字を除くため下端48pxを切った。どれも `modificationJa` に書いた。描き足し・AI生成なし。
- 写真を付けなかった札：ミラノのプラダ財団（2015年の現代建築。イタリアにはパノラマの自由がなく、建物の写真の権利の確認が要る）とサン・マウリツィオ教会、ミラノの「待機」、各旅行編の宿（架空の宿）。ウズベキスタン編・ルアンパバーン編は準備中。

## 候補と外した理由

探した所：Wikimedia Commons の分類（Cattle in Delhi・Cows in Delhi・Cattle on roads in India / Rajasthan / Uttar Pradesh・Cattle in Jaipur・Cows in India・Lying cattle・Resting cattle・Textile shops in India / Jaipur・Clothing shops in Jaipur・Shops in Jaipur）。全文検索は「too busy」と 429 でほとんど返らなかった（cow lying road Delhi などは PDF ばかり）。Sari shops・Fabric shops in India・Shops in Agra・Shops in Delhi の分類は、回数の制限で開けなかった。

- 牛：Cow in Delhi-1〜3（ごみの山を食べている）、Well-loved cow, Delhi / Cow on Delhi street（飾った牛を連れた人が主役）、20191205 Krowy i pies na ulicy Delhi（ごみと犬）、Agra 60 - Taj Ganj shopping（立っているだけで店の看板が主役）、India Taj Mahal (14〜17)（水牛）、Bos taurus DT -IN Jaipur-（ごみの山）、Pink City, Jaipur（牛が小さい）、Delhi - Rind als Verkehrsteilnehmer 02・Street Cow, Delhi（1頭が立っているだけ）。
- 布地の店：Clothing shop in Jaipur1 / 2（客の顔が多く写る）、Textile shop in Jaipur, India（CC0 だが客が密集し顔が多い）、Textile shop - Jaipur（店の人が1人、模様の布を広げる。デリーの候補の次点）、Goods in textile shop（布の寄りで、店に見えない）、Sari on mannequin for demo（旅の図鑑の言葉「サリー」に使用済み）。

## 確かめたこと（2026-11-25）

- ライセンス・作者・撮影日は Commons のファイルのページの情報（API の extmetadata）で読んだ。Flickr から来た4枚は FlickreviewR の確認済みの分類が付いている。Flickr の写真のページそのものは開いていない。
- 撮影日：デリーの牛 2007-11-17、アーグラの牛 2008-12-29、ジャイプールの牛 2010-01-28、布地の店 2019-11-04・05（どれも昼）。
- 配信：Commons の縮小版（1920px。ジャイプールの牛は1280px）から作り、幅1600px・高さ1800pxの枠に収めて WebP 品質80。

## 確かめられなかったこと

- アーグラ・デリーの布地の店の、その都市で撮った自由ライセンスの写真（分類が回数の制限で開けなかった）。見つかれば差し替える。
- 布地の店の店の人が撮影に同意していたか（構えて布を広げているので、撮られることは知っていたと思われるが、記録はない）。顔はぼかした。
