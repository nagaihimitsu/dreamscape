INCLUDE modules.ink
-> DONE

// ラーム・バーグのデート（二人きり。茶屋の主人が少し出る。噛み合いの選択は2回）。
// 不満リストに何を書くかは、手伝いの knot の選択。茶屋の代金は頭の # on_done: で払う（選択のない買い物）。

// 【3】
=== gt_agra_date_ram_bagh ===
# scene: date
# title: 皇帝の不満リスト
# when: episodes agra >= 1
# on_done: money -80
# background: gt_bg_agra_ram_bagh
# speaker: narrator
ラーム・バーグには、ほとんど人がいなかった。一段高い石の通路が庭を四つに分け、水のない水路が、川の方へまっすぐ下りていく。木の上で、緑のインコが騒いでいた。
インドでいちばん古いムガル庭園の一つで、帝国を開いたバーブルが造らせたと伝えられている。亡くなったバーブルは、いったんこの庭に葬られ、のちにカーブルへ運ばれた。
# speaker: heroine
最初の皇帝の庭なのに、静かだね。タージの十分の一も、人がいない
# speaker: narrator
彼女のガイドブックに、バーブルが自伝に書き残した言葉が載っていた。この国にないもの、の一覧だ。
良い馬がない。良い肉がない。ぶどうも、メロンもない。氷も、冷たい水もない。市場に、良いパンがない。湯につかる風呂がない。学校がない。ろうそくも、燭台もない。
# speaker: heroine
# reaction: heroine,surprised_big,question
全部、文句！？　国を手に入れた人が書く文章じゃない
# speaker: narrator
カーブルから届いたメロンを切って、泣いたという話も残っている。遠い故郷の味だったのだ。
# speaker: heroine
千キロ以上も遠くから来て、着いた国に文句ばっかり。メロンで泣いちゃう皇帝。でも、ちょっとだけ、分かる
# speaker: heroine
# emotion: teasing
ねえ。わたしたちも、書いてみない？　インドの不満リスト。皇帝の真似して
-> gt_agra_ram_bagh_complaints ->
# speaker: heroine
わたしのも、いい？　道を聞くと、知らなくても全員が教えてくれる。しかも、全員違う方向
# speaker: heroine
それと……
# speaker: narrator
そこで、彼女の言葉が止まった。水のない水路を見下ろしたまま、少し笑う。
# speaker: heroine
# emotion: worried
実はね、昨日の夜、コンビニのおにぎりの夢を見たの。鮭の。包装、ちゃんと三か所はがすところまで、夢に出てきた
# speaker: heroine
自分で来たかった旅なのに、帰りたいって思っちゃうの、ずるいよね。楽しいのに。すごく楽しいのに
* [「自分も、味噌汁が飲みたい」 # option: miss_miso]
    # profile: honest
    # memory: gt_agra_date_ram_bagh_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        そっちも？　なんだ。わたしだけ泣き言を言ってるみたいで、ちょっと損した気分
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,sparkle
        ほんと？　よかった。わたしだけじゃなかった
        # speaker: heroine
        # emotion: smile
        味噌汁とおにぎりで、帰ったら定食ができるね
    }
* [「帰りたいのも、ここにいたいのも、両方本当でいい」 # option: both_true]
    # profile: attentive
    # memory: gt_agra_date_ram_bagh_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        ……そう言ってくれるのは、うれしいけど。なんだか、きれいにまとめられちゃった気がする
    - else:
        # speaker: heroine
        ……うん。両方、本当。どっちかに決めなくて、いいんだね
    }
* [「じゃあ、そのリスト、裏返してみよう」 # option: flip_list]
    # profile: playful
    # memory: gt_agra_date_ram_bagh_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        今、ちょっと真面目に言ったんだけどな。でも、いいよ。裏返そう
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,question
        裏返す？　あ、分かった。やってみよう
    }
