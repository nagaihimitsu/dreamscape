# インド編の夜と夕方の写真（2026-11-15）

夜の場面なのに、昼の写真や別の都市の写真が出ていた所に、夜（1枚は夕方）の写真を7枚足した。
2026-11-15 に2回に分けて作業した（1回目は5枚、2回目は2枚）。この記録は 2026-11-16 に、その2回の作業の報告から移した。

- 1回目：ユーザーの答え「足す。それに加えてライトアップのものも足すのはどうだろう」。宿の屋上（アーグラ・ジャイプール）、
  デリーのフィナーレのチャンドニー・チョークとレッド・フォートの光と音のショー、チャンドニー・チョークとジャル・マハルのデートの夜の書き出し。
- 2回目：1回目の報告で聞いた2点に、ユーザーが「はい」。デリーの宿の夜の宿題の場面（帳場）と、アーグラのフィナーレのメヘターブ・バーグ（夕方）。

写真の登録（作者・出典・ライセンス・加工・確認日）は `content/journeys/golden_triangle/tourism/catalog.json` の `assets`、
背景（名前・位置・上の帯の場所）は `content/journeys/golden_triangle/romance/presentation.json` の `backgrounds` にある。
ここは、選んだ理由・探した所・外した候補と、ページで読んだ文の記録。

## 足した写真

ファイルはどれも `content/journeys/golden_triangle/public/assets/tourism/india/` にある。
WebP（品質80）への変換は `npm run images:optimize -- --journey golden_triangle --write` で行った（`modificationJa` の最後の変換の文も、この道具が書いた）。

| 画像ID ／ ファイル | 背景ID | 使う場面 |
| --- | --- | --- |
| `gt_img_agra_tajganj_rooftops_night` ／ `agra_tajganj_rooftops_night.webp`（1600×1067） | `gt_bg_agra_hotel_rooftop_night` | アーグラの宿の屋上の告白と「チャイが冷めるまで」（`gt_agra_hotel_hub_dates.ink`）、アーグラのエピローグの屋上（`gt_agra_hotel_hub.ink`）。宿の地図の札（`travel/agra.json` の宿の `photoAssetId`） |
| `gt_img_jaipur_old_city_night` ／ `jaipur_old_city_night.webp`（1600×1067） | `gt_bg_jaipur_hotel_rooftop_night` | ジャイプールの宿の屋上の告白と「チャイが冷めるまで」（`gt_jaipur_hotel_hub_dates.ink`）。宿の地図の札（`travel/jaipur.json` の宿の `photoAssetId`） |
| `gt_img_delhi_red_fort_night` ／ `delhi_red_fort_night.webp`（1600×1020） | `gt_bg_delhi_red_fort_night` | デリーのフィナーレの、城の中の光と音のショーから終わりまで（`gt_delhi_red_fort.ink`。クイズ5もこの絵） |
| `gt_img_delhi_chandni_chowk_night` ／ `delhi_chandni_chowk_night.webp`（1600×1321） | `gt_bg_delhi_chandni_chowk_night` | デリーのフィナーレの、夜のチャンドニー・チョーク（`gt_delhi_red_fort.ink`。クイズ3・4もこの絵）。チャンドニー・チョークのデートの夜の書き出し（`gt_delhi_chandni_chowk.ink` の `cond("time night")` の枝） |
| `gt_img_jaipur_jal_mahal_night` ／ `jaipur_jal_mahal_night.webp`（1600×1067） | `gt_bg_jaipur_jal_mahal_night` | ジャル・マハルのデートの夜の書き出し（`gt_jaipur_jal_mahal.ink` の `cond("time night")` の枝） |
| `gt_img_delhi_paharganj_reception_night` ／ `delhi_paharganj_reception_night.webp`（1350×1800） | `gt_bg_delhi_hotel_hub_night` | デリーの宿の夜の宿題の場面（`gt_delhi_inserts.ink` の `gt_delhi_hotel_homework`）。昼の帳場の背景と宿の札は今までの昼の写真のまま |
| `gt_img_agra_mehtab_bagh_sunset` ／ `agra_mehtab_bagh_sunset.webp`（1600×1067） | `gt_bg_agra_mehtab_bagh_sunset` | アーグラのフィナーレの「夕方、一行は川を渡った」から終わりまで（`gt_agra_taj_mahal.ink`。クイズ2〜5と結果もこの絵）。正門の前の昼の部分と、メヘターブ・バーグのデート（昼）は今までの写真のまま |

