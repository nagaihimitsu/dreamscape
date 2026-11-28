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
# hint: ジャイプールの観光を一つ終えてから
# background: gt_bg_jaipur_panna_meena_kund
# speaker: narrator
アンベールの町はずれに、四角い穴が、地面に深く口を開けていた。
# speaker: narrator
パンナー・ミーナー・カ・クンド。雨水をためるための、十六世紀の階段井戸だ。
三方の壁を、細かな階段が、斜めに交差しながら埋めつくしている。
# speaker: narrator
上から見ると、模様のように整っていて、どの段がどこへつながっているのか、目で追うほど分からなくなる。
# speaker: heroine
# reaction: heroine,surprised_big,dizzy
# voice: gt_jaipur_date_panna_meena_kund_001
# photo: gt_album_j082 # photo_caption: 交差する階段で、目が回る
目が回る。全部、同じ階段に見える。どこから下りて、どこへ着くの、これ
# speaker: narrator
この井戸には、言い伝えがある。下りたときと同じ階段で、上ってくることはできない、と。
# speaker: heroine
# voice: gt_jaipur_date_panna_meena_kund_002
ほんとだ。目で一段ずつ追いかけても、さっきの段に戻れない。一回下りたら、違う道で帰るしかないんだ
# speaker: narrator
二人は、井戸のふちの日陰に腰を下ろした。
# speaker: narrator
昔、ここには村の女たちが水をくみに集まり、そのついでに、家の話や町の噂を交わしていたのだという。
# speaker: heroine
# emotion: teasing
# voice: gt_jaipur_date_panna_meena_kund_003
それって、文字どおりの井戸端会議だね。日本語の『井戸端会議』って、本当に井戸の端でしてたんだもんね
# speaker: heroine
# voice: gt_jaipur_date_panna_meena_kund_004
# photo: gt_album_j083 # photo_caption: 井戸のふちの日陰で、井戸端会議
ねえ、しよう。井戸端会議。この旅で会った人たちの噂話。悪口じゃなくて、勝手な想像だけ
* [「サミールさんから」 # option: gossip_samir]
    # profile: playful
    # memory: gt_jaipur_date_panna_meena_kund_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        # recall: gt_album_a002
        # voice: gt_jaipur_date_panna_meena_kund_005
        サミールさん……。思い出すと、また誤解が増えそう。白鳥の折り方、毎晩練習してると思う
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        # recall: gt_album_a002
        # voice: gt_jaipur_date_panna_meena_kund_006
        絶対、毎晩、白鳥の折り方を練習してる。新しいお客さんが来るたびに、首の角度を変えてると思う
    }
    # speaker: narrator
    アーグラの宿で、『ハネムーン・スペシャル』の白鳥を飾った支配人のことだ。
* [「カムラさんから」 # option: gossip_kamla]
    # profile: honest
    # memory: gt_jaipur_date_panna_meena_kund_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        # voice: gt_jaipur_date_panna_meena_kund_007
        カムラさんの噂は、ちょっと怖いな。……本人に聞こえてそう
    - else:
        # speaker: heroine
        # emotion: teasing
        # voice: gt_jaipur_date_panna_meena_kund_008
        ジャイプールに着いたその日に、もう誰かを値切ってると思う。運転手さんとか。三十秒で
    }
    # speaker: narrator
    デリーの路地で会ったカムラは、もう、ジャイプールの息子の家に越している。
* [「君から、どうぞ」 # option: gossip_you_first]
    # profile: attentive
    # memory: gt_jaipur_date_panna_meena_kund_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_date_panna_meena_kund_009
        わたしから？　……言い出したの、わたしだもんね。えっと
    - else:
        # speaker: heroine
        # voice: gt_jaipur_date_panna_meena_kund_010
        わたしから？　じゃあ……
    }
    # speaker: heroine
    # voice: gt_jaipur_date_panna_meena_kund_033
    アマンさん。毎晩、花嫁さんに言う言葉を、鏡の前で三十回は練習してる
    # speaker: heroine
    # voice: gt_jaipur_date_panna_meena_kund_034
    カムラさんに『毎日言葉にしなさい』って言われたから
    # speaker: narrator
    カムラの孫で、二人を結婚式に招いてくれた花婿のことだ。
