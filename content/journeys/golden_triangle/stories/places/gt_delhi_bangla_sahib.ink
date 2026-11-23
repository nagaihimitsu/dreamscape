INCLUDE modules.ink
-> DONE

// バングラー・サーヒブのデート（噛み合いの選択は2回）。一回目は、主人公がミニゲーム「ローティーを伸ばす」で生地を伸ばし、伸びた形で話が進む（下の注）。
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
# emotion: happy
入口で配られる橙色の布を、彼女は手際よく結んだ。それから、こちらを見て、こらえきれずに笑った。
# speaker: heroine
# reaction: heroine,teasing,music
# voice: gt_delhi_date_bangla_sahib_001
# photo: gt_album_d082 # photo_caption: 橙色の布、「ずっとそれっぽい」
待って、それ、ほどけかけてる。じっとして。はい。うん、さっきより、ずっとそれっぽい
# speaker: narrator
靴を預け、素足で白い石の上を歩く。祈りの歌が、中の広間から流れてくる。
# speaker: narrator
# local_word: gt_delhi_word_langar
# term: gt_term_langar
その奥に、大きな台所があった。ランガル。毎日、何千人分。作るのも配るのも、ほとんどが奉仕の人たちだ。
巨大な鍋で豆が煮え、長い台の前に何十人もが並んで、黙々と生地を丸めている。その一人、白いひげの大柄な老人が、二人を手招きした。
# speaker: gt_delhi_bangla_old_man
# term: gt_term_roti
# voice: gt_delhi_date_bangla_sahib_harbans_001
見てるだけか。手を洗って、こっちへ来なさい。ローティーは、見るより丸める方がうまい
# speaker: gt_harbans
# cutin: name
# voice: gt_delhi_date_bangla_sahib_harbans_002
ハルバンス・シンだ。四十年、トラックで国を縦断する大きな街道を走ってきた。降りてからは、毎日ここで生地を丸めている
# speaker: narrator
彼女が丸めた一枚目は、どこから見ても丸くなかった。ハルバンスはそれを持ち上げて、光にかざした。
# speaker: gt_harbans
# voice: gt_delhi_date_bangla_sahib_harbans_003
ほう。これはインドだ。ここが西のグジャラート、この出っぱりがベンガル。……四十年走ったわしが言うんだ、間違いない
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_delhi_date_bangla_sahib_002
丸くしようとしたんです……。世界地図を作ろうとしたわけじゃなくて
// 一回目の噛み合いの代わりに、ミニゲーム「ローティーを伸ばす」（2026-11-16。前は「真剣に、丸を目指す」を選んだときだけ遊んだ）。
// ゲームの結果と同じ ID の選択肢をゲームが選ぶ（噛み合いはここで1回）。地図のようにいびつな形（country）は、ハルバンスが
// 「ハート」と読み、前の「ハートの形にしてみる」の道の台詞へつなぐ。
# speaker: narrator
ハルバンスが、新しい生地の玉を一つ、こちらの前に置いた。麺棒を渡される。
# speaker: gt_harbans
# minigame: roti_rolling auto truck_bed art.kitchen gt_img_delhi_bangla_sahib_langar
# voice: gt_delhi_date_bangla_sahib_harbans_004
押して、回す。押して、回す。……あとは、手に聞け
* [ローティー：まん丸に伸ばした # option: round]
    # profile: honest
    # memory: gt_delhi_date_bangla_sahib_memory
    # speaker: narrator
    伸ばした生地は、ほとんど丸かった。ハルバンスはそれを持ち上げて、光にかざした。
    # speaker: gt_harbans
    # voice: gt_delhi_date_bangla_sahib_harbans_005
    丸い。……四十年で、いちばんつまらん地図だ
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_delhi_bangla_sahib_roti_001
        ……ずるい。わたしのは、インドになったのに
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_delhi_bangla_sahib_roti_002
        ふふっ。丸すぎて怒られる人、初めて見た
    }