場面の行の `# background:` と `# tint: off`（写真がもう夜なので、時刻の色を重ねない）は、どれも同じ日に書いた。

## 出典・作者・ライセンス・加工

ページは作業の日（2026-11-15）に読み、2026-11-16 にもう一度開いて、作者・ライセンス・撮影日・説明が下のとおりであることを確かめた。
引用はページの文のまま。ライセンスはインド編がすでに使っているもの（CC BY 2.0〜4.0、CC BY-SA 2.0〜4.0）だけ。

| 画像ID | 元のページ | 作者（ページの記載） | ライセンス（ページの文） | 撮影日・説明（ページの記載） | 加工 |
| --- | --- | --- | --- | --- | --- |
| `gt_img_agra_tajganj_rooftops_night` | https://commons.wikimedia.org/wiki/File:India_DSC01595_(16721145132).jpg | Jan Bockaert（Flickr から。「It was reviewed on 25 May 2015 by FlickreviewR and was confirmed to be licensed under the terms of the cc-by-sa-2.0.」） | 「This file is licensed under the Creative Commons Attribution-Share Alike 2.0 Generic license.」 | 「26 February 2015, 13:42」（**昼**）。元画像 6000×4000 | Commons の 1920×1280 の縮小版から。**昼の写真を夜に見えるように暗くした**：全体を暗く、青みを加え、色を薄く、空を上ほど・四隅を暗く。タージの白い大理石だけ暗くする度合いを弱めた。切り抜き・描き足し・AI生成なし |
| `gt_img_jaipur_old_city_night` | https://commons.wikimedia.org/wiki/File:Pink_city.jpg | Sabikhan26（「Own work」） | 「This file is licensed under the Creative Commons Attribution-Share Alike 4.0 International license.」 | 「3 April 2012, 19:11:46」。説明「Beautiful view at evening from Nahargarh Fort of pink city Jaipur」。元画像 5184×3456 | 縮小と WebP だけ |
| `gt_img_delhi_red_fort_night` | https://commons.wikimedia.org/wiki/File:Light_and_sound_show_in_Redfort.JPG | Abhinavmnnit（「Own work」） | 「This file is licensed under the Creative Commons Attribution-Share Alike 3.0 Unported license.」 | 「8 October 2011, 20:36:38」。分類「Diwan-i-Khas (Red Fort)」「Red Fort illuminated」。元画像 4000×2551 | 縮小と WebP だけ |
| `gt_img_delhi_chandni_chowk_night` | https://commons.wikimedia.org/wiki/File:Chandni_Chowk_(93969355).jpeg | Stuti B（「Imported from 500px (archived version) by the Archive Team.」） | 「This file is licensed under the Creative Commons Attribution 3.0 Unported license.」 | 日付の欄「27 December 2014, 05:57:02」。説明「500px provided description: The street of Chandni Chowk, Old Delhi」（タグに #night #evening）。元画像 2048×2035 | 黒い枠と、下端の写真共有サイトの名前（透かし）の帯を切り取り（1910×1577）。バイク・車のナンバープレート、店の看板の文字、看板に写った人の顔をぼかした。描き足し・AI生成なし |
| `gt_img_jaipur_jal_mahal_night` | https://commons.wikimedia.org/wiki/File:JALMAHAL_JAIPUR.jpg | Ajoygupta（「Own work」） | 「This file is licensed under the Creative Commons Attribution-Share Alike 4.0 International license.」 | 「23 October 2014, 19:36:27」。説明「Jal Mahal, Jaipur - by the night.」。元画像 6000×4000 | 縮小と WebP だけ |
| `gt_img_delhi_paharganj_reception_night` | https://www.flickr.com/photos/sasha-india/27650947394/ | Sasha India（題「Cottage Yes Please (New Delhi, India)」） | 「Some rights reserved」、リンクは https://creativecommons.org/licenses/by/2.0/deed.en（CC BY 2.0） | 撮影日の欄「Taken on January 1, 2008」（カメラの初期値と思われ、当てにならない）。位置情報はない | 今の昼の帳場と同じ写真の元画像（1944×2592）から。昼の版と同じ所の顔（係の男性・客の男性・窓の外の店先の3人）をぼかした。**夜に見えるように暗くした**：全体を暗く、灯りのような暖かい色に、色を少し薄く、四隅と床を暗く。天井と壁の灯りの周りは暗くする度合いを弱め、左の大きな窓（外の通り）は暗い青にして、店の明かりと看板の濃い色だけを少し残した。切り抜き・描き足し・AI生成なし |
| `gt_img_agra_mehtab_bagh_sunset` | https://commons.wikimedia.org/wiki/File:Sunset_view_of_the_Taj.jpg | Sumit Das（「Own work」） | 「This file is licensed under the Creative Commons Attribution-Share Alike 4.0 International license.」「This image was uploaded as part of Wiki Loves Monuments 2018.」 | 「10 November 2015, 16:31:47」。説明「View of the Taj Mahal from the banks of Mehtab Bagh in the sun-kissed glow of a summer evening.」（説明は夏、日付は11月。どちらもページのまま）。分類「Views of the Taj Mahal from Mehtab Bagh」。元画像 6000×4000 | 縮小と WebP だけ。遠くの基壇の上の人は点ほどで、顔は分からない |

