INCLUDE modules.ink
// 【3】1場面1ファイルの頭の札（結果を初めて記録したとき1回当たる）。足した札：細密画を受け取り、細密画（-900）と印刷の写し（-300）の代金を払う。金額は案
# on_done: item gt_jaipur_salim_miniature
# on_done: money -900
# on_done: money -300
# background: gt_bg_jaipur_amber_fort
# speaker: narrator
十分前、{heroine_name}は一枚の絵を買った。中庭の隅の小さな露店で、若い画家が描いていた、アンベール城の細密画。手のひらほどの紙に、門も宮殿も、細い筆で描き込まれている。
# speaker: narrator
誰かへのお土産ではなく、自分のための買い物。旅に出てから、たぶん初めてだった。
# speaker: narrator
その絵が、門の近くの大きな土産物屋に、三十枚並んでいた。同じ構図。同じ色。値段は三分の一。光沢のある紙に、印刷されている。
# speaker: heroine
# reaction: heroine,surprised,gloom
「……同じ絵。手描きだって、言ってたのに」
# speaker: narrator
足が、中庭の露店へ引き返していた。画家は顔を上げず、筆を動かし続けている。
# speaker: heroine
# emotion: serious
「すみません。さっきの絵、手描きだって言いましたよね。向こうのお店に、同じ絵がたくさんありました」
# speaker: narrator
周りの露店の店主たちが、ちらりとこちらを見た。画家の筆が、止まった。
# speaker: enemy
「……サリームだ。この中庭で、八年描いている」
# speaker: narrator
彼はゆっくり顔を上げた。怒鳴りはしなかった。その分、声が冷たかった。
# speaker: enemy
「あんたは、どっちがどっちを写したと思った」
# speaker: heroine
# reaction: heroine,worried,sweat
「それは……その……」
# speaker: enemy
「答えなくていい。顔に書いてある。……向こうの一枚を持ってこい。並べて見ろ。実物を見た人間にしか、描けないものがある」
# speaker: narrator
{heroine_name}は印刷の一枚を買って戻り、二枚を並べた。まず目に入ったのは、王の宮殿へ入る、色鮮やかな門。その上に描かれた姿が、二枚で違っていた。
-> quiz(1) ->
# background: gt_bg_jaipur_amber_fort
{ quiz_correct:
    # speaker: heroine
    「サリームさんの絵が、ガネーシャ。……門の名前と同じ。向こうのは、孔雀になってる」
- else:
    # speaker: enemy
    「ガネーシャだ。ガネーシュ・ポール、ガネーシャの門。名前を読めば分かる。向こうのは孔雀になっている」
}
# speaker: narrator
土産物屋の店主が、騒ぎを聞きつけてやってきた。腹の出た男で、首から金の鎖を下げている。
# speaker: narrator
「何を言いがかりつけてる。うちのが元の絵だ。うちの職人が描いて、それを刷ったんだ」
# speaker: enemy
「職人の名前は」
# speaker: narrator
店主は答えず、話をそらした。サリームはもう店主を見ていなかった。次の場所を、筆の尻で示す。
# speaker: enemy
「鏡の間。天井を見ろ」
# speaker: narrator
印刷の方の天井には、金色の星が描かれていた。サリームの絵の天井は、細かな点の集まりで埋め尽くされている。
# speaker: heroine
「……サリームさん、これ、何日描いたんですか」
# speaker: enemy
「鏡の間に、四日座った。警備員に顔を覚えられた」
-> quiz(2) ->
# background: gt_bg_jaipur_amber_fort
{ quiz_correct:
    # speaker: heroine
    「何千もの小さな鏡。だから点で描いたんですね。……星じゃない。鏡なんだ」
- else:
    # speaker: enemy
    「鏡だ。何千もの、小さな鏡。星に見えるのは、写真がぼやけていたからだ。実物を見ていない証拠だ」
}
# speaker: narrator
{heroine_name}には、もう分かっていた。印刷の方は、サリームの絵を写真に撮って刷ったものだ。写真でぼやけた所だけ、別のものにすり替わっている。
# speaker: narrator
疑ったのは、自分の方だった。
# speaker: heroine
# emotion: worried
「わたし……」
# speaker: enemy
「まだだ。最後に、あっちの説明書きを読め」
# speaker: narrator
印刷の絵の下に、英語の説明が刷り込まれていた。この城は、ジャイプールを築いた王が建てた、と。
# speaker: enemy
「おれの絵には、説明は書かない。書くなら、正しいことを書く」
-> quiz(3) ->
# background: gt_bg_jaipur_amber_fort
{ quiz_correct:
    # speaker: heroine
    「城を建てたのは、マーン・シング一世。ジャイプールができる、ずっと前です。向こうの説明は、二人の王を混ぜてる」
- else:
    # speaker: enemy
    「城を建てさせたのはマーン・シング一世だ。ジャイプールより百年以上前。向こうは王を取り違えている。……描いた奴は、ここに来たこともない」
}
# speaker: narrator
土産物屋の店主は、いつの間にかいなくなっていた。周りの店主たちが、黙ってこちらを見ている。
# speaker: narrator
{heroine_name}はサリームに向き直り、深く頭を下げた。
# speaker: heroine
# emotion: serious
「ごめんなさい。確かめもしないで、サリームさんを疑いました。みんなの前で」
# speaker: enemy
「謝罪は受け取る。……だが、あんたがさっき、ここで大きな声で言ったことは、もう戻らない」
# speaker: heroine
「……はい。だから、戻すために、もう一回大きな声を出してきます」
# speaker: narrator
彼女は土産物屋の前に立った。印刷の絵を手に取っている観光客たちに、はっきり聞こえる声で言った。
# speaker: heroine
「この絵の本物は、中庭の奥の露店にあります。描いた人が、今もそこにいます」
# speaker: narrator
観光客の何人かが、顔を見合わせて中庭の方へ歩き出した。戻ってくると、サリームは筆を止めて、こちらを見ていた。
{
- battle_score == 3:
    # speaker: enemy
    「全部、見分けた。……画家の目だな。疑ったのも、見る目があったからだ。向きを間違えただけで」
- battle_score == 2:
    # speaker: enemy
    「二つは見分けた。残りの一つは、おれが言った。それでいい。見ようとしたことの方が大事だ」
- else:
    # speaker: enemy
    「見分けたのは、ほとんどおれだ。だが最後に声を出したのは、あんただ」
}
# speaker: narrator
サリームは{heroine_name}の手から絵を取り、裏返した。細い筆で、自分の名前を書き入れる。
# speaker: enemy
「おれの仕事だと言えるときだけ、名前を書く。……これは、あんたの絵だ」
# speaker: heroine
# reaction: heroine,smile,sparkle
「……わたしが、自分のために買った、初めての絵です。疑ったことも、ちゃんと一緒に覚えておきます」
-> END
