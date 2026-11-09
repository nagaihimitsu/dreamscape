VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0
// 【3】1場面1ファイルの頭の札（結果を初めて記録したとき1回当たる）。足した札：香油（雨の匂いの小瓶）を受け取り、代金を払う。金額は案
# on_done: item gt_delhi_rain_attar
# on_done: money -300

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: gt_bg_delhi_jama_masjid
# speaker: narrator
モスクの長い階段を下りきった先、人ひとりがやっと通れる路地で、{heroine_name}の足が止まった。
# speaker: narrator
甘くて、少し煙たい匂い。小さな店の棚に、色の違う液体の小瓶が何十本も並んでいる。
# speaker: enemy
「アタル。花や木を、油に閉じこめたものだ。手首を」
# speaker: narrator
白い髭の老人が、ガラス棒を瓶に浸し、{heroine_name}の手首にひと筋つけた。ハミード、と名乗る。この路地で六十年、香油を売っているという。
# speaker: heroine
# reaction: heroine,happy,sparkle
「わ……。薔薇なのに、甘すぎない。ずっと嗅いでいられる」
# speaker: narrator
「客だ！　時計、スタート！」
# speaker: narrator
隣の店から若い男が顔を出した。店先には、スマートフォンのケースと充電器がぶら下がっている。
# speaker: enemy
「隣のゾヘブだ。気にするな。……いや、気にしてもらうことになるか」
# speaker: narrator
ハミードの説明は短かった。ゾヘブが店を買い取りたいと言ってきた。ハミードは断った。そこでゾヘブが賭けを持ちかけた。
# speaker: narrator
「一時間以内に、外国の観光客がアタルを買えば、俺は一年手を引く。買わなきゃ、爺さんは店を売る。観光客が買うのは携帯のケースだけさ」
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
「えっ、じゃあ、わたしが……判定なんですか？」
# speaker: enemy
「先に言っておく。気の毒だから買う、なら、出ていってくれ。同情で売った香りは、すぐ飛ぶ」
# speaker: narrator
退路をふさがれた。気の毒だから買う、が使えない。{heroine_name}は手首の匂いと、老人の顔を交互に見た。
# speaker: enemy
「この店はな、世界を見下ろすモスクの足もとにある。名前からして、そういう意味なんだ」
# speaker: narrator
「また爺さんの作り話だ」とゾヘブが笑う。ハミードは笑わず、こちらの答えを待っていた。
-> END

=== after_first ===
# background: gt_bg_delhi_jama_masjid
{ answer_correct:
    # speaker: narrator
    ゾヘブが目を丸くした。「……合ってんのかよ」
    # speaker: enemy
    「六十年ここにいて、作り話はしない。盛るのは香りだけだ」
- else:
    # speaker: enemy
    「世界を見渡すモスク、だ。丘の上に建てたからな。……作り話じゃない」
    # speaker: narrator
    ゾヘブは肩をすくめた。「名前が立派でも、客は来ないけどね」
}
# speaker: narrator
ハミードは別の瓶の栓を抜いた。今度の匂いは花ではなかった。
# speaker: heroine
# reaction: heroine,surprised,question
「……あれ。これ、雨？　降り始めの、乾いた地面の匂い」
# speaker: enemy
「ミッティ。土を焼いて閉じこめる。夏の終わりの、最初の雨だ」
# speaker: narrator
{heroine_name}は手首を鼻に近づけたまま、しばらく動かなかった。ゾヘブが店先から口を挟む。
# speaker: narrator
「みんなそう言うんだよ、いい匂いって。で、買わない。この通りは、もう香油じゃなくて充電器の通りなんだ」
# speaker: enemy
「この通りは、もっと悪い時代を越えてきた。あのモスクだってそうだ」
# speaker: narrator
「出た、昔話」とゾヘブ。ハミードは顎で、路地の先の階段を指した。千八百五十七年の後、あのモスクに何が起きたか。
-> END