- 本物の夜の写真ではないのは2枚（アーグラの屋上、デリーの夜の帳場）。どちらも `altJa` と `modificationJa` に「夜に見えるように暗くした」と書いた。
- ジャイプールの屋上は、宿の屋上からではなくナハルガル城から見た旧市街。背景の `captionJa` に「ナハルガル城から見た旧市街の夜景を用いたイメージ」と書いた。
- 暗くする加工とぼかしの手順（Python の小さな道具）は、作業用の一時フォルダに置いたもので、リポジトリには入れていない。
  結果の WebP と、`modificationJa` の説明が記録。

## 選んだ理由と、外した候補

探した所：Wikimedia Commons の検索・分類と、ファイルのページと API（`imageinfo` の `extmetadata`）。Openverse（Flickr と Commons を含む）。
2回目は Flickr のサイトの検索も見た（ライセンスを CC BY・BY-SA・CC0・PDM に絞り、検索の画面を見ただけ）。
Commons の API は混んでいて（429）何度も待ち直した。1回目に最後まで返らなかった検索の語は「Jaipur night rooftop」「Jaipur skyline night」の2つで、
同じ内容は分類「Night in Jaipur」「Jaipur at night」で見た。

- **アーグラの屋上**：本文は「宿の屋上から、夜、白く薄く光るタージのドーム」「反対側は洗濯物と貯水タンク」。
  「Taj Mahal rooftop night / Taj Ganj rooftop / view from hotel / dusk / twilight」と、分類 Tajganj・Taj Mahal at night で探したが、
  屋上からの本物の夜の写真は見つからなかった。夜の写真（`Taj_Mahal,_Agra_at_Night.jpg`、`Taj_Mahal_in_Moonlight.jpg` など）は敷地の中から撮ったもの。
  そこで、タージ・ガンジの屋上越しにドーム・正門・貯水タンク・洗濯物が写る昼の写真を、デリーの宿の部屋の夜版（`gt_img_delhi_paharganj_room_night`）と同じやり方で夜にした。
  外した候補：`Agra_1_Taj_viewed_from_the_terrace_DSCN2687`（朝の霞。洗濯物はあるが小さく粗い）、`Neighbour.jpg`（霞）。
- **ジャイプールの屋上**：本文は「旧市街は、夜になると、桃色が橙色に変わる」「下の通りの店の灯り」。屋上からの夜の写真は Commons になく、
  昼の屋上の写真（`Over_The_Rooftops_1〜9`）には灯りがない。外した候補：`Jaipur_Night_During_Diwali.jpg`（800×533 で小さすぎる）、
  `View_from_Nahargarh.jpg`（ディワリの灯りで空が真っ橙）。