-
# speaker: heroine
# voice: gt_jaipur_date_panna_meena_kund_012
それから……
{
- cond("flag gt_delhi_suresh_encouraged"):
    # speaker: heroine
    # emotion: teasing
    # voice: gt_jaipur_date_panna_meena_kund_013
    スレーシュさんとミーナさん。もう、笑う会の外でも会ってるよね。絶対。薔薇、毎回違う色にしてる
    # speaker: narrator
    フマユーン廟で会った元調査官と、笑う会で隣にいた、彼の大学の同級生だ。
- cond("episode gt_delhi_main_humayun_tomb"):
    # speaker: heroine
    # emotion: teasing
    # voice: gt_jaipur_date_panna_meena_kund_014
    スレーシュさん。今ごろ、胸ポケットの薔薇を、新聞で隠しながら歩いてる
    # speaker: narrator
    フマユーン廟で、姪とその同級生を問い詰めていた元調査官だ。
}
{ cond("episode gt_agra_main_taj_mahal"):
    # speaker: heroine
    # voice: gt_jaipur_date_panna_meena_kund_031
    ニキルさんは、結婚式の段取りも三十枚のスライドにしてる
    # speaker: heroine
    # voice: gt_jaipur_date_panna_meena_kund_032
    それで、タンヴィさんに『次は、場所から一緒に決めて』って言われてる
    # speaker: narrator
    タージ・マハルのベンチで、指輪を出しそびれた二人。
}
{
- cond("date gt_agra_date_guru_ka_taal"):
    # speaker: heroine
    # voice: gt_jaipur_date_panna_meena_kund_016
    ハルバンスさんは、カナダで絶対、洗車係じゃ終わらない。三日目には、息子さんの会社の配車表を書き直してると思う
    # speaker: narrator
    グル・カ・タールの食堂で会った、四十年トラックを走らせてきた人だ。
- cond("date gt_agra_date_mehtab_bagh"):
    # speaker: heroine
    # voice: gt_jaipur_date_panna_meena_kund_017
    ソニアさんは、十年後に州の代表。写真代も、ずっと高くなってるね
    # speaker: narrator
    メヘターブ・バーグの外の空き地の、十二歳のキャプテン。
- else:
    # speaker: heroine
    # voice: gt_jaipur_date_panna_meena_kund_018
    道を教えてくれた人たち。全員、違う方向を指さした人たち。今ごろ、次の旅行者にも、自信満々で違う方向を教えてる
}
# speaker: narrator
# se: pigeon_flutter
# photo: gt_album_j084 # photo_caption: 斜めの階段を伝って、鳩が一羽
井戸の底の方から、鳩が一羽、斜めの階段を伝って飛び上がっていった。
# speaker: heroine
# emotion: teasing
# voice: gt_jaipur_date_panna_meena_kund_019
じゃあ、最後の噂。わたしたちのことは、みんな、何て言ってると思う？
* [「サミールさんの帳面には、また何か書いてある」 # option: rumor_newlyweds]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_jaipur_date_panna_meena_kund_020
        その話は、もういい……。ここまで追いかけてこないで
    - else:
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        # voice: gt_jaipur_date_panna_meena_kund_021
        あれは、もう諦めた。訂正したら、訂正した分だけ、話が増える気がする
    }
* [「カムラさんは、『いい男は黙ってる』って言ってた」 # option: rumor_kamla_words]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_date_panna_meena_kund_022
        ……それ、褒めてたのかな。わたし、ずっと分からないままなんだけど
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        # voice: gt_jaipur_date_panna_meena_kund_023
        あれ、褒めてたんだよ、たぶん。カムラさんの褒め方、分かりにくいから
    }
* [「みんな、もう二人で一組だと思ってる」 # option: rumor_a_pair]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        # voice: gt_jaipur_date_panna_meena_kund_024
        そ、そう見えてるのかな。噂って、勝手に先に進むから、困る
    - else:
        {
        - cond("couple"):
            # speaker: heroine
            # reaction: heroine,shy,heart
            # voice: gt_jaipur_date_panna_meena_kund_025
            # photo: gt_album_j085 # photo_caption: 「一組だもん」
            ……一組だもん。噂じゃなくて、本当のこと
        - cond("stage >= 3"):
            # speaker: heroine
            # reaction: heroine,shy_deep,blush
            # voice: gt_jaipur_date_panna_meena_kund_026
            ……ふふ。わたしも、ちょっと、そう思ってた。噂のほうが、先を歩いてるね
        - else:
            # speaker: heroine
            # reaction: heroine,surprised,blush
            # voice: gt_jaipur_date_panna_meena_kund_027
            そう見えてるのかな。一緒にいる時間、長いもんね。噂って、早いなあ
        }
    }
-
# speaker: heroine
# voice: gt_jaipur_date_panna_meena_kund_028
噂って、外から見た本当、なのかもね。わたしたちが言葉にする前に、まわりの方が、先に言葉にしてる
# speaker: narrator
彼女は、交差する階段をもう一度見下ろした。下りた道とは違う道でしか、上ってこられない井戸。
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_date_panna_meena_kund_029
# photo: gt_album_j086 # photo_caption: 井戸の底に置いていこう
ここで聞いた噂話も、全部、井戸の底に置いていこう。わたしたちの分だけ、持って帰って
-> END
