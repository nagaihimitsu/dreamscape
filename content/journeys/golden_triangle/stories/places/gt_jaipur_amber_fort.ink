INCLUDE modules.ink
-> DONE

// アンベール城の場所のファイル（2026-11-10 に新しい書き方へ形を移した）。
// バトル（対決）は、このファイルの最後の knot。

// 観光案内。tourism/catalog.json の guideStoryId がこの knot を指す。
=== gt_jaipur_amber_fort_guide ===
# scene: guide
# background: gt_bg_jaipur_amber_fort
# speaker: narrator
アンベール城は、丘の斜面にしがみつくように建っていた。蜂蜜色の城壁が、峰に沿ってどこまでも続いている。
# speaker: heroine
# reaction: heroine,surprised,exclamation
# voice: gt_jaipur_amber_fort_guide_001
# photo: gt_album_j006 # photo_caption: 峰に続く城壁
お城の後ろの山に、まだ壁が続いてる。……万里の長城みたい
# speaker: narrator
坂を上りきると、大きな中庭に出た。その向こうに、色鮮やかな絵で飾られた門が見える。王の私的な宮殿へ入る門だ。
# speaker: heroine
# voice: gt_jaipur_amber_fort_guide_002
# photo: gt_album_j007 # photo_caption: くぐるのがもったいない門
門って、くぐる所なのに。ここまで飾られてると、くぐるのがもったいないね
# speaker: narrator
中庭の隅に、小さな露店が出ていた。若い男が板に紙を留め、極細の筆で絵を描いている。手のひらほどの紙に、この城がまるごと入っていた。
# speaker: heroine
# reaction: heroine,happy,sparkle
# voice: gt_jaipur_amber_fort_guide_003
# photo: gt_album_j008 # photo_caption: まつげみたいに細い筆
わ……門の模様まで、ちゃんと描いてある。この筆、まつげみたいに細い
# speaker: narrator
画家は顔を上げず、「手描き」と値段だけを言った。{heroine_name}は財布を開きかけ、手を止めた。
# speaker: heroine
# emotion: neutral
# voice: gt_jaipur_amber_fort_guide_004
……お土産、じゃないの。誰かにあげるんじゃなくて、わたしが欲しい
# speaker: narrator
自分に言い聞かせるように言ってから、彼女は代金を払った。画家は絵を薄紙で包み、短くうなずいた。
# speaker: heroine
# reaction: heroine,smile,music
# voice: gt_jaipur_amber_fort_guide_005
# photo: gt_album_j009 # photo_caption: 自分のための、初めての買い物
自分のための買い物、この旅で初めてかも。……ちょっと、どきどきした
# speaker: narrator
包みを大事そうに鞄にしまい、二人は門の方へ歩き出した。門の脇には、大きな土産物屋が口を開けている。
-> END