- **レッド・フォート**：場面の山場は「光が、内謁の間の白いアーチを照らし出した」なので、ショーの最中の内謁の間の写真にした。
  外した候補：`Red_Fort_-Delhi_-...-DSC002.jpg`（同じショーだが画面の大半が真っ黒）、ラホール門のライトアップ（`Delhi_Red_Fort_Night.jpg` など。城の外の門で、場面は城の中）。
- **ジャル・マハル**：本文「灯りに縁どられた宮殿」「水面に映ったもう一つの宮殿が、風が吹くたびに揺れる」に、屋根の線が灯りで縁どられ、さざ波に光が揺れる写真が合う。
  外した候補：`Jal_Mahal,_Jaipur,_India.JPG`（青い夕暮れで、灯りの線より投光の照明）、`Beauty_in_the_water.jpg`（水面が鏡のように止まっている）。
- **チャンドニー・チョーク**：夜の場面が2つ（フィナーレとクイズ2問、デートの夜の書き出し）あるので足した。人は小さな後ろ姿と影だけ。
- **デリーの夜の帳場**：小さな宿の帳場を夜に撮った自由ライセンスの写真は見つからなかった。
  Commons の分類「Hotel lobbies in India」（大きなホテルだけ）・「Paharganj」（宿の中の夜の写真はない）、
  Openverse の「hotel reception night India」「guesthouse reception night」「Paharganj hotel night」「Paharganj reception」ほか、
  Flickr の「paharganj hotel」「hotel reception india」「delhi guesthouse」ほか（同じ宿 Cottage Yes Please の写真は約40枚あったが、すべて昼）。
  昼に見ている宿と同じ帳場を夜にすれば、場面のつながりも保てるので、この形にした。
- **メヘターブ・バーグの夕方**：本文は「メヘターブ・バーグの岸辺。夕日に染まるタージが、川向こうに正面から見えた」。
  「Taj Mahal Mehtab Bagh sunset」「Taj Mahal from Mehtab Bagh dusk」「Taj Mahal sunset Yamuna」「Taj Mahal evening Yamuna」と、
  分類「Views of the Taj Mahal from Mehtab Bagh」「Sunsets at the Taj Mahal」を見た。外した候補：
  `Taj_Mahal_at_sunset.jpg`（本物の夕焼けだが広角でタージが小さく、縦の画面では立ち絵の後ろに隠れる）、
  `Taj_Sunset_(6639047373).jpg`（場面にぴったりの説明だが、右下に作者の手書きの署名。切り取りは避けた）、
  `Many_hues_of_Taj_Mahal.jpg`（撮影時刻が 08:38 で朝の可能性が高い）、`Taj_Mahal_in_winter_02.jpg`（ドームが二人の間に半分隠れる。次点）、
  `Taj_Mahal_as_seen_from_Mehtab_Bagh_,_evening_view.jpg`（日没後の青い時間で、タージが小さい）、`Taj_Mahal_from_Mehtab_Bhag,_Monsoon_Dusk.jpg`（白黒）。

候補の上位は、実際の場面（390×844、立ち絵と会話の窓がある行）に入れて見比べ、背景の `imagePosition` もそこで決めた
（アーグラの屋上 x62、レッド・フォート x72、チャンドニー・チョーク x35、ジャル・マハル x52、ジャイプールの屋上 x50、夜の帳場 x40、メヘターブ・バーグ x50）。

## 文と写真が少し食い違う所（文は変えていない）

- ジャイプールの屋上は城の上からの遠い眺めなので、「眼下の旧市街を、よその花婿の行列が、ゆっくり横切っていく」の行列は写真には見えない。
- アーグラのフィナーレの「日が沈み、川向こうのタージが、白から灰色へ変わっていく」：写真は西日の金色のまま。
  「川向こうに正面から見えた」：写真は望遠で、川そのものは写っていない（前の昼の写真も同じ）。
- メヘターブ・バーグの写真の左端の尖塔に、修復の足場が組まれている（`altJa` に書いた。390×844 では画面の外）。
- 夜の帳場の写真には、係の男性と客の男性（顔はぼかした）がいて、宿題をする女の子は写っていない（女の子は立ち絵で出る。昼の写真のときから同じ）。
- ゲームの時計では18:00から夜。18時台はまだ夕暮れの季節もありうるが、写真は真っ暗な夜にしている。
