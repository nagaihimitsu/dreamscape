INCLUDE modules.ink
-> DONE

// グル・カ・タールのデート（噛み合いの選択は2回）。
// デリーのバングラー・サーヒブのデートで会っていれば、ハルバンスとの再会になる。会っていなければ、ここで初めて会う。

// 【3】
=== gt_agra_date_guru_ka_taal ===
# scene: date
# title: 寒い国へは、夏だけ
# when: episodes agra >= 1
# background: gt_bg_agra_guru_ka_taal
# speaker: narrator
デリーへ続く幹線道路を、トラックが途切れなく唸りながら走っていく。その道沿いに、赤い砂岩の塔を残した、古い石の貯水池があった。グル・カ・タール。
雨水をためるために、1610年に造られた。塔はもとは十二本あり、今は八本が残る。シク教の言い伝えでは、九代目のグル、テーグ・バハードゥルが、ここで自ら捕らえられに出たとされ、そのそばに礼拝所が建っている。
# speaker: heroine
「道路の音が、すごい。でも、池の方を向くと、少しだけ静かになるね」
# speaker: narrator
礼拝所の食堂で、湯気の立つ豆の皿を受け取ったときだった。
{ cond("date gt_delhi_date_bangla_sahib"):
    # speaker: narrator
    奥の長い敷物の端から、聞き覚えのある大声が飛んできた。
    ハルバンス「世界地図！　世界地図の娘じゃないか！」
    # speaker: heroine
    # reaction: heroine,surprised_big,exclamation
    「ハルバンスさん！　どうして、アーグラに？」
- else:
    # speaker: narrator
    奥の長い敷物の端から、大きな声が飛んできた。白いひげの大柄な老人が、こちらを手招きしていた。外国の若い二人が珍しいらしい。ハルバンス・シンと名乗った。四十年、トラックで国じゅうを走ってきたという。
}
# speaker: narrator
ハルバンスの隣には、同じ鼻と同じ肩幅の、四十代くらいの男が座っていた。二人のあいだには、ちょうど一人分の隙間が空いている。
ハルバンス「息子のグルミートだ。カナダから来た。わしを連れて帰るつもりで」
グルミートは、父親の方を見ないまま、軽く頭を下げた。カナダのブランプトンで、トラックの会社をやっているという。
グルミート「親父が、昔の自分の道を見せると言って聞かなくて。デリーから、ずっとこの街道を。……車の中で、三回喧嘩しました」
ハルバンス「四回だ」
それきり、二人とも黙った。豆の皿だけが、ゆっくり冷めていく。
しばらくすると、ハルバンスが彼女の袖を引いた。
ハルバンス「あいつに言ってくれ。わしは寒い国には行かん、と」
反対側から、グルミートが小声で言う。
グルミート「親父に言ってください。意地を張るのもいい加減にしろ、と」
# speaker: heroine
# reaction: heroine,exasperated,sweat
「……隣に座ってるのに」
* [「君が決めていいよ」と、目で合図する # option: leave_it_to_her]
    # profile: attentive
    # memory: gt_agra_date_guru_ka_taal_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「えっ、わたし一人で？　……う、うん。やってみる」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。任せて。わたし、こういうの、ちょっとだけ得意かも」
    }
