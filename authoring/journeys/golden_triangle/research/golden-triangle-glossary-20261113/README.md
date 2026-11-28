# 旅の図鑑：ゴールデントライアングル編の言葉の調査（2026-11-13）

この下の「調査の記録」は、インド編の台本から旅の図鑑の言葉を集めたときの記録（候補45語・1行の説明の根拠・札の置き場所・写真の候補）。
`terms-research.json` はその全データ（`priority`・`factSources`・`notesJa`・`tags`・`photo` つき）。ゲームが読むのは
`content/journeys/golden_triangle/glossary/terms.json`（言葉の欄だけ）と、`tourism/catalog.json` の `gt_img_term_…` の写真だけ。

## 統合で決めたこと（2026-11-13）

- 入れた言葉：33語。優先度 高・中の26語すべてと、低のうち7語（パラーター・アジョワン・クルハル・ティフィン・隊商宿・細密画・セーラー）。
  ほかの低の12語（プーリー・ワカケホンセイインコ・電動リキシャ・デリーの鉄柱・銀の大壺・笑う会・ジャイヴァーナ・祝い金の一ルピー・
  パンチャーング・葉の器・願いの糸・サハーヤク）は入れていない。
- 同じ行の二つの言葉：インド門のデートの行はアチャールだけ、デリー到着の行はニハーリーだけ。レッド・フォートのフィナーレの行は
  パラーター → 自転車リキシャの順に札を置いた（自転車リキシャはジャーマー・マスジドの案内で先に出ているので、ふつうは窓が一枚）。
  アジョワンは二度目に出る行（「母は、何にでもアジョワンを入れます」）に置いた。
- 土地の言葉と同じ行（ペーター・メヘンディ・キチュリー・ランガル・ニハーリー）：窓が出て、「ことばを覚えた」は窓を閉じた後に出る。
- 名前：台本に名前の出ない言葉は、本当の名前を `nameJa` に、台本の言い方を `aliasJa` にした（ニンブー・ミルチ、アチャール、
  ドーティー、バラート、パルチン・カーリー、クルハル、ティフィン、セーラー、オートリキシャ）。ホーン・オーケー・プリーズは別名を外した
  （英字の別名は日本語の欄の注意になるため。台本の行に英字がそのまま出る）。隊商宿と細密画には読みを付けた。
- 同じ場面に二つの札（`content:build` の注意）：隊商宿（アーグラのフィナーレ）とガンガウル（ジャイプールのフィナーレ）は、
  クイズに正しく答えたときと間違えたときの二つの分かれ道に一つずつ置いたもの。そのままでよい（2026-11-25 から、ビルドが分かれ道を見分けるので、この注意は出ない）。
- 写真：Wikimedia Commons の1920px配信版（それより小さい画像は元画像か標準の縮小版）から、長い辺1200pxまでの WebP（品質80）にした。
  人の写る写真は、ドーティーを胸より下だけに切り抜き、バラート（馬に乗る人と通りの人）・自転車リキシャ（こぎ手と通りの人）・
  ランガル（台所の人）の顔をぼかした。ガンガウルは右上の店の人と左下の撮影機種の表示を切り落とした。オートリキシャは右の広場の人々を
  外した。ニンブー・ミルチは上の看板の字を外し、ホーン・オーケー・プリーズはナンバープレートをぼかした。どれも描き足しやAI生成はない。
  切り抜きの範囲とぼかしは、各写真の `modificationJa` に書いた。
- 低の7語の写真（2026-11-13に各ファイルのページのライセンスのテンプレートを読んで選んだ）：

| 言葉 | ファイル | 作者 | ライセンス（テンプレート） |
| --- | --- | --- | --- |
| パラーター | File:Paratha is a dough fried flatbread native to India and Pakistan.jpg | Shahzaib Damn Cruze | CC BY-SA 4.0（`{{self\|cc-by-sa-4.0}}`） |
| アジョワン | File:Ajowan.jpg | Mon Œil（Flickr） | CC BY 2.0（`{{cc-by-2.0}}`、FlickreviewR 確認済み） |
| クルハル | File:Kulhad Chai 3.jpg | Gannu03 | CC BY-SA 4.0（`{{self\|cc-by-sa-4.0}}`） |
| ティフィン | File:Tiffin box.jpg | Nipunbayas | CC BY-SA 3.0（`{{self\|cc-by-sa-3.0}}`） |
| 隊商宿 | File:Caravan Sarai, Fatehpur Sikri.jpg | Bruno Girin（Flickr） | CC BY-SA 2.0（`{{cc-by-sa-2.0}}`、flickrreview 確認済み） |
| 細密画 | File:Northwestern India, Rajasthan, Jaipur - A Sakhi brings Radha to Krishna - 2018.172 - Cleveland Museum of Art.tif | 作者不詳（クリーブランド美術館所蔵、1790〜1800年ごろ） | CC0 1.0（`{{cc-zero}}`、同館のオープンアクセス） |
| セーラー | File:Dulha of udaipur 2015.jpg（2026-11-14に差し替え。下の節） | nevil zaveri（Flickr） | CC BY 2.0（`{{cc-by-2.0}}`、FlickreviewR 確認済み。花婿の顔は房で隠れている。バルコニーの小さな人影はぼかした） |

### セーラーの写真の差し替え（2026-11-14）

最初に選んだ File:Sehragroom.jpg（SynthContibutor、`{{self|cc-by-sa-4.0}}`、「own work」）は、投稿者の名前から本物の写真か疑問が出たので調べ直した。

- AIで作った画像ではなさそう：EXIF に Canon EOS 5D Mark IV・63mm・1/200秒・f/2.8・ISO 800・撮影 2017-12-30、Lightroom 6.7 での書き出し（2020-02-12、+05:30）が残り、房・ひげ・布の模様にも不自然な所はない。
  名前の「Synth」は、2012年に英語版ウィキペディアでピアノ練習ソフト「Synthesia」の記事を編集していたアカウントだから（AIとは関係がない）。
- ただし、作者が投稿者本人とは確かめられない：EXIF の作者は「Duke Photography」、著作権は「Duke Photography Inc.」、キーワードは「dukeimages」（婚礼写真の会社の名前）。
  投稿者のCommonsでの投稿はこの1枚だけ（2022-06-06、英語版の Sehra (headdress) を編集しながらアップロード）で、
  許諾の記録（VRT）もない。667×1000px というウェブ用の小さな書き出しでもあり、写真会社の作品を「own work」として載せた可能性が残る。
  ページに削除依頼や警告はまだ付いていない。撮影地も分からない（分類にはインド・パキスタン・バングラデシュが並ぶ）。
- そこで、作者とライセンスがはっきりしていて、北インドで撮られた写真に替えた。

探した所：Commons の検索（sehra・sehrabandi・groom sehra・dulha・ghudchadi など、ヒンディー語・ウルドゥー語・パンジャーブ語の綴りも）、
分類（Grooms of India・Groom of Rajasthan・Baraat・Hindu weddings in India・Wedding clothes of India・Wedding traditions in India。
Commons に Sehra の分類はない）、Openverse で Flickr の CC BY・CC BY-SA・CC0・PDM の写真、WordPress の写真集。

| 候補 | 作者 | ライセンス | 判断 |
| --- | --- | --- | --- |
| **File:Dulha of udaipur 2015.jpg**（Flickr 22141280892「dulha, udaipur」） | nevil zaveri | CC BY 2.0（Commons は `{{cc-by-2.0}}`・FlickreviewR 2025-07-01 合格。Flickr のページも 2026-11-14 に CC BY 2.0） | **採用**。ウダイプールの婚礼の行列（Flickr の札：baraat・udaipur・rajasthan・bridegroom・nikkah・veil）。金と銀の房が花婿の顔をすっかり覆い、飾った馬の頭も写る。EXIF の作者と著作権表示は撮影者本人の名前で、Flickr のアカウントと一致。Commons のファイルは Flickr の原寸（535×800px）とSHA-1まで同じ。解像度は低めだが、正方形に切り抜いて531×531pxで使う。下端の「COPYRIGHT © NEVIL ZAVERI」は切り抜きで外れるため、CC BY 2.0 の「著作権表示をそのまま残す」に合わせて、クレジットを「写真：© nevil zaveri／…」とした。 |
| Flickr 6264450244・6263900501「Sawai Madhopur, groom during baraat」 | Arian Zwegers | CC BY 2.0（Flickr のページで確認） | ラージャスターンで、房のある花婿も写るが、房を額に上げて顔と子どもの顔が見えている。ぼかすと房の見せ方が悪くなる。 |
| File:Rajput wedding riding.jpg | Jaisingh Rathore | CC BY 2.5／GFDL（2006年に英語版へ本人が投稿） | ラージプートの婚礼。金の房はあるが横顔が見え、周りの人の顔も主題になっている。 |
| Flickr 2720232518 ほか「Sehra」（File:Sehra.jpg） | apsaramokashi | CC BY 2.0（Flickr のページで確認） | 房を結んでいる場面。房は顔を覆っておらず、花婿の顔が主題。 |
| File:Sehra (YS).jpg | YVSREDDY | CC BY-SA 3.0 | 飾った馬と行列の写真。携帯電話の低い画質で、房の形が分かりにくい。 |
| WordPress 写真集「Dulhe ka Sehra」 | Makarand Mane | CC0 | 写っているのは房の付かない婚礼のターバン（サファ）で、セーラーではない。 |
| File:Bridegroom headgear for Indian wedding.jpg ほか | Wikilover90 ほか | CC BY-SA 4.0 | ターバンや飾りだけで、セーラーは写っていない。 |

## 服から入る言葉と「衣装」の分類（2026-11-21）

ユーザーの判断で、お店で買う服（伝統衣装・地域の衣装）は、買ったときに旅の図鑑にも入れる（`shop/catalog.json` の服の `termId`）。
写真はゲームの絵ではなく、ほかの言葉と同じく出典つきの実写の写真にする。あわせて図鑑に分類「衣装」（`clothing`）を足し、
もとは「もの」にあった衣服の4語（ドゥパッター・クルタ・ドーティー・セーラー）を「衣装」へ移した。同じ日に、制作者が足した紺のサルワール・カミーズの服（#205）にも
言葉を付けた。続けて、木版プリントのクルタ（#208）と翡翠色のアナルカリ（#209）の服にも付けた。インド編は36語になった。

### サリー（`gt_term_saree`）

- 服：青いサリー（`gt_saree_blue`）を買うと入る。台本の行には札を置いていない（「サリー姿の女性」などの行はあるが、今回は服からだけ）。
- 1行の説明：「縫わない一枚の長い布を腰に巻き、端を肩に掛けて着る、南アジアの女性の装い。」（37字）
  - 根拠：英語版ウィキペディア「Sari」（2026-11-21 に読んだ。冒頭と「Styles of draping」）。“an un-stitched stretch of woven fabric
    arranged over the body as a dress”、“with one end attached to the waist, while the other end rests over one shoulder as a stole”、
    “The most common style is for the sari to be wrapped around the waist, with the loose end of the drape to be worn over the shoulder”、
    “women's garment in the Indian subcontinent”。長さは4.1〜8.2m とあるが、説明文には入れていない。
    ブリタニカの「sari」は取得を拒まれ（403）、読めていない。
  - 地域：インドだけでなくバングラデシュ・ネパール・スリランカなどでも着るので、「南アジアの」とした。
  - 着方は80通り以上あり（同記事）、説明文はいちばん多い着方（ニヴィ）に合わせた。
