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
  クイズに正しく答えたときと間違えたときの二つの分かれ道に一つずつ置いたもの。そのままでよい。
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
| セーラー | File:Sehragroom.jpg | SynthContibutor | CC BY-SA 4.0（`{{self\|cc-by-sa-4.0}}`。花婿の顔は房で隠れ、ほかの人の顔は写っていない） |

---

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