=== after_second ===
# background: gt_bg_delhi_jama_masjid
{ answer_correct:
    # speaker: enemy
    「そうだ。五年、取り上げられていた。返ってきたのは、町の人間が何度も何度も頼んだからだ。しつこさは、この町の取り柄だ」
- else:
    # speaker: enemy
    「英国の兵隊に五年取り上げられて、町の人間の請願で返ってきたんだ。しつこさは、この町の取り柄だ」
}
# speaker: narrator
そのとき、ゾヘブの電話が鳴った。画面を見て、彼は路地の角まで離れる。
# speaker: narrator
声を落としても、狭い路地では全部聞こえた。「はい、アサドさん。……まだです。お父さん、頑固で。ええ、ドバイの部屋の話も、まだ」
# speaker: heroine
# emotion: serious
「……アサドさんって」
# speaker: narrator
戻ってきたゾヘブは、{heroine_name}の顔を見て観念したように息を吐いた。ハミードには聞こえない声で言う。
# speaker: narrator
「爺さんの息子だよ。ドバイにいる。親父を引き取りたいけど、店がある限り動かないって。だから俺が買う役。賭けも、負けても納得できるようにって、俺が考えた」
# speaker: narrator
「俺は店なんか欲しくない。ガキの頃、冬じゅうここで匂いをかいでたんだ」
# speaker: heroine
# emotion: worried
「……ハミードさん本人は、ドバイに行きたいって、言ったんですか？」
# speaker: narrator
ゾヘブは答えなかった。答えを知らない顔だった。
# speaker: narrator
店の奥で、ハミードが古い帳面をめくっている。断食月の夕方には、通り中がモスクからの合図を待っていた。親父はその直前に、礼拝へ向かう男たちにアタルを売った。そんな話を、独り言のように続けていた。
-> END

=== conclusion ===
# background: gt_bg_delhi_jama_masjid
{ answer_correct:
    # speaker: enemy
    「そう、断食を終える時刻だ。合図の直前は、通りが一番いい匂いになる。揚げ物と、香油と、人の汗で」
- else:
    # speaker: enemy
    「断食を終える時刻だよ。合図の直前は、通りが一番いい匂いになる。揚げ物と、香油と、人の汗で」
}
# speaker: narrator
ゾヘブが小さく笑った。「うちの親父、その時間にここで毎年、同じ瓶を買ってた」
# speaker: narrator
柱時計が、賭けの一時間まであと数分を指している。{heroine_name}はミッティの小瓶を手に取った。
# speaker: heroine
# emotion: serious
「わたし、これを買います。雨の匂いが欲しいから。……でも、それで勝負に勝ったことにはしないでください」
# speaker: enemy
「どういう意味だ」
# speaker: heroine
「お店のことは、賭けじゃなくて、息子さんと話して決めてほしいんです。ゾヘブさんを通さずに、直接」
# speaker: narrator
老人の目が、隣の若者に向いた。ゾヘブは逃げなかった。小さくうなずいて、全部を認めた。
# speaker: enemy
# reaction: enemy,anger
「……アサドめ。言いたいことがあるなら、自分の口で電話をよこせばいい。隣の若造を使うな」
# speaker: narrator
怒っている。けれど、帳面を閉じる手は、さっきより少しだけ遅かった。
{
- battle_score == 3:
    # speaker: enemy
    「あんたは、香りより先に、この町の話を覚えた。そういう客は、香りを長く持たせる」
- battle_score == 2:
    # speaker: enemy
    「町の話を二つ覚えて帰る客は、上等だ。三つ目は、次に来たときでいい」
- else:
    # speaker: enemy
    「話はまた覚えればいい。香りの方は、もう覚えたろう」
}
# speaker: narrator
代金を出すと、ハミードは一ルピーもまけなかった。値引きは同情だから、だそうだ。
# speaker: narrator
店を出るとき、背中で電話のボタンを押す音がした。ゆっくり、一つずつ。ゾヘブは自分の店に戻り、充電器の列を、意味もなく並べ直していた。
# speaker: heroine
# reaction: heroine,smile,music
「……雨の匂い、まだしてる。日本で雨が降ったら、たぶん、この路地を思い出すね」
-> END
