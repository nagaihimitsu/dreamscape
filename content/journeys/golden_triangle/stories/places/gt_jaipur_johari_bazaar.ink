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
ジョーハリー・バザールは、宝石商の通りだった。桃色のアーケードの下に、金と宝石の店が、ガラスの扉を並べている。
# speaker: heroine
# reaction: heroine,exasperated,sweat
どのお店も、まぶしすぎる……。値札、見るのも怖い
# speaker: narrator
# term: gt_term_lac_bangles
アーケードの端に、一軒だけ、まるで色の洪水のような店があった。天井まで積み上げられた、ラックの腕輪。赤、緑、黄、桃色。小さなガラスや石がはめこまれて、裸電球の下で光っている。
店番の女性が、顔を上げた。
# speaker: gt_nasreen
# cutin: name
いらっしゃい。ナスリーンよ。腕輪は、夫と義理の弟が、近くの職人の路地で、小さな炉に向かって作ってるの。売るのは、女の仕事
{ cond("battle gt_delhi_main_red_fort_battle"):
    # speaker: narrator
    彼女の足が、店の前で止まった。棚に伸ばしかけた手が、途中で止まる。
    # speaker: heroine
    デリーの、赤い城の商店街。腕輪の棚に手を伸ばしたとき、生徒さんたちの波が来たの、覚えてる？
    # speaker: heroine
    # emotion: worried
    あのあと、結局、言いそびれちゃった。欲しいって。……カムラさんに、欲しいものは欲しいと言いなさいって、言われたばっかりだったのに
}
# speaker: gt_nasreen
結婚式？　あなた、花嫁さん？
# speaker: heroine
# reaction: heroine,surprised_big,blush
ち、違います！　招待されてるだけです！
{ cond("flag gt_agra_said_for_now"):
    # speaker: heroine
    # reaction: heroine,teasing,question
    そこの『今のところは』の人。今、何か言おうとしたでしょ
}
# speaker: gt_nasreen
招待客なら、なおさら。結婚式の腕輪は、女の人みんなの楽しみよ
# speaker: narrator
ナスリーンは、腕輪をはめながら話してくれた。
# speaker: gt_nasreen
昔ね、女神パールヴァティーがシヴァと結婚するとき、腕輪職人たちがラックの腕輪を作ったの。それからずっと、花嫁や結婚した女の人は、ラックの腕輪で手首を飾るのよ
# speaker: gt_nasreen
……言い伝えだけどね
# speaker: narrator
# item_show: gt_jaipur_lac_bangles
腕輪を通すとき、ナスリーンは彼女の手を握り、指の付け根をぎゅっと寄せた。手を細くして、その上を滑らせるのだ。
# speaker: heroine
# reaction: heroine,surprised,exclamation
# se: bangles_clink
い、いたた……！　あ、入った。手首で、からんって鳴った
* [「赤が似合う」 # option: red_suits_you]
    # profile: bold
    # memory: gt_jaipur_date_johari_bazaar_memory
    { romance_result == "negative":
        # speaker: gt_nasreen
        赤は、花嫁さんがよく選ぶ色ね
        # speaker: heroine
        # emotion: exasperated
        ……今それ、ちょっと困る。ほら、また花嫁さんって言われた
    - else:
        # speaker: gt_nasreen
        赤は、花嫁さんがよく選ぶ色ね
        # speaker: heroine
        # reaction: heroine,teasing,blush
        それ、分かってて言ったでしょ。……でも、似合うって言われたら、ちょっと迷う
    }
* [「君が選んで」 # option: you_choose]
    # profile: attentive
    # memory: gt_jaipur_date_johari_bazaar_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        ……迷ってるの、見て分からない？　一緒に見てほしかったのに
        # speaker: narrator
        それでも彼女は、棚の前で長いこと迷ってから、桃色と橙色がまだらに混ざった一組を、自分で指さした。
    - else:
        # speaker: narrator
        彼女は棚の前で、長いこと迷っていた。そして、桃色と橙色がまだらに混ざった一組を、自分で指さした。
        # speaker: heroine
        # emotion: smile
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
        ……そう言われると、ちょっと恥ずかしい
    - else:
        # speaker: heroine
        # reaction: heroine,surprised,blush
        言ってくれるんだ。あのとき、わたし、何にも言わなかったのに
        # speaker: heroine
        # emotion: smile
        じゃあ、一緒に選んで。でも、最後に決めるのは、わたしね
    }
-
# speaker: narrator
ナスリーンが値段を言うと、彼女は息を吸い、ナスリーンの目をまっすぐ見た。値切るのは、生まれて初めてらしい。
# speaker: heroine
欲しいです。すごく、欲しいです。でも、もう少しだけ、安くなりませんか
# speaker: gt_nasreen
あはは！　欲しい、を先に言ったら、値切れないのよ
# speaker: heroine
# reaction: heroine,exasperated,gloom
……カムラさんの教え、値切りには向いてなかった
* [黙って、彼女の交渉を見守る # option: watch_her_bargain]
    # profile: attentive
    { romance_result == "negative":
        # speaker: narrator
        彼女は何度か、助けを求めるようにこちらを振り返った。こちらが黙っていると、小さくため息をついて、ナスリーンに向き直った。
        # speaker: gt_nasreen
        正直な人には、少しだけね
    - else:
        # speaker: gt_nasreen
        正直な人には、少しだけまけてあげる。今日だけよ
        # speaker: heroine
        # reaction: heroine,happy,sparkle
        値切れた！　正直に言ったのに、値切れた
    }
* [横から口を出して、値切りに加わる # option: join_bargain]
    # profile: bold
    { romance_result == "negative":
        # speaker: gt_nasreen
        あら、旦那さんが出てきた
        # speaker: heroine
        # emotion: exasperated
        わたしの交渉だったのに……。それに、旦那さんじゃないです
    - else:
        # speaker: gt_nasreen
        あら、旦那さんが出てきた。……いいわ、旦那さんに免じて、少しだけ
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        旦那さんじゃないです……！　この旅で、もう何回目……
    }
* [「欲しいなら、値切らなくてもいいよ」 # option: no_need_to_haggle]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        ……値切るのも、ちょっと楽しみだったのにな
    - else:
        # speaker: heroine
        ううん。値切るのも、買い物のうちだから。でも、ありがとう
    }
    # speaker: narrator
    ナスリーンは笑って、細い腕輪を一本、おまけに足した。
    # speaker: gt_nasreen
    旦那さんの分よ
    # speaker: narrator
    そう言って、こちらの手首にはめてくれた。
-
# speaker: narrator
ナスリーンは、腕輪を新聞紙で一組ずつ包み、紙袋に入れてくれた。
# speaker: gt_nasreen
割れやすいから、結婚式の日まで、はめっぱなしにしない方がいいわ
# speaker: narrator
# se: bangles_clink
アーケードの下を歩くと、彼女の手首で、試しにはめたままの一本が小さく鳴った。一歩ごとに、からん、と。
# speaker: heroine
# emotion: smile
音がする。歩くたびに。自分で選んで、自分で欲しいって言ったものの音
# speaker: heroine
次は、値切る前に、欲しいって言わないようにする。ううん、やっぱり言う。言ってから、値切る
-> END