- 写真：[File:Sari on mannequin for demo.jpg](https://commons.wikimedia.org/wiki/File:Sari_on_mannequin_for_demo.jpg)
  （Suyash.dwivedi／CC BY-SA 4.0、`{{self|cc-by-sa-4.0}}` をファイルのページで確認。2018-01-10、Sant Hirdaram Nagar（マディヤ・プラデーシュ州）。
  英語版ウィキペディアの「Sari」の記事でも使われている）。店先のマネキン3体に着せたサリーで、腰に巻いて端を肩に掛ける着方が分かり、
  人の顔が写らない。元画像（1080×1080px）の左端の奥に小さく写る通行人を外すため、左と下を80pxずつ切り落として1000×1000px にした
  （縮小なし。WebP 品質80）。
- 見て外した候補（どれも Category:Saris）：

| 候補 | 判断 |
| --- | --- |
| File:Sari draping style of Cuttack, Odisha state museum, Bhubaneswar 2013.JPG | オリッサの地方の着方の展示で、一般的な着方の説明に合わない。針金の顔の人形が目立つ。 |
| File:Indian Woman in Saree.jpg | 着方はよく分かるが、人の顔が主題。 |
| File:Saree with pallu.jpg・File:Saree with silver border.jpg | 畳んだ布に「Pallu」「Saree」などの英字と人形が重ねてある。 |
| File:Sambhalpuri Saree (Blue).jpg・File:India (Madhya Pradesh), sari, 1980s - Bunka Gakuen Costume Museum - DSC05305.JPG | 布だけで、着た形が分からない。 |

### サルワール・カミーズ（`gt_term_salwar_kameez`）

- 服：紺のサルワール・カミーズ（`gt_salwar_kameez_navy`）を買うと入る。
- 名前：服の名前に合わせて「サルワール・カミーズ」。パキスタンなどでの呼び方（英語版ウィキペディアの記事名 Shalwar kameez）を別名「シャルワール・カミーズ」にした。
- 1行の説明：「長い上着カミーズに、足首ですぼまるズボンのサルワールを合わせた南アジアの装い。」（39字）
  - 根拠：英語版ウィキペディア「Shalwar kameez」（2026-11-21 に読んだ。冒頭・Description・Styles）。“The kameez is a long shirt or tunic.”、
    “The shalwar are loose pyjama-like trousers. The legs are wide at the top, and narrow at the ankle.”、
    “a traditional combination dress worn by men and women in South Asia”、“the shalwar kameez has now become popular across the Indian subcontinent.”
  - 「膝下まで」などの丈は、読んだ部分では確かめられなかったので説明文に入れていない（服の説明 `descriptionJa` の「膝下まである」は服そのものの描写として残した）。
  - 男女とも着る（パキスタンでは国の服）。インドではおもに女性の服なので「女性の」とは書かず、「南アジアの装い」とした。
  - ドゥパッターは「一部の地域で女性が合わせる」もので、組み合わせの決まった一部ではないため、説明文には入れていない（写真には写っている）。
- 写真：[Pretty ladies in salwar kameez](https://www.flickr.com/photos/64924693@N00/6387773781)（Nagarjun／Flickr／CC BY 2.0。
  2026-11-21 に Flickr のページでライセンスを確認。説明は「Colours of Deepavali in Bhopal」、2011-10-24 撮影）。店先に並んだマネキンで、
  人の顔が写らない。元画像（1683×1051px）から、右上の店の看板（店名と「SALWAR KAMEEZ …」の字）と左側のマネキン・吊るした布を外すため、
  右下の983×771px を切り抜いた（縮小なし。WebP 品質80）。
- 見て外した候補（Commons の Category:Shalwar kameez・Punjabi dress と Openverse）：

| 候補 | 判断 |
| --- | --- |
| File:Girl in salwar kameez.jpg（Samantha McNamara／CC BY 2.0） | 黒い上着に赤いドゥパッターで形はよいが、顔が主題で、胸の前に字の入った本を持っている。 |
| File:In my salwar suit.jpg（Linda／CC BY 2.0） | 形はよく分かるが、顔が主題で、後ろの人たちの顔と服の字も写る。 |
| File:Shalwar kameez.jpg（Lunaloop／CC BY-SA 4.0） | 男性3人の後ろ姿。ゲームの服は女性の装いなので外した。 |
| Flickr「Punjabi suit shop」（lucyrfisher／CC BY 2.0） | ロンドンの店の飾り窓。奥に通行人。 |
| File:Salwar kameez in Forest Fields - geograph.org.uk - 1408883.jpg | イギリスの店の外観で、服が小さい。 |
| File:Shalwar kameez (1710604).jpg ほか（Pixabay） | 写っているのはクルティーとレギンスで、モデルの顔が主題。 |

### クルタ（`gt_term_kurta`）

- 服：木版プリントのクルタ（`gt_kurta_block_print`）を買うと入る。言葉と写真は 2026-11-13 からあるもの（フマーユーン廟の案内の行の札でも入る）をそのまま使った。
  先に物語で出会っていれば、買っても何もしない。

### アナルカリ（`gt_term_anarkali`）

- 服：翡翠色のアナルカリ（`gt_anarkali_jade`）を買うと入る。
- 名前：服の名前に合わせて「アナルカリ」。別名「アナルカリ・スーツ」。
- 1行の説明：「裾の広がる長いドレスのような上着に、細身のズボンを合わせる女性の装い。」（35字）
  - 根拠：英語版ウィキペディア「Anarkali salwar kameez」（Anarkali suit から転送。2026-11-21 に読んだ。冒頭）。
    “An anarkali is a type of women's suit consisting of a long, frock-style top and a slim-fitting bottom.”、
    “The top varies in length … ranging from knee-length to floor-length designs.”
  - 名前の由来は同じ記事で “Anarkali suits owe their name to the eponymous character played by actress Madhubala in the 1960 Indian epic film
    Mughal-e-Azam.”（宮廷の踊り手アナールカリーの話は、記事では伝説と書いていない）。1行に入らないのと、史実と伝説の区別が要るので、説明文には入れていない。
  - 記事には胸の下での切り替えやドゥパッターの記述がないので、説明文に入れていない（服の説明 `descriptionJa` と写真には出ている）。
- 写真：[File:Yogita Grover, Well Groomed Fashion Show (5420850558).jpg](https://commons.wikimedia.org/wiki/File:Yogita_Grover,_Well_Groomed_Fashion_Show_(5420850558).jpg)
  （Brendan Lally（Flickr の Dance Photographer）／CC BY 2.0。Flickr のページと Commons の FlickreviewR（2020-02-01）で確認）。
  2011年のファッションショーで、青緑のアナルカリにチュリダールとドゥパッターを合わせた姿の全身。顔を外すため、Flickr の 2048px 版から首から下を切り抜き、
  長い辺1200px に縮めた（WebP 品質80）。
- 見て外した候補：Commons の Category:Anarkali Salwar Suit の写真は、ほとんどが芸能人の催しの写真で顔が主題。
  File:Woman sitting wearing red anarkali dress.jpg（CC0）は座った姿で裾の広がりが見えず、花嫁の装身具が主題。
  File:IMG-20230408-WA0382.jpg は店の字（品番と店名）が重ねてある。Openverse の「anarkali」は廟（アナールカリーの墓）と映画の写真が中心だった。

---

## 11-13 以降に足した台本の見直し（2026-11-21）

2026-11-13 の統合より後に台本へ入った行（#193・#196・#198〜#202 など。アーグラとジャイプールの告白のデート、アーグラのフィナーレの推理クイズC、
ジャイプールの大根の夜と朝、ハワー・マハルのガウラ）を、上と同じ基準（日本の旅行者がぱっと思い浮かべられない・台本で説明し切っていない）で読み直した。

- 入れた言葉：**タヴェルニエ**（`gt_term_tavernier`、分類「人」。インド編で最初の「人」）。札は `gt_agra_taj_mahal.ink` のフィナーレで
  アンワルが名前を出す行（「フランスの宝石商、タヴェルニエだよ。…」）。この後の推理クイズC（証拠連結）が「タヴェルニエは『黒い』と書いていない」を
  答えにするので、説明文は旅と旅行記だけにし、タージや黒い墓の話には触れない。
  - 事実：1605–1689年、パリ生まれの宝石商。1630〜1668年にペルシアとインドへ6度旅し、『六つの旅』（1676年）を出した
    （英語版ウィキペディア「Jean-Baptiste Tavernier」、2026-11-21に確認）。
  - 写真：File:Jean-Baptist Tavernier, by Nicolas de Largillière.jpg（ラルジリエールの油彩、1678年頃、ブラウンシュヴァイクのヘルツォーク・アントン・ウルリッヒ美術館）。
    Commons のテンプレートは PD-Art（PD-old-100-expired）。全身の縦長の絵なので、一覧の正方形に顔が入るよう膝より上を切り抜いた。
    Commons の API と画像サーバーは今回も 429 を返し、960px の縮小版だけを取った。
- 外した言葉：ダヒー（台本の行が「ヨーグルトのこと」と説明する）、ムーリー（大根。台本が説明する）、ムーリー・パラーター（パラーターの札で足りる。
  大根の朝の行にもパラーターの札がある）、メヘターブ・バーグ（場面の背景写真が見せる）、黒いタージ（言い伝えで、写真で見せる物がない）、
  夜の楽隊（バラートで足りる）。
- 服：お店の4着はどれも `termId` がある（上の節）。品物（ガウラの大根など）は図鑑の対象にしていない。

## 台本に出る人物（2026-11-21）

ユーザーの判断で、分類「人」に、台本に名前の出る実在の人物を入れた（タヴェルニエに続けて11人。インド編は48語）。インド編の40ファイルの台本の
地の文・台詞から、実在の人物の名前を全部拾い、次の決まりで選んだ。

- **クイズの答えに触れない**：説明文（`lineJa`）には、地図のクイズ・推理クイズの問いの答えと、その解説の要点を書かない。図鑑は後から何度でも
  見返せ、アーグラの観光は好きな順に回れるので、札の行がクイズの後でも同じにした。
  - シャー・ジャハーン：息子に幽閉された（アーグラ城の問い）、デリーの新都（フィナーレの問い）、職人の手の話（フィナーレ）は書かない。
  - ムムターズ・マハル：亡くなった場所と様子、最初の墓（タージの問い）は書かない。札はタンヴィが問いを出す行（クイズの前）。
  - アクバル：シークリーの聖者と跡継ぎ・首都の年数（ファテープル・シークリーの問い）、読み書きの話（アクバル廟）は書かない。
  - フマユーン：書庫の階段で亡くなった話（フマユーン廟の問い）は書かない。
  - アウラングゼーブ：父を幽閉した（アーグラ城）・サワーイーの称号を与えた（ジャイプールのフィナーレ）は書かない。「シャー・ジャハーンの子」とも書かない。
  - ジャハーナーラー：父の世話（アーグラ城）とチャンドニー・チョークは書かない。
  - ヌール・ジャハーン：父がペルシアの貴族（イティマード廟の問い）、タージの設計（同じく、裏付けのない主張の問い）は書かない。
  - マーン・シング1世：アンベール城を建てた（アンベール城の問い）は書かない。
  - アミール・フスロー：ディーワーニ・ハースの句は書かない（台本はファイズの「誰が書いたかは分かってない」で終わる）。
- **外した人物**：イティマード・ウッダウラ（「どんな人か」がクイズの問い）、ヴィディヤーダル（ジャイプールを設計した人がフィナーレの答え）、
  イーサー・ハーン（最初の墓の主がフマユーン廟の答え）、マリアム・ウッザマーニー（ジョーダー・バーイー。同時代の肖像がなく、墓廟は場面の背景写真が見せる）、
  アマーナト・ハーン（タージの署名がフィナーレの答え。肖像もない）、シェール・シャー（英語版ウィキペディアの絵は出典と権利の記録が弱い。
  名前は不正解の分かれ道にしか出ない）、アフザル・ハーン（肖像がない。台本の行が人物を説明する）、ナハル・シン・ボーミヤー（言い伝えの霊）、
  ラーム・シン（インド門の兵士で、ジャイプールの王とは別人）、神々（シヴァ・クリシュナ・ガネーシャ・パールヴァティー。知られているか、クイズの答え）。
- **札の置き場所**：初めて名前が出うる行すべて（アーグラの観光は順が自由なので、シャー・ジャハーンは4か所、アクバルは3か所）。クイズの正解・不正解の
  分かれ道の両方に出る名前は両方に置いた（2026-11-25 から、ビルドが分かれ道を見分けるので、この置き方に注意は出ない）。グル・カ・タールの行は
  テーグ・バハードゥル → アウラングゼーブの順。
- **事実**：英語版ウィキペディアの各人物の記事（2026-11-21に確認）。在位・出身・称号などは記事の冒頭と情報欄で確かめた。
- **写真**：どれもパブリックドメインの細密画・肖像画（Wikimedia Commons。出典・所蔵は各写真の `creditJa`）。ムムターズ・マハルとヌール・ジャハーンは、
  後の時代に想像・理想化して描かれた絵で、そのことを `altJa` に書いた。図鑑の一覧の正方形に顔が入るよう切り抜き、範囲を `modificationJa` に書いた。
  Commons の API が 429 を返したため、画像は記事の縮小版か元画像を取った（アウラングゼーブは309×375pxと小さい）。

### 答えに当たる人物・神々・言い伝えの人物を足す（2026-11-21）

ユーザーの判断で、上で外した人物のうち、クイズの答えに当たる人物と神々・言い伝えの人物も入れた（7語。インド編は55語）。
**答えに当たる部分だけを説明に書かない**、神々と言い伝えの人物は説明の頭に「ヒンドゥー教の神（神話の存在）」「言い伝えの人物」と書く。

- イティマード・ウッダウラ：イティマード廟の問い「どんな人だったか」の答え（ペルシアから来て宮廷の頂点まで上った貴族）を書かない。称号の意味と本名だけ。
  札は問いを出す行（クイズの前）。肖像は18世紀の細密画（フリーア美術館）。
- イーサー・ハーン：フマユーン廟の問い「最初の墓は誰のものか」の答えの要素（シェール・シャーの宮廷の人、フマユーン廟より古い墓）を書かない。
  写真は墓廟の内部（CC BY-SA 4.0）で、代替テキストにも場所を書かない。
- シヴァ・パールヴァティー：ジョーハリー・バザールのラックの腕輪の言い伝えの行。ガンガウルの問いの答え（女神ガウリー）には触れない。二柱は同じ細密画の同じ部分。
- クリシュナ：ハワー・マハルの問いの答え（頂上の形が表す冠）を書かない。絵はゴーヴァルダン山を持ち上げる場面（メトロポリタン美術館）。
- ガネーシャ：アンベール城の問いの答え（門の上に描かれた、幸運のしるし）を書かない。絵はラヴィ・ヴァルマーの石版画。
- ナハル・シン・ボーミヤー：言い伝えの霊。本人の絵も、砦の中の寺の写真も Commons にないので、名の由来とされるナハルガル砦の遠景を使い、
  そのことを代替テキストに書いた。
- ヴィディヤーダル（同じ日に追加。インド編は56語）：フィナーレの問いの答え（町を設計した人、建築書に沿った区画）を書かない。出身とアンベール王国での
  役目（英語版ウィキペディア「Vidyadhar Bhattacharya」：ナイハーティー出身のガウル・バラモン、アンベール王国の下級の会計監査役）だけを書いた。
  肖像は残っていないので、写真は彼の名を冠したヴィディヤーダル庭園の回廊（Commons、CC BY-SA 4.0）。町並みの写真は答えを示すので使わない。

### 肖像のない人物を、ゆかりの場所の写真で足す（2026-11-21）

ユーザーの判断で、肖像や権利のはっきりした絵がなくて見送った4人も入れた（インド編は60語）。写真は本人が建てた・眠る場所で、場面の背景写真と
同じ見え方にならないものを選び、代替テキストに「本人の肖像は残っていない」と書いた。

- マリアム・ウッザマーニー（別名 ジョーダー・バーイー）：ラホールに建てさせたマリアム・ザマーニー・モスクの礼拝室の壁画（CC BY-SA 4.0）。
  墓廟は場面の背景写真が見せるので使わない。札は墓廟の最初の行と、ファテープル・シークリーのツアーで「お妃ジョーダー」が出る行。
- アマーナト・ハーン：アーグラ〜ラホールの道の隊商宿サライ・アマーナト・ハーンの門（CC0）。フィナーレの問いの答え（タージの銘文の署名、1638年）は書かない。
- シェール・シャー：サーサーラームの墓廟（CC BY-SA 3.0）。英語版ウィキペディアの絵は出典と権利の記録が弱いので使わない。イーサー・ハーンの問いには触れない。
- アフザル・ハーン・シーラーズィー：チーニー・カ・ラウザーの外壁のタイルの近景（CC BY-SA 4.0）。説明に弟アマーナト・ハーンを書かない
  （チーニー・カ・ラウザーはフィナーレより前に回れ、書家の名がフィナーレの答えを教えてしまうため）。

## 旅のことばに足した語（2026-11-21）

ユーザーの判断で、図鑑から外したダヒー・ムーリーを「旅のことば」（`learning/local-words.json`）に入れた。あわせて台本の残りのヒンディー語を見直し、
ドゥベイの駅の決まり文句（ローディー・ガーデンのデート）のヤートリーガン・クリプヤー・ディヤーンと、ジャイガルのナーナー（ナーニーと対になる）を足した。
出典は、ほかの語と同じ McGregor のヒンディー語英語辞典（Digital South Asia Library、2026-11-21に確認）。ヤートリーガンは見出し語がないので、
यात्री（乗客）と गण（集まり）の二つの項を出典にした。

## オープニングの空港の場面と、ならわしの見直し（2026-11-23）

ユーザーの依頼：「首を左右に揺らす……こういうのも旅の図鑑の、ならわし？に登録できますかね。旅の図鑑に書けるものを考えて追加してください」。
旅の最初に足した空港の場面（`gt_delhi_inserts.ink` の `gt_delhi_arrive_hands`。記録は `../golden-triangle-delhi-opening-20261123/`）と、
11-13 に低・見送りにした言葉を、同じ基準（日本の旅行者がぱっと思い浮かべられない・台本で説明し切っていない・見せる写真がある）で見直した。

入れた言葉（5語。インド編65語）：

| 言葉 | 分類 | 札の行 | 説明の根拠 | 写真 |
| --- | --- | --- | --- | --- |
| ムドラー（`gt_term_mudra`） | ならわし | 空港の場面、女の子の「あれ、ムドラーだよ。…」 | Wikipedia「List of mudras (dance)」（古典舞踊の手のしぐさ。マユーラ＝孔雀）、Natyasutra Online のマユーラ・ハスタ | File:Mayura-Hasta.jpg（Arpitha05、CC BY-SA 4.0）。女の子が見せた「くじゃく」の手。右下の撮影日時の表示を切り落とした |
| 首を揺らすしぐさ（`gt_term_head_bobble`、別名 ヘッド・ボブル） | ならわし | 空港の場面、地の文「パスポートには、ちゃんとスタンプが押してある。たぶん、いいという意味だ。」（彼女が戸惑った後の行。戸惑いの前に小窓で答えを出さない） | Wikipedia「Head bobble」（インドでよく見られ、場面により yes・okay・I understand など。いちばん多いのは yes か、分かったという合図） | 写真が見つからなかった（Commons で head bobble・head wobble を探しても、人のしぐさの写真・図はない）。**自作の図**（`../golden-triangle-delhi-opening-20261123/head_bobble.svg`、CC0 1.0）にし、`photoNoteJa`「画像は、首の動きを表した図」 |
| 願いの糸（`gt_term_wish_threads`） | ならわし | ツアーの帰りの車、ヴィノードの「それに母は、聖者のお墓の格子に糸を結んで、…」 | Trawell.in の Sheikh Salim Chisti Tomb のページ（"tying a thread on the marble screens of the main tomb building serves as a constant reminder to the saint of their wishes"）。Wikipedia の廟の記事には糸の話がない。Lonely Planet・Deccan Herald は 403 で読めなかった | File:Threads for Fertility Twined in Latticework - Tomb of Shaikh Salim Chishti …（Adam Jones、Flickr から転載、CC BY-SA 2.0、FlickreviewR 確認済み）。人は写っていない |
| ワカケホンセイインコ（`gt_term_rose_ringed_parakeet`） | 生き物 | フマユーン廟の案内（初めての訪問だけ）の「…オウムの緑が、木から木へ飛んだ。」。アーグラのラーム・バーグの「緑のインコ」は必ず後なので札を置かない | Wikipedia「Rose-ringed parakeet」（"adult males have a pink and black neck ring"） | File:Rose-ringed Parakeet, Delhi AMSM0345.jpg（Savithri Singh、CC BY-SA 4.0）。デリーで撮った雄（首の輪が見える） |
| ジャイヴァーナ（`gt_term_jaivana`） | もの | ジャイガル城のデートの「最初の印は、巨大な大砲だった。…」 | Wikipedia「Jaivana Cannon」（1720年、ジャイガルの鋳造所で造られた。造られた当時、車輪のついた大砲として世界最大）。説明は年と場所だけにし、台本の「三十五キロ」の言い伝えには触れない | File:Jaivana Cannon, January 2024 01.jpg（Noon Plastic、CC BY 4.0）。右端の係員を切り落とした。もう一つの候補（2016年の写真）は観光客の顔が多く写るので使わなかった |

見送った言葉（この日の判断。下の「インドの言葉でも探し直した5語」で、どれも入れた）：

- 祝い金の一ルピー（シャグン）・笑う会・葉の器（ドーナー）：英語の検索では写真が見つからなかった。
- 女性車両・靴を預ける：日本の旅行者にも分かると判断した。

### インドの言葉でも探し直した5語（2026-11-25）

ユーザーの依頼：「もっと探して。インドの言語でも探す。」。写真は Wikimedia Commons（検索とカテゴリ）と Flickr（CC の絞り込み）を、
英語に加えてヒンディー語・パンジャーブ語・ウルドゥー語・マラーティー語・グジャラート語・タミル語・カンナダ語・テルグ語・オリヤー語・ベンガル語の語でも探した
（例：शगुन का लिफाफा・ਸ਼ਗਨ・ચાંલ્લો・आहेर・மொய்／हास्य योग・लाफ्टर क्लब・हास्ययोग／दोना पत्तल・द्रोण・ದೊನ್ನೆ・దొన్నె・தொன்னை・ଦନା／ਜੋੜਾ ਘਰ・जोड़ा घर／केवल महिलाओं के लिए・महिला कोच）。
出典も英語とインドの言葉で探した（インドの言葉のページで、説明を支える文のあるものは見つからなかった。使ったのは英語の新聞・大学・団体のページ）。入れた5語（インド編70語）：

| 言葉 | 分類 | 札の行 | 説明の根拠 | 画像 |
| --- | --- | --- | --- | --- |
| シャグン（`gt_term_shagun`、別名 祝い金の一ルピー） | ならわし | ジャイプール到着、フロントの女性の「お祝いはね、封筒に入れた現金。…」 | The Quint「Curious Case of The One Rupee: Why It's in Your 'Shagun' Envelope」（2015。"it is considered auspicious for the amount gifted, to end in one"、"an amount that ends in zero suggests the end of a transaction. But the additional rupee connotes continuity"）、The Tribune（IANS）「7 reasons why Indians add one rupee in money gifting」（2024。"'zero' (shunya) indicates the end and 'one' is the beginning"）、DNA India（2024） | **自作の図**（`../golden-triangle-delhi-opening-20261123/shagun_envelope.svg`、CC0 1.0）。どの言葉で探しても、封筒の写真は Commons にも Flickr の CC の写真にもなかった（近いのはパンジャーブの祝いの盆の写真と、人が主題の儀式の写真だけ）。図は「शगुन」と書いた赤い封筒と、手前に置いた一ルピー硬貨。硬貨を封筒に貼る形にはしていない（貼ると書いた資料が見つからなかったため）。`photoNoteJa`「画像は、シャグンの封筒と一ルピー硬貨を表した図」 |
| 笑う会（`gt_term_laughter_club`、別名 笑いヨガ） | ならわし | ロディ・ガーデンのデート、ドゥベイの「ここは、笑うために集まる会。…」（輪が笑い出す行には置かない。理由が分かる前に小窓で明かさない） | Laughter Yoga International「History of Laughter Yoga」（"First Laughter Club started in Lokhandwala Park in Mumbai on 13th March 1995"）、Gulf News（AFP）、Outlook India のカタリア医師の聞き書き、Wikipedia「Laughter yoga」 | インドで撮った写真はなかった（Commons の Laughter yoga のカテゴリはフィンランド・オーストラリア・イギリス・イランだけ。Flickr も同じ）。File:Laughter_Yoga.jpg（Nauravainenanu、CC BY-SA 3.0、2009年フィンランドの講習、真ん中にカタリア医師）を切り抜き、ほかの参加者4人の顔をぼかした。`photoNoteJa` で撮った場所を書いた。カタリア医師の肖像（File:Dr._Madan_Kataria.jpg）は、白背景のスタジオの写真なのに「own work」で、撮った人の写真か分からないので使わなかった（[落とし穴集 5.2](../../../../RESEARCH_PITFALLS.md#52-own-workでも本人の写真とは限らない)） |
| ドーナー（`gt_term_dona`、別名 葉の器） | もの | チャンドニー・チョークのデート、「人だかりのできた屋台があった。客はみんな、葉っぱを固めた小さな器を…」 | Wikipedia「Leaf plate」（ヒンディー語名 पत्तल/दोना、"stitching 6 to 8 leaves with tiny wooden sticks"、屋台とお供えに使う）、Down To Earth「Feast on pattal」（2019。"donas (bowls)"）、Business Today（2026。"Known as pattals, patravalis and donas"、細い竹ひごで縫う） | File:Dosa Served in Handmade "Pattal".jpg（Sachin Gupta、CC BY-SA 4.0）。説明は「pattal」だが、写っているのは平らな皿でなく葉の器（手と袖だけが写る）。中身はゴルガッパでなく屋台のドーサ |
| ジョーラー・ガル（`gt_term_jora_ghar`、別名 靴の預かり所） | ならわし | グルドワーラー・バングラー・サーヒブのデート、「靴を預け、素足で白い石の上を歩く。…」 | サセックス大学 Pilgrimonics「Sevacation」（黄金寺院。"Even shoes are polished in the shoe houses (jora ghar)"、"Doing seva (selfless service) by tending to shoes in the jora ghar"）、Sikh Missionary Society「Seva」、The Pioneer（2026。デリーの副知事がバングラー・サーヒブで靴を清める奉仕をした） | Flickr「A closer view of the receiving counters for footwear」（shankar s.、CC BY 2.0、2017年、アムリトサルの黄金寺院）。窓口の「FREE SERVICE / SHOE STAND」とパンジャーブ語「ਜੋੜੇ ਘਰ」が写る。写っている3人の顔をぼかした。Commons にはバングラー・サーヒブや黄金寺院の靴の預かり所の写真がなかった。`photoNoteJa` で場所を書いた。名前は、パンジャーブ語の発音に近い「ジョーラー・ガル」にした（英語では Joda/Jora Ghar） |
| 女性車両（`gt_term_ladies_coach`） | 乗り物 | デリーのフィナーレ、クイズ1問目の後の「病院の番号を押しかけていた指が、止まった。…」。**このクイズの答え（先頭の一両は女性専用）なので、答えた後の行にだけ置く**。宿の宿題の場面やカムラの到着の台詞には置かない | クイズと宿の宿題の場面の出典（India TV News、Deccan Herald／PTI、Business Standard） | File:Women Only (5722040111).jpg（Chris Brown、Flickr から転載、CC BY-SA 2.0、FlickreviewR 確認済み）。ホームの床の桃色の案内「केवल महिलायें / Women Only」。人は写っていない |

### 前に見送った言葉を、同じやり方で探し直した7語（2026-11-25）

ユーザーの依頼：「過去に収録を写真や出典がないからと見送ったものを探す」「今回と同様の手法で探す」「実装する」。
この記録の中で、写真や出典がなくて見送った言葉を洗い出した：優先度 低で写真を探していなかった6語（プーリー・電動リキシャ・デリーの鉄柱・銀の大壺・パンチャーング・サハーヤク）、
「言い伝えで、写真で見せる物がない」とした黒いタージ、「写真で見せるものがない」とした土地の言葉のうちの物（ミッティ・グルドワーラー）。
次の3つは対象から外した：プーリー（見送った理由は写真ではなく、インド門の同じ行にアチャールの小窓があり、二枚続けて出さないため）、
グルドワーラー（場面の背景写真がバングラー・サーヒブを見せる）、ほかの土地の言葉（バス・ダーディーなど。見せる物がない）。

探し方は前の5語と同じ（[無料の素材の探し方 7.7〜7.11](../../../../FREE_ASSETS_GUIDE.md#77-その土地の言葉でも探す)）。写真と出典の担当を同時に頼み（Sonnet）、
英語とヒンディー語・ベンガル語・タミル語・テルグ語・カンナダ語・グジャラート語の語で探した（例：ई-रिक्शा・টোটো、लौह स्तंभ、गंगाजली、पंचांग・পঞ্জিকা・பஞ்சாங்கம்・పంచాంగం・ಪಂಚಾಂಗ、कुली・सहायक、काला ताजमहल・मेहताब बाग、मिट्टी अत्तर・कन्नौज इत्र）。
インドの言葉の語で見つかった写真はなく、写真はどれも英語の語か分類から見つかった。出典ではパンチャーングの語の意味（ヒンディー語の Astrobix「पंचांग शब्द का अर्थ है - पाँच अंग」）と、カンナウジの香油（Aaj Tak のヒンディー語の記事）がインドの言葉のページだった。
入れた7語（インド編77語）：

| 言葉 | 分類 | 札の行 | 説明の根拠 | 画像 |
| --- | --- | --- | --- | --- |
| 電動リキシャ（`gt_term_e_rickshaw`） | 乗り物 | イティマード廟の案内の最初の行 | TERI「The E-rickshaw story」（2018。デリーで2010年の初めに始まった）、自動車法の2015年の改正の e-rickshaw の定義（SCC Online） | File:Electric rickshaw in Meerut, Uttar Pradesh, India.jpg（Libreravi、CC BY-SA 4.0）。アーグラ・デリーには、車が主題で人や番号札の写らない写真がなかった。下の道路を切り落とした |
| デリーの鉄柱（`gt_term_iron_pillar`） | 建物 | クトゥブ・ミナールの案内の「塔の足元の中庭に、黒っぽい鉄の柱が立っていた。…」。到着のカムラの一覧にも「鉄の柱」と出るが、そこはふつうの言葉として読めるので、実物が見える行に置いた | Live History India（2020。高さ7.3m、4世紀）、Wikipedia「Iron pillar of Delhi」（7.21m、5世紀）。数字が食い違うので「約7m」「約1600年前」にした。クイズの3問（柵の理由・錆びない理由・最初に立っていた所）には触れない | File:Iron Pillar 01.jpg（Indrajit Das、CC BY-SA 4.0）。人は写っていない |
| 銀の大壺（`gt_term_gangajali`、別名 ガンガージャリ） | もの | シティ・パレスの本筋、クイズ1問目（イギリスへ持っていった理由）の**後**のヴィシャールの行。案内の最初に壺が出る行には置かない（別名のガンガージャリが答えのガンジスの水を思わせるため） | ギネス世界記録「Largest pieces of silverware」（"The largest single pieces of silver are a pair of water jugs"、今はシティ・パレスにある）。重さと容量は資料ごとに大きく違う（ギネス 242.7kg・1,800L、ほかの記事 345kg・4,000L）ので書かない | File:Lascar Gangajalis - The biggest silver objects of the world (4499234941).jpg（Jorge Láscar、Flickr から転載、CC BY 2.0、FlickreviewR 確認済み）。壺を中心に切り抜いた |
| パンチャーング（`gt_term_panchang`、別名 ヒンドゥーの暦） | もの | ジャンタル・マンタルの本筋の「声の主は、眼鏡の若い女性だった。…膝の上に、使い込んだ暦の冊子。」 | The Hans India「Panchanga: The Glossary」（2020。"Panchanga literally means five angas or limbs"）、Astrobix（ヒンディー語）、HinduTone（祭りの日取り。ブログ）。クイズ（地方時と標準時）には触れない | 冊子の写真は、どの言葉で探しても見つからなかった（テルグ語で見つかったのは、読み上げる人の顔が主題の写真）。File:Hindu calendar 1871-72.jpg（1871〜72年のラージャスターンの布の暦、アメリカ議会図書館、PD-Art）の上の部分を切り抜き、`photoNoteJa` に書いた。ジャイプールのあるラージャスターンの暦なので、場面に近い |
| サハーヤク（`gt_term_sahayak`、別名 駅の荷運び） | 人 | デリーの出発の駅の「昔は「クーリー」と呼ばれた彼らは、…」（土地の言葉と同じ行。小窓の後に「ことばを覚えた」が出る） | The Daily Star（AFP、2016）、The Goan（2016）、The Asian Age（2016。鉄道相が2016-17年の鉄道予算で呼び名を変えると発表）。別名に「クーリー」は使わない（植民地時代の呼び名として変えられたため） | File:1996 -229-18 New Delhi Train Station (2234206340).jpg（Dan Lundberg、Flickr から転載、CC BY-SA 2.0、FlickreviewR 確認済み）。ニューデリー駅の階段を上る赤いシャツの荷運びの後ろ姿で、顔は写っていない |
| 黒いタージ（`gt_term_black_taj`） | 建物 | アーグラのフィナーレ、推理クイズの2問目（黒いタージについて何が言えるか）の**後**の「アンワルは杖をついたまま、しばらく黙った。」 | Rana Safvi「The garden opposite the Taj」（The Hindu、2018。著者のサイトの転載で確かめた。タヴェルニエが最初に書いた、発掘で建物の土台は見つからなかった）、Wikipedia「Black Taj Mahal」。説明は「言い伝え」だけにした | File:The remnants of the Black Taj, attempted by Aurangzeb.JPG（g.kaustav、CC BY-SA 3.0）。メヘターブ・バーグの池の跡。ファイルの名前は「アウラングゼーブが試みた黒いタージの跡」だが、それは裏付けがないので、`photoNoteJa` と代替テキストには池の跡とだけ書いた |
| ミッティ（`gt_term_mitti_attar`、別名 雨の匂いの香油） | もの | ジャーマー・マスジドの本筋、ハミードの「ミッティ。土を焼いて閉じこめる。…」（土地の言葉と同じ行） | The Better India（2016。焼いた土のかけらを銅の釜（デーグ）で蒸し、白檀の油に移す。カンナウジの香油は地理的表示）、National Geographic（2020）、地理的表示の登録（IP India、Kannauj Perfume） | カンナウジの蒸留の釜や焼いた土の写真は見つからなかった。File:Camel skin Perfume Bottles from Kannauj.jpg（David Prasad、Flickr から転載、CC BY-SA 2.0、FlickreviewR 確認済み。香油を寝かせるラクダの革の瓶）を、`photoNoteJa` に書いて使った |

- 写真の担当が、Flickr の画像を取るときにブラウザの名乗り（User-Agent）と参照元を付けていた。この手引きでは、その取り方をしない（7.8）。荷運びの写真は、Commons の元画像をページを読む道具で取り直して使った。

## 調査の記録

設計（`glossary/design.md`）に沿って、インド編の物語に初めて出る「日本の旅行者がぱっと思い浮かべられない言葉」を集め、1行の説明と写真の候補を付けた。リポジトリには何も書いていない。

## まとめ

- 調べた台本：`content/journeys/golden_triangle/stories/places/*.ink` の40ファイルすべて（地の文・台詞・選択肢を全部読んだ）。
- 言葉の数：**45語**（優先度 高 10・中 16・低 19）。
- 写真：高・中の26語すべてに、Wikimedia Commons の写真を1枚ずつ選び、次点を1枚ずつ付けた。
- データ：`terms.json`（設計のデータの形＋ `tags`・`photo`、それに統合のための `priority`・`factSources`・`notesJa`）。`photos/<ID>/meta.json` と下見の画像（`A.jpg` 採用、`B.jpg` 次点。Commons の標準の縮小版で、長い辺はどれも800px以下）。

## 札の置き場所の決め方

- 「最初に出うる場所」：その言葉が初めて出る行。道順で初出の場面が変わるときは、初出になりうる場面ごとに1つずつ挙げた。
- 都市の順（デリー → アーグラ → ジャイプール）、各都市の場面の順（到着 → 観光の案内とクイズ（どの順でも可）・デート（観光を1つ終えてから）→ フィナーレ → エピローグ → 出発）と、Inkの `cond(…)`・`when:` を見て、**必ず後になる再登場には札を付けていない**（表の注に、なぜ不要かを書いた）。
- 選択肢の文には札を置かない（設計どおり）。今回挙げた行は、どれも地の文か台詞。
- `line` は、Inkの行の字下げを除いた本文そのまま（`{heroine_name}` などの差し込みもそのまま）。`lineNo` は 2026-11-13 時点の行番号で、台本を直すとずれる。
- クイズの直前に置くと答えを先に言ってしまう語は、説明文で答えに触れないようにした（ジャーリー、銀の大壺、デリーの鉄柱、パルチン・カーリー）。

## 統合で決めてほしいこと

1. **土地の言葉（`learning/local-words.json`）と重なる語**：ペーター、メヘンディ、キチュリー、ランガル、ニハーリー、サハーヤク。どれも同じ行か直前の行に `# local_word:` がある。窓を二つ続けて出すか、片方にまとめるか。なお、ニハーリーは土地の言葉では「朝ごはん」の意味、図鑑では料理（煮込み）として説明している。
2. **同じ行に二つの言葉**：
   - インド門の204行（アチャールとプーリー）→ 低のプーリーを外す案。
   - ツアーの212行（マトリーとアジョワン）→ アジョワンは220行へずらした。
   - デリー到着の31行（ニハーリーとデリーの鉄柱）→ 低の鉄柱を外す案。
   - レッド・フォートのフィナーレ331行（自転車リキシャの念のための札とパラーター）。
3. **台本に語そのものが出ない言葉**（名前を図鑑で初めて見せることになる）：ニンブー・ミルチ（台本は「レモンと青唐辛子」）、アチャール（「漬物」）、ドーティー（「白い腰布」）、バラート（「花婿の行列」）、パルチン・カーリー（「石がはめ込んである」）、クルハル（「素焼きのカップ」）ほか。名前を台本の言い方に合わせるか、別名の欄に回すかは書き手の判断。
4. **物語より先に、画面の文字で見える語**：オートリキシャ（移動の手段）、ゴルガッパ・ローティー・メヘンディ・ラックの腕輪など（地図のデートの説明）、ジャーリー・ランガル・ドゥパッター（観光地の説明）、ペーター・ラックの腕輪（品物の名前）。図鑑の窓はInkの札でしか開かないので、ここでは扱っていない。

## 外した言葉

- 多くの日本人が知っている：チャイ、カレー、ナン、サリー、ターバン、ショール、クミン、ガラムマサラ、ガネーシャ、クリケット、タオルの白鳥、落花生、ラクダ・孔雀・猿・牛・水牛・鳩・山羊。
- 場面の背景写真がそのまま見せる名所：アグラセン・キ・バオリやパンナー・ミーナー・カ・クンド（階段井戸）、グルドワーラー・バングラー・サーヒブ、ハワー・マハル、ジャンタル・マンタルのサムラート・ヤントラ、チャッタ・チョーク、各廟・城。
- 土地の言葉で足りている言葉（写真で見せるものがない）：バス、ダーディー、ナーニー、ハーン、バフー、サワーイー、チャンドニー、グルドワーラー、ミッティ（雨の匂いの香油。アタルの窓で足りる）。
- 小さすぎる・説明が台本にある：クミンの水、塩と砂糖の粉（経口補水塩）、頭を覆う布。

## 人が写る写真（使う前に加工が要る）

- ドーティー（A）：顔が写る。**胸より下だけを切り出す**。
- バラート（A・B）：花婿と通りの人の顔が写る。**ぼかしが要る**。
- 自転車リキシャ（A）：こぎ手の顔が小さく写る。原寸で見分けられるならぼかす。
- ガンガウル（A）：右上に店の人が写る。切り出しで外す。
- ランガル（A）・オートリキシャ（A）：奥に人が小さく写る。原寸で確かめる。
- ドゥパッター（B）：女性たちの顔が主題。使うなら切り出しかぼかし。

## 低の語の写真

優先度 低の19語は写真を探していない（`imageId` と `photo` は `null`）。設計ではビルドが「画像が未登録」で止めるので、図鑑に入れる語だけ、写真を探してから登録する。

> 2026-11-28 の確かめ：この19語のうち18語は、2026-11-13・11-25 に写真を探して図鑑に入れた（16語は同じ ID、葉の器は `gt_term_dona`、願いの糸は `gt_term_wish_threads` の ID）。プーリーは、インド門の同じ行にアチャールの小窓があるので入れない（下の「前に見送った言葉を、同じやり方で探し直した7語」）。写真のない低の語は残っていない。


## 優先度 高（10語）

| ID | 名前（別名） | 分類 | 1行の説明（字数） | 最初に出うる場所 | 写真 |
|---|---|---|---|---|---|
| `gt_term_golgappa` | ゴルガッパ（パーニー・プーリー） | 食べ物 | 薄く揚げた空洞の玉に、酸っぱく辛い香草水を注いで一口で食べる屋台の軽食。（36） | `gt_delhi_chandni_chowk` / `gt_delhi_date_chandni_chowk` 31行：「ゴルガッパ。薄く揚げた空洞の玉に、男が親指で穴を開け、じゃがいもを少し詰め、酸っぱくて辛い緑…」<br>└ デリーのデート「バス、と言うまで」（任意）。ゴルガッパが物語に出るのはこの行が最初。宿の翌朝・駅前の詐欺の場面・勝負の選択肢での再登場は、どれもこのデートの後（フラグ条件つき）なので札は不要。 | 【採用】[Crispy Pani Puri.jpg](https://commons.wikimedia.org/wiki/File:Crispy_Pani_Puri.jpg)<br>Teena Sometimes／CC BY-SA 4.0／2592×1944<br>次点：[Panipuri, Golgappa, Phuchka.jpg](https://commons.wikimedia.org/wiki/File:Panipuri,_Golgappa,_Phuchka.jpg)（CC BY-SA 4.0） |
| `gt_term_blackbuck` | ブラックバック | 生き物 | インドの草原にすむレイヨウ。雄は背が黒く、らせん状にねじれた長い角をもつ。（37） | `gt_agra_akbar_tomb` / `gt_agra_date_akbar_tomb` 20行：「芝生の上で、背中の黒い獣が数頭、草を食んでいた。ねじれた長い角。ブラックバックだ。この廟の庭…」<br>└ アーグラのデート「猿との取引」（任意）の冒頭。猿の場面（gt_agra_akbar_tomb_monkey_attar）での再登場はこの後。 | 【採用】[Blackbuck in Tal Chhapar Sanctuary November 2025 by Tisha Mukherjee 06.jpg](https://commons.wikimedia.org/wiki/File:Blackbuck_in_Tal_Chhapar_Sanctuary_November_2025_by_Tisha_Mukherjee_06.jpg)<br>Tisha Mukherjee／CC BY-SA 4.0／4265×3199<br>次点：[BBR-Male-Blackbuck-walking (16120302957).jpg](https://commons.wikimedia.org/wiki/File:BBR-Male-Blackbuck-walking_(16120302957).jpg)（CC BY 2.0） |
| `gt_term_attar` | アタル（イッタル） | もの | 花や木の香りを蒸留して油に閉じこめた、南アジアの伝統的な香油。（31） | `gt_delhi_jama_masjid` / `gt_delhi_main_jama_masjid_battle` 60行：「アタル。花や木を、油に閉じこめたものだ。手首を」<br>└ デリーの観光クイズ（ジャーマー・マスジド、必須）。ほかの場面では「雨の匂いの小瓶」と呼ばれ、「アタル」の語はここだけ。 | 【採用】[Perfume bottles displayed at a shop near Charminar in Hyderabad, India.jpg](https://commons.wikimedia.org/wiki/File:Perfume_bottles_displayed_at_a_shop_near_Charminar_in_Hyderabad,_India.jpg)<br>Dev Jadiya／CC BY-SA 4.0／6120×8160<br>次点：[Camel skin Perfume Bottles from Kannauj.jpg](https://commons.wikimedia.org/wiki/File:Camel_skin_Perfume_Bottles_from_Kannauj.jpg)（CC BY-SA 2.0） |
| `gt_term_petha` | ペーター | 食べ物 | 冬瓜を砂糖で煮つめた、白く半透明のお菓子。アーグラの名物。（29） | `gt_agra_taj_mahal` / `gt_agra_finale_battle` 358行：「帰りぎわ、アンワルは甥の支配人に電話をかけ、何か短く言った。それから、二人に紙の箱を差し出し…」<br>└ アーグラのフィナーレ（必須）の終わり。エピローグ（gt_agra_hotel_hub の gt_agra_epilogue、107行）の再登場は必ずこの後なので札は不要。 | 【採用】[Petha-from-Agra.JPG](https://commons.wikimedia.org/wiki/File:Petha-from-Agra.JPG)<br>Rsrikanth05／CC BY-SA 4.0／2224×1428<br>次点：[Agra sweet petha.jpg](https://commons.wikimedia.org/wiki/File:Agra_sweet_petha.jpg)（CC BY 4.0） |
| `gt_term_mathri` | マトリー | 食べ物 | 小麦粉の生地を平たく揚げた、塩気のあるサクサクした軽食。（28） | `gt_agra_tour_fatehpur_sikri` / `gt_agra_tour_mathri` 212行：「包みの中は、狐色の平たい揚げ菓子だった。マトリーというらしい。ヴィノードの母のは、アジョワン…」<br>└ ファテープル・シークリーへの車のツアー（運転手ヴィノード）を選んだときだけ。同じ行に「アジョワン」もある。 | 【採用】[Masala Mathri.JPG](https://commons.wikimedia.org/wiki/File:Masala_Mathri.JPG)<br>Mdsmds0／CC BY-SA 4.0／4896×3672<br>次点：[Mathri.JPG](https://commons.wikimedia.org/wiki/File:Mathri.JPG)（Public domain） |
| `gt_term_mehndi` | メヘンディ（ヘナ） | ならわし | ヘナの練り物で手足に細かな模様を描く装い。花嫁の支度でも描かれる。（33） | `gt_jaipur_jal_mahal` / `gt_jaipur_date_jal_mahal` 29行：「メヘンディ、どう？　手に描く模様。ヘナで描いて、二週間くらい残るの」<br>└ ジャイプールのデート「手のひらに隠した名前」（任意）。宿の夜・朝、フィナーレの前、屋上の場面での再登場は、どれもこのデートが条件なので札は不要。 | 【採用】[Mehndi front.JPG](https://commons.wikimedia.org/wiki/File:Mehndi_front.JPG)<br>AKS.9955／CC BY-SA 4.0／4578×3170<br>次点：[Hand with mehndi design.jpg](https://commons.wikimedia.org/wiki/File:Hand_with_mehndi_design.jpg)（CC BY-SA 4.0） |
| `gt_term_nimbu_mirchi` | ニンブー・ミルチ（レモンと青唐辛子の魔よけ） | ならわし | レモンと青唐辛子を糸に通した魔よけ。車や店の入口に下げ、悪い目を防ぐ。（35） | `gt_agra_tour_fatehpur_sikri` / `gt_agra_tour_out_leg` 91行：「バックミラーの下で、糸に通した小さなレモンと青唐辛子が揺れていた。彼女の視線に気づいて、ヴィ…」<br>└ ファテープル・シークリーへの車のツアーの行き（gt_agra_tour_out_leg）。台本に「ニンブー・ミルチ」の語はなく、「糸に通した小さなレモンと青唐辛子」。 | 【採用】[Nimbu-Mirchi Totka à Jaipur (2).jpg](https://commons.wikimedia.org/wiki/File:Nimbu-Mirchi_Totka_%C3%A0_Jaipur_(2).jpg)<br>Ji-Elle／CC BY-SA 4.0／3648×5472<br>次点：[Nimbu-Mirchi Totka à Jaipur (1).jpg](https://commons.wikimedia.org/wiki/File:Nimbu-Mirchi_Totka_%C3%A0_Jaipur_(1).jpg)（CC BY-SA 4.0） |
| `gt_term_roti` | ローティー（チャパーティー） | 食べ物 | 全粒粉の生地を薄く丸くのばして焼く、インドの毎日の平たいパン。（31） | `gt_delhi_bangla_sahib` / `gt_delhi_date_bangla_sahib` 27行：「見てるだけか。手を洗って、こっちへ来なさい。ローティーは、見るより丸める方がうまい」<br>└ デリーのデート「世界地図のローティー」（任意）。グル・カ・タール（アーグラ）の再登場はこのデートが条件なので札は不要。 | 【採用】[Chapati 2.jpg](https://commons.wikimedia.org/wiki/File:Chapati_2.jpg)<br>Manavatha／CC BY-SA 3.0／3648×2736<br>次点：[Chapati 1.jpg](https://commons.wikimedia.org/wiki/File:Chapati_1.jpg)（CC BY-SA 4.0） |
| `gt_term_dupatta` | ドゥパッター | もの | 長いショールのような布。肩や胸元に掛けたり、頭からかぶったりする。（33） | `gt_delhi_agrasen_baoli` / `gt_delhi_date_agrasen_baoli` 24行：「階段の途中で、大学生くらいの二人が言い争っていた。携帯を構えた青年と、白いドゥパッターを頭か…」<br>└ デリーのデート「本物の悲鳴」（任意）。この後、幽霊や鳩の役の小道具になる。 | 【採用】[Bandhani Dupatta (5788125979).jpg](https://commons.wikimedia.org/wiki/File:Bandhani_Dupatta_(5788125979).jpg)<br>goblinbox (queen_of_ad_hoc_bento)／CC BY 2.0／2048×1536<br>次点：[At The Fair (5823095519).jpg](https://commons.wikimedia.org/wiki/File:At_The_Fair_(5823095519).jpg)（CC BY 2.0） |
| `gt_term_lac_bangles` | ラックの腕輪 | もの | 虫が出す樹脂ラックを熱して形にし、色ガラスや石で飾った腕輪。（30） | `gt_jaipur_johari_bazaar` / `gt_jaipur_date_johari_bazaar` 23行：「アーケードの端に、一軒だけ、まるで色の洪水のような店があった。天井まで積み上げられた、ラック…」<br>└ ジャイプールのデート「欲しいものは、欲しいと」（任意）。フィナーレ前の「腕輪は…」の再登場はこのデートが条件。 | 【採用】[Lac Bangles making Hyderabad (29986).jpg](https://commons.wikimedia.org/wiki/File:Lac_Bangles_making_Hyderabad_(29986).jpg)<br>PJeganathan／CC BY-SA 3.0／4096×3072<br>次点：[Lac Bangles making Hyderabad.jpg](https://commons.wikimedia.org/wiki/File:Lac_Bangles_making_Hyderabad.jpg)（CC BY-SA 3.0） |

## 優先度 中（16語）

| ID | 名前（別名） | 分類 | 1行の説明（字数） | 最初に出うる場所 | 写真 |
|---|---|---|---|---|---|
| `gt_term_jalebi` | ジャレビー | 食べ物 | 生地を渦巻きの形に油で揚げ、甘いシロップに浸した菓子。（27） | `gt_delhi_red_fort` / `gt_delhi_finale_battle` 335行：「ああ、あのばあさんか。ジャレビー百グラムで三回値切った。それから聞かれたよ。一年分の香辛料を…」<br>└ デリーのフィナーレ（必須）。チャンドニー・チョークの揚げ菓子屋の台詞。 | 【採用】[Jalebi 2.jpg](https://commons.wikimedia.org/wiki/File:Jalebi_2.jpg)<br>Haroldandkumar／Public domain／2832×2128<br>次点：[Jalebi 1.jpg](https://commons.wikimedia.org/wiki/File:Jalebi_1.jpg)（CC BY-SA 4.0） |
| `gt_term_nihari` | ニハーリー | 食べ物 | 肉を長い時間じっくり煮込んだ、香辛料の濃い煮込み。もとは朝の料理。（33） | `gt_delhi_hotel_hub` / `gt_delhi_arrival` 31行：「わたしのデリー。赤い城、暗くなってから。クトゥブ・ミナール、鉄の柱、もう抱けない、腹立たしい…」<br>└ デリー到着（必須・旅の最初の場面）。カムラの「五行の地図」の四行目。説明があるのはジャーマー・マスジドの案内（gt_delhi_jama_masjid 34行）。 | 【採用】[Nihari.JPG](https://commons.wikimedia.org/wiki/File:Nihari.JPG)<br>Miansari66／Public domain／2816×2112<br>次点：[Nihari taj.jpg](https://commons.wikimedia.org/wiki/File:Nihari_taj.jpg)（CC BY-SA 4.0） |
| `gt_term_khichdi` | キチュリー | 食べ物 | 米と豆をいっしょにやわらかく煮た料理。お腹を壊したときにも食べる。（33） | `gt_delhi_inserts` / `gt_delhi_hotel_sick_morning` 262行：「キチュリー。米と豆を、やわらかく煮たの。うちでは、お腹を壊したら、これ。……外国の人は、みん…」<br>└ ゴルガッパで腹を壊した翌朝の宿の場面（gt_delhi_hotel_sick_morning）だけ。 | 【採用】[Masala Khichadi.jpg](https://commons.wikimedia.org/wiki/File:Masala_Khichadi.jpg)<br>Dkgohil／CC BY-SA 4.0／5184×3456<br>次点：[ভুনা খিচুড়ি 1.jpg](https://commons.wikimedia.org/wiki/File:%E0%A6%AD%E0%A7%81%E0%A6%A8%E0%A6%BE_%E0%A6%96%E0%A6%BF%E0%A6%9A%E0%A7%81%E0%A6%A1%E0%A6%BC%E0%A6%BF_1.jpg)（CC BY-SA 4.0） |
| `gt_term_maggi` | マギー | 食べ物 | インドで広く食べられている即席麺。香辛料のきいた粉で味をつける。（32） | `gt_agra_ram_bagh` / `gt_agra_date_ram_bagh` 105行：「庭を出ると、道の向かいに小さな茶屋があった。プラスチックの椅子が三つと、湯気の立つ大鍋。注文…」<br>└ アーグラのデート「皇帝の不満リスト」（任意）の終わり、茶屋の場面。 | 【採用】[Maggi Bowl.jpg](https://commons.wikimedia.org/wiki/File:Maggi_Bowl.jpg)<br>Mrudit161187／CC BY-SA 4.0／720×1280<br>次点：[Maggi - 1.jpg](https://commons.wikimedia.org/wiki/File:Maggi_-_1.jpg)（CC BY-SA 4.0） |
| `gt_term_achar` | アチャール（インドの漬物） | 食べ物 | 果物や野菜を油と香辛料、塩で漬けた、酸っぱく辛いインドの漬物。（31） | `gt_delhi_india_gate` / `gt_delhi_date_india_gate` = `family_talk` 204行：「帰りぎわ、母親たちが弁当箱を差し出した。揚げたパンに、辛い漬物。断ると、もう一つ増えた。」<br>└ デリーのデート「十三人目」（任意）の終わり（= family_talk。どの道からも通る）。同じ行に「揚げたパン」（プーリー）もある。<br>`gt_jaipur_city_palace` / `gt_jaipur_main_city_palace_battle` 46行：「母さん、預け荷物は二十三キロまでなんだ。漬物だけで五キロは無理だって」<br>└ ジャイプールの観光クイズ（シティ・パレス、必須）。インド門のデートをしていなければ、ここが最初。 | 【採用】[Indian Mango Pickles.JPG](https://commons.wikimedia.org/wiki/File:Indian_Mango_Pickles.JPG)<br>Sidg13／CC BY-SA 4.0／4608×3456<br>次点：[Mango Pickle Home Made Style.JPG](https://commons.wikimedia.org/wiki/File:Mango_Pickle_Home_Made_Style.JPG)（CC0） |
| `gt_term_kurta` | クルタ | もの | ゆったりした襟なしの長い上着。男女とも、ズボンと合わせて着る。（31） | `gt_delhi_humayun_tomb` / `gt_delhi_main_humayun_tomb_battle` 76行：「返事より先に、太い声が飛んできた。口ひげ、腹の上で張ったクルタ、手にはなぜか新聞。大股で近づ…」<br>└ デリーの観光クイズ（フマユーン廟、必須）。アーグラ（チーニー・カ・ラウザー、タージ・マハル2か所）の再登場は、都市の順で必ずこの後。 | 【採用】[Blue khadi kurta.jpg](https://commons.wikimedia.org/wiki/File:Blue_khadi_kurta.jpg)<br>Purva4u／CC BY-SA 3.0／600×800<br>次点：[Kurta closeup sandalwood buttons.jpg](https://commons.wikimedia.org/wiki/File:Kurta_closeup_sandalwood_buttons.jpg)（Public domain） |
| `gt_term_dhoti` | ドーティー（腰布） | もの | 縫わない一枚の長い布を、腰から脚に巻きつけてはく男性の衣服。（30） | `gt_jaipur_jantar_mantar` / `gt_jaipur_jantar_mantar_guide` 26行：「一番大きな三角の壁の日陰で、白い腰布の老人が、古い冊子を膝に広げて座っていた。そこへ、眼鏡の…」<br>└ ジャイプールの観光の案内（ジャンタル・マンタル、必須）。台本の語は「白い腰布」。 | 【採用】[A man in dhoti tied north Indian style.jpg](https://commons.wikimedia.org/wiki/File:A_man_in_dhoti_tied_north_Indian_style.jpg)<br>Abigail Batchelder／CC BY 2.0／2336×3504<br>次点：[Dhoti.tif](https://commons.wikimedia.org/wiki/File:Dhoti.tif)（CC0） |
| `gt_term_horn_ok_please` | ホーン・オーケー・プリーズ（HORN OK PLEASE） | もの | インドのトラックの後ろによく描かれる文字。追い越すなら警笛を、の合図。（35） | `gt_agra_tour_fatehpur_sikri` / `gt_agra_tour_out_leg` 80行：「やがて道は西へまっすぐ伸び、建物の間に畑がのぞきはじめた。前を走るトラックの荷台の後ろに、色…」<br>└ ファテープル・シークリーへの車のツアーの行き（gt_agra_tour_out_leg）。 | 【採用】[Mumbai (Bombay), RTW 2012 (8404896932).jpg](https://commons.wikimedia.org/wiki/File:Mumbai_(Bombay),_RTW_2012_(8404896932).jpg)<br>Ana Raquel S. Hernandes／CC BY-SA 2.0／1936×2592<br>次点：[Horn Ok sign on a Bangalore truck.jpg](https://commons.wikimedia.org/wiki/File:Horn_Ok_sign_on_a_Bangalore_truck.jpg)（CC BY-SA 3.0） |
| `gt_term_auto_rickshaw` | オートリキシャ（オート） | 乗り物 | エンジンで走る三輪の小さなタクシー。屋根つきの後ろの席に客を乗せる。（34） | `gt_delhi_red_fort` / `gt_delhi_finale_battle` 267行：「待ってください。あの日のカムラさん、すごくはっきりしてました。オートの運転手とはすぐ喧嘩にな…」<br>└ デリーのフィナーレ（必須）。台本の語は「オートの運転手」。同じ場面の321行「アマンがオートリキシャを止めた。」（警笛の効果音つき）の方が窓を出す場所として自然なので、札をそちらに置く案もある。 | 【採用】[Auto Rickshaws outside Purana Qila, Delhi.jpg](https://commons.wikimedia.org/wiki/File:Auto_Rickshaws_outside_Purana_Qila,_Delhi.jpg)<br>Slyronit／CC BY-SA 4.0／6000×4000<br>次点：[Auto-rickshaw.JPG](https://commons.wikimedia.org/wiki/File:Auto-rickshaw.JPG)（CC BY-SA 4.0） |
| `gt_term_cycle_rickshaw` | 自転車リキシャ（サイクルリキシャ） | 乗り物 | 人がペダルをこいで客を運ぶ、三輪の自転車タクシー。（25） | `gt_delhi_jama_masjid` / `gt_delhi_jama_masjid_guide` 27行：「見学を終えて、また長い階段を下りる。段の下は、もう別の世界だった。焼いた肉の煙、呼び込みの声…」<br>└ デリーの観光の案内（ジャーマー・マスジド、必須）。<br>`gt_delhi_red_fort` / `gt_delhi_finale_battle` 331行：「夜のチャンドニー・チョークは、昼より人が多い。揚げたてのパラーターの匂い。自転車リキシャの鈴…」<br>└ デリーのフィナーレ（必須）。主な観光を全部終えてから始まるなら、ここは必ず2回目（念のための札）。同じ行に「パラーター」もある。 | 【採用】[Cycle Rickshaw - Chandni Chowk Road - Delhi 2014-05-13 3518.JPG](https://commons.wikimedia.org/wiki/File:Cycle_Rickshaw_-_Chandni_Chowk_Road_-_Delhi_2014-05-13_3518.JPG)<br>Biswarup Ganguly／CC BY 3.0／6016×4000<br>次点：[Old Delhi rickshaw 2011.JPG](https://commons.wikimedia.org/wiki/File:Old_Delhi_rickshaw_2011.JPG)（CC BY-SA 4.0） |
| `gt_term_neem` | ニーム（インドセンダン） | 生き物 | インドでよく見る大きな常緑の木。昔からインドの民間の薬に使われてきた。（35） | `gt_agra_itimad_tomb` / `gt_agra_itimad_tomb_guide` 33行：「庭の隅のニームの木の下で、白髪の女性が一人、布の手提げを膝に置いて座っていた。その目が、こち…」<br>└ アーグラの観光の案内（イティマード・ウッダウラ廟、必須）。クイズの場面（48行）の再登場はこの後。 | 【採用】[Neem Tree (Azadirachta indica) 1.jpg](https://commons.wikimedia.org/wiki/File:Neem_Tree_(Azadirachta_indica)_1.jpg)<br>Mokkie／CC BY-SA 3.0／3920×2204<br>次点：[Qutb Minar with Neem Tree.jpg](https://commons.wikimedia.org/wiki/File:Qutb_Minar_with_Neem_Tree.jpg)（CC BY-SA 4.0） |
| `gt_term_jali` | ジャーリー（透かし彫りの格子） | 建物 | 石を幾何学や花の模様に透かし彫りにした格子。光と風を通す。（29） | `gt_agra_itimad_tomb` / `gt_agra_itimad_tomb_guide` 24行：「近づくほど細かくなる模様に、{heroine_name}の歩幅が小さくなる。窓には、石を透か…」<br>└ アーグラの観光の案内（イティマード・ウッダウラ廟、必須）。アーグラは必ずジャイプールより先なので、ハワー・マハルの「格子」はどれも後。 | 【採用】[Itimad-ud-Daula’s Tomb 730 (crop).jpg](https://commons.wikimedia.org/wiki/File:Itimad-ud-Daula%E2%80%99s_Tomb_730_(crop).jpg)<br>Anupamg／CC BY-SA 4.0／2208×2635<br>次点：[Jali ITIMAD UD DAULAH.jpg](https://commons.wikimedia.org/wiki/File:Jali_ITIMAD_UD_DAULAH.jpg)（CC BY-SA 4.0） |
| `gt_term_baraat` | バラート（花婿の行列） | ならわし | 花婿が親族や楽隊と式の場へ向かう、踊りながら進む行列。白い馬に乗ることも。（37） | `gt_jaipur_hotel_hub` / `gt_jaipur_arrival` 20行：「花婿の行列は、旅の最後の夜、旧市街のハワー・マハルの近くを通ります」<br>└ ジャイプール到着（必須）。アマンからの連絡「花婿の行列は、旅の最後の夜…」。行列そのものの描写はフィナーレ（gt_jaipur_hawa_mahal 201・203行）。 | 【採用】[Baraat à Varanasi (1).jpg](https://commons.wikimedia.org/wiki/File:Baraat_%C3%A0_Varanasi_(1).jpg)<br>Ji-Elle／CC BY-SA 4.0／2885×2885<br>次点：[A Baraat procession, Jaipur.jpg](https://commons.wikimedia.org/wiki/File:A_Baraat_procession,_Jaipur.jpg)（CC BY 2.0） |
| `gt_term_gangaur` | ガンガウル | ならわし | 女神ガウリーを祝う、ラージャスターンの春の祭り。女性たちの行列が出る。（35） | `gt_jaipur_hawa_mahal` / `gt_jaipur_finale_battle` 327行：「ガンガウル。女神さまを敬う、春のお祭り」<br>└ ジャイプールのフィナーレ（必須）。クイズ4問目に正しく答えたとき（主人公側が答える行）。<br>`gt_jaipur_hawa_mahal` / `gt_jaipur_finale_battle` 332行：「ガンガウルよ。女神さまの、春のお祭り」<br>└ 同じクイズを間違えたとき（花嫁の祖母が答える行）。エピローグ（gt_jaipur_hotel_hub 71行）はこの後。 | 【採用】[Gangaur Idols for celebrating Gangaur Festival.jpg](https://commons.wikimedia.org/wiki/File:Gangaur_Idols_for_celebrating_Gangaur_Festival.jpg)<br>Kaushlendrapathe／CC BY-SA 4.0／3072×4080<br>次点：[The Festival of Gangaur - Google Art Project.jpg](https://commons.wikimedia.org/wiki/File:The_Festival_of_Gangaur_-_Google_Art_Project.jpg)（Public domain） |
| `gt_term_langar` | ランガル | ならわし | シク教の礼拝所にある無料の食堂。誰もが床に並んで座り、同じ食事をとる。（35） | `gt_delhi_bangla_sahib` / `gt_delhi_date_bangla_sahib` 24行：「靴を預け、素足で白い石の上を歩く。祈りの歌が、中の広間から流れてくる。その奥に、大きな台所が…」<br>└ デリーのデート「世界地図のローティー」（任意）。<br>`gt_agra_guru_ka_taal` / `gt_agra_date_guru_ka_taal` 21行：「礼拝所の食堂で、湯気の立つ豆の皿を受け取ったときだった。」<br>└ アーグラのデート「寒い国へは、夏だけ」（任意）。台本の語は「礼拝所の食堂」で「ランガル」は出ない。バングラー・サーヒブのデートをしていない人にも見せたいときだけ置く（任意の札）。 | 【採用】[Gurudwara Bangla Sahib-Langar (17).jpg](https://commons.wikimedia.org/wiki/File:Gurudwara_Bangla_Sahib-Langar_(17).jpg)<br>Ji-Elle／CC BY-SA 4.0／5472×3648<br>次点：[Gurudwara Bangla Sahib-Langar (26).jpg](https://commons.wikimedia.org/wiki/File:Gurudwara_Bangla_Sahib-Langar_(26).jpg)（CC BY-SA 4.0） |
| `gt_term_parchin_kari` | パルチン・カーリー（石の象眼（ピエトラ・ドゥーラ）） | 建物 | 色とりどりの石を切って磨き、大理石にはめこんで花や模様を描く技。（32） | `gt_agra_itimad_tomb` / `gt_agra_itimad_tomb_guide` 22行：「あ……模様が、絵の具じゃない。石がはめ込んであるんだ。花も、瓶も、ぜんぶ石」<br>└ アーグラの観光の案内（イティマード・ウッダウラ廟、必須）。19行で模様が出て、22行で「石がはめ込んであるんだ」と気づく。気づきの行に置く案（19行に置くと、気づく前に答えを見せてしまう）。 | 【採用】[Pietra Dura - Pillar - Musamman Burj - Agra Fort - Agra 2014-05-14 4143.JPG](https://commons.wikimedia.org/wiki/File:Pietra_Dura_-_Pillar_-_Musamman_Burj_-_Agra_Fort_-_Agra_2014-05-14_4143.JPG)<br>Biswarup Ganguly／CC BY 3.0／4000×6016<br>次点：[PIETRA DURA - Agra - India.png](https://commons.wikimedia.org/wiki/File:PIETRA_DURA_-_Agra_-_India.png)（CC BY-SA 3.0） |

## 優先度 低（19語）

| ID | 名前（別名） | 分類 | 1行の説明（字数） | 最初に出うる場所 | 写真 |
|---|---|---|---|---|---|
| `gt_term_paratha` | パラーター | 食べ物 | 生地に油を塗って折り重ねて焼く、層のある平たいパン。具を包むことも。（34） | `gt_delhi_red_fort` / `gt_delhi_finale_battle` 331行：「夜のチャンドニー・チョークは、昼より人が多い。揚げたてのパラーターの匂い。自転車リキシャの鈴…」<br>└ デリーのフィナーレ（必須）。匂いだけの登場。同じ行に「自転車リキシャ」（念のための札）もある。 | —（優先度 低のため探していない） |
| `gt_term_ajwain` | アジョワン | 食べ物 | 種のような小さな実で、強い香りの香辛料。揚げ菓子やパンに混ぜる。（32） | `gt_agra_tour_fatehpur_sikri` / `gt_agra_tour_mathri` 220行：「母は、何にでもアジョワンを入れます。お腹にいい、と言って」<br>└ ツアーの「マトリー」の場面。初出は212行（マトリーと同じ行）なので、窓が重ならないよう、二度目に出るこの行（母は、何にでもアジョワンを入れます）に置く案。 | —（優先度 低のため探していない） |
| `gt_term_kulhad` | クルハル（素焼きのカップ） | もの | 釉薬をかけない素焼きの小さな器。チャイを入れ、飲んだら使い捨てにする。（35） | `gt_delhi_hotel_hub_dates` / `gt_delhi_date_reassurance` 171行：「宿の屋上に上がると、彼女が素焼きのカップを二つ持って待っていた。湯気が、二本並んで上っている…」<br>└ デリーの夜のデート「チャイが冷めるまで」（告白の返事を待つときだけ）。エピローグより先に来うる。<br>`gt_delhi_hotel_hub` / `gt_delhi_epilogue` 80行：「戸を叩く音。アマンが、素焼きの小さなカップのチャイを三つ、器用に指に挟んで立っていた。」<br>└ デリーのエピローグ（必須）。上のデートをしていなければ、ここが最初。 | —（優先度 低のため探していない） |
| `gt_term_tiffin` | ティフィン（段重ねの弁当箱） | もの | 丸い金属の器を何段も重ね、取っ手で留めて運ぶインドの弁当箱。（30） | `gt_delhi_india_gate` / `gt_delhi_date_india_gate` 15行：「インド門の前の芝生は、敷物でまだら模様になっていた。風船売り、アイスの屋台、銀の弁当箱を開け…」<br>└ デリーのデート「十三人目」（任意）の冒頭。台本の語は「銀の弁当箱」。<br>`gt_agra_mariam_tomb` / `gt_agra_date_mariam_tomb` = `grandmother` 122行：「父親が、弁当箱のふたを持ったまま、黙りこんだ。祖母は涼しい顔で、揚げ菓子をもう一つ取った。」<br>└ アーグラのデート「本当の名前」（任意）。インド門のデートをしていなければ、ここが最初（台本の語は「弁当箱」）。 | —（優先度 低のため探していない） |
| `gt_term_puri` | プーリー（揚げたパン） | 食べ物 | 小麦粉の生地を丸くのばして油で揚げ、ぷくっとふくらませた平たいパン。（34） | `gt_delhi_india_gate` / `gt_delhi_date_india_gate` = `family_talk` 204行：「帰りぎわ、母親たちが弁当箱を差し出した。揚げたパンに、辛い漬物。断ると、もう一つ増えた。」<br>└ デリーのデート「十三人目」（任意）。同じ行に「漬物」（アチャール）もある。どちらか一つにする案。 | —（優先度 低のため探していない） |
| `gt_term_rose_ringed_parakeet` | ワカケホンセイインコ | 生き物 | インドなどにすむ緑色の中型のインコ。英語では「首に輪のあるインコ」。（34） | `gt_delhi_humayun_tomb` / `gt_delhi_humayun_tomb_guide` 18行：「クラクションの洪水を抜けてきた耳に、鳥の声がやけに大きく聞こえる。オウムの緑が、木から木へ飛…」<br>└ デリーの観光の案内（フマユーン廟、必須）。台本の語は「オウムの緑」。ラーム・バーグ（アーグラ）の「緑のインコ」はこの後。 | —（優先度 低のため探していない） |
| `gt_term_e_rickshaw` | 電動リキシャ（イー・リキシャ） | 乗り物 | 電気モーターで走る三輪の小さな乗り物。客を乗せて短い距離を運ぶ。（32） | `gt_agra_itimad_tomb` / `gt_agra_itimad_tomb_guide` 12行：「電動リキシャでヤムナー川の橋を渡ると、町の音が一段遠くなった。対岸の道は細く、牛がのんびり横…」<br>└ アーグラの観光の案内（イティマード・ウッダウラ廟、必須）の最初の行。 | —（優先度 低のため探していない） |
| `gt_term_iron_pillar` | デリーの鉄柱（鉄の柱） | 建物 | クトゥブの中庭に立つ、高さ約7mの古い鉄の柱。錆びにくいことで知られる。（36） | `gt_delhi_hotel_hub` / `gt_delhi_arrival` 31行：「わたしのデリー。赤い城、暗くなってから。クトゥブ・ミナール、鉄の柱、もう抱けない、腹立たしい…」<br>└ デリー到着（必須）。カムラの「五行の地図」の二行目（「ニハーリー」と同じ行）。観光地の一部なので、図鑑に入れないか、クトゥブ・ミナールの案内（gt_delhi_qutb_minar 29行「黒っぽい鉄の柱が立っていた」）に置く案。 | —（優先度 低のため探していない） |
| `gt_term_caravanserai` | 隊商宿（キャラバンサライ） | 建物 | 旅の商人や荷を運ぶ動物が泊まった、中庭を囲む宿。（24） | `gt_agra_taj_mahal` / `gt_agra_finale_battle` 324行：「タージ・ガンジは、市場と隊商宿の町。最初から、タージの計画の一部だったんですよね」<br>└ アーグラのフィナーレ（必須）。クイズ5問目に正しく答えたとき。<br>`gt_agra_taj_mahal` / `gt_agra_finale_battle` 327行：「市場と隊商宿だよ。タージの南門の外に、最初から造られた町だ。墓と一緒に生まれた町なんだ」<br>└ 同じクイズを間違えたとき（アンワルが答える行）。 | —（優先度 低のため探していない） |
| `gt_term_miniature` | 細密画（ミニアチュール） | もの | 極細の筆で細部まで描きこむ小さな絵。インドの宮廷で栄えた。（29） | `gt_jaipur_albert_hall` / `gt_jaipur_date_albert_hall` 72行：「博物館の中は、ひんやりしていた。細密画、陶器、絨毯、鎧。ひときわ賑やかなのは、制服の子どもた…」<br>└ ジャイプールのデート「ミイラより鳩」（任意）。<br>`gt_jaipur_amber_fort` / `gt_jaipur_main_amber_fort_battle` 48行：「十分前、{heroine_name}は一枚の絵を買った。中庭の隅の小さな露店で、若い画家が描…」<br>└ ジャイプールの観光クイズ（アンベール城、必須）。上のデートをしていなければ、ここが最初。 | —（優先度 低のため探していない） |
| `gt_term_gangajali` | 銀の大壺（ガンガージャリ） | もの | シティ・パレスの中庭に並ぶ、人の背丈ほどもある大きな銀の壺。（30） | `gt_jaipur_city_palace` / `gt_jaipur_city_palace_guide` 23行：「ある中庭の真ん中で、{heroine_name}の足が止まった。人の背丈ほどもある銀の壺が、…」<br>└ ジャイプールの観光の案内（シティ・パレス、必須）。 | —（優先度 低のため探していない） |
| `gt_term_laughter_club` | 笑う会（笑いヨガ） | ならわし | 理由なく声を出して笑い、それを体操にする集まり。インドで始まった。（33） | `gt_delhi_lodhi_garden` / `gt_delhi_date_lodhi_garden` 32行：「ドゥベイと申します。鉄道の駅で、三十年、列車の案内放送をしておりました。ここは、笑うために集…」<br>└ デリーのデート「笑う会の秘密」（任意）。ドゥベイが会を説明する台詞。 | —（優先度 低のため探していない） |
| `gt_term_jaivana` | ジャイヴァーナ | もの | ジャイガル砦にある、車輪のついた巨大な大砲。18世紀に砦で造られた。（34） | `gt_jaipur_jaigarh_fort` / `gt_jaipur_date_jaigarh_fort` 29行：「最初の印は、巨大な大砲だった。屋根の下に、車輪のついた砲身が横たわっている。ジャイヴァーナ。…」<br>└ ジャイプールのデート「最後のバツ印」（任意）。台本がすぐ後で詳しく説明している。 | —（優先度 低のため探していない） |
| `gt_term_shagun` | 祝い金の一ルピー（シャグン） | ならわし | 祝いの現金は端数の一ルピーを足して包む。割り切れない数が縁起よいとされる。（37） | `gt_jaipur_hotel_hub` / `gt_jaipur_arrival` 29行：「何を着ていくのか、お祝いには何を持っていくのか。宿のフロントの女性に尋ねると、笑って教えてく…」<br>└ ジャイプール到着（必須）。フロントの女性に教わる行。 | —（優先度 低のため探していない） |
| `gt_term_sehra` | セーラー（花婿の顔を覆う花の房） | もの | 婚礼で花婿の額から垂らし、顔を覆う花や飾りの房。（24） | `gt_jaipur_hawa_mahal` / `gt_jaipur_finale_battle` 203行：「赤い制服の楽隊。頭に灯りを載せて歩く男たち。白い馬の上には、花の房で顔を隠したアマン。その前…」<br>└ ジャイプールのフィナーレ（必須）。台本の語は「花の房」。 | —（優先度 低のため探していない） |
| `gt_term_panchang` | パンチャーング（ヒンドゥーの暦） | もの | 日の吉凶や祭りの日取りを計算して載せた、ヒンドゥーの暦の冊子。（31） | `gt_jaipur_jantar_mantar` / `gt_jaipur_main_jantar_mantar_battle` 41行：「声の主は、眼鏡の若い女性だった。向かいの石段には、白い腰布の老人が座っている。膝の上に、使い…」<br>└ ジャイプールの観光クイズ（ジャンタル・マンタル、必須）。台本の語は「暦の冊子」。 | —（優先度 低のため探していない） |
| `gt_term_leaf_bowl` | 葉の器（ドーナー） | もの | 乾いた葉を重ねて固めた、使い捨ての小さな器。屋台の軽食を入れる。（32） | `gt_delhi_chandni_chowk` / `gt_delhi_date_chandni_chowk` 25行：「人だかりのできた屋台があった。客はみんな、葉っぱを固めた小さな器を手に、屋台の男の前に半円を…」<br>└ デリーのデート「バス、と言うまで」（任意）。ゴルガッパの札（31行）の少し前。 | —（優先度 低のため探していない） |
| `gt_term_chishti_thread` | 願いの糸（サリーム・チシュティー廟の糸） | ならわし | 聖者の廟の石の格子に糸を結んで願う習わし。子を願う人も多い。（30） | `gt_agra_tour_fatehpur_sikri` / `gt_agra_tour_back_leg` 276行：「それに母は、聖者のお墓に糸を結んで、わたしを授かったそうです。だから、聖者のそばを離れない。…」<br>└ ファテープル・シークリーへの車のツアーの帰り（gt_agra_tour_back_leg）。 | —（優先度 低のため探していない） |
| `gt_term_sahayak` | サハーヤク（駅の荷運び） | 人 | インドの駅で客の荷物を運ぶ、鉄道公認の荷運び。赤いシャツが目じるし。（34） | `gt_delhi_inserts` / `gt_delhi_depart_scam` = `across_the_road` 461行：「階段を駆け下り、道を渡る。駅の入口で、赤いシャツの荷運びの男が、こちらの出てきた路地を見て、…」<br>└ デリーを発つ日（必須）、駅前の詐欺の場面の終わり（台本の語は「赤いシャツの荷運びの男」）。<br>`gt_delhi_inserts` / `gt_delhi_depart_station` 521行：「ホームは、発車を待つ人であふれていた。赤いシャツに真鍮の腕章をつけた荷運びの男たちが、スーツ…」<br>└ その後の駅のホームの場面（gt_delhi_depart_station）。語「サハーヤク」は523行。 | —（優先度 低のため探していない） |

---

# 2026-11-25：台本とデータを全部洗い直して足した85語

ユーザーの依頼（2026-11-25）：「可能な限り全部入れる」「分類を足しましょう」「調べが届いたら全部入れてください。また、今回の登録の範囲ややり方も（制作の手引きに）書いておいてください」。

- **候補**：`candidates-20261125.md`。台本の全行と、台本以外のデータ（クイズ・観光地・行き先・デート・お店・品物・ツアー・ミニゲームの日本語）を、担当（AI）4つで読んで集めた。
- **調べ**：85語を4つに分けて担当に頼んだ（頼み文は `briefs/`）。写真の見つからなかった4語は、もう一度だけ担当に探し直してもらった。
- **入れた言葉**：85語すべて（デリーの前半18・後半18、ジャイプール27、アーグラ22）。インド編の図鑑は162語になった。
  - 言葉ごとの説明・札の行・出典・画像と加工は `added-20261125.md`。担当が返した元のデータ（事実の引用・顔や看板の位置・メモ）は `terms-research-20261125.json`。
- **分類**：意匠と工芸・町と場所・音楽と踊り・神話と言い伝えの4つを足した（12分類）。
- **服の説明の言葉**：服の `termIds` で、木版プリント（木版プリントのクルタ）とチュリダール（翡翠色のアナルカリ）を、服を買ったときに入れる。
- **屋上に突き出た鉄筋**：はじめは出典が見つからず見送った。ユーザーの依頼（「これは出典を探しまくって欲しい」）で、ヒンディー語でも探し直し、2つの出典で確かめて入れた（下の節）。

## 決めたこと

- **クイズの答えの言葉**：その問いに答えた後の行にだけ札を置いた。例：鏡の間、シティ・パレスの四つの門、最後のムガル皇帝、ジャワーブ、サリーム・チシュティー、シャージャハーナーバード、手を切られた職人の伝説。
  - ブルハーンプルは1問目の答え（ムムターズが亡くなった町）だが、説明の「庭に半年ほど葬られた」が2問目の答えなので、2問目の後に置いた。
- **場面に合わせて言葉を変えた**：
  - 「両手をお椀の形にして差し出した」の行は、ランガルでローティーを受け取る場面だった。そのため、「カラー・プラサード」ではなく「両手で受け取る」にし、説明でカラー・プラサードに触れた。
  - 頭を覆う布の名前の案「パトカー（patka）」は、日本語の車のパトカーに読める。そのため、名前を「頭を覆う布」、別名を貸し出しの布の呼び名「ルマール」にした。
- **言葉そのものの説明に直した**：赤い砂岩（案は塔の説明だった）、バハイ信仰（案は礼拝堂の説明だった）、バーオリー（階段井戸）。
- **写真を使い回した**：鉄の柱を抱く願掛け（デリーの鉄柱の写真）、ムフールタ（パンチャーングの写真）。
  - 2026-11-27に、この2つを含む24語の画像を、言葉そのものの画像に差し替えた（`reimage-20261127.md`）。
- **自作の図（CC0。SVG は `diagrams/`）**：頭を覆う布、頭に手を置く祝福、バクシーシ、屋上に突き出た鉄筋。
  - バクシーシの写真の候補は、1879年のエジプトの本の物乞いの挿絵だけだった。インドの場面でもなく、人を見下ろす描き方なので使わず、場面（手のひらを上に向けて差し出す）に合わせた図にした。
- **人と文字の扱い**：
  - 顔は、まず切り抜いて外した（座り込みは横断幕だけ、オールド・デリーは建物と電線だけ、カラー・プラサードは手だけ、パハールガンジは看板の並ぶ上だけ）。
  - 切り抜けないタージ前の電動カートは、観光客の顔など9か所をぼかした。
  - 写真に入れた文字や撮影日時（水牛の「agra」、ベンチの日時）と、車の番号札（牛）は、切り抜いて外した。
- **縮小版の大きさ**：Commons の縮小版が元画像より大きく配られていた2枚（カラー・プラサード、グル・ハルクリシャン）は、元の寸法に戻した。Commons の利用制限で元の寸法を読めなかった4枚（サローヴァル、パハールガンジ、前撮り、電動カート）は、`modificationJa` に「幅○pxの縮小版」とだけ書いた。

## 屋上に突き出た鉄筋の出典（2026-11-25に探し直した）

- 説明：「家は一度に建てず、数年ごとに階を足す。その備えの鉄筋が、何年も屋上に残る。」（37字）。別名「サリヤー」は、ヒンディー語で鉄筋のこと（सरिया。下の記事の言葉）。
- 札：アーグラのツアーの帰り道「道沿いの家の屋上から、鉄の棒が何本も突き出していた。…」（台本が言うとおりの話）。
- **出典1**：AajTak（インドの大手ヒンディー語ニュース）「घर की बालकनी और पिलर में सरिए निकले देखे होंगे... कभी सोचा है इन्हें काटते क्यों नहीं?」（家のバルコニーや柱から鉄筋が出ているのを見たことがあるでしょう。なぜ切らないのか考えたことは？）2026-08-06。
  https://www.aajtak.in/information/story/why-steel-bars-stick-out-of-rcc-columns-and-pillars-tedu-dskc-2616104-2026-08-06
  - “भारत में बहुत से लोग अपना घर एक साथ पूरा नहीं बनाते.”（インドでは、多くの人が家を一度に建て終えない。）
  - “पहले ग्राउंड फ्लोर बनता है, फिर कुछ साल बाद पहली मंजिल और उसके बाद दूसरी मंजिल.”（まず1階を建て、数年後に2階、その後に3階を建てる。）
  - “यही वजह है कि घर बनाते समय इंजीनियर या ठेकेदार कई बार पिलर और छत से सरिए बाहर छोड़ देते हैं.”（そのため、家を建てるとき、技師や請負人は柱や屋上から鉄筋を外に出しておくことが多い。）
  - “कई बार भविष्य में कभी निर्माण होता ही नहीं, लेकिन सरिए सालों तक खुले रहते हैं.”（結局その先の工事が行われないことも多く、鉄筋は何年もむき出しのまま残る。）
- **出典2**：Geetika Anand「A Place to Live: Incremental Building and its Logics in Informal Settlements of Cape Town and Delhi」（ケープタウン大学の修士論文、2020年1月）48ページ。デリーのガヤトリ・コロニーの家の調べ。
  https://open.uct.ac.za/bitstreams/94c92ac2-70a7-441b-929f-12349db20d88/download
  - “some have already built a second storey, some plan to do that later; but the foundation is laid for upward expansion.”
  - “Exposed reinforcement (steel bars) can be found sticking out on ID’s terrace (Plate 4.4), as commonly seen in bulk of the houses in Gayatri Colony–a symbol of ‘house in making’.”
  - 同じ調べをもとにした論文が、雑誌 City（Taylor & Francis、2023年、doi:10.1080/13604813.2023.2172911）に出ているが、出版社のページは読めなかった（403）。そのため、元になった学位論文を大学の保管庫から取って読んだ。
- **見つけ方**：英語で探すと、中米やアフリカの例、図解のブログ、掲示板の書き込みばかりで、インドについての確かな出典が出なかった。ヒンディー語の「छत पर सरिया」（屋上の鉄筋）で探すと、上の記事が見つかった。論文は、英語の「incremental building」「Delhi」「rooftop steel bars」で探した。
- **写真**：Wikimedia Commons の分類（建設中の家・インドの建設・鉄筋）と全文検索、Openverse（Flickr の CC の写真）で、デリー・ヴァーラーナシー・アーグラ・ジャイプールの屋上の写真を見たが、インドの家の屋上に鉄筋がはっきり写るものはなかった。そのため図を自作した。
- **見送った出典**：Sketchplanations「Pillars of hope」（中米とアジアとだけ書き、インドを名指ししない）、Nepali Times の随筆（ネパール）、Hacker News の書き込み（掲示板）、住宅の設計の手引き（業者のページ）。

## 確かでないこと（2026-11-25）

- **牛**：「インドのマクドナルドは牛肉を出さない」の出典は、1996年の開店時の記事（The Christian Science Monitor）と2012年の記事（Al Jazeera）。今のメニューは見ていない。
- **孔雀**：「自然に抜け落ちた羽だけ集めてよい」は、英語版ウィキペディアだけの話で、議会の答弁（検索結果の要約だけを見た）と食い違うので書かなかった。説明は「国鳥で、法律で守られる」まで。
- **前撮り**：流行していることは ThePrint（2026-07-10）で確かめた。タージを背景に撮る話は、観光業者のページの要約しか見ていないので、説明には「遺跡や宮殿」とだけ書いた。写真はジャイプールのシティ・パレスで、ファイルの説明は「婚礼写真の撮影」（前撮りとは書いていない）。
- **出典が百科事典だけの言葉**：蓮・パハールガンジ・グル・ハルクリシャン・バハイ信仰・ベーラン・シャバド・キールタン・チャイ・ジャワーブ・バーブル・ナーマなど。どれも、よく知られた事実だけを書いた。
- **数字を書かなかった言葉**：ブランド・ダルワーザの高さ（資料により40・51・54m）、水牛の乳の割合（年と数え方で43〜51%）、チャイの生産・消費の順位。
- **言い伝え・信仰として書いた言葉**：手を切られた職人の伝説（「歴史家は裏づけを見つけていない」）、鉄の柱を抱く願掛け（「信じられていた」）、サローヴァルの水（「癒やしの力があるとされ」）、クミンの水（「効くとされる」）。

---

# 写真の詳細（高・中）

寸法は元画像。下見の画像は `photos/<ID>/A.jpg`（採用）と `B.jpg`（次点）。ライセンスと作者は、ファイルページのライセンスの札（ウィキテキスト）と画像情報（extmetadata）で確かめた。確認日はどれも 2026-11-13。


## ゴルガッパ（`gt_term_golgappa`）

### 【採用】A. Crispy Pani Puri.jpg
- 合う点・合わない点：緑の水と、穴をあけた揚げ玉が一目で分かる。皿の飾り（薄切りの玉ねぎ・唐辛子）が少し華やかすぎる。
- 人物：人物の顔は写っていない。
- 寸法：2592×1944
- 切り出しの案：正方形に切るなら中央。皿の上の揚げ玉と、真ん中の緑の水が入る。（`imagePosition` x=50、y=50）
- 作者：Teena Sometimes
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2015-06-15 14:45:55
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Crispy_Pani_Puri.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/5/5c/Crispy_Pani_Puri.jpg
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Teena Sometimes|Teena Sometimes]]）
- 代替テキストの案（`altJa`）：皿に並んだゴルガッパの写真。薄く揚げた丸い玉の上部に穴があき、真ん中の器に緑色の香草水が入っている。
- 出典表記の案（`creditJa`）：写真：Teena Sometimes／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Panipuri, Golgappa, Phuchka.jpg
- 揚げ玉に具をのせ、中央の器に香草水。茶色の台。具が多く、玉の形がやや見えにくい。
- Rupamdas75／**CC BY-SA 4.0**／1200×800／https://commons.wikimedia.org/wiki/File:Panipuri,_Golgappa,_Phuchka.jpg

## ブラックバック（`gt_term_blackbuck`）

### 【採用】A. Blackbuck in Tal Chhapar Sanctuary November 2025 by Tisha Mukherjee 06.jpg
- 合う点・合わない点：雄の黒い背、白い腹、らせんの角がはっきり見える。背景は枯れ草で単純。撮影はラージャスターン州のタール・チャーパル保護区（アクバル廟ではない）。
- 人物：人物の顔は写っていない。
- 寸法：4265×3199
- 切り出しの案：横長。正方形なら x≈50 で、体と角が収まる。（`imagePosition` x=50、y=50）
- 作者：Tisha Mukherjee
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2025-11-26 08:35:29
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Blackbuck_in_Tal_Chhapar_Sanctuary_November_2025_by_Tisha_Mukherjee_06.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/5/5e/Blackbuck_in_Tal_Chhapar_Sanctuary_November_2025_by_Tisha_Mukherjee_06.jpg
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Tisha Mukherjee|Tisha Mukherjee]]）
- 代替テキストの案（`altJa`）：乾いた草地を歩く雄のブラックバックの写真。背は黒く腹は白く、らせん状にねじれた長い角がある。
- 出典表記の案（`creditJa`）：写真：Tisha Mukherjee／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. BBR-Male-Blackbuck-walking (16120302957).jpg
- 歩く雄の横向き。茶色の地面の前で、黒い体と角がくっきりしている。CC BY 2.0（継承なし）。
- Navin Sigamany／**CC BY 2.0**／2000×1335／https://commons.wikimedia.org/wiki/File:BBR-Male-Blackbuck-walking_(16120302957).jpg

## アタル（`gt_term_attar`）

### 【採用】A. Perfume bottles displayed at a shop near Charminar in Hyderabad, India.jpg
- 合う点・合わない点：台本の「色の違う液体の小瓶が何十本も並んでいる」に近い。撮影はハイデラバードのチャールミナール近くの店で、デリーではない。
- 人物：人物の顔は写っていない。
- 寸法：6120×8160
- 切り出しの案：縦長。正方形なら中央で、金色の台に並んだ小瓶の列が入る。（`imagePosition` x=50、y=50）
- 作者：Dev Jadiya
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2026-07-09 19:23:44
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Perfume_bottles_displayed_at_a_shop_near_Charminar_in_Hyderabad,_India.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/f/f2/Perfume_bottles_displayed_at_a_shop_near_Charminar_in_Hyderabad%2C_India.jpg
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Dev Jadiya|Dev Jadiya]]）
- 代替テキストの案（`altJa`）：香油の店に並ぶ小さなガラス瓶の写真。色の違う液体の入った飾り瓶が、金色の台に何十本も並んでいる。
- 出典表記の案（`creditJa`）：写真：Dev Jadiya／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Camel skin Perfume Bottles from Kannauj.jpg
- カナウジ（アタルの産地）の、ラクダの革で作った香油の入れ物。伝統の道具だが、小瓶の店先とは違う。
- David Prasad／**CC BY-SA 2.0**／4928×3264／https://commons.wikimedia.org/wiki/File:Camel_skin_Perfume_Bottles_from_Kannauj.jpg

## ペーター（`gt_term_petha`）

### 【採用】A. Petha-from-Agra.JPG
- 合う点・合わない点：半透明の質感がよく分かる。説明に「アーグラのペーター」とある。
- 人物：人物の顔は写っていない。
- 寸法：2224×1428
- 切り出しの案：横長。正方形なら中央で、二切れとも入る。（`imagePosition` x=50、y=50）
- 作者：Rsrikanth05
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2015-06-30 02:03:48
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Petha-from-Agra.JPG
- 元画像：https://upload.wikimedia.org/wikipedia/commons/b/b4/Petha-from-Agra.JPG
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Rsrikanth05|Rsrikanth05]]）
- 代替テキストの案（`altJa`）：黒い背景に置かれたアーグラのペーター二切れの写真。白っぽく半透明で、砂糖の粒が光っている。
- 出典表記の案（`creditJa`）：写真：Rsrikanth05／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Agra sweet petha.jpg
- 一切れの寄り。335×386と小さい。CC BY 4.0。
- Muralikrishna m／**CC BY 4.0**／335×386／https://commons.wikimedia.org/wiki/File:Agra_sweet_petha.jpg

## マトリー（`gt_term_mathri`）

### 【採用】A. Masala Mathri.JPG
- 合う点・合わない点：狐色で平たく、台本の「狐色の平たい揚げ菓子」に近い。黒い背景で形が読みやすい。
- 人物：人物の顔は写っていない。
- 寸法：4896×3672
- 切り出しの案：横長。正方形なら中央で、皿の上の数枚が入る。（`imagePosition` x=50、y=50）
- 作者：Mdsmds0
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2015-06-11 11:23:20
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Masala_Mathri.JPG
- 元画像：https://upload.wikimedia.org/wikipedia/commons/e/ef/Masala_Mathri.JPG
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Mdsmds0|Mdsmds0]]）
- 代替テキストの案（`altJa`）：金属の皿に盛ったマトリーの写真。狐色に揚がった平たい丸い揚げ菓子が重なっている。
- 出典表記の案（`creditJa`）：写真：Mdsmds0／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Mathri.JPG
- 鉄の皿に盛った緑がかったマトリー（香草入り）。パブリックドメイン。
- Randhir／**Public domain**／1600×1200／https://commons.wikimedia.org/wiki/File:Mathri.JPG

## メヘンディ（`gt_term_mehndi`）

### 【採用】A. Mehndi front.JPG
- 合う点・合わない点：黒い背景で、細い線の模様まで読める。手の甲側で、手のひらではない。人の顔は写っていない（手だけ）。
- 人物：人物の顔は写っていない。
- 寸法：4578×3170
- 切り出しの案：横長。正方形なら中央で、二つの手の甲と指先の模様が入る。（`imagePosition` x=50、y=50）
- 作者：AKS.9955
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2015-10-30 13:04:50
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Mehndi_front.JPG
- 元画像：https://upload.wikimedia.org/wikipedia/commons/3/3f/Mehndi_front.JPG
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:AKS.9955|AKS.9955]]）
- 代替テキストの案（`altJa`）：メヘンディを描いた二つの手の写真。手の甲から指先まで、こげ茶色の細かな網目や花の模様が描かれている。
- 出典表記の案（`creditJa`）：写真：AKS.9955／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Hand with mehndi design.jpg
- 赤茶色に染まった手のひらの模様と腕輪。台本の「手のひら」に近い。960×539と小さめ。
- Rajettan／**CC BY-SA 4.0**／960×539／https://commons.wikimedia.org/wiki/File:Hand_with_mehndi_design.jpg

## ニンブー・ミルチ（`gt_term_nimbu_mirchi`）

### 【採用】A. Nimbu-Mirchi Totka à Jaipur (2).jpg
- 合う点・合わない点：ジャイプールで撮った、まさに店先の魔よけ。糸・レモン・唐辛子がはっきり見える。車のバックミラーではない。
- 人物：人物の顔は写っていない。
- 寸法：3648×5472
- 切り出しの案：縦長。上端に店の看板の文字が少し写るので、y≈60 で下寄りに切り、看板を外す。（`imagePosition` x=50、y=60）
- 作者：Ji-Elle
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2019-11-19 05:11:50
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Nimbu-Mirchi_Totka_%C3%A0_Jaipur_(2).jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/9/99/Nimbu-Mirchi_Totka_%C3%A0_Jaipur_%282%29.jpg
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Ji-Elle|Ji-Elle]]）
- 代替テキストの案（`altJa`）：店先に吊るされたニンブー・ミルチの写真。糸に通したレモンと、緑と赤の唐辛子が下がっている。
- 出典表記の案（`creditJa`）：写真：Ji-Elle／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Nimbu-Mirchi Totka à Jaipur (1).jpg
- 同じ撮影者が同じ町で撮った別の一本。配線の箱の前に下がっていて、背景が少し雑然としている。
- Ji-Elle／**CC BY-SA 4.0**／3648×5472／https://commons.wikimedia.org/wiki/File:Nimbu-Mirchi_Totka_%C3%A0_Jaipur_(1).jpg

## ローティー（`gt_term_roti`）

### 【採用】A. Chapati 2.jpg
- 合う点・合わない点：焼き目のある薄い丸い生地がはっきり分かる。寄りの写真で、丸い形が画面からはみ出し気味。
- 人物：人物の顔は写っていない。
- 寸法：3648×2736
- 切り出しの案：横長。正方形なら中央で、焼き目のある丸い面が画面いっぱいに入る。（`imagePosition` x=50、y=50）
- 作者：Manavatha
- ライセンス：**CC BY-SA 3.0** https://creativecommons.org/licenses/by-sa/3.0
- 撮影・作成：0017-01-14
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Chapati_2.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/4/4c/Chapati_2.jpg
- 確認：{{Self|1=GFDL|2=cc-by-sa-3.0|author={{User at project|Manavatha|w|en}}|migration=redundant}}（GFDL と CC BY-SA 3.0 の二重ライセンス）
- 代替テキストの案（`altJa`）：金属の皿に重ねたローティー（チャパーティー）の写真。薄く丸い生地に、ところどころ茶色の焼き目がある。
- 出典表記の案（`creditJa`）：写真：Manavatha／Wikimedia Commons／CC BY-SA 3.0

### 次点 B. Chapati 1.jpg
- 白い皿に一枚のチャパーティーと小皿の漬物。黒い背景で形が読みやすい。
- Gaurav Dhwaj Khadka／**CC BY-SA 4.0**／3024×4032／https://commons.wikimedia.org/wiki/File:Chapati_1.jpg

## ドゥパッター（`gt_term_dupatta`）

### 【採用】A. Bandhani Dupatta (5788125979).jpg
- 合う点・合わない点：薄く長い布の質感は分かるが、どう身に着けるか（肩や頭に掛ける）は見えない。顔の写らない「着ている写真」は見つからなかった。撮影地はアメリカ（ファイルページの座標）。
- 人物：人物の顔は写っていない。
- 寸法：2048×1536
- 切り出しの案：横長。どこを切っても布が画面いっぱいに入る。（`imagePosition` x=50、y=50）
- 作者：goblinbox (queen_of_ad_hoc_bento)
- ライセンス：**CC BY 2.0** https://creativecommons.org/licenses/by/2.0
- 撮影・作成：2011-05-28 15:23:18
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Bandhani_Dupatta_(5788125979).jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/f/f8/Bandhani_Dupatta_%285788125979%29.jpg
- 確認：{{FlickrVerifiedByUploadWizard|cc-by-2.0}}・{{cc-by-2.0}}（座標はアメリカ合衆国ワシントン州。インドで撮った布ではない）
- 代替テキストの案（`altJa`）：桃色の絞り染めのドゥパッターの寄りの写真。薄い布に白い小さな点の模様が並び、ゆるくひだを作っている。
- 出典表記の案（`creditJa`）：写真：goblinbox (queen_of_ad_hoc_bento)／Wikimedia Commons／CC BY 2.0

### 次点 B. At The Fair (5823095519).jpg
- ハリヤーナー州ファリーダーバードの祭りで、女性たちが頭から布をかぶって歩く写真。着方は分かるが、顔が主題なので、切り出しかぼかしが必要。
- Koshy Koshy／**CC BY 2.0**／1000×1510／https://commons.wikimedia.org/wiki/File:At_The_Fair_(5823095519).jpg

## ラックの腕輪（`gt_term_lac_bangles`）

### 【採用】A. Lac Bangles making Hyderabad (29986).jpg
- 合う点・合わない点：色とりどりの腕輪が棚いっぱいに並び、台本の「色の洪水」に近い。撮影はハイデラバードのラード・バザールで、ジャイプールではない。
- 人物：人物の顔は写っていない。
- 寸法：4096×3072
- 切り出しの案：横長。正方形なら中央やや上で、腕輪を掛けた棒の段が入る。（`imagePosition` x=50、y=45）
- 作者：PJeganathan
- ライセンス：**CC BY-SA 3.0** https://creativecommons.org/licenses/by-sa/3.0
- 撮影・作成：30 August 2026 (according to Exif data)
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Lac_Bangles_making_Hyderabad_(29986).jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/6/6e/Lac_Bangles_making_Hyderabad_%2829986%29.jpg
- 確認：{{self|cc-by-sa-3.0}}（author 欄：[[User:PJeganathan|PJeganathan]]）
- 代替テキストの案（`altJa`）：店の棒に何段も掛けられたラックの腕輪の写真。赤、緑、黄、桃色の腕輪に、小さな石や模様が並ぶ。
- 出典表記の案（`creditJa`）：写真：PJeganathan／Wikimedia Commons／CC BY-SA 3.0

### 次点 B. Lac Bangles making Hyderabad.jpg
- 同じ撮影者・同じ店の縦長の写真。腕輪の棚を正面から。
- PJeganathan／**CC BY-SA 3.0**／3072×4096／https://commons.wikimedia.org/wiki/File:Lac_Bangles_making_Hyderabad.jpg

## ジャレビー（`gt_term_jalebi`）

### 【採用】A. Jalebi 2.jpg
- 合う点・合わない点：色と渦巻きの形がはっきりしている。器と背景も単純。
- 人物：人物の顔は写っていない。
- 寸法：2832×2128
- 切り出しの案：横長。正方形なら中央で、器の中の渦巻きがほぼ全部入る。（`imagePosition` x=50、y=50）
- 作者：Haroldandkumar
- ライセンス：**Public domain** 
- 撮影・作成：12 February 2007 (original upload date)
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Jalebi_2.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/e/e8/Jalebi_2.jpg
- 確認：{{PD-user-en|Haroldandkumar}}（author 欄：{{user at project|Haroldandkumar|wikipedia|en}}）
- 代替テキストの案（`altJa`）：ガラスの器に盛ったジャレビーの写真。明るい橙色の、渦巻きの形の揚げ菓子がつやつや光っている。
- 出典表記の案（`creditJa`）：写真：Haroldandkumar／Wikimedia Commons／パブリックドメイン

### 次点 B. Jalebi 1.jpg
- 金属の器に大きな渦巻きが一つ。形はいちばん分かりやすいが、縦長。
- Gaurav Dhwaj Khadka／**CC BY-SA 4.0**／3024×4032／https://commons.wikimedia.org/wiki/File:Jalebi_1.jpg

## ニハーリー（`gt_term_nihari`）

### 【採用】A. Nihari.JPG
- 合う点・合わない点：骨つきのすね肉と油の浮いた煮込み、薬味の小皿がそろい、この料理らしい。下の布の柄が少しにぎやか。
- 人物：人物の顔は写っていない。
- 寸法：2816×2112
- 切り出しの案：横長。正方形なら x≈40 で、煮込みの皿が中心に入り、右の薬味の小皿は端にかかる。（`imagePosition` x=40、y=50）
- 作者：Miansari66
- ライセンス：**Public domain** 
- 撮影・作成：2007
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Nihari.JPG
- 元画像：https://upload.wikimedia.org/wikipedia/commons/2/24/Nihari.JPG
- 確認：{{PD-self}}（author 欄：[[User:Miansari66|Miansari66]]）
- 代替テキストの案（`altJa`）：皿に盛ったニハーリーの写真。骨つきの肉が赤茶色の濃い煮込みに沈み、横の小皿にレモン・生姜・青唐辛子の薬味がある。
- 出典表記の案（`creditJa`）：写真：Miansari66／Wikimedia Commons／パブリックドメイン

### 次点 B. Nihari taj.jpg
- 器に盛った煮込みに香菜と生姜。いちばん整った見た目だが、撮影地は日本（埼玉県八潮市のインド・パキスタン料理店）。
- 赤猫法師／**CC BY-SA 4.0**／3511×2340／https://commons.wikimedia.org/wiki/File:Nihari_taj.jpg

## キチュリー（`gt_term_khichdi`）

### 【採用】A. Masala Khichadi.jpg
- 合う点・合わない点：やわらかく煮た米と豆の様子が分かる。香辛料の入った「マサラ・キチュリー」で、病人向けの白っぽいものより色が濃い。
- 人物：人物の顔は写っていない。
- 寸法：5184×3456
- 切り出しの案：横長。正方形なら中央で、鍋の中のキチュリーが入る。（`imagePosition` x=50、y=50）
- 作者：Dkgohil
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2015-04-22 08:44:39
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Masala_Khichadi.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/1/10/Masala_Khichadi.jpg
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Dkgohil|Dkgohil]]）
- 代替テキストの案（`altJa`）：金属の鍋に入ったキチュリーの写真。黄色く煮えた米と豆に、トマトや香辛料の葉がまじっている。
- 出典表記の案（`creditJa`）：写真：Dkgohil／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. ভুনা খিচুড়ি 1.jpg
- 皿のキチュリーの横に、生の米と数種の豆を並べた写真。材料が一目で分かる。バングラデシュの炒め煮風（やや固め）。
- Dolon Prova／**CC BY-SA 4.0**／5000×3391／https://commons.wikimedia.org/wiki/File:%E0%A6%AD%E0%A7%81%E0%A6%A8%E0%A6%BE_%E0%A6%96%E0%A6%BF%E0%A6%9A%E0%A7%81%E0%A6%A1%E0%A6%BC%E0%A6%BF_1.jpg

## マギー（`gt_term_maggi`）

### 【採用】A. Maggi Bowl.jpg
- 合う点・合わない点：器に盛った麺だけで、袋の商標は写っていない。写真は小さめ（720×1280）。
- 人物：人物の顔は写っていない。
- 寸法：720×1280
- 切り出しの案：縦長（720×1280と小さめ）。正方形なら y≈45 で器全体が入る。（`imagePosition` x=50、y=45）
- 作者：Mrudit161187
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2015-06-16
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Maggi_Bowl.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/8/8b/Maggi_Bowl.jpg
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Mrudit161187|Mrudit161187]]）
- 代替テキストの案（`altJa`）：白い器に入ったマギーの即席麺の写真。香辛料で黄色く色づいた細い麺に、スプーンが添えてある。
- 出典表記の案（`creditJa`）：写真：Mrudit161187／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Maggi - 1.jpg
- 鍋で野菜と一緒に煮ているところ。横長（1024×576）。
- Ashok Kumar P S／**CC BY-SA 4.0**／1024×576／https://commons.wikimedia.org/wiki/File:Maggi_-_1.jpg

## アチャール（`gt_term_achar`）

### 【採用】A. Indian Mango Pickles.JPG
- 合う点・合わない点：香辛料と油で漬けた、日本の漬物とは違う見た目がよく分かる。台本のライムではなくマンゴーの漬物。
- 人物：人物の顔は写っていない。
- 寸法：4608×3456
- 切り出しの案：横長。どこを切っても漬物が画面いっぱいに入る。（`imagePosition` x=50、y=50）
- 作者：Sidg13
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2015-05-02 22:59:01
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Indian_Mango_Pickles.JPG
- 元画像：https://upload.wikimedia.org/wikipedia/commons/7/70/Indian_Mango_Pickles.JPG
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Sidg13|Sidg13]]）
- 代替テキストの案（`altJa`）：赤い香辛料と油をまとったマンゴーのアチャールの寄りの写真。緑の皮のついた果肉が、ごろごろ入っている。
- 出典表記の案（`creditJa`）：写真：Sidg13／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Mango Pickle Home Made Style.JPG
- 白い皿に盛った手作りのマンゴーの漬物。CC0。
- Miansari66／**CC0**／2816×2112／https://commons.wikimedia.org/wiki/File:Mango_Pickle_Home_Made_Style.JPG

## クルタ（`gt_term_kurta`）

### 【採用】A. Blue khadi kurta.jpg
- 合う点・合わない点：クルタの形（襟なし・長い丈）が一目で分かる。写真が小さい。
- 人物：首から上は写っていない（顔なし）。
- 寸法：600×800
- 切り出しの案：縦長（600×800と小さめ）。正方形なら中央で、襟元から裾まで入れるには縦長のまま使う。（`imagePosition` x=50、y=50）
- 作者：Purva4u
- ライセンス：**CC BY-SA 3.0** http://creativecommons.org/licenses/by-sa/3.0/
- 撮影・作成：2007-10-16
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Blue_khadi_kurta.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/c/c5/Blue_khadi_kurta.jpg
- 確認：{{GFDL-user-en-no-disclaimers|Purva4u|migration = relicense}}（author 欄：[[:en:User:Purva4u|Purva4u]] ([[:en:User talk:Purva4u|talk]]) ([[:en:Special:ListFiles/Purva4u|Uploads]])）（GFDL から CC BY-SA 3.0 へのライセンス移行済み）
- 代替テキストの案（`altJa`）：水色の手織り木綿のクルタの写真。襟なしで、膝近くまである長い上着。
- 出典表記の案（`creditJa`）：写真：Purva4u／Wikimedia Commons／CC BY-SA 3.0

### 次点 B. Kurta closeup sandalwood buttons.jpg
- 生成りのクルタの胸元の寄り。白檀のボタン。上端にあごの先が少し写るので、切り出しで外す。パブリックドメイン。
- Fowler&fowler／**Public domain**／1690×1111／https://commons.wikimedia.org/wiki/File:Kurta_closeup_sandalwood_buttons.jpg

## ドーティー（`gt_term_dhoti`）

### 【採用】A. A man in dhoti tied north Indian style.jpg
- 合う点・合わない点：北インド式の巻き方がよく分かる。上は普通のTシャツ。
- 人物：**顔が写っている。胸より下だけを切り出すこと**（切り出せないなら顔をぼかす）。
- 寸法：2336×3504
- 切り出しの案：縦長。顔が写っているので、胸より下（y≈45〜100%）だけを切り出し、腰から足首までの白いドーティーを見せる。（`imagePosition` x=50、y=72）
- 作者：Abigail Batchelder
- ライセンス：**CC BY 2.0** https://creativecommons.org/licenses/by/2.0
- 撮影・作成：2009-03-29 11:38
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:A_man_in_dhoti_tied_north_Indian_style.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/f/fe/A_man_in_dhoti_tied_north_Indian_style.jpg
- 確認：{{cc-by-2.0}}・{{User:FlickreviewR/reviewed-pass|abbybatchelder|https://flickr.com/photos/17668216@N00/3402225732|2017-03-17 09:09:14|cc-by-2.0|}}（author 欄：[https://www.flickr.com/people/17668216@N00 Abigail Batchelder]）
- 代替テキストの案（`altJa`）：白いドーティーをはいた男性の下半身の写真。一枚の布を腰に巻き、脚の間を通して、ゆったりしたズボンのように着ている。
- 出典表記の案（`creditJa`）：写真：Abigail Batchelder／Wikimedia Commons／CC BY 2.0

### 次点 B. Dhoti.tif
- 「ドーティー」の着付けを描いた線画（写真ではない）。CC0。顔の問題がない代わりに、写真ではない。
- David Ring／**CC0**／1680×2350／https://commons.wikimedia.org/wiki/File:Dhoti.tif

## ホーン・オーケー・プリーズ（`gt_term_horn_ok_please`）

### 【採用】A. Mumbai (Bombay), RTW 2012 (8404896932).jpg
- 合う点・合わない点：トラックの後ろに描かれた文字そのもの。にぎやかな絵柄のトラック・アートではなく、白地の簡素な描き方。
- 人物：人物の顔は写っていない。
- 寸法：1936×2592
- 切り出しの案：縦長。正方形なら y≈55 で、荷台の後ろの「OK」と「HORN PLEASE」の文字が入る。（`imagePosition` x=50、y=55）
- 作者：Ana Raquel S. Hernandes
- ライセンス：**CC BY-SA 2.0** https://creativecommons.org/licenses/by-sa/2.0
- 撮影・作成：2012-11-26 18:08
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Mumbai_(Bombay),_RTW_2012_(8404896932).jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/b/b4/Mumbai_%28Bombay%29%2C_RTW_2012_%288404896932%29.jpg
- 確認：{{cc-by-sa-2.0}}（author 欄：[https://www.flickr.com/people/23930118@N04 Ana Raquel S. Hernandes] from Sao Paulo, Brazil）
- 代替テキストの案（`altJa`）：ムンバイのトラックの荷台の後ろの写真。白い扉に赤い「OK」と、「HORN PLEASE」の文字が描かれている。
- 出典表記の案（`creditJa`）：写真：Ana Raquel S. Hernandes／Wikimedia Commons／CC BY-SA 2.0

### 次点 B. Horn Ok sign on a Bangalore truck.jpg
- ベンガルールのトラックの黄色い板に、大きく「Horn」「K」と赤い反射板。字が大きく読みやすいが、「PLEASE」は写っていない。
- Subhashish Panigrahi／**CC BY-SA 3.0**／2448×2448／https://commons.wikimedia.org/wiki/File:Horn_Ok_sign_on_a_Bangalore_truck.jpg

## オートリキシャ（`gt_term_auto_rickshaw`）

### 【採用】A. Auto Rickshaws outside Purana Qila, Delhi.jpg
- 合う点・合わない点：デリーのCNG車の緑と黄の配色。側面から見て三輪の形が分かる。
- 人物：人は遠くに小さく写るだけで、顔は見分けられない（原寸で要確認）。
- 寸法：6000×4000
- 切り出しの案：横長。手前の一台が左にあるので、x≈30 で切ると一台が大きく入る。（`imagePosition` x=30、y=55）
- 作者：Slyronit
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2014-03-05 16:27:29
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Auto_Rickshaws_outside_Purana_Qila,_Delhi.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/1/1b/Auto_Rickshaws_outside_Purana_Qila%2C_Delhi.jpg
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Slyronit|Slyronit]]）
- 代替テキストの案（`altJa`）：デリーのプラーナー・キラーの前に並ぶオートリキシャの写真。緑の車体に黄色の幌の、三輪の小さなタクシー。
- 出典表記の案（`creditJa`）：写真：Slyronit／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Auto-rickshaw.JPG
- 一台を斜め前から大きく写した写真。形はいちばん分かりやすいが、運転席の人の顔を原寸で確かめる必要がある。
- J. Miers／**CC BY-SA 4.0**／3072×2304／https://commons.wikimedia.org/wiki/File:Auto-rickshaw.JPG

## 自転車リキシャ（`gt_term_cycle_rickshaw`）

### 【採用】A. Cycle Rickshaw - Chandni Chowk Road - Delhi 2014-05-13 3518.JPG
- 合う点・合わない点：物語の舞台と同じチャンドニー・チョークの通り。前の自転車と後ろの客席の形が分かる。
- 人物：こぎ手が写っている（横向きで小さい）。原寸で顔が見分けられるなら、ぼかしが要る。
- 寸法：6016×4000
- 切り出しの案：横長。正方形なら中央で、こぎ手と後ろの客席が入る。（`imagePosition` x=50、y=55）
- 作者：Biswarup Ganguly
- ライセンス：**CC BY 3.0** https://creativecommons.org/licenses/by/3.0
- 撮影・作成：2014-05-13 17:57:02
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Cycle_Rickshaw_-_Chandni_Chowk_Road_-_Delhi_2014-05-13_3518.JPG
- 元画像：https://upload.wikimedia.org/wikipedia/commons/8/8e/Cycle_Rickshaw_-_Chandni_Chowk_Road_-_Delhi_2014-05-13_3518.JPG
- 確認：{{self|GFDL|cc-by-3.0|author=Biswarup Ganguly}}・{{self|GFDL|cc-by-3.0}}（author 欄：[[User:Gangulybiswarup|Biswarup Ganguly]]）
- 代替テキストの案（`altJa`）：デリーのチャンドニー・チョークの通りを走る自転車リキシャの写真。人がペダルをこぎ、後ろに幌つきの客席がある。
- 出典表記の案（`creditJa`）：写真：Biswarup Ganguly／Wikimedia Commons／CC BY 3.0

### 次点 B. Old Delhi rickshaw 2011.JPG
- オールド・デリーの赤い自転車リキシャを横から。こぎ手が写る。
- Marcin Białek／**CC BY-SA 4.0**／3008×2000／https://commons.wikimedia.org/wiki/File:Old_Delhi_rickshaw_2011.JPG

## ニーム（`gt_term_neem`）

### 【採用】A. Neem Tree (Azadirachta indica) 1.jpg
- 合う点・合わない点：葉の形がはっきり分かる。木全体の姿は写っていない（台本は「ニームの木の下で」）。
- 人物：人物の顔は写っていない。
- 寸法：3920×2204
- 切り出しの案：横長。どこを切っても、細長い小葉が羽のように並ぶ葉が入る。（`imagePosition` x=50、y=50）
- 作者：Mokkie
- ライセンス：**CC BY-SA 3.0** https://creativecommons.org/licenses/by-sa/3.0
- 撮影・作成：2014-04-07 13:27:54
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Neem_Tree_(Azadirachta_indica)_1.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/b/b8/Neem_Tree_%28Azadirachta_indica%29_1.jpg
- 確認：{{self|cc-by-sa-3.0}}（author 欄：[[User:Mokkie|Mokkie]]）
- 代替テキストの案（`altJa`）：ニームの木の葉の寄りの写真。ふちがぎざぎざの細長い小葉が、羽のように左右に並んでいる。
- 出典表記の案（`creditJa`）：写真：Mokkie／Wikimedia Commons／CC BY-SA 3.0

### 次点 B. Qutb Minar with Neem Tree.jpg
- クトゥブ・ミナールの塔の上に、ニームの枝と葉が広がるのを見上げた写真。木陰の感じは出るが、葉は小さい。
- Shikhers／**CC BY-SA 4.0**／3000×4500／https://commons.wikimedia.org/wiki/File:Qutb_Minar_with_Neem_Tree.jpg

## ジャーリー（`gt_term_jali`）

### 【採用】A. Itimad-ud-Daula’s Tomb 730 (crop).jpg
- 合う点・合わない点：物語と同じ廟のジャーリー。正面から撮っていて、格子の細かさが分かる。
- 人物：人物の顔は写っていない。
- 寸法：2208×2635
- 切り出しの案：縦長。正方形なら y≈55 で、六角形の透かし格子の窓が中心に入る。（`imagePosition` x=50、y=55）
- 作者：Anupamg
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2016-09-19
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Itimad-ud-Daula%E2%80%99s_Tomb_730_(crop).jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/c/cd/Itimad-ud-Daula%E2%80%99s_Tomb_730_%28crop%29.jpg
- 確認：{{cc-by-sa-4.0}}（author 欄：Anupamg）
- 代替テキストの案（`altJa`）：アーグラのイティマード・ウッダウラ廟の、透かし彫りの石の格子窓の写真。六角形の穴が規則正しく並ぶ。
- 出典表記の案（`creditJa`）：写真：Anupamg／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Jali ITIMAD UD DAULAH.jpg
- 同じ廟の別の格子窓。縦長。周りの彫刻も入る。
- Ajaykumarkatnauri／**CC BY-SA 4.0**／3120×4160／https://commons.wikimedia.org/wiki/File:Jali_ITIMAD_UD_DAULAH.jpg

## バラート（`gt_term_baraat`）

### 【採用】A. Baraat à Varanasi (1).jpg
- 合う点・合わない点：昼の通りで、飾った馬に乗る花婿という、行列の形がひと目で分かる。物語の舞台はジャイプールの夜で、場所と時間が違う。
- 人物：**通りの人と花婿の顔が写る。小さな画面でも見分けられる顔は、ぼかしが要る**（馬と飾りが主題）。
- 寸法：2885×2885
- 切り出しの案：正方形。中央やや上で、飾りをつけた馬と、その上の花婿が入る。（`imagePosition` x=50、y=45）
- 作者：Ji-Elle
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2019-11-30 07:14:37
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Baraat_%C3%A0_Varanasi_(1).jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/5/53/Baraat_%C3%A0_Varanasi_%281%29.jpg
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Ji-Elle|Ji-Elle]]）
- 代替テキストの案（`altJa`）：ヴァーラーナシーの通りを進むバラートの写真。きらびやかな布で飾った白い馬に花婿が乗り、行列の人々が続く。
- 出典表記の案（`creditJa`）：写真：Ji-Elle／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. A Baraat procession, Jaipur.jpg
- ジャイプールの夜のバラート。台本の「頭に灯りを載せて歩く男たち」がそのまま写るが、暗く、小さな画面ではほとんど黒に見える。CC BY 2.0。
- Christian Haugen／**CC BY 2.0**／3900×2598／https://commons.wikimedia.org/wiki/File:A_Baraat_procession,_Jaipur.jpg

## ガンガウル（`gt_term_gangaur`）

### 【採用】A. Gangaur Idols for celebrating Gangaur Festival.jpg
- 合う点・合わない点：祭りの主役の像がはっきり見える。行列そのものではない。
- 人物：右上に人が写る（顔が入るなら、切り出しで外すか、ぼかす）。
- 寸法：3072×4080
- 切り出しの案：縦長。右上に店の人が少し写るので、y≈60 で下寄りに切り、色とりどりの像だけを入れる。（`imagePosition` x=45、y=60）
- 作者：Kaushlendrapathe
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：30 March 2025 (according to Exif data)
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Gangaur_Idols_for_celebrating_Gangaur_Festival.jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/7/74/Gangaur_Idols_for_celebrating_Gangaur_Festival.jpg
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Kaushlendrapathe|Kaushlendrapathe]]）
- 代替テキストの案（`altJa`）：ガンガウルの祭りのために並べられた、女神ガウリーとイーサルの像の写真。赤や緑の衣装を着た小さな像がたくさん並ぶ。
- 出典表記の案（`creditJa`）：写真：Kaushlendrapathe／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. The Festival of Gangaur - Google Art Project.jpg
- ガンガウルの行列を描いた昔の絵（パブリックドメイン）。人の顔の問題はないが、写真ではない。
- 作者不詳（17世紀の絵画）／**Public domain**／3328×5001／https://commons.wikimedia.org/wiki/File:The_Festival_of_Gangaur_-_Google_Art_Project.jpg

## ランガル（`gt_term_langar`）

### 【採用】A. Gurudwara Bangla Sahib-Langar (17).jpg
- 合う点・合わない点：物語と同じバングラー・サーヒブの台所。台本の「巨大な鍋で豆が煮え」に近い。床に並んで座って食べる広間ではない。
- 人物：奥に人が小さく写る（原寸で顔が見分けられるなら、ぼかしが要る）。
- 寸法：5472×3648
- 切り出しの案：横長。正方形なら中央で、並んだ大鍋が入る。（`imagePosition` x=50、y=55）
- 作者：Ji-Elle
- ライセンス：**CC BY-SA 4.0** https://creativecommons.org/licenses/by-sa/4.0
- 撮影・作成：2019-11-28 07:17:28
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Gurudwara_Bangla_Sahib-Langar_(17).jpg
- 元画像：https://upload.wikimedia.org/wikipedia/commons/c/c0/Gurudwara_Bangla_Sahib-Langar_%2817%29.jpg
- 確認：{{self|cc-by-sa-4.0}}（author 欄：[[User:Ji-Elle|Ji-Elle]]）
- 代替テキストの案（`altJa`）：デリーのグルドワーラー・バングラー・サーヒブのランガルの台所の写真。火にかけた大きな鍋がいくつも並んでいる。
- 出典表記の案（`creditJa`）：写真：Ji-Elle／Wikimedia Commons／CC BY-SA 4.0

### 次点 B. Gurudwara Bangla Sahib-Langar (26).jpg
- 同じ台所で、何人もが台を囲んでローティーの生地をのばしている横長の写真。台本の場面そのものだが、人の顔が写るのでぼかしが要る。
- Ji-Elle／**CC BY-SA 4.0**／5472×2279／https://commons.wikimedia.org/wiki/File:Gurudwara_Bangla_Sahib-Langar_(26).jpg

## パルチン・カーリー（`gt_term_parchin_kari`）

### 【採用】A. Pietra Dura - Pillar - Musamman Burj - Agra Fort - Agra 2014-05-14 4143.JPG
- 合う点・合わない点：石の象眼の細かさがよく分かる。撮影はアーグラ城のムサンマン・ブルジュの柱で、イティマード・ウッダウラ廟ではない（同じ町の同じ技）。
- 人物：人物の顔は写っていない。
- 寸法：4000×6016
- 切り出しの案：縦長。正方形なら中央で、花と蔓の象眼が一組入る。（`imagePosition` x=50、y=50）
- 作者：Biswarup Ganguly
- ライセンス：**CC BY 3.0** https://creativecommons.org/licenses/by/3.0
- 撮影・作成：2014-05-14 16:58:37
- ファイルページ（`sourceUrl`）：https://commons.wikimedia.org/wiki/File:Pietra_Dura_-_Pillar_-_Musamman_Burj_-_Agra_Fort_-_Agra_2014-05-14_4143.JPG
- 元画像：https://upload.wikimedia.org/wikipedia/commons/e/e4/Pietra_Dura_-_Pillar_-_Musamman_Burj_-_Agra_Fort_-_Agra_2014-05-14_4143.JPG
- 確認：{{self|GFDL|cc-by-3.0|author=Biswarup Ganguly}}・{{self|GFDL|cc-by-3.0}}（author 欄：[[User:Gangulybiswarup|Biswarup Ganguly]]）
- 代替テキストの案（`altJa`）：白い大理石の柱に、色とりどりの石をはめこんで描いた花と蔓の模様の寄りの写真。
- 出典表記の案（`creditJa`）：写真：Biswarup Ganguly／Wikimedia Commons／CC BY 3.0

### 次点 B. PIETRA DURA - Agra - India.png
- 丸い大理石の卓に、花の模様を象眼した工芸品。白い背景で読みやすいが、今の土産物。
- MyotisSI／**CC BY-SA 3.0**／1772×1772／https://commons.wikimedia.org/wiki/File:PIETRA_DURA_-_Agra_-_India.png


---

# 確かでないこと

- **写真の撮影地**：ブラックバック（ラージャスターン州タール・チャーパル）、ラックの腕輪（ハイデラバード）など、物語の場所とは別の土地の写真がある。図鑑は「その物が何か」を見せるので問題ないと考えたが、見出しやクレジットに撮影地を書くかは決めていない。
- **ワカケホンセイインコ**：台本は「オウムの緑」「緑のインコ」としか書いていない。インドの町で最もよく見る種として当てたが、推定。
- **祝い金の一ルピー（シャグン）・葉の器**：一次資料を見ていない。説明文は台本の内容をなぞっただけなので、使うなら確かめが要る（どちらも図鑑から外す案を推す）。
- **サハーヤクの「真鍮の腕章」**：台本の描写だが確かめられなかった。説明文には赤いシャツ（下院の答弁で確認）だけを書いた。
- **ニームの小枝の歯ブラシ**：よく聞く話だが今回は確かめていないので、説明文から外した。
- **ペーターの食感**：英語版ウィキペディアは「やわらかい」、ほかの記事は石灰水でしっかりした歯ごたえになると書く。説明文では食感に触れなかった。
- **Wikimedia の利用制限**：Commons の API と画像サーバーが頻繁に 429（要求が多すぎる）を返したため、下見の画像は Commons の標準の縮小幅（500px・330px）でだけ取った。元画像はダウンロードしていない。
- **行番号**：2026-11-13 の台本の行番号。台本を直すとずれるので、`line`（本文）で照合してほしい。

---

# ミラノ編の候補（短い一覧・写真なし）

`content/journeys/milano/stories/places/*.ink`（13ファイル）を見た。都市の日常と美術が中心で、インド編より「思い浮かべられない言葉」は少ない。

| 候補（仮の名前） | 分類 | 優先度案 | 最初に出うる場所（ファイル / knot 行：本文） | メモ |
|---|---|---|---|---|
| ガッレリアの雄牛のモザイク（かかとで一回転する言い伝え） | building | 中 | `milano_galleria` / `milano_galleria_01` 78行：「サンドロは画面を胸に伏せ、床のモザイクへ顎をしゃくった。雄牛の上で、また誰かがかかとで回っている。」<br>`milano_galleria` / `galleria_fortune` 130行：「ガッレリアの真ん中の床、雄牛のモザイクの前で、少年が靴を脱いでいる。…」 | クイズ（`milano_galleria_01`）が「トリノの牛」を扱うので、説明文で紋章の話を先に言わない。`galleria_fortune` は「観察の後」に起きる場面で、クイズとどちらが先かは道順しだい。 |
| 洗濯屋小路の洗い場（ヴィコロ・デイ・ラヴァンダイ） | building | 中 | `milano_navigli` / `milano_navigli_date_01` 124行：「洗濯屋小路の石の洗い場の近くに、子どもの赤い手袋が落ちていた。…」 | デート「片方だけの手袋」。屋根の下の傾いた石の洗い場は、写真があると伝わりやすい。 |
| 手すり廊下の集合住宅（カーザ・ディ・リンギエーラ） | building | 低 | `milano_navigli` / `milano_night_01` 23行：「運河沿いには、家の入口をつなぐ共同の廊下がある建物もあるんだって。つい窓を見ちゃう」 | デート「拍を外して歩く」。台本に名前は出ない。 |
| 手回しの版画のプレス機 | thing | 低 | `milano_galleria` / `galleria_print` 205行：「柱の陰に、折り畳みの台が一つ。手回しのプレス機の横で、…」 | 出会い「リナの紋章室」（`galleria_fortune` を見た後）。 |
| フォンタナのネオン（ノヴェチェント美術館） | thing | 低 | `milano_novecento` / `milano_novecento_date_01` 14行：「ノヴェチェント美術館。フォンタナのネオンの線を目で追っていた彼女が、…」 | 美術作品。デートの背景写真が見せるなら外す。 |
| ドゥオモの尖塔の像 | building | 低 | `milano_duomo` / `duomo_string` 129行：「女が顎で示した先、尖った塔のてっぺんに、石の人が立っている。…」 | 背景写真（`milano_duomo`）が大聖堂を見せるので、外す案。 |

外した物：ピック・ギター・パン・チーズ・ピザ・パスタ・コーヒー（知っている）、ブレラの《接吻》・サン・サティロの見せかけの奥行き・ロースタリーの焙煎機（名所・作品そのもので、背景写真や観光の案内が見せる）。
