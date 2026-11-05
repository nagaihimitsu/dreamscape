VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR battle_scene = "intro"
VAR answer_correct = false
VAR battle_score = 0

{ battle_scene == "intro": -> introduction }
{ battle_scene == "after_1": -> after_first }
{ battle_scene == "after_2": -> after_second }
{ battle_scene == "outro": -> conclusion }
-> END

=== introduction ===
# background: gt_bg_delhi_qutb_minar
# speaker: narrator
{heroine_name}はクトゥブ・ミナールの足元から、スマートフォンをゆっくり上へ向けた。塔を追い越した画面いっぱいに、空が広がる。
# speaker: heroine
# reaction: heroine,surprised,interrobang
「あれ。塔、どこまで行った？」
# speaker: narrator
こちらの肩が揺れる。画面を見た彼女も吹き出した。二人の笑い声まで入ってから、ようやく録画が止まった。
# speaker: enemy
「画面じゃなくて、本物を見てたんだろ。よくある。うちに持ってきても、返品は受け付けないやつ」
# speaker: narrator
近くの青年はデーヴと名乗った。電器店で販売と返品の受付をしているという。端末を取り上げず、画面の塔を指して笑った。
# speaker: heroine
# emotion: worried
「笑い声だけなら、撮るつもりじゃなかったんですけど」
# speaker: enemy
「でもカメラは正常。空も笑い声も、注文どおり記録してる。塔だけ別売りだったね」
# speaker: narrator
彼女が笑い直す隣で、デーヴは低いままのアラーイー・ミナールを眺めた。今度は彼の方が、納得できない顔になる。
# speaker: enemy
「これは、途中で終わってるのか。完成した塔を見に来たのに、見本だけ置いてある気分」
# speaker: heroine
# reaction: heroine,serious,question
「見本って。どのくらい大きくするつもりだったのか、まだ分からないですよ」
# speaker: narrator
デーヴが眉を上げる。二人で案内を確かめると、今残っている高さとは別に、目指していた規模が記されていた。
-> END

=== after_first ===
# background: gt_bg_delhi_qutb_minar
{ answer_correct:
    # speaker: enemy
    「クトゥブ・ミナールの二倍を目指した。第一層でこれか。小さい仕事じゃないな」
- else:
    # speaker: enemy
    「二倍の規模を目指して、第一層まで。小さい塔として完成したわけじゃなかったんだ」
}
# speaker: heroine
# reaction: heroine,worried,sweat
「あ、わたしも、そんなに大きいとは思ってませんでした。急にかばったけど、よく知らなかった」
# speaker: enemy
「僕は完成してる方がお得だと思った。今、ない部分の方が気になってる。変な買い物だな」
# speaker: narrator
互いに未完の塔を見て、少し黙る。先に肩をすくめたのはデーヴだった。
# speaker: enemy
「こっちの門は完成してる。これは安心して見られるな」
# speaker: narrator
アラーイー門を前に、彼女が完成の時期を尋ねる。デーヴは一目で分かる顔をしてから、首を振った。
# speaker: enemy
「外側を見て古いと決めると、お客さんに怒られる。記録を探そう」
-> END

=== after_second ===
# background: gt_bg_delhi_qutb_minar
{ answer_correct:
    # speaker: heroine
    「門の碑文に、1311年の完成記録。模様だと思ってたところが、証拠になるんだ」
- else:
    # speaker: heroine
    「碑文に完成の記録があるんだね。1311年。古そう、で当てるより、読む場所を知っておきたい」
}
# speaker: enemy
「買った日を覚えてない人には、まずレシートを探してもらう。建物にも残る証拠があるんだな」
# speaker: narrator
彼は胸のポケットを探り、折れた紙を引っ張り出した。今度は小銭入れを開け、首をかしげる。
# speaker: heroine
# reaction: heroine,teasing,music
「何か、なくしました？」
# speaker: enemy
「自分のレシート。ポケットに入れたはずなのに。今の話、お客さんにしないで」
# speaker: narrator
彼女が笑うと、デーヴは急いでクトゥブ・ミナールへ視線を戻した。説明には、建て始めた人以外の名も残っていた。
# speaker: enemy
「あの塔の方は、記録をなくしてない。最初のままかどうかも、確かめられる」
-> END

=== conclusion ===
# background: gt_bg_delhi_qutb_minar
{ answer_correct:
    # speaker: enemy
    「増築や修理も重ねてる。完成品だから、そのまま長持ちした、とは言えないのか」
- else:
    # speaker: enemy
    「後の時代にも増築と修理が重なった塔なんだ。最初に造った人だけで、今の姿になったわけじゃない」
}
{
- battle_score == 3:
    # speaker: enemy
    「記録を全部拾ったな。君たちなら、説明書を捨てずにいてくれそうだ」
- battle_score == 2:
    # speaker: enemy
    「一つ見落とした分は、もう一回読めばいい。そこで分かったふりをすると、後が長い」
- else:
    # speaker: enemy
    「今日は見落としが多かったね。僕も完成品だけ見に来てた。あと、自分のレシート」
}
# speaker: narrator
別れ際、彼女は空の動画をもう一度見た。自分の笑い声が聞こえ、今度は録画していないのに、また肩が揺れる。
# speaker: heroine
# reaction: heroine,happy,music
「やっぱり、消さなくていいや。これ、見てると笑っちゃう」
# speaker: enemy
「それなら返品不可。……いや、そもそも僕の店の商品じゃないんだけど」
# speaker: heroine
# emotion: smile
「はい。もう一本も撮ります。今度は塔も出演してもらいます」
# speaker: narrator
彼女は少し離れて撮り直した。塔の入った映像の隣に、空になった映像も残る。デーヴはやっぱり塔の方が好きだと言い、レシートを探しながら歩いていった。
-> END
