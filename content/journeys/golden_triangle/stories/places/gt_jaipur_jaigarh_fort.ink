INCLUDE modules.ink
-> DONE

// ジャイガル砦のデート（噛み合いの選択は2回）。
// 宝の地図と、祖父が1976年の宝探しで水を運んだという話は、人物の作り話。砦の事実と分けて書く。
// 地図の値段は手伝いの knot のミニゲーム（raju_haggle）で決める（買わなくても話は進む）。二人分のチャイは頭の # on_done: で払う。

// 【3】
=== gt_jaipur_date_jaigarh_fort ===
# scene: date
# title: 最後のバツ印
# when: episodes jaipur >= 1
# hint: ジャイプールの観光を一つ終えてから
# on_done: money -20
# background: gt_bg_jaipur_jaigarh_fort
# speaker: narrator
ジャイガル砦は、アンベール城の真上の尾根にあった。アンベールを守るために築かれた砦で、城壁は山の稜線に沿って、どこまでも続いている。
門をくぐってすぐ、十歳くらいの男の子が、二人の前に立ちはだかった。手には、ノートを破った紙。鉛筆で描いた地図に、赤いペンで、大きなバツ印がついている。
# speaker: gt_jaipur_jaigarh_boy
宝の地図、買わない？　この砦には、王さまの宝が隠されてる。本当だよ。昔、国が、何か月も掘って探したんだから
# speaker: gt_raju
# cutin: name
ぼく、ラージュー。この地図、全部ぼくが描いたんだ
# speaker: heroine
# reaction: heroine,surprised,sparkle
宝の地図！　ねえ、これ、すごく欲しいかも。子どものとき、こういうの、自分で描いてた
-> gt_jaipur_jaigarh_fort_map ->
# speaker: narrator
最初の印は、巨大な大砲だった。屋根の下に、車輪のついた砲身が横たわっている。ジャイヴァーナ。1720年にこの砦で造られ、当時、車輪のついた大砲としては世界最大だったという。
# speaker: gt_raju
宝を守る大砲。一回撃ったら、玉が三十五キロ先まで飛んだんだ。落ちたところが、池になった
# speaker: narrator
試し撃ちは一度きりで、火薬は百キロ使ったと伝えられている。三十五キロ飛んだという話も残っているが、どこまでが本当かは分からない。
* [ラージューの話を、最後まで聞く # option: hear_him_out]
    # profile: attentive
    # memory: gt_jaipur_date_jaigarh_fort_memory
    { romance_result == "negative":
        # speaker: narrator
        ラージューの話は、池から魚の話へ、魚から王さまの釣りの話へと、どこまでも続いた。彼女が、こっそりあくびをかみ殺した。
    - else:
        # speaker: narrator
        ラージューは、聞いてくれる客がうれしいらしい。池の大きさを、両腕をいっぱいに広げて見せた。
        # speaker: heroine
        # emotion: teasing
        どこまで本当で、どこから宝の地図なのか、分からなくなってきた。でも、それが楽しいね
    }
* [「三十五キロは、本当かな」と首をかしげる # option: doubt_the_story]
    # profile: honest
    # memory: gt_jaipur_date_jaigarh_fort_memory
    { romance_result == "negative":
        # speaker: gt_raju
        ……本当だもん
        # speaker: narrator
        ラージューが口をとがらせると、彼女がこちらの袖を引いた。
        # speaker: heroine
        宝探しの最中に、それは言わない約束
    - else:
        # speaker: gt_raju
        池になったのは、ちょっと盛った。でも、大砲は本物
        # speaker: heroine
        # reaction: heroine,teasing,music
        正直な案内人。盛ったところも、ちゃんと自分で言うんだね
    }
* [「落ちたところの池、見に行こう」と話に乗る # option: play_along]
    # profile: playful
    # memory: gt_jaipur_date_jaigarh_fort_memory
    { romance_result == "negative":
        # speaker: gt_raju
        え、それは……今日は遠いから、無理
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        案内人を困らせないの
    - else:
        # speaker: gt_raju
        それは、次の地図。別料金
        # speaker: heroine
        # reaction: heroine,teasing_big,music
        ふふっ、商売上手！　続きは次の地図、だって
    }
-
# speaker: narrator
二つ目の印は、石の蓋のついた、地下の貯水槽だった。砦には大きな貯水槽が三つあり、いちばん大きなものは、六百万ガロンもの水をためられるという。
# speaker: gt_raju
宝は、この水の底。……って、みんな言ってた。だから、昔、国が本当に掘ったんだ
# speaker: narrator
1976年、この砦では、実際に大がかりな宝探しが行われた。宝が見つかったという記録はない。
{ cond("flag gt_jaipur_raju_guided"):
    # speaker: gt_raju
    三つ目の印は、アンベールへ抜ける秘密の通路。でも、今日は時間がないから、飛ばす。……最後の印が、いちばん大事だから
- else:
    # speaker: narrator
    地図の三つ目の印は、アンベールへ下りる通路を指していた。砦とアンベール城は、地下の通路でつながっているという。今日は、入口をのぞくだけにした。
}
# speaker: narrator
最後のバツ印は、門のすぐ外だった。古い木の台の上に、湯気の立つ鍋。小さな茶屋で、白いひげの老人が、チャイを煮ていた。
# speaker: gt_raju
宝は、ここ。うちのナーナーのチャイ。……ジャイプールでいちばんうまいんだ。本当だよ
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
やられた！　ふふっ、最後の印、お茶屋さんだった！
# speaker: narrator
老人は孫の頭を軽く叩き、素焼きのカップを二つ並べた。
# speaker: gt_jaipur_jaigarh_old_man
わしは子どものころ、あの宝探しの兵隊たちに、水を運んでおった
# speaker: narrator
本人の話では、だが。
# speaker: gt_jaipur_jaigarh_old_man
何か月も掘って、出てきたのは、コウモリと、古い靴が片方だけ。……でも、あの年だけは、この砦が、国でいちばん有名だった
* [「本当に、宝の味がする」 # option: treasure_taste]
    # profile: playful
    { romance_result == "negative":
        # speaker: gt_jaipur_jaigarh_old_man
        宝の味は、もっと甘い。砂糖が足りなかったか
        # speaker: narrator
        老人が本気で砂糖を足そうとしたので、彼女があわてて止めた。
    - else:
        # speaker: heroine
        # emotion: smile
        甘い。濃い。ほんとだ。宝物の味がする
    }
* [ラージューの分も頼む # option: chai_for_raju]
    # profile: attentive
    # money: -10
    { romance_result == "negative":
        # speaker: gt_raju
        仕事中は飲まない。……でも、もらう
        # speaker: narrator
        ラージューは三秒で飲み干し、次の客を探しに門の方へ走っていった。
    - else:
        # speaker: gt_raju
        やった。……案内料に、チャイもつけてくれる客は、初めて
    }
* [「その頃の話、もっと聞かせてください」と頼む # option: more_stories]
    # profile: honest
    { romance_result == "negative":
        # speaker: gt_jaipur_jaigarh_old_man
        話は、チャイ一杯につき一つだ
        # speaker: narrator
        老人はそれきり、鍋をかき混ぜる手を止めなかった。
    - else:
        # speaker: gt_jaipur_jaigarh_old_man
        話を聞きたがる人は、宝を見つける人だ。……わしの昔の話は、いつも、そういう人にしかしない
        # speaker: heroine
        # reaction: heroine,teasing,music
        宝を見つける人、だって。じゃあ、今日のわたしたち、ちょっとは見込みあるね
    }
-
# speaker: narrator
チャイのカップを手に、城壁のふちに立つ。下には、アンベール城と、その前の湖が、模型のように小さく見えた。
{ cond("episode gt_jaipur_main_amber_fort"):
    # speaker: heroine
    あ、あの門。サリームさんが描いてた門だ。上から見ると、絵より、ずっと小さい
}
# speaker: heroine
# emotion: smile
宝物って、見つからない方が、ずっと探していられるね。五十年たっても、男の子が地図を描いて売ってるくらいに
-> END

// 【3】手伝いの knot：宝の地図の値段（ミニゲーム raju_haggle。噛み合いでない選択）。ラージューとのにらめっこ。言い値は₹50。
// ラージューは胸を張る時と目が泳ぐ時をくり返し、目が泳いだ時の「じっと見る」2回ごとに₹40、₹30と下がる
// （時間では下がらない）。₹40では背を向けて振り返るふりもし、振り返った所を見ると、すぐ₹30。胸を張っている時と
// ₹30で見ると跳ね返され、3回跳ね返されるとへそを曲げて売らない。12秒何もしなくても買わずに終わる。決めた値段を払う。
// ₹30で決めると、しぶしぶ安い方の地図。断るか、決めずに終わると、ラージューが地図なしで案内してくれる。払えない値段は、
// ゲームが次に安い値段へ下げる（どれも払えなければ断るだけ）。
// 関係値は前の選択肢のまま（言い値は affection、いちばん安くは spark、₹40と断るは無し）。値切り方は腕前でなく態度
// （どこまで粘るか）。
=== gt_jaipur_jaigarh_fort_map ===
# speaker: gt_raju
# minigame: raju_haggle auto fair_map bg gt_bg_jaipur_jaigarh_fort
五十ルピー。……でも、じっと見られると、ぼく、ちょっとずつ負けちゃう
* [地図の値段：言い値の₹50で買った # option: buy_map]
    # money: -50
    # rel: affection +1
    # speaker: gt_raju
    まいど。……宝が見つかっても、山分けはしないよ
* [地図の値段：₹40で話がまとまった # option: fair_map]
    # money: -40
    # speaker: gt_raju
    四十。……うん、決まり。ナーナーが言ってた。ちょっとだけ値切るお客さんは、ちゃんと最後まで地図を読むって
    # speaker: narrator
    ラージューは地図のしわを手のひらで伸ばしてから、両手で差し出した。
    # speaker: heroine
    # reaction: heroine,happy,sparkle
    本物の宝の地図だ。……ねえ、最初の印は、どこ？
* [地図の値段：₹30まで値切った # option: haggle_map]
    # money: -30
    # rel: spark +1
    # speaker: gt_raju
    宝の値段を値切る人には、宝は見つからないよ。……でも、いいよ。安い方の地図ね
    # speaker: narrator
    ラージューはポケットから、別の紙を出した。さっきのより、バツ印が少し小さい。
    # speaker: heroine
    # reaction: heroine,teasing_big,music
    ふふっ、値段で地図が変わった！
// decline_map は「やめておく」、3回跳ね返されてへそを曲げた（「もういい！　地図は売らない！」）、12秒何もしなかった、のどれでも来る
// （どれかは物語に渡らない）。最初の一言は、すねたときにも、断られたときにも合う形にする。
* [地図の値段：買わなかった # option: decline_map]
    # set: gt_jaipur_raju_guided
    # speaker: gt_raju
    ……ふん。ぼくの地図、すごいのに
    # speaker: gt_raju
    じゃあ、見習い期間ってことで、ついてきていいよ。地図は見せないけど
    # speaker: narrator
    ラージューは地図を胸に抱えたまま、先に立って歩き出した。地図の印を、順に回ることになった。
- ->->
