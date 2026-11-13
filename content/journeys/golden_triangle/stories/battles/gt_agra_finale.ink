INCLUDE modules.ink
// 【3】1場面1ファイルの頭の札（結果を初めて記録したとき1回当たる）。足した札：アンワルの詫びのペーターを受け取る（アーグラのエピローグで食べ切る）
# on_done: item gt_agra_anwar_petha
# background: gt_bg_agra_taj_mahal
# ambience: amb_crowd_outdoor
# speaker: narrator
タージ・マハルの正門の近くに、ひときわ大きな人だかりができていた。真ん中に、白いクルタに銀の握りの杖を持った老ガイドが立っている。
# speaker: narrator
アンワル。この町で一番泣かせるガイド、とホテルの支配人が言っていた。支配人の叔父なのだそうだ。
# speaker: enemy
# cutin: name
そして最後の石が置かれた日。皇帝は命じたのです。二度とこれほどのものを造らせぬよう、二万の職人の手を、切り落とせと
# speaker: narrator
観客から、悲鳴に近い溜め息が漏れた。何人かは本当に目を拭っている。アンワルは満足げに杖を鳴らし、ぐるりと見回して、こちらで目を止めた。
# speaker: enemy
おお、ご覧なさい！　日本から来た新婚のお二人です。愛の記念碑に、愛を誓いに来られた
# speaker: narrator
# se: applause
拍手が起きた。ホテルの花びらの寝台の情報は、町中のガイドに回っていたらしい。
# speaker: heroine
# reaction: heroine,surprised_big,interrobang
ち、違います！　わたしたち、新婚じゃ……！
# speaker: enemy
ご覧なさい、この照れよう。タージの前では、誰もが恋に正直になる
# speaker: narrator
笑いと拍手が大きくなる。{heroine_name}の言葉は、そのたびに物語の一部にされていく。
# speaker: narrator
# recall: gt_album_d01
彼女は唇を結んだ。デリーで言われた言葉が、頭の中で聞こえた。言いたいことは、言いなさい。
# speaker: heroine
# emotion: serious
……アンワルさん。その、職人の手を切ったっていう話。本当なんですか
# speaker: narrator
観客が、一斉にこちらを振り向いた。アンワルの笑顔は崩れない。
# speaker: enemy
お嬢さん。この町では、昔からみんながそう語ってきた。それを違うと言うなら、証明できるかね
-> quiz(1) ->
# background: gt_bg_agra_taj_mahal
{ quiz_correct:
    # speaker: heroine
    記録が、ないんです。歴史家の人たちも、根拠のない伝説だって言ってます
- else:
    # speaker: narrator
    観客の中の学生らしい青年が、携帯を見ながら言った。
    # speaker: gt_agra_finale_student
    歴史家は、記録がない伝説だって言ってますよ
}
# speaker: narrator
観客がざわめく。何人かは、がっかりした顔をした。泣いて損をした、という顔だった。
# speaker: enemy
本当のことは、人を泣かせない。泣かない客は、タージを忘れる。わしは四十年、それを見てきた
# speaker: narrator
アンワルは杖を上げた。
# speaker: enemy
日が傾いたら、対岸の庭へ参りましょう。この旅の最後の、とっておきの話は、そこでいたします
# background: gt_bg_agra_mehtab_bagh
# ambience: amb_wind
# speaker: narrator
川を渡ったメヘターブ・バーグの岸辺。夕日に染まるタージが、川向こうに正面から見えた。
# speaker: enemy
皇帝は、この岸に、自分のための黒いタージを建てるつもりだった。白い妃と、黒い皇帝。川を挟んで、永遠に見つめ合うはずだったのです
# speaker: narrator
観客がまた息をのむ。アンワルは横目で、{heroine_name}を見た。今度は何と言う、という目で。
-> quiz(2) ->
# background: gt_bg_agra_mehtab_bagh
{ quiz_correct:
    # speaker: heroine
    調べた人たちが見つけたのは、黒い墓の土台じゃなくて、庭でした。タージと、水に映るタージを眺めるための
- else:
    # speaker: narrator
    岸辺の案内板に、調査の結果が書いてあった。見つかったのは墓の土台ではなく、水に映るタージを眺めるための庭だった。
}
# speaker: narrator
アンワルは杖をついたまま、しばらく黙った。それから、観客に向かって両手を広げた。
# speaker: enemy
皆さん、この若いお嬢さんは、わしの話を二つも壊した。では、お願いしよう。あなたの本当の話で、この人たちを泣かせてみなさい
# speaker: narrator
観客が、拍手で彼女を前へ押し出した。逃げ場はない。五十人の目が、こちらを見ている。
# speaker: heroine
# reaction: heroine,worried,sweat
え、わたしが？　む、無理です。人前で話すのは……
# speaker: narrator
声が震えた。けれど、一歩下がりはしなかった。
# speaker: heroine
# emotion: serious
……やってみます。下手でも、本当の話をします
# speaker: enemy
では、聞こう。手を切られなかったというなら、職人たちはそのあと、どこへ行った
-> quiz(3) ->
# background: gt_bg_agra_mehtab_bagh
{ quiz_correct:
    # speaker: heroine
    デリーです。皇帝の新しい都。赤いお城と、大きなモスクのある町。……わたしたち、デリーで見てきました。あの壁も、同じ人たちの手だったのかもしれない
- else:
    # speaker: narrator
    アンワルが代わりに答えた。
    # speaker: enemy
    デリーの新しい都だ。赤い城と、大きなモスク
    # speaker: narrator
    答えてから、彼は自分の口をしまったという顔をした。
    # speaker: heroine
    ……デリーで見てきました。あの壁も、同じ人たちの手だったのかもしれない
}
# speaker: narrator
観客が静かになった。泣いてはいない。けれど、さっきとは違う顔で、川向こうの白い建物を見ている。
# speaker: enemy
名もない手の話では、人は泣かないよ。人は、名前に泣くんだ
# speaker: heroine
名前、ありますよ。一人だけ、タージに自分の名前を書き残した人がいるんです
# speaker: narrator
アンワルの眉が、わずかに上がった。四十年、聞かれたことのない方向からの話だった。
-> quiz(4) ->
# background: gt_bg_agra_mehtab_bagh
{ quiz_correct:
    # speaker: heroine
    書家のアマーナト・ハーン。壁の文字を書いた人です。一六三八年って、日付まで入れて
- else:
    # speaker: enemy
    ……アマーナト・ハーン。書家だ。知っていたとも。わしは、その話をしたことがないだけだ
}
# speaker: narrator
観客の何人かが、川向こうのタージを、目を細めて見つめた。あの白い壁のどこかに、一人の名前がある。
# speaker: heroine
それと、もう一つ、言っておきたいことがあります
# speaker: narrator
{heroine_name}は観客に向き直った。耳が熱い。それでも、声は最初より通っていた。
# speaker: heroine
# reaction: heroine,shy,blush
# photo: gt_album_a66 # photo_caption: 「わたしたちのことは、わたしたちで決めます」
わたしたちは、新婚じゃありません。……でも、二人でここに来たのは、本当です。わたしたちのことは、わたしたちで決めます
# speaker: narrator
# pause: 800
# se: applause
一瞬の静寂。それから、どっと拍手が起きた。さっきの拍手より、ずっと温かい音だった。
# speaker: narrator
アンワルは杖の先で地面を叩き、苦笑いした。
# speaker: enemy
参った。……では、わしの番だ。わしの家がどこか、お嬢さんは知っているかね。タージの南門の外、タージ・ガンジだ。七代、あそこに住んでいる
-> quiz(5) ->
# background: gt_bg_agra_mehtab_bagh
{ quiz_correct:
    # speaker: heroine
    タージ・ガンジは、市場と隊商宿の町。最初から、タージの計画の一部だったんですよね
- else:
    # speaker: enemy
    市場と隊商宿だよ。タージの南門の外に、最初から造られた町だ。墓と一緒に生まれた町なんだ
}
# speaker: heroine
# bgm: touching_moments_four
アンワルさん。わたし、今日聞いた中で一番泣けるのは、アンワルさんの話だと思います
# speaker: enemy
わしの？
# speaker: heroine
手を切られた人の話じゃなくて、手を受け継いだ人の話。タージと一緒に生まれた町に、七代、住んでる人の話
# speaker: narrator
アンワルは答えなかった。杖を握る指に、少し力が入った。日が沈み、川向こうのタージが、白から灰色へ変わっていく。
# speaker: enemy
……明日も、わしは手を切る話をするよ。客はあれで泣く。泣いた客は、また来る
# speaker: heroine
# emotion: serious
はい。……そう言うと思ってました
# speaker: enemy
だが、終わりに一つ足そう。壁に名前を残した書家の話と、南門の外の町の話を
{
- battle_score == 5:
    # speaker: enemy
    五つとも、あなたの言うとおりだった。四十年で初めて、話を全部取られた。……悔しいが、いい夕方だった
- battle_score >= 3:
    # speaker: enemy
    いくつかは、わしが守った。だが、大事なところは全部あなたに取られた
- else:
    # speaker: enemy
    答えは半分も合わなかったね。それでも客は、あなたの方を見ていた。話というのは、そういうものだ
}
# speaker: narrator
# item_show: gt_agra_anwar_petha
帰りぎわ、アンワルは甥の支配人に電話をかけ、何か短く言った。それから、二人に紙の箱を差し出した。アーグラ名物の菓子、ペーター。
# speaker: enemy
詫びの印だ。新婚でなくても、甘いものは食べられる
# speaker: heroine
# reaction: heroine,teasing,music
……それは、受け取ります。そこは、譲らないです
-> END
