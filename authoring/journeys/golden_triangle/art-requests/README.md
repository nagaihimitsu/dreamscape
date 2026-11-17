# インド編の絵の依頼の記録

絵を描く人に渡した依頼書（`<日付>.md`）を、渡したときのまま置きます。ゲームはこのフォルダを読み込みません。このファイルには、依頼書に書かない開発の記録（絵がどこに入るか、届いたらどうつなぐか）を依頼ごとに書きます。行番号は依頼書を作った日のものです。依頼書の書き方と、届いた絵の入れ方は[発注マニュアルの「絵の依頼書」](../../../ORDERING_MANUAL.md#5-絵の依頼書)にあります。

## オープニングムービー（2026-11-17、依頼書なし）

「旅をはじめる」で流れる動画を入れ替えました。前の動画（KlingAI 4.0 で作った10秒の動画。透かしとマスコットが入っていた）をやめ、写真と地図をコードで組み立てた15秒の動画にしました。描く人への依頼はしていません。

- 動画：`content/journeys/golden_triangle/public/assets/movies/gt_opening.mp4`。場所が同じなので、`manifest.json` の `openingMovie.videoPath` は変えていません。
- 元のファイルと作り直し方、写真8枚・音楽・フォントの出典：[movies/opening/](../movies/opening/README.md)。
- ゲームの出典：`manifest.json` の `openingMovie.credits`（写真8枚と音楽1曲）。「出典・権利の一覧」の「オープニングムービー」に出ます。
- 旅の名前は「インド」と「ゴールデントライアングル編」の2行で、「・」は出していません。制作者が「これでよい」と決めました。

## 2026-11-16.md

2026-11-16のユーザーの判断（「おすすめで」）で作った依頼書です。ラージューの姿（11-14に「描いていただくもの」として記録した分）、花婿の行列で踊るカムラ、ジャイプールの返事の場面の「はい」の道のアルバムの絵。描く順は1から（ラージューの2枚が先）。5・6は余裕があれば。

| 番号 | ファイル名 | 使う所 | つなぐのにコードの変更 |
| --- | --- | --- | --- |
| 1 | `gt_raju_back.png` | ミニゲーム「地図の値段」で背を向ける・へそを曲げて去る所。デートの場面でも合う行がある | 要る（ミニゲームの絵の枠を足す） |
| 2 | `gt_raju_peek.png` | ミニゲーム「地図の値段」で振り返る所。デートの場面でも合う行がある | 要る（同上） |
| 3 | `gt_mg_baraat_kamla.png` | ミニゲーム「花婿の行列で踊る」の絵の枠 `kamla` | 要らない |
| 4 | `gt_album_j59.png` | ジャイプールの返事のデートの「はい」の道のアルバム | 要らない（台本に `# photo:` を書く） |
| 5 | `gt_raju_boast.png` | ミニゲーム「地図の値段」で胸を張る所 | 要る（1と同じ） |
| 6 | `gt_raju_wobble.png` | ミニゲーム「地図の値段」で目が泳ぐ所 | 要る（1と同じ） |

### 1・2・5・6 ラージュー

- 人物：`gt_raju`（ラージュー。名乗る前は `gt_jaipur_jaigarh_boy`「男の子」、同じ絵）。今の絵は1枚だけ（元の絵 `characters/gt_raju/neutral.png` 1024×1536・透明、配信は `content/journeys/golden_triangle/public/assets/characters/gt_raju/neutral.webp`。正面で、地図を両手で差し出して笑う姿）。新しい絵は同じ大きさ・同じ背の高さ（頭のてっぺん上から2%、足の裏が下の端）で頼んだので、入れ替えても背が変わらない。
- ミニゲーム「地図の値段」（`raju_haggle`。`content/journeys/golden_triangle/stories/places/gt_jaipur_jaigarh_fort.ink:170` の `# minigame: raju_haggle auto fair_map bg gt_bg_jaipur_jaigarh_fort`）：
  - 背を向ける（1）：₹40で1回効いた後の、帰るふり（様子 `turn`、約1.1秒。吹き出し「……じゃあ、いいよ。ほかのお客さん、探すから」）と、へそを曲げて去るとき（「もういい！　地図は売らない！」）。
  - 振り返る（2）：帰るふりの途中で振り返る所（様子 `peek`、約1.5秒。吹き出し「（ちらっ）」、彼女の「ふふっ、ちらちら見てる」）。ここで「じっと見る」と見抜いて₹30。
  - 胸を張る（5）：様子 `boast`・`back`（「全部、手描きだよ！」など）。目が泳ぐ（6）：様子 `wobble`（「……はあ」「（地図の端を、くるくる）」など）。
  - 今は、正面の立ち絵を左右に反転して背を向けたことにしている（`src/minigames/raju_haggle/skin.css` の `[data-look="turn"]`・`[data-look="peek"]`・`mg-raju-haggle-off`）。地図を差し出して笑う絵のまま「ほかのお客さん、探すから」と言うので、ちぐはぐに見える。
- コードの作業（要る）：皮の絵の枠は今、気分ごとの3つ（`src/minigames/raju_haggle/definition.ts` の `artSlots`：`raju_glad`・`raju_unsure`・`raju_sulky`。どれもまだ絵がない）で、`Skin.tsx` は気分で絵を選ぶ（`moodOf` → `art[raju_${mood}]`）。様子ごとの枠（例 `raju_back`・`raju_peek`、任意で `raju_boast`・`raju_wobble`）を足し、様子の絵があればそれを、なければ今までどおり気分の絵、立ち絵の順に出す。様子の絵には `skin.css` の左右の反転（`scale(-…)`）をかけない。絵の向き：1・2は、画面で見えるとおり絵の左の奥へ歩き出す形で頼んだ（今の反転と同じ向き）。
- 届いたら：`content/journeys/golden_triangle/public/assets/minigames/<絵のID>.webp`（PNG も可）に置き、`presentation/own-artwork.json` に載せ、170行の札に `art.raju_back <絵のID> art.raju_peek <絵のID>` を足す（docs/13 の 2.12）。
- デートの場面（`gt_jaipur_date_jaigarh_fort`）でも合う行：
  - 振り返る（2）：地図を買わなかった道の201行「……ふん。ぼくの地図、すごいのに」・203行「じゃあ、見習い期間ってことで、ついてきていいよ。地図は見せないけど」、案内してもらう道の89行「三つ目の印は……最後の印が、いちばん大事だから」。
  - 背を向ける（1）：205行の地の文「ラージューは地図を胸に抱えたまま、先に立って歩き出した。」（地の文では立ち絵は変わらないので、その前の203行で絵を替える）。
  - 胸を張る（5）：23行「ぼく、ラージュー。この地図、全部ぼくが描いたんだ」、31行（大砲の話）、97行（「宝は、ここ」）、176行「まいど。……」。目が泳ぐ（6）：59行「池になったのは、ちょっと盛った」、69行「え、それは……今日は遠いから、無理」、84行。
- 1人に2枚目の絵を出す仕組み（今のコード）：
  - `presentation/characters.json` の人物の `variants`（`emotion`・`pose`・`costume` で選ぶ。`src/content/character-assets.ts`）は型にあるが、インド編はどの人物も空。
  - 表情を渡すのは、バトルの相手（`src/features/battle/BattleScreen.tsx` の `enemyEmotion`）と、到着・エピローグ・差し込みの場面の `# person:`（`EpilogueScreen.tsx`・`EncounterScreen.tsx`）だけ。デート（`RomanceScene.tsx`）と観光案内（`TourismScreen.tsx`）の向かいに立つ人は、いつも1枚目（`imagePath`）。ラージューの場面はデートなので、`variants` に足しても出ない。
  - `# emotion:` に書けるのはヒロインの12の表情（`content/romance/presentation.json` の `emotions`）で、姿勢を選ぶ札はない。
  - コードを変えずに出す道：背中の絵を別の人物として `characters.json` に登録し（例 `gt_raju_back`、絵は `assets/characters/gt_raju/back.webp`、元の絵は `characters/gt_raju/back.png`、置き方は今の立ち絵と同じ）、`progression/story.json` の `people` に同じ名前「ラージュー」の別名（例 `gt_raju_walking`、`characterId: gt_raju_back`）を足して、その行を `# speaker: gt_raju_walking` にする。今の「男の子」→ラージューと同じ別名の仕組みで、立ち絵はその人が話した行から入れ替わる（向かいは一人ずつ）。`# leave:` は別名の ID で書く。ミニゲームとデートの両方で使うなら、絵は2か所に置く。
  - コードで直す道：人物の行で、その人の絵を選ぶ札（例 `# emotion:` を話す人にも効かせる、または姿勢の札）と、デート・案内の向かいの人にそれを渡す作業。

### 3 カムラ（花婿の行列で踊る）

- ミニゲーム「花婿の行列で踊る」（`baraat_dance`。`content/journeys/golden_triangle/stories/places/gt_jaipur_hawa_mahal.ink:426` の `# minigame: baraat_dance auto off_beat_together bg gt_bg_jaipur_baraat_night`）の絵の枠 `kamla`（`src/minigames/baraat_dance/definition.ts`「桃色のサリーで腕を上げて踊るカムラの全身」）にそのまま入る。コードの変更は要らない。今は枠が空なので、その行で向かいに立つ人の立ち絵（410・412行で話したカムラなら、デリーの緑のサリーと臙脂のショールで、豆をのせた手を差し出す姿）が太鼓に合わせて揺れている（`BattleScreen.tsx` の `ChoicePoint` の `cast.person`）。
- 届いたら：`public/assets/minigames/gt_mg_baraat_kamla.webp` に置き、`presentation/own-artwork.json` に載せ、426行の札に `art.kamla gt_mg_baraat_kamla` を足す。場の踊り手の枠は縦横 2:3 で、足もとを下の真ん中に合わせて縮めて入る（`src/minigames/baraat_dance/skin.css`）。
- 2026-11-13にまとめたミニゲームの絵の依頼（23枚。リポジトリにはない）の22番「踊るカムラ」と同じ絵・同じファイル名。今回は、立ち絵にも使えるように、大きさを立ち絵と同じ 1024×1536 にした。同じ依頼の20・21・23番（行列の通り、太鼓打ち、踊るヒロイン）は、この依頼書に入れていない。
- 立ち絵としても使うなら（任意）：ジャイプールのフィナーレ（`gt_jaipur_finale_battle`）では、212行の地の文「輪の真ん中で、鮮やかな桃色のサリーが跳ねた」の次の、214行の最初の台詞から、カムラが相手として立つ。今はデリーの服の立ち絵。バトルは相手の行の表情を絵に渡すので、`characters.json` の `gt_kamla` の `variants` に表情の差分として登録し（例 `{ "emotion": "happy", "imagePath": "assets/characters/gt_kamla/dance.webp" }`）、踊る行（214行「そこの二人！……」、219行「踊るわよ。孫の行列だもの……」、433行「なによ。やればできるじゃない」）に `# emotion: happy` を書けば、コードなしで出せる。今、カムラの台詞にはどの表情の札も付いていないので、ほかの場面には出ない。ただし表情の ID を衣装の代わりに使うことになる。きれいにするなら、場面ごとの衣装（`costume`）を人物にも効かせるコードの作業。
- 気づいたこと：ジャイプールのエピローグ（`gt_jaipur_hotel_hub.ink:60`「降りてきたのは、桃色のサリーのカムラだった。」）とフィナーレでも、カムラはデリーの服の立ち絵で出る。ジャイプールの服の立ち絵（踊らない姿）は、今回は頼んでいない。

### 4 アルバムの絵（返事の「はい」の道）

- 使う所：ジャイプールの「待って」の後の、彼女からの返事のデート `gt_jaipur_date_answer`（`content/journeys/golden_triangle/stories/places/gt_jaipur_hotel_hub_dates.ink:273`、題「夜のせいにしない返事」）の「はい」の道（`= yes`、305〜336行）。3つの屋上の告白の「はい」には絵がある（デリー `gt_album_d69`：`gt_delhi_hotel_hub_dates.ink:49`、アーグラ `gt_album_a59`：`gt_agra_hotel_hub_dates.ink:57`、ジャイプール `gt_album_j43`：`gt_jaipur_hotel_hub_dates.ink:51`）が、この返事の「はい」にはない（11-15の「おすすめ」A7(2)）。
- 絵にした瞬間：312行「昼間に、牛の横で言ってるんだからね。もう、夜のせいにはできないよ」と、313〜314行の地の文「すぐ後ろを、さっきの牛が通っていった。彼女は笑いそうになるのをこらえて、こちらを見たままでいた。」。選択の前なので、3つの選択のどれを選んでも読む。
- 札（案。台本はまだ変えていない）：314行の地の文に `# photo: gt_album_j59 # photo_caption: 昼間に、牛の横で`。
- 届いたら：`content/journeys/golden_triangle/public/assets/album/gt_album_j59.webp`（WebP がおすすめ。登録・出典は要らない）。ID の数字は、2026-11-11の「絵にしたい場面の一覧」（J-01〜J-58）の続き。
- 大きさ：アルバム・写真の札・あらすじ・エンドロールの枠は、どれも 3:2（`aspect-ratio: 3 / 2`、`object-fit: cover`）。今のアルバムの25枚は 1600×900（16:9）で、枠では左右が少し切れる。新しい絵は制作ガイドのとおり 3:2（1536×1024）で頼んだ。
- 彼女の見た目は、昼のジャイプールのアルバムの絵（`gt_album_j22`・`gt_album_j57` ほか）に合わせた：灰色の帽子、白いワンピース、黒いウエストバッグ。メヘンディは、ジャル・マハルのデートを遊んだときだけなので描かない。表情は、312行の札（`teasing`・`blush`）と、[キャラクターバイブル](../../../../docs/09_HEROINE_CHARACTER_BIBLE.md)の「照れたときは……思いきって相手を見つめ返したりする」「軽くからかうときは目を細め、笑いをこらえ」から。