* [ローティー：四角くなった # option: truck_bed]
    # profile: playful
    # memory: gt_delhi_date_bangla_sahib_memory
    { romance_result == "negative":
        # speaker: narrator
        全力で伸ばした生地は、なぜか四角くなった。
        # speaker: gt_harbans
        # voice: gt_delhi_date_bangla_sahib_harbans_006
        ……荷台だな
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_delhi_date_bangla_sahib_003
        ……わたしのより、まとまってる。ちょっと悔しい
    - else:
        # speaker: narrator
        全力で伸ばした生地は、なぜか四角くなった。ハルバンスが、しげしげと眺める。
        # speaker: gt_harbans
        # voice: gt_delhi_date_bangla_sahib_harbans_007
        トラックの荷台だな。積みやすくていい
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # voice: gt_delhi_date_bangla_sahib_004
        ふふっ。わたしの地図より、ちゃんと役に立ちそう
    }
* [ローティー：地図のような形になった # option: country]
    # profile: bold
    # memory: gt_delhi_date_bangla_sahib_memory
    # speaker: narrator
    生地は、思ったようには伸びてくれなかった。ハルバンスが、目を細める。
    # speaker: gt_harbans
    # voice: gt_delhi_date_bangla_sahib_harbans_008
    ほう。……これは、ハートか
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
    # voice: gt_delhi_date_bangla_sahib_harbans_009
    焼いたら、誰の皿に行くかは分からんぞ。ランガルでは、誰が誰に作ったかは、関係ない
    # speaker: heroine
    # voice: gt_delhi_date_bangla_sahib_007
    そっか。じゃあ、知らない誰かが、ハートを食べるんだ。……それはそれで、いいね
* [ローティー：伸ばしすぎて穴が開いた # option: torn]
    # profile: provocative
    # memory: gt_delhi_date_bangla_sahib_memory
    # speaker: narrator
    もう一押し、と力を込めたところで、生地の真ん中に、ぽっかり穴が開いた。
    # speaker: gt_harbans
    # voice: gt_delhi_date_bangla_sahib_harbans_010
    トンネルだな。……丸め直せ。生地は、何度でもやり直せる
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_delhi_bangla_sahib_roti_005
        真剣すぎ。……ローティーに、トンネルは要らないと思う
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_delhi_bangla_sahib_roti_006
        ふふっ。トンネル開通、おめでとう。……次のは、穴なしでね
    }
-
# speaker: narrator
生地を丸めながら、ハルバンスは街道の話をした。どの町の茶屋のチャイが一番濃いか。夜中の検問で、どうやって眠気をこらえたか。川が溢れて、三日動けなかった夏のこと。
# speaker: gt_harbans
# voice: gt_delhi_date_bangla_sahib_harbans_011
米も、セメントも、祭りの花も運んだ。荷台が空のまま走った日は、ほとんどない
# speaker: gt_harbans
# voice: gt_delhi_date_bangla_sahib_harbans_012
息子はカナダだ。向こうでトラックの会社をやっている。三台持っているそうだ。こっちへ来い、来い、と毎週電話してくる
# speaker: gt_harbans
# voice: gt_delhi_date_bangla_sahib_harbans_013
寒い国は嫌だ。道が白い。白い道は、走ったことがない
# speaker: heroine
# voice: gt_delhi_date_bangla_sahib_010
毎週、電話してくれるんですね
# speaker: gt_harbans
# voice: gt_delhi_date_bangla_sahib_harbans_014
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
        # voice: gt_delhi_date_bangla_sahib_harbans_015
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
    # voice: gt_delhi_date_bangla_sahib_harbans_016
    向こうへ行ったら、わしは、何も運ばない人になる。四十年、何かを運んできた。運ばないわしを、息子に見せるのが、嫌なんだ
    # speaker: heroine
    # emotion: serious
    # voice: gt_delhi_date_bangla_sahib_013
    わたしも、役に立てていないと不安になる方なので……少し、分かります。ちゃんとした答えは、出せないですけど
    # speaker: gt_harbans
    # voice: gt_delhi_date_bangla_sahib_harbans_017
    答えは要らん。分かると言ってもらえたら、それで十分だ
* [黙って、生地を丸め続ける # option: keep_rolling]
    # profile: attentive
    { romance_result == "negative":
        # speaker: gt_harbans
        # voice: gt_delhi_date_bangla_sahib_harbans_018
        ……黙っているのも、時には寂しいものだ
        # speaker: heroine
        # voice: gt_delhi_date_bangla_sahib_014
        あ……すみません。聞いてないわけじゃ、ないんです
    - else:
        # speaker: gt_harbans
        # voice: gt_delhi_date_bangla_sahib_harbans_019
        いい弟子だ。黙って手を動かす者が、いちばん先に上手くなる
        # speaker: heroine
        # emotion: teasing
        # voice: gt_delhi_date_bangla_sahib_015
        わたしも黙ってたら、上手くなりますか？
        # speaker: gt_harbans
        # voice: gt_delhi_date_bangla_sahib_harbans_020
        君は、しゃべりながらでいい。地図が、毎回違う国になるのが面白い
    }
-
# speaker: narrator
食事の広間では、細長い敷物が何列も敷かれ、人々が床に並んで座っていた。隣はスーツの男、その隣は裸足の子ども。誰がどこに座っても、出てくるものは同じだ。
奉仕の人が籠を持って回ってくる。二人は、裸足の子どもの手つきを真似て、両手をお椀の形にして差し出した。
# photo: gt_album_d086 # photo_caption: 自分の地図が、手のひらに戻る
ハルバンスが、わざわざ二枚を選んで、二人の手のひらに落とした。インドの形と、もう一枚。自分で丸めたものが、自分の手に戻ってきた。
# speaker: heroine
# reaction: heroine,surprised,sparkle
# voice: gt_delhi_date_bangla_sahib_016
わたしの地図だ！　焼けると、ちゃんとおいしそうに見える
# speaker: narrator
# leave: gt_harbans
ほかに丸めた何枚もは、籠に混ざったまま、知らない人たちの皿へ配られていった。
# speaker: narrator
豆の煮込みを桶から注いで回る人が、彼女の皿の前で止まった。ここでは、食べられる分だけもらって、残さないのが作法だ。
{
- cond("flag gt_delhi_said_bas"):
    # speaker: narrator
    チャンドニー・チョークの屋台で、彼女は「もう十分」の一言を覚えていた。
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
    # speaker: narrator
    チャンドニー・チョークの屋台では、「もう十分」の一言を、こちらが代わりに言った。
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
外に出ると、大きな池が、金色の丸屋根を逆さに映していた。この池の水には、病を癒やす力があると信じられている。
# speaker: narrator
昔、ここに滞在したシク教の師、八代目のグルが、天然痘やコレラに苦しむ人たちを、井戸の水で助けたという話が伝わっている。
# photo: gt_album_d088 # photo_caption: 金色の丸屋根を映す池
二人は池をめぐる白い回廊に腰を下ろした。大理石が、素足にひんやりする。
# speaker: heroine
# voice: gt_delhi_date_bangla_sahib_021
誰が食べたか分からないけど、わたしのローティー、もう誰かのお腹に入ってるんだよね。なんだか不思議。知らない人に、ちょっとだけ届いた感じ
# speaker: heroine
# emotion: smile
# voice: gt_delhi_date_bangla_sahib_022
わたし、今日、何か運べたのかな。世界地図を一枚
-> END