// ───── バトル（本筋）。battles/catalog.json の gt_jaipur_main_amber_fort_battle の storyId がこの knot を指す。1本の流れ（-> quiz(n) -> でクイズ）。
// 【3】頭の札（結果を初めて記録したとき1回当たる）。足した札：細密画を受け取り、細密画（-900）と印刷の写し（-300）の代金を払う。金額は案
=== gt_jaipur_main_amber_fort_battle ===
# scene: battle
# on_done: item gt_jaipur_salim_miniature
# on_done: money -900
# on_done: money -300
# background: gt_bg_jaipur_amber_fort
# speaker: narrator
# term: gt_term_miniature
# leave: enemy
門の脇の土産物屋の前で、{heroine_name}は鞄の包みに手を当てた。中庭の露店で、自分のために買ったばかりの、この城の細密画。
# speaker: narrator
# photo: gt_album_j010 # photo_caption: 店先に並ぶ、三十枚の同じ絵
その絵が、店先に三十枚並んでいた。同じ構図。同じ色。値段は三分の一。光沢のある紙に、印刷されている。
# speaker: heroine
# reaction: heroine,surprised,gloom
# voice: gt_jaipur_main_amber_fort_001
……同じ絵。手描きだって、言ってたのに
# speaker: narrator
足が、中庭の露店へ引き返していた。画家は顔を上げず、筆を動かし続けている。
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_main_amber_fort_002
すみません。さっきの絵、手描きだって言いましたよね。向こうのお店に、同じ絵がたくさんありました
# speaker: narrator
周りの露店の店主たちが、ちらりとこちらを見た。画家の筆が、止まった。
# speaker: enemy
# cutin: name
# voice: gt_jaipur_main_amber_fort_battle_saleem_001
……サリームだ。この中庭で、八年描いている
# speaker: narrator
彼はゆっくり顔を上げた。怒鳴りはしなかった。その分、声が冷たかった。
# speaker: enemy
# voice: gt_jaipur_main_amber_fort_battle_saleem_002
あんたは、どっちがどっちを写したと思った
# speaker: heroine
# reaction: heroine,worried,sweat
# voice: gt_jaipur_main_amber_fort_003
それは……その……
# speaker: enemy
# voice: gt_jaipur_main_amber_fort_battle_saleem_003
答えなくていい。顔に書いてある。……向こうの一枚を持ってこい。並べて見ろ。実物を見た人間にしか、描けないものがある
# speaker: narrator
{heroine_name}は印刷の一枚を買って戻り、二枚を並べた。まず目に入ったのは、王の宮殿へ入る、色鮮やかな門。その上に描かれた姿が、二枚で違っていた。
-> quiz(1) ->
# background: gt_bg_jaipur_amber_fort
{ quiz_correct:
    # speaker: heroine
    # voice: gt_jaipur_main_amber_fort_004
    # term: gt_term_ganesha
    # photo: gt_album_j011 # photo_caption: 二枚を並べて
    サリームさんの絵が、ガネーシャ。……門の名前と同じ。向こうのは、孔雀になってる
- else:
    # speaker: enemy
    # voice: gt_jaipur_main_amber_fort_battle_saleem_004
    # term: gt_term_ganesha
    # photo: gt_album_j011 # photo_caption: 二枚を並べて
    ガネーシャだ。ガネーシュ・ポール、ガネーシャの門。名前を読めば分かる。向こうのは孔雀になっている
}
# speaker: narrator
# term: gt_term_ganesh_pol
土産物屋の店主が、騒ぎを聞きつけてやってきた。腹の出た男で、首から金の鎖を下げている。
# speaker: gt_jaipur_amber_shopkeeper
# voice: gt_jaipur_main_amber_fort_battle_jaipur_amber_shopkeeper_001
何を言いがかりつけてる。うちのが元の絵だ。うちの職人が描いて、それを刷ったんだ
# speaker: enemy
# voice: gt_jaipur_main_amber_fort_battle_saleem_005
職人の名前は
# speaker: narrator
店主は答えず、話をそらした。サリームはもう店主を見ていなかった。次の場所を、筆の尻で示す。
# speaker: enemy
# voice: gt_jaipur_main_amber_fort_battle_saleem_006
鏡の間。天井を見ろ
# speaker: narrator
二枚とも、絵の隅に、城の奥の鏡の間が天井まで描き込まれている。
# speaker: narrator
印刷の方の天井には、金色の星が描かれていた。サリームの絵の天井は、細かな点の集まりで埋め尽くされている。
# speaker: heroine
# voice: gt_jaipur_main_amber_fort_005
……サリームさん、これ、何日描いたんですか
# speaker: enemy
# voice: gt_jaipur_main_amber_fort_battle_saleem_007
# photo: gt_album_j012 # photo_caption: 鏡の間に、四日座った
鏡の間に、四日座った。警備員に顔を覚えられた
-> quiz(2) ->
# background: gt_bg_jaipur_amber_fort
{ quiz_correct:
    # speaker: heroine
    # em: 鏡
    # voice: gt_jaipur_main_amber_fort_006
    何千もの小さな鏡。だから点で描いたんですね。……星じゃない。鏡なんだ
- else:
    # speaker: enemy
    # em: 鏡
    # voice: gt_jaipur_main_amber_fort_battle_saleem_008
    鏡だ。何千もの、小さな鏡。星に見えるのは、写真がぼやけていたからだ。実物を見ていない証拠だ
}
# speaker: narrator
# term: gt_term_sheesh_mahal
{heroine_name}には、もう分かっていた。印刷の方は、サリームの絵を写真に撮って刷ったものだ。写真でぼやけた所だけ、別のものにすり替わっている。
# speaker: narrator
疑ったのは、自分の方だった。
# speaker: heroine
# emotion: worried
# voice: gt_jaipur_main_amber_fort_007
わたし……
# speaker: enemy
# voice: gt_jaipur_main_amber_fort_battle_saleem_009
まだだ。最後に、あっちの説明書きを読め
# speaker: narrator
印刷の絵の下に、英語の説明が刷り込まれていた。この城は、ジャイプールを築いた王が建てた、と。
# speaker: enemy
# voice: gt_jaipur_main_amber_fort_battle_saleem_010
おれの絵には、説明は書かない。書くなら、正しいことを書く
-> quiz(3) ->
# background: gt_bg_jaipur_amber_fort
{ quiz_correct:
    # speaker: heroine
    # voice: gt_jaipur_main_amber_fort_008
    # term: gt_term_man_singh
    城を建てたのは、マーン・シング一世。ジャイプールができる、ずっと前です。向こうの説明は、二人の王を混ぜてる
- else:
    # speaker: enemy
    # voice: gt_jaipur_main_amber_fort_battle_saleem_011
    # term: gt_term_man_singh
    城を建てさせたのはマーン・シング一世だ。ジャイプールより百年以上前。向こうは王を取り違えている。……描いた奴は、ここに来たこともない
}
# speaker: narrator
土産物屋の店主は、いつの間にかいなくなっていた。周りの店主たちが、黙ってこちらを見ている。
# speaker: narrator
# photo: gt_album_j013 # photo_caption: 深く頭を下げる
{heroine_name}はサリームに向き直り、深く頭を下げた。
# speaker: heroine
# emotion: serious
# voice: gt_jaipur_main_amber_fort_009
ごめんなさい。確かめもしないで、サリームさんを疑いました。みんなの前で
# speaker: enemy
# voice: gt_jaipur_main_amber_fort_battle_saleem_012
謝罪は受け取る。……だが、あんたがさっき、ここで大きな声で言ったことは、もう戻らない
# speaker: heroine
# voice: gt_jaipur_main_amber_fort_010
……はい。だから、戻すために、もう一回大きな声を出してきます
# speaker: narrator
彼女は土産物屋の前に立った。印刷の絵を手に取っている観光客たちに、はっきり聞こえる声で言った。
# speaker: heroine
# voice: gt_jaipur_main_amber_fort_011
# photo: gt_album_j014 # photo_caption: もう一回、大きな声
この絵の本物は、中庭の奥の露店にあります。描いた人が、今もそこにいます
# speaker: narrator
観光客の何人かが、顔を見合わせて中庭の方へ歩き出した。戻ってくると、サリームは筆を止めて、こちらを見ていた。
{
- battle_score == 3:
    # speaker: enemy
    # voice: gt_jaipur_main_amber_fort_battle_saleem_013
    全部、見分けた。……画家の目だな。疑ったのも、見る目があったからだ。向きを間違えただけで
- battle_score == 2:
    # speaker: enemy
    # voice: gt_jaipur_main_amber_fort_battle_saleem_014
    二つは見分けた。残りの一つは、おれが言った。それでいい。見ようとしたことの方が大事だ
- else:
    # speaker: enemy
    # voice: gt_jaipur_main_amber_fort_battle_saleem_015
    見分けたのは、ほとんどおれだ。だが最後に声を出したのは、あんただ
}
# speaker: narrator
サリームは{heroine_name}の手から絵を取り、裏返した。細い筆で、自分の名前を書き入れる。
# speaker: enemy
# item_show: gt_jaipur_salim_miniature
# voice: gt_jaipur_main_amber_fort_battle_saleem_016
おれの仕事だと言えるときだけ、名前を書く。……これは、あんたの絵だ
# speaker: heroine
# reaction: heroine,smile,sparkle
# voice: gt_jaipur_main_amber_fort_012
# photo: gt_album_j015 # photo_caption: 裏に書かれた名前
……わたしが、自分のために買った、初めての絵です。疑ったことも、ちゃんと一緒に覚えておきます
-> END