-
# speaker: narrator
二人で、一つずつ裏返していった。帰ったら、恋しくなるもののリストに。
# speaker: heroine
クラクションがないと、静かすぎて眠れなくなるかも。チャイは、日本のコンビニには売ってない。道を聞いたら、知らない人が全員で考えてくれる国も、たぶん、ここだけ
# speaker: heroine
# emotion: smile
不満って、裏返すと、恋しいものになるんだね
# speaker: narrator
バーブルにも、この国で褒めたものはあった。そのひとつが、雨の季節の涼しい風だ。
{
- cond("item gt_delhi_rain_attar held"):
    # speaker: heroine
    雨か。わたしが路地で買ったのも、雨の匂いだった。皇帝と、好みが合うね
- cond("flag gt_agra_rain_on_lawn"):
    # speaker: heroine
    雨か。わたしの雨は、猿のせいで、もう鹿の芝生に降っちゃったけど。皇帝と、好みは合ってたんだね
- else:
    # speaker: heroine
    文句ばっかりの人が、雨は褒めたんだ。ちょっと、かわいいね
}
# speaker: narrator
庭を出ると、道の向かいに小さな茶屋があった。プラスチックの椅子が三つと、湯気の立つ大鍋。注文は、インスタントのマギーの麺と、チャイを二つ。
麺を運んできた主人が、二人を見比べて、にやりとした。
# speaker: gt_agra_ram_bagh_tea_master
サミールのところの客だろう。白鳥の部屋の。この町じゃ、あそこの新婚は有名だ
# speaker: heroine
# reaction: heroine,surprised_big,sweat
ど、どうして知ってるんですか！　しかも新婚じゃないです！
* [「新婚じゃありません」 # option: not_newlyweds]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        ……そんなに、きっぱり否定しなくても。いや、合ってるんだけど
    - else:
        # speaker: gt_agra_ram_bagh_tea_master
        皆さん、最初はそう言う
        # speaker: heroine
        # reaction: heroine,exasperated,gloom
        サミールさんと、同じこと言ってる……。この町、全員つながってるの？
    }
* [「新婚じゃありません。……今のところは」 # option: for_now]
    # profile: bold
    # set: gt_agra_said_for_now
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        ……そういう冗談、ここで言う？　お店の人、本気にするよ
        # speaker: narrator
        茶屋の主人は本気にしたらしく、頼んでいないゆで卵を二つ置いていった。
    - else:
        # speaker: heroine
        # reaction: heroine,shy_deep,blush
        ……今のところは、って何
        # speaker: narrator
        茶屋の主人は満足そうにうなずき、頼んでいないゆで卵を二つ置いていった。彼女は麺をすすりながら、しばらくこちらを見なかった。
    }
* [笑ってごまかす # option: laugh_it_off]
    # profile: provocative
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        ごまかさないで。……ちゃんと否定してくれないと、わたしが困るんだから
    - else:
        # speaker: heroine
        # emotion: exasperated
        ごまかさないで、ちゃんと否定して。ううん、わたしがする。新婚じゃ、ありません！
        # speaker: gt_agra_ram_bagh_tea_master
        はいはい
    }
-
# speaker: narrator
マギーは、日本のどのインスタント麺にも似ていなかった。香辛料が強くて、少しだけ甘い。
# speaker: heroine
全然、日本の味じゃないのに、なんでだろう。ちょっと、懐かしい
# speaker: heroine
# emotion: smile
帰ったら、きっとこれも恋しくなるんだね。恋しいものが一つ増えるの、ちょっと、うれしい
-> END

// 【3】手伝いの knot：インドの不満リスト（噛み合いでない選択）
=== gt_agra_ram_bagh_complaints ===
* [「クラクション」 # option: list_horns]
    # rel: affection +1
    # speaker: heroine
    # reaction: heroine,teasing,music
    一つ目から強い。それと、クラクションに返事するクラクション
* [「何を頼んでも、チャイが甘い」 # option: list_sweet_chai]
    # rel: spark +1
    # speaker: heroine
    # reaction: heroine,teasing,question
    でも、毎回、全部飲んでるよね。わたしも飲んでるけど
* [「時間どおりに来るものが、一つもない」 # option: list_late]
    # rel: trust +1
    # speaker: heroine
    # reaction: heroine,exasperated,sigh
    それ、わたしたちの電車も、オートも、さっき頼んだ水も
- ->->
