INCLUDE modules.ink
-> DONE

// パンナー・ミーナー・カ・クンドのデート（二人きり。噛み合いの選択は2回）。
// 旅で会った人たちの噂話をする。噂の中身は、遊んだデートや回の記録で変わる（全部は出さず、数件に絞る）。
// 階段を下りられるかどうかは確かめられていないので、二人は井戸のふちに座るだけにする。

// 【3】
=== gt_jaipur_date_panna_meena_kund ===
# scene: date
# title: 文字どおりの井戸端会議
# when: episodes jaipur >= 1
# background: gt_bg_jaipur_panna_meena_kund
# speaker: narrator
アンベールの町はずれに、四角い穴が、地面に深く口を開けていた。パンナー・ミーナー・カ・クンド。雨水をためるための、十六世紀の階段井戸だ。
三方の壁を、細かな階段が、斜めに交差しながら埋めつくしている。上から見ると、模様のように整っていて、どの段がどこへつながっているのか、目で追うほど分からなくなる。
# speaker: heroine
# reaction: heroine,surprised_big,dizzy
目が回る。全部、同じ階段に見える。どこから下りて、どこへ着くの、これ
# speaker: narrator
この井戸には、言い伝えがある。下りたときと同じ階段で、上ってくることはできない、と。
# speaker: heroine
ほんとだ。目で一段ずつ追いかけても、さっきの段に戻れない。一回下りたら、違う道で帰るしかないんだ
# speaker: narrator
二人は、井戸のふちの日陰に腰を下ろした。昔、ここには村の女たちが水をくみに集まり、そのついでに、家の話や町の噂を交わしていたのだという。
# speaker: heroine
# reaction: heroine,teasing,music
それって、文字どおりの井戸端会議だね。日本語の『井戸端会議』って、本当に井戸の端でしてたんだもんね
# speaker: heroine
ねえ、しよう。井戸端会議。この旅で会った人たちの噂話。悪口じゃなくて、勝手な想像だけ
* [「サミールさんから」 # option: gossip_samir]
    # profile: playful
    # memory: gt_jaipur_date_panna_meena_kund_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        # recall: gt_album_a01
        サミールさん……。思い出すと、また誤解が増えそう。白鳥の折り方、毎晩練習してると思う
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # recall: gt_album_a01
        絶対、毎晩、白鳥の折り方を練習してる。新しいお客さんが来るたびに、首の角度を変えてると思う
    }
* [「カムラさんから」 # option: gossip_kamla]
    # profile: honest
    # memory: gt_jaipur_date_panna_meena_kund_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        カムラさんの噂は、ちょっと怖いな。……本人に聞こえてそう
    - else:
        # speaker: heroine
        # emotion: teasing
        ジャイプールに着いたその日に、もう誰かを値切ってると思う。運転手さんとか。三十秒で
    }
* [「君から、どうぞ」 # option: gossip_you_first]
    # profile: attentive
    # memory: gt_jaipur_date_panna_meena_kund_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        わたしから？　……言い出したの、わたしだもんね。えっと
    - else:
        # speaker: heroine
        わたしから？　じゃあ……
    }
    # speaker: heroine
    アマンさん。結婚式の前の晩、花嫁さんに言う言葉を、鏡の前で三十回は練習してる。カムラさんに『毎日言葉にしなさい』って言われたから
-
# speaker: heroine
それから……
{
- cond("flag gt_delhi_suresh_encouraged"):
    # speaker: heroine
    # emotion: teasing
    スレーシュさんとミーナさん。もう、笑う会の外でも会ってるよね。絶対。薔薇、毎回違う色にしてる
- cond("episode gt_delhi_main_humayun_tomb"):
    # speaker: heroine
    # emotion: teasing
    スレーシュさん。今ごろ、胸ポケットの薔薇を、新聞で隠しながら歩いてる
}
{ cond("episode gt_agra_main_taj_mahal"):
    # speaker: heroine
    ニキルさんは、結婚式の段取りも三十枚のスライドにしてる。それで、タンヴィさんに『次は、場所から一緒に決めて』って言われてる
}
{
- cond("date gt_agra_date_guru_ka_taal"):
    # speaker: heroine
    ハルバンスさんは、カナダで絶対、洗車係じゃ終わらない。三日目には、息子さんの会社の配車表を書き直してると思う
- cond("date gt_agra_date_mehtab_bagh"):
    # speaker: heroine
    ソニアさんは、十年後に州の代表。写真代も、ずっと高くなってるね
- else:
    # speaker: heroine
    道を教えてくれた人たち。全員、違う方向を指さした人たち。今ごろ、次の旅行者にも、自信満々で違う方向を教えてる
}
# speaker: narrator
# se: pigeon_flutter
井戸の底の方から、鳩が一羽、斜めの階段を伝って飛び上がっていった。
# speaker: heroine
# emotion: teasing
じゃあ、最後の噂。わたしたちのことは、みんな、何て言ってると思う？
* [「サミールさんは、まだ新婚だと思ってる」 # option: rumor_newlyweds]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        その話は、もういい……。ここまで追いかけてこないで
    - else:
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        あれは、もう諦めた。訂正したら、訂正した分だけ、話が増える気がする
    }
* [「カムラさんは、『いい男は黙ってる』って言ってた」 # option: rumor_kamla_words]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        ……それ、褒めてたのかな。わたし、ずっと分からないままなんだけど
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        あれ、褒めてたんだよ、たぶん。カムラさんの褒め方、分かりにくいから
    }
* [「みんな、もう二人で一組だと思ってる」 # option: rumor_a_pair]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        そ、そう見えてるのかな。噂って、勝手に先に進むから、困る
    - else:
        {
        - cond("couple"):
            # speaker: heroine
            # reaction: heroine,shy,heart
            ……一組だもん。噂じゃなくて、本当のこと
        - cond("stage >= 3"):
            # speaker: heroine
            # reaction: heroine,shy_deep,blush
            ……ふふ。わたしも、ちょっと、そう思ってた。噂のほうが、先を歩いてるね
        - else:
            # speaker: heroine
            # reaction: heroine,surprised,blush
            そう見えてるのかな。一緒にいる時間、長いもんね。噂って、早いなあ
        }
    }
-
# speaker: heroine
噂って、外から見た本当、なのかもね。わたしたちが言葉にする前に、まわりの方が、先に言葉にしてる
# speaker: narrator
彼女は、交差する階段をもう一度見下ろした。下りた道とは違う道でしか、上ってこられない井戸。
# speaker: heroine
# emotion: smile
ここで聞いた噂話も、全部、井戸の底に置いていこう。わたしたちの分だけ、持って帰って
-> END
