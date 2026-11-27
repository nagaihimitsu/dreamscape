INCLUDE modules.ink
-> DONE

// ジョーハリー・バザールのデート（噛み合いの選択は2回）。
// デリーの赤い城（チャッタ・チョーク）で、彼女は腕輪の棚に手を伸ばしたところで生徒たちの波に遮られ、買えずじまいだった。その続き。
// 腕輪は必ず一組買う（選択のない買い物）。代金と品物は、頭の # on_done: で、デートを終えたときに当たる。

// 【3】
=== gt_jaipur_date_johari_bazaar ===
# scene: date
# title: 欲しいものは、欲しいと
# when: episodes jaipur >= 1
# hint: ジャイプールの観光を一つ終えてから
# on_done: money -500
# on_done: item gt_jaipur_lac_bangles
# background: gt_bg_jaipur_johari_bazaar
# speaker: narrator
# term: gt_term_kundan
# term: gt_term_meenakari
ジョーハリー・バザールは、宝石商の通りだった。桃色のアーケードの下に、金と宝石の店が、ガラスの扉を並べている。
# speaker: heroine
# reaction: heroine,exasperated,sweat
# voice: gt_jaipur_date_johari_bazaar_001
# photo: gt_album_j065 # photo_caption: まぶしすぎる宝石の通り
どのお店も、まぶしすぎる……。値札、見るのも怖い
# speaker: narrator
# term: gt_term_lac_bangles
アーケードの端に、一軒だけ、まるで色の洪水のような店があった。
# speaker: narrator
天井まで積み上げられた、ラックの腕輪。赤、緑、黄、桃色。
# speaker: narrator
小さなガラスや石がはめこまれて、裸電球の下で光っている。
# photo: gt_album_j066 # photo_caption: 色の洪水の腕輪の店 # photo_with: gt_nasreen
店番の女性が、顔を上げた。
# speaker: gt_nasreen
# cutin: name
いらっしゃい。ナスリーンよ
# speaker: gt_nasreen
腕輪は、夫と義理の弟が、近くの職人の路地で、小さな炉に向かって作ってるの。売るのは、女の仕事
{ cond("battle gt_delhi_main_red_fort_battle"):
    # speaker: narrator
    彼女の足が、店の前で止まった。棚に伸ばしかけた手が、途中で止まる。
    # speaker: heroine
    # voice: gt_jaipur_date_johari_bazaar_002
    デリーの、赤い城の商店街。腕輪の棚に手を伸ばしたとき、生徒さんたちの波が来たの、覚えてる？
    # speaker: heroine
    # emotion: worried
    # voice: gt_jaipur_date_johari_bazaar_024
    あのあと、結局、言いそびれちゃった。欲しいって
    # speaker: heroine
    # emotion: worried
    # voice: gt_jaipur_date_johari_bazaar_025
    ……カムラさんに、欲しいものは欲しいと言いなさいって、言われたばっかりだったのに
}
# speaker: narrator
この町の結婚式に呼ばれた、と{heroine_name}が話すと、ナスリーンの目が光った。
# speaker: gt_nasreen
# voice: gt_jaipur_date_johari_bazaar_nasreen_002
結婚式？　あなた、花嫁さん？
# speaker: heroine
# reaction: heroine,surprised_big,blush
# voice: gt_jaipur_date_johari_bazaar_023
# photo: gt_album_j067 # photo_caption: 「花嫁さん？」「違います！」 # photo_with: gt_nasreen
ち、違います！　ただの招待客です！
{ cond("flag gt_agra_said_for_now"):
    # speaker: heroine
    # reaction: heroine,teasing,question
    # voice: gt_jaipur_date_johari_bazaar_005
    そこの『今のところは』の人。今、何か言おうとしたでしょ
}
# speaker: gt_nasreen
# voice: gt_jaipur_date_johari_bazaar_nasreen_003
招待客なら、なおさら。結婚式の腕輪は、女の人みんなの楽しみよ
# speaker: narrator
ナスリーンは、腕輪をはめながら話してくれた。
# speaker: gt_nasreen
# term: gt_term_parvati
# term: gt_term_shiva
昔ね、女神パールヴァティーがシヴァと結婚するとき、腕輪職人たちがラックの腕輪を作ったの
# speaker: gt_nasreen
それからずっと、花嫁や結婚した女の人は、ラックの腕輪で手首を飾るのよ
# speaker: gt_nasreen
# voice: gt_jaipur_date_johari_bazaar_nasreen_005
……言い伝えだけどね
# speaker: narrator
腕輪を通すとき、ナスリーンは彼女の手を握り、指の付け根をぎゅっと寄せた。手を細くして、その上を滑らせるのだ。
# speaker: heroine
# reaction: heroine,surprised,exclamation
# se: bangles_clink
# voice: gt_jaipur_date_johari_bazaar_006
# photo: gt_album_j068 # photo_caption: 手首で、からんって鳴った # photo_with: gt_nasreen
い、いたた……！　あ、入った。手首で、からんって鳴った
* [「赤が似合う」 # option: red_suits_you]
    # profile: bold
    # memory: gt_jaipur_date_johari_bazaar_memory
    { romance_result == "negative":
        # speaker: gt_nasreen
        # voice: gt_jaipur_date_johari_bazaar_nasreen_006
        赤は、花嫁さんがよく選ぶ色ね
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_jaipur_date_johari_bazaar_007
        ……今それ、ちょっと困る。ほら、また花嫁さんって言われた
    - else:
        # speaker: gt_nasreen
        # voice: gt_jaipur_date_johari_bazaar_nasreen_007
        赤は、花嫁さんがよく選ぶ色ね
        # speaker: heroine
        # reaction: heroine,teasing,blush
        # voice: gt_jaipur_date_johari_bazaar_008
        それ、分かってて言ったでしょ。……でも、似合うって言われたら、ちょっと迷う
    }
* [「君が選んで」 # option: you_choose]
    # profile: attentive
    # memory: gt_jaipur_date_johari_bazaar_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_date_johari_bazaar_009
        ……迷ってるの、見て分からない？　一緒に見てほしかったのに
        # speaker: narrator
        # photo: gt_album_j069 # photo_caption: 夕方のジャイプールの色
        それでも彼女は、棚の前で長いこと迷ってから、桃色と橙色がまだらに混ざった一組を、自分で指さした。
    - else:
        # speaker: narrator
        # photo: gt_album_j069 # photo_caption: 夕方のジャイプールの色
        彼女は棚の前で、長いこと迷っていた。そして、桃色と橙色がまだらに混ざった一組を、自分で指さした。
        # speaker: heroine
        # emotion: smile
        # voice: gt_jaipur_date_johari_bazaar_010
        これ。夕方のジャイプールの色。この町に着いた日、窓から見た色だから
    }
// 赤い城の回の後だけ出す選択肢。# requires: を満たさないと、選択肢は隠れる（灰色にならない。2026-11-09 に決まった仕組み）
* [「赤い城で買えなかった分、今日は二人で選ぼう」 # option: red_fort_promise]
    # requires: battle gt_delhi_main_red_fort_battle
    # profile: honest
    # memory: gt_jaipur_date_johari_bazaar_memory
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy,sweat
        # voice: gt_jaipur_date_johari_bazaar_011
        ……そう言われると、ちょっと恥ずかしい
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,blush
        # voice: gt_jaipur_date_johari_bazaar_012
        言ってくれるんだ。あのとき、わたし、何にも言わなかったのに
        # speaker: heroine
        # emotion: smile
        # voice: gt_jaipur_date_johari_bazaar_013
        じゃあ、一緒に選んで。でも、最後に決めるのは、わたしね
    }
-
# speaker: narrator
ナスリーンが値段を言うと、彼女は息を吸い、ナスリーンの目をまっすぐ見た。値切るのは、生まれて初めてらしい。
# speaker: heroine
# voice: gt_jaipur_date_johari_bazaar_014
欲しいです。すごく、欲しいです。でも、もう少しだけ、安くなりませんか
# speaker: gt_nasreen
# voice: gt_jaipur_date_johari_bazaar_nasreen_008
あはは！　欲しい、を先に言ったら、値切れないのよ
# speaker: heroine
# reaction: heroine,exasperated,gloom
# voice: gt_jaipur_date_johari_bazaar_015
# photo: gt_album_j070 # photo_caption: 欲しい、を先に言ったら # photo_with: gt_nasreen
……カムラさんの教え、値切りには向いてなかった
* [黙って、彼女の交渉を見守る # option: watch_her_bargain]
    # profile: attentive
    { romance_result == "negative":
        # speaker: narrator
        # emotion: worried
        彼女は何度か、助けを求めるようにこちらを振り返った。
        # speaker: narrator
        こちらが黙っていると、小さくため息をついて、ナスリーンに向き直った。
        # speaker: gt_nasreen
        # voice: gt_jaipur_date_johari_bazaar_nasreen_009
        正直な人には、少しだけね
    - else:
        # speaker: gt_nasreen
        # voice: gt_jaipur_date_johari_bazaar_nasreen_010
        正直な人には、少しだけまけてあげる。今日だけよ
        # speaker: heroine
        # reaction: heroine,happy,sparkle
        # voice: gt_jaipur_date_johari_bazaar_016
        値切れた！　正直に言ったのに、値切れた
    }
* [横から口を出して、値切りに加わる # option: join_bargain]
    # profile: bold
    { romance_result == "negative":
        # speaker: gt_nasreen
        # voice: gt_jaipur_date_johari_bazaar_nasreen_011
        あら、旦那さんが出てきた
        # speaker: heroine
        # emotion: exasperated
        # voice: gt_jaipur_date_johari_bazaar_017
        わたしの交渉だったのに……。それに、旦那さんじゃないです
    - else:
        # speaker: gt_nasreen
        # voice: gt_jaipur_date_johari_bazaar_nasreen_012
        あら、旦那さんが出てきた。……いいわ、旦那さんに免じて、少しだけ
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        # voice: gt_jaipur_date_johari_bazaar_018
        旦那さんじゃないです……！　この旅で、もう何回目……
    }
* [「欲しいなら、値切らなくてもいいよ」 # option: no_need_to_haggle]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_date_johari_bazaar_019
        ……値切るのも、ちょっと楽しみだったのにな
    - else:
        # speaker: heroine
        # voice: gt_jaipur_date_johari_bazaar_020
        ううん。値切るのも、買い物のうちだから。でも、ありがとう
    }
    # speaker: narrator
    ナスリーンは笑って、細い腕輪を一本、おまけに足した。
    # speaker: gt_nasreen
    # voice: gt_jaipur_date_johari_bazaar_nasreen_013
    旦那さんの分よ
    # speaker: narrator
    # photo: gt_album_j071 # photo_caption: 旦那さんの分 # photo_with: gt_nasreen
    そう言って、こちらの手首にはめてくれた。
-
# speaker: narrator
# item_show: gt_jaipur_lac_bangles
代金を払うと、ナスリーンは腕輪を新聞紙で一組ずつ包み、紙袋に入れてくれた。
# speaker: gt_nasreen
# voice: gt_jaipur_date_johari_bazaar_nasreen_014
割れやすいから、はめっぱなしにしない方がいいわ。はめるのは、特別な日だけ
# speaker: narrator
# se: bangles_clink
# photo: gt_album_j072 # photo_caption: 一歩ごとに、からん
アーケードの下を歩くと、彼女の手首で、試しにはめたままの一本が小さく鳴った。一歩ごとに、からん、と。
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_date_johari_bazaar_021
音がする。歩くたびに。自分で選んで、自分で欲しいって言ったものの音
# speaker: heroine
# voice: gt_jaipur_date_johari_bazaar_022
次は、値切る前に、欲しいって言わないようにする。ううん、やっぱり言う。言ってから、値切る
-> END