* [グルミートの方に、チャイを持っていく # option: tea_for_gurmeet]
    # profile: bold
    # memory: gt_agra_date_guru_ka_taal_memory
    { romance_result == "negative":
        # speaker: narrator
        湯気の立つ素焼きのカップを置いたが、グルミートは手をつけなかった。父親の方から、鼻を鳴らす音がした。
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「……あ、冷めないうちに、どうぞ」
    - else:
        # speaker: narrator
        湯気の立つ素焼きのカップを置くと、グルミートは、少し驚いた顔で受け取った。父親に背を向けたまま、一口飲む。
    }
* [二人の間の、一人分の隙間に座る # option: sit_between]
    # profile: playful
    # memory: gt_agra_date_guru_ka_taal_memory
    # set: gt_agra_sat_between
    { romance_result == "negative":
        # speaker: narrator
        敷物の隙間に腰を下ろすと、左右から、同じ大きさの視線が刺さった。しばらく、誰も口をきかなかった。
    - else:
        # speaker: narrator
        敷物の隙間に腰を下ろすと、左右から、同じ大きさのため息が聞こえた。
    }
-
# speaker: heroine
# emotion: serious
「ごめんなさい。伝言は、運べません」
# speaker: heroine
「わたしが伝えたら、お二人の言葉じゃなくなっちゃうから。……そのかわり、一つずつ聞いてもいいですか。何が、怖いんですか」
# speaker: narrator
二人とも、同時に彼女を見た。怒っているというより、そんなことを聞かれたのは初めてだ、という顔だった。
{ cond("flag gt_delhi_harbans_fear_told"):
    # speaker: heroine
    「ハルバンスさん。デリーで話してくれたこと、ご自分で言えますか」
    # speaker: narrator
    ハルバンスは、しばらく豆の皿を見ていた。それから、息子の方を見ないまま、口を開いた。
    ハルバンス「……向こうへ行ったら、わしは、何も運ばない人になる。四十年、何かを運んできた。運ばないわしを、息子に見せるのが嫌なんだ」
    グルミートが、初めて父親の方を向いた。そんな話は、一度も聞いたことがなかったらしい。
- else:
    # speaker: narrator
    ハルバンス「……向こうへ行ったら、わしは、何も運ばない人になる。四十年、何かを運んできた。運ばないわしを、息子に見せるのが嫌なんだ」
    グルミートが、初めて父親の方を向いた。
}
# speaker: narrator
グルミート「俺は……電話が鳴るのが怖い。夜中に鳴ったら、親父のことかもしれない。一万キロ先じゃ、何が起きても間に合わない」
グルミート「運ばなくていいんだ。生きててくれれば、それで」
食堂の窓の外を、トラックが一台、長い警笛を鳴らして通り過ぎた。ハルバンスは、その音が遠ざかるまで、黙って聞いていた。
ハルバンス「……冬は、だめだ。道が白い」
グルミート「じゃあ、夏は。夏なら、道は白くない。三か月だけ。うちのトラックの、助手席に乗ればいい」
ハルバンス「助手席は嫌だ」
グルミート「……じゃあ、洗車係」
ハルバンスが、鼻を鳴らした。それから、敷物の隙間を、自分から詰めた。
{ cond("flag gt_agra_sat_between"):
    # speaker: narrator
    隙間に座っていたこちらが、二人に挟まれて身動きできなくなった。彼女が、それを見て吹き出した。
}
# speaker: narrator
ハルバンス「夏だけだ。寒い国へは、夏だけ。……それと、向こうのチャイが薄かったら、すぐ帰る」
グルミート「濃いのを探しておく。ブランプトンには、パンジャーブの店がいくらでもある」
{ cond("date gt_delhi_date_bangla_sahib"):
    # speaker: narrator
    ハルバンス「世界地図の娘。カナダの地図のローティーを、いつか焼いてやる。……たぶん、また違う国になるがな」
}
# speaker: narrator
食堂を出て、古い貯水池のふちに立つ。四百年分の雨を受けとめてきた、深い石の底。道路の向こうでは、相変わらずトラックが走っている。
# speaker: heroine
「わたし、どっちの味方もしなかったね。……できなかった、の方が近いかな」
* [「それで、よかったと思う」 # option: it_was_right]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「そうかな。……本当は、何もできなかっただけかも」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。伝言を運ばなくてよかった。同じことでも、自分の口で言った方が、ちゃんと届くもんね」
    }
* [「正直、少し息子さんの味方だった」 # option: honest_side]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「そう？　……わたしは、お父さんの方だったかも。運ばない自分を見せたくないの、分かるから」
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,question
        「そうなの？　実は、わたしも。電話が鳴るのが怖いって、あれ、ずるいくらい本当だった」
    }
* [「来年の夏、ブランプトンまで洗車を手伝いに行こう」 # option: go_wash_trucks]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        「……今、ちょっと真面目な話してたんだけど」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        「ふふっ、洗車係の、助手の助手？　ハルバンスさん、絶対に口出ししてくるよ。ホースの持ち方から」
    }
-
# speaker: heroine
# emotion: smile
「隣に座ってるなら、なおさらだね。伝言じゃなくて、自分の口で」
-> END
