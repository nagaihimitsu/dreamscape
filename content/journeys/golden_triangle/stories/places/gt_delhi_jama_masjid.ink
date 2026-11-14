INCLUDE modules.ink
-> DONE

// ジャーマー・マスジドの場所のファイル（新しい書き方への形の移し替え。文は今のまま）。
// バトル（対決）は、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_delhi_jama_masjid_guide ===
# scene: guide
# background: gt_bg_delhi_jama_masjid
# speaker: narrator
ジャーマー・マスジドの門の前で、靴を脱いで預ける。{heroine_name}は門の係から薄い上着を借りて羽織り、袖の長さを確かめた。
# speaker: heroine
# reaction: heroine,smile,question
# voice: gt_delhi_jama_masjid_guide_001
似合ってる？　……あ、そういう場所じゃないね。ちゃんと見てきます
# speaker: narrator
裸足の足の裏に、日差しを吸った石の温度が伝わる。広い中庭の向こうで、赤と白の塔が空へ伸びていた。
# speaker: narrator
中庭の端から見下ろすと、町が足もとにある。屋根、物干しの洗濯物、給水タンク、旋回する鳩の群れ。
# speaker: heroine
# reaction: heroine,surprised,sparkle
# voice: gt_delhi_jama_masjid_guide_002
階段を上っただけなのに、旧市街が全部見える気がする
# speaker: narrator
# se: bicycle_bell
# term: gt_term_cycle_rickshaw
見学を終えて、また長い階段を下りる。段の下は、もう別の世界だった。焼いた肉の煙、呼び込みの声、自転車リキシャの鈴。
# speaker: narrator
{heroine_name}は段ボールの切れ端を出した。四行目。ジャーマー・マスジド、朝のニハーリー、階段の下の店。
# speaker: heroine
# reaction: heroine,worried,gloom
# local_word: gt_delhi_word_nihari
# voice: gt_delhi_jama_masjid_guide_003
ニハーリーって、一晩じっくり煮込む朝ごはんなんだって。……今、お昼過ぎ。完全に出遅れた
# speaker: narrator
彼女は本気で悔しがり、通りの鍋を一つずつのぞき込んだ。どの鍋も、もう底が見えている。
# speaker: heroine
# voice: gt_delhi_jama_masjid_guide_004
明日の朝、もう一回来る？　……って言いたいけど、明日の朝は別の街かもしれないし
# speaker: narrator
そのとき、路地の奥から甘い匂いが流れてきた。料理ではない。花のような、木のような、少し煙たい匂い。
# speaker: heroine
# emotion: smile
# voice: gt_delhi_jama_masjid_guide_005
ちょっとだけ寄ってもいい？　ごはんの代わりに、匂いだけでも
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_delhi_main_jama_masjid_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 【3】頭の札（結果を初めて記録したとき1回当たる）。足した札：香油（雨の匂いの小瓶）を受け取り、代金を払う。金額は案
=== gt_delhi_main_jama_masjid_battle ===
# scene: battle
# on_done: item gt_delhi_rain_attar
# on_done: money -300
# background: gt_bg_delhi_jama_masjid
# speaker: narrator
モスクの長い階段を下りきった先、人ひとりがやっと通れる路地で、{heroine_name}の足が止まった。
# speaker: narrator
甘くて、少し煙たい匂い。小さな店の棚に、色の違う液体の小瓶が何十本も並んでいる。
# speaker: gt_delhi_jama_old_man
# term: gt_term_attar
アタル。花や木を、油に閉じこめたものだ。手首を
# speaker: narrator
白い髭の老人が、ガラス棒を瓶に浸し、{heroine_name}の手首にひと筋つけた。
# speaker: enemy
# cutin: name
ハミードだ。この路地で六十年、香油を売っている
# speaker: heroine
# reaction: heroine,happy,sparkle
# voice: gt_delhi_main_jama_masjid_001
わ……。薔薇なのに、甘すぎない。ずっと嗅いでいられる
# speaker: gt_delhi_jama_young_man
客だ！　時計、スタート！
# speaker: narrator
隣の店から若い男が顔を出した。店先には、スマートフォンのケースと充電器がぶら下がっている。
# speaker: enemy
隣のゾヘブだ。気にするな。……いや、気にしてもらうことになるか
# speaker: narrator
ハミードの説明は短かった。
# speaker: enemy
こいつが、この店を売れと言ってきた。断った。そうしたら、賭けを持ちかけてきた
# speaker: gt_zoheb
# cutin: name
一時間以内に、外国の観光客がアタルを買えば、俺は一年手を引く。買わなきゃ、爺さんは店を売る。観光客が買うのは携帯のケースだけさ
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
# voice: gt_delhi_main_jama_masjid_002
えっ、じゃあ、わたしが……判定なんですか？
# speaker: enemy
先に言っておく。気の毒だから買う、なら、出ていってくれ。同情で売った香りは、すぐ飛ぶ
# speaker: narrator
退路をふさがれた。気の毒だから買う、が使えない。{heroine_name}は手首の匂いと、老人の顔を交互に見た。
# speaker: enemy
この店はな、世界を見下ろすモスクの足もとにある。名前からして、そういう意味なんだ
# speaker: gt_zoheb
また爺さんの作り話だ
# speaker: narrator
ゾヘブが笑う。ハミードは笑わず、こちらの答えを待っていた。
-> quiz(1) ->
# background: gt_bg_delhi_jama_masjid
{ quiz_correct:
    # speaker: narrator
    ゾヘブが目を丸くした。
    # speaker: gt_zoheb
    ……合ってんのかよ
    # speaker: enemy
    六十年ここにいて、作り話はしない。盛るのは香りだけだ
- else:
    # speaker: enemy
    世界を見渡すモスク、だ。丘の上に建てたからな。……作り話じゃない
    # speaker: narrator
    ゾヘブは肩をすくめた。
    # speaker: gt_zoheb
    名前が立派でも、客は来ないけどね
}
# speaker: narrator
# se: cork_pop
ハミードは別の瓶の栓を抜いた。今度の匂いは花ではなかった。
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_delhi_main_jama_masjid_003
……あれ。これ、雨？　降り始めの、乾いた地面の匂い
# speaker: enemy
# local_word: gt_delhi_word_mitti
ミッティ。土を焼いて閉じこめる。夏の終わりの、最初の雨だ
# speaker: narrator
{heroine_name}は手首を鼻に近づけたまま、しばらく動かなかった。ゾヘブが店先から口を挟む。
# speaker: gt_zoheb
みんなそう言うんだよ、いい匂いって。で、買わない。この通りは、もう香油じゃなくて充電器の通りなんだ
# speaker: enemy
この通りは、もっと悪い時代を越えてきた。あのモスクだってそうだ
# speaker: gt_zoheb
出た、昔話
# speaker: narrator
ハミードは顎で、路地の先の階段を指した。
# speaker: enemy
千八百五十七年の後、あのモスクに何が起きたか。知ってるか
-> quiz(2) ->
# background: gt_bg_delhi_jama_masjid
{ quiz_correct:
    # speaker: enemy
    そうだ。五年、取り上げられていた。返ってきたのは、町の人間が何度も何度も頼んだからだ。しつこさは、この町の取り柄だ
- else:
    # speaker: enemy
    英国の兵隊に五年取り上げられて、町の人間の請願で返ってきたんだ。しつこさは、この町の取り柄だ
}
# speaker: narrator
# se: phone_ring
そのとき、ゾヘブの電話が鳴った。画面を見て、彼は路地の角まで離れる。
# speaker: narrator
声を落としても、狭い路地では全部聞こえた。
# speaker: gt_zoheb
はい、アサドさん。……まだです。お父さん、頑固で。ええ、ドバイの部屋の話も、まだ
# speaker: heroine
# emotion: serious
# voice: gt_delhi_main_jama_masjid_004
……アサドさんって
# speaker: narrator
戻ってきたゾヘブは、{heroine_name}の顔を見て観念したように息を吐いた。ハミードには聞こえない声で言う。
# speaker: gt_zoheb
爺さんの息子だよ。ドバイにいる。親父を引き取りたいけど、店がある限り動かないって。だから俺が買う役。賭けも、負けても納得できるようにって、俺が考えた
# speaker: gt_zoheb
俺は店なんか欲しくない。ガキの頃、冬じゅうここで匂いをかいでたんだ
# speaker: heroine
# emotion: worried
# voice: gt_delhi_main_jama_masjid_005
……ハミードさん本人は、ドバイに行きたいって、言ったんですか？
# speaker: narrator
ゾヘブは答えなかった。答えを知らない顔だった。
# speaker: narrator
店の奥で、ハミードが古い帳面をめくっている。独り言のように、話を続けていた。
# speaker: enemy
断食月の夕方にはな、通り中がモスクからの合図を待っていた。親父はその直前に、礼拝へ向かう男たちにアタルを売った
-> quiz(3) ->
# background: gt_bg_delhi_jama_masjid
{ quiz_correct:
    # speaker: enemy
    そう、断食を終える時刻だ。合図の直前は、通りが一番いい匂いになる。揚げ物と、香油と、人の汗で
- else:
    # speaker: enemy
    断食を終える時刻だよ。合図の直前は、通りが一番いい匂いになる。揚げ物と、香油と、人の汗で
}
# speaker: narrator
ゾヘブが小さく笑った。
# speaker: gt_zoheb
うちの親父、その時間にここで毎年、同じ瓶を買ってた
# speaker: narrator
# item_show: gt_delhi_rain_attar
柱時計が、賭けの一時間まであと数分を指している。{heroine_name}はミッティの小瓶を手に取った。
# speaker: heroine
# emotion: serious
# voice: gt_delhi_main_jama_masjid_006
わたし、これを買います。雨の匂いが欲しいから。……でも、それで勝負に勝ったことにはしないでください
# speaker: enemy
どういう意味だ
# speaker: heroine
# voice: gt_delhi_main_jama_masjid_007
お店のことは、賭けじゃなくて、息子さんと話して決めてほしいんです。ゾヘブさんを通さずに、直接
# speaker: narrator
老人の目が、隣の若者に向いた。ゾヘブは逃げなかった。
# speaker: gt_zoheb
……全部、アサドさんに頼まれたことだよ。爺さん
# speaker: enemy
# reaction: enemy,anger
……アサドめ。言いたいことがあるなら、自分の口で電話をよこせばいい。隣の若造を使うな
# speaker: narrator
怒っている。けれど、帳面を閉じる手は、さっきより少しだけ遅かった。
{
- battle_score == 3:
    # speaker: enemy
    あんたは、香りより先に、この町の話を覚えた。そういう客は、香りを長く持たせる
- battle_score == 2:
    # speaker: enemy
    町の話を二つ覚えて帰る客は、上等だ。三つ目は、次に来たときでいい
- else:
    # speaker: enemy
    話はまた覚えればいい。香りの方は、もう覚えたろう
}
# speaker: narrator
代金を出すと、ハミードは一ルピーもまけなかった。
# speaker: enemy
値引きは、同情だからな
# speaker: narrator
# se: phone_keypad
店を出るとき、背中で電話のボタンを押す音がした。ゆっくり、一つずつ。ゾヘブは自分の店に戻り、充電器の列を、意味もなく並べ直していた。
# speaker: heroine
# reaction: heroine,smile,music
# voice: gt_delhi_main_jama_masjid_008
……雨の匂い、まだしてる。日本で雨が降ったら、たぶん、この路地を思い出すね
-> END
