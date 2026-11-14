INCLUDE modules.ink
-> DONE

// バングラー・サーヒブのデート（噛み合いの選択は2回）。「真剣に、丸を目指す」では、主人公がミニゲーム「ローティーを伸ばす」で生地を伸ばす（手伝いの knot gt_delhi_bangla_sahib_roti）。
// ハルバンス・シンは、アーグラのグル・カ・タールのデートで息子と一緒に再登場する。

// 【3】
=== gt_delhi_date_bangla_sahib ===
# scene: date
# title: 世界地図のローティー
# when: episodes delhi >= 1
# hint: デリーの観光を一つ終えてから
# background: gt_bg_delhi_bangla_sahib
# speaker: narrator
# local_word: gt_delhi_word_gurdwara
金色の丸屋根の下で、入口の人たちが、次々に頭を布で覆っていた。グルドワーラー・バングラー・サーヒブ。シク教の礼拝所で、ここでは男も女も、頭を覆って入る。
入口で配られる橙色の布を、彼女は手際よく結んだ。それから、こちらを見て、こらえきれずに笑った。
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_delhi_date_bangla_sahib_001
待って、それ、ほどけかけてる。じっとして。はい。うん、さっきより、ずっとそれっぽい
# speaker: narrator
# local_word: gt_delhi_word_langar
# term: gt_term_langar
靴を預け、素足で白い石の上を歩く。祈りの歌が、中の広間から流れてくる。その奥に、大きな台所があった。ランガル。来た人なら誰でも、無料で食事ができる。毎日、何千人分。作るのも配るのも、ほとんどが奉仕の人たちだ。
巨大な鍋で豆が煮え、長い台の前に何十人もが並んで、黙々と生地を丸めている。その一人、白いひげの大柄な老人が、二人を手招きした。
# speaker: gt_delhi_bangla_old_man
# term: gt_term_roti
見てるだけか。手を洗って、こっちへ来なさい。ローティーは、見るより丸める方がうまい
# speaker: gt_harbans
# cutin: name
ハルバンス・シンだ。四十年、トラックで国を縦断する大きな街道を走ってきた。降りてからは、毎日ここで生地を丸めている
# speaker: narrator
彼女が丸めた一枚目は、どこから見ても丸くなかった。ハルバンスはそれを持ち上げて、光にかざした。
# speaker: gt_harbans
ほう。これはインドだ。ここが西のグジャラート、この出っぱりがベンガル。……四十年走ったわしが言うんだ、間違いない
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_delhi_date_bangla_sahib_002
丸くしようとしたんです……。世界地図を作ろうとしたわけじゃなくて
* [真剣に、丸を目指す # option: aim_round]
    # profile: honest
    # memory: gt_delhi_date_bangla_sahib_memory
    -> gt_delhi_bangla_sahib_roti ->
* [ハートの形にしてみる # option: heart_roti]
    # profile: bold
    # memory: gt_delhi_date_bangla_sahib_memory
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        # voice: gt_delhi_date_bangla_sahib_005
        こ、ここで、それ？　お祈りの台所なのに。ちょっと恥ずかしいよ
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        # voice: gt_delhi_date_bangla_sahib_006
        ……ねえ、それ、誰にあげるの
    }
    # speaker: gt_harbans
    焼いたら、誰の皿に行くかは分からんぞ。ランガルでは、誰が誰に作ったかは、関係ない
    # speaker: heroine
    # voice: gt_delhi_date_bangla_sahib_007
    そっか。じゃあ、知らない誰かが、ハートを食べるんだ。……それはそれで、いいね
* [彼女の生地を、横から直そうとする # option: fix_her_dough]
    # profile: provocative
    # memory: gt_delhi_date_bangla_sahib_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        # voice: gt_delhi_date_bangla_sahib_008
        あ、待って。自分でやる。……下手でも、わたしの地図だから
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_delhi_date_bangla_sahib_009
        ありがとう。でも、ここは自分で。直されたら、地図が普通の丸になっちゃう
    }
    # speaker: gt_harbans
    そのとおり。手は、自分の手で覚える。人の手で丸めたら、明日もまた丸められん
-
# speaker: narrator
生地を丸めながら、ハルバンスは街道の話をした。どの町の茶屋のチャイが一番濃いか。夜中の検問で、どうやって眠気をこらえたか。川が溢れて、三日動けなかった夏のこと。
# speaker: gt_harbans
息子はカナダだ。向こうでトラックの会社をやっている。三台持っているそうだ。こっちへ来い、来い、と毎週電話してくる
# speaker: gt_harbans
寒い国は嫌だ。道が白い。白い道は、走ったことがない
# speaker: heroine
# voice: gt_delhi_date_bangla_sahib_010
毎週、電話してくれるんですね
# speaker: gt_harbans
毎週だ。日曜の朝。向こうは土曜の夜だ
* [「行ってみたら、案外いいかもしれませんよ」 # option: suggest_go]
    # profile: bold
    { romance_result == "negative":
        # speaker: narrator
        ハルバンスの手が止まり、こちらをじろりと見た。生地が一枚、台の上で乾きかける。
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        # voice: gt_delhi_date_bangla_sahib_011
        あ、えっと……生地、乾いちゃいますよ
    - else:
        # speaker: gt_harbans
        皆そう言う。息子も、娘も、隣の家の者も。……皆、行かない者ほど、そう言う
        # speaker: heroine
        # emotion: worried
        # voice: gt_delhi_date_bangla_sahib_012
        そうですよね。わたしたちも、カナダに行くわけじゃないのに、言っちゃいました
    }
* [「寒いのが嫌なだけですか」 # option: ask_real_reason]
    # profile: honest
    # set: gt_delhi_harbans_fear_told
    { romance_result == "negative":
        # speaker: narrator
        ハルバンスは長いこと黙り、生地を三枚丸めてから、ぶっきらぼうに言った。
    - else:
        # speaker: narrator
        ハルバンスの手が、初めて止まった。
    }
    # speaker: gt_harbans
    向こうへ行ったら、わしは、何も運ばない人になる。四十年、何かを運んできた。運ばないわしを、息子に見せるのが、嫌なんだ
    # speaker: heroine
    # emotion: serious
    # voice: gt_delhi_date_bangla_sahib_013
    わたしも、役に立てていないと不安になる方なので……少し、分かります。ちゃんとした答えは、出せないですけど
    # speaker: gt_harbans
    答えは要らん。分かると言ってもらえたら、それで十分だ
* [黙って、生地を丸め続ける # option: keep_rolling]
    # profile: attentive
    { romance_result == "negative":
        # speaker: gt_harbans
        ……黙っているのも、時には寂しいものだ
        # speaker: heroine
        # voice: gt_delhi_date_bangla_sahib_014
        あ……すみません。聞いてないわけじゃ、ないんです
    - else:
        # speaker: gt_harbans
        いい弟子だ。黙って手を動かす者が、いちばん先に上手くなる
        # speaker: heroine
        # emotion: teasing
        # voice: gt_delhi_date_bangla_sahib_015
        わたしも黙ってたら、上手くなりますか？
        # speaker: gt_harbans
        君は、しゃべりながらでいい。地図が、毎回違う国になるのが面白い
    }
-
# speaker: narrator
食事の広間では、細長い敷物が何列も敷かれ、人々が床に並んで座っていた。隣はスーツの男、その隣は裸足の子ども。誰がどこに座っても、出てくるものは同じだ。
奉仕の人が籠を持って回ってくる。ローティーは、両手をお椀の形にして、上に差し出して受け取る。額のあたりまで持ち上げて、ありがとうの気持ちを示す人もいる。
ハルバンスが、わざわざ二枚を選んで、二人の手のひらに落とした。インドの形と、もう一枚。自分で丸めたものが、自分の手に戻ってきた。
# speaker: heroine
# reaction: heroine,surprised,sparkle
# voice: gt_delhi_date_bangla_sahib_016
わたしの地図だ！　焼けると、ちゃんとおいしそうに見える
# speaker: narrator
豆の煮込みを桶から注いで回る人が、彼女の皿の前で止まった。ここでは、残さずに食べるのが決まりだ。皿は床に置いたまま、持ち上げない。
{
- cond("flag gt_delhi_said_bas"):
    # speaker: heroine
    # emotion: smile
    # voice: gt_delhi_date_bangla_sahib_017
    バス。ありがとうございます
    # speaker: narrator
    桶を持った人はにっこり笑って、次の人へ移っていった。彼女が、こちらを見て小さく胸を張る。
    # speaker: heroine
    # reaction: heroine,teasing,music
    # voice: gt_delhi_date_bangla_sahib_018
    ね。もう、ちゃんと言えるんだから
- cond("flag gt_delhi_bas_for_her"):
    # speaker: heroine
    # size: large
    # voice: gt_delhi_date_bangla_sahib_019
    今度は自分で言う。バス！
    # speaker: narrator
    少し声が大きすぎて、列の三人先まで振り返った。それでも桶を持った人は、ちゃんと止まってくれた。
- else:
    # speaker: narrator
    彼女は笑顔でうなずいた。二杯目。また、うなずいた。三杯目。
    # speaker: heroine
    # reaction: heroine,exasperated,gloom
    # voice: gt_delhi_date_bangla_sahib_020
    残しちゃいけないんだよね。うん。食べる。食べるけど……断り方、誰か教えて
}
# speaker: narrator
外に出ると、大きな池が、金色の丸屋根を逆さに映していた。この池の水には、病を癒やす力があると信じられている。昔、ここに滞在した八代目のグルが、天然痘やコレラに苦しむ人たちを、井戸の水で助けたという話が伝わっている。
二人は池をめぐる白い回廊に腰を下ろした。大理石が、素足にひんやりする。
# speaker: heroine
# voice: gt_delhi_date_bangla_sahib_021
誰が食べたか分からないけど、わたしのローティー、もう誰かのお腹に入ってるんだよね。なんだか不思議。知らない人に、ちょっとだけ届いた感じ
# speaker: heroine
# emotion: smile
# voice: gt_delhi_date_bangla_sahib_022
わたし、今日、何か運べたのかな。世界地図を一枚
-> END

// 【3】手伝いの knot：主人公が丸を目指して伸ばすローティー。選択肢の代わりにミニゲーム「ローティーを伸ばす」
// （# minigame: roti_rolling）。伸ばした形をハルバンスが名付ける。場面の中の選択なので噛み合いはなく、関係値も動かさない。
// 彼女の声は aim_round の噛み合いの romance_result のまま。
=== gt_delhi_bangla_sahib_roti ===
# speaker: narrator
ハルバンスが、新しい生地の玉を一つ、こちらの前に置いた。麺棒を渡される。
# speaker: gt_harbans
# minigame: roti_rolling auto truck_bed art.kitchen gt_img_delhi_bangla_sahib_langar retry yes
押して、回す。押して、回す。……あとは、手に聞け
* [ローティー：まん丸に伸ばした # option: round]
    # speaker: narrator
    伸ばした生地は、ほとんど丸かった。ハルバンスはそれを持ち上げて、光にかざした。
    # speaker: gt_harbans
    丸い。……四十年で、いちばんつまらん地図だ
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        ……ずるい。わたしのは、インドになったのに
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        ふふっ。丸すぎて怒られる人、初めて見た
    }
* [ローティー：四角くなった # option: truck_bed]
    { romance_result == "negative":
        # speaker: narrator
        全力で伸ばした生地は、なぜか四角くなった。
        # speaker: gt_harbans
        ……荷台だな
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_delhi_date_bangla_sahib_003
        ……わたしのより、まとまってる。ちょっと悔しい
    - else:
        # speaker: narrator
        全力で伸ばした生地は、なぜか四角くなった。ハルバンスが、しげしげと眺める。
        # speaker: gt_harbans
        トラックの荷台だな。積みやすくていい
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # voice: gt_delhi_date_bangla_sahib_004
        ふふっ。わたしの地図より、ちゃんと役に立ちそう
    }
* [ローティー：地図のような形になった # option: country]
    # speaker: narrator
    伸ばした生地は、丸とも四角ともつかない形になった。ハルバンスが、目を細める。
    # speaker: gt_harbans
    ほう。こっちはスリランカだ。インドの南には、島がないとな
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        並べないでください。……わたしのインドまで、本物っぽくなっちゃう
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        じゃあ、わたしのインドの下に置こう。地図、完成だね
    }
* [ローティー：伸ばしすぎて穴が開いた # option: torn]
    # speaker: narrator
    もう一押し、と力を込めたところで、生地の真ん中に、ぽっかり穴が開いた。
    # speaker: gt_harbans
    トンネルだな。……丸め直せ。生地は、何度でもやり直せる
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        真剣すぎ。……ローティーに、トンネルは要らないと思う
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        ふふっ。トンネル開通、おめでとう。……次のは、穴なしでね
    }
- ->->
