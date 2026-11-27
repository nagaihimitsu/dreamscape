INCLUDE modules.ink
-> DONE

// ジャイプールの布の店（話して買う店。2026-11-26）。サーンガーネールの刷り師、スミトラー。
// 三都市の「織る・縫う・押す」の、押す。出典は scenes/catalog.json（この knot の ID ごと）。
// 変化球：スミトラーは値段を一度しか言わない（版は一度押したら押し直せない、と同じ）。値切ると、まけずに、息子が初めて刷って
// 版がにじんだ一着（売り物にしていない）を出してくる。
// 分かれ方（どれにも得と損）：
//   pay_once        ₹1,200・affection +1（言い値。端切れに版を一つ押させてもらえる）
//   ask_cheaper → take_son_print ₹800（安い。にじんだ花を彼女が自分で見つける。版は押させてもらえない）
//               → back_to_first  ₹1,200（値切ろうとした分、版は押させてもらえないまま、言い値で買う）
// ヒロインが自分で値切るのは、ジョーハリー・バザールのデートが初めて。そのデートの後だけ、ここで値切りかけて断られる。

// 初めて店に入ったときだけ。この後に、交渉の場面（gt_jaipur_cloth_shop_haggle）が続く。
=== gt_jaipur_cloth_shop_intro ===
# scene: talk
# at: shop gt_jaipur_cloth_shop
# priority: -2
# person: gt_sumitra
# background: gt_bg_jaipur_johari_bazaar
# speaker: narrator
旧市街のアーケードの下に、刷った布を軒いっぱいに吊るした店があった。
# speaker: narrator
白い地に、小さな赤い花。風が来るたびに、花の列がそろって揺れる。
# speaker: heroine
# voice: gt_jaipur_cloth_shop_intro_001
吊るしてある布、どれも小さな花が並んでる。……近くで見たら、ひとつずつ違ったりして
# speaker: narrator
# term: gt_term_block_print
店の奥の台で、女の人が木の版を布に当て、手のひらで、とん、と押した。版を上げると、花が一輪増えている。
# speaker: narrator
その指先が、爪の際まで青かった。
# speaker: gt_sumitra
# cutin: name
藍だよ。洗っても、すぐには落ちない。……スミトラー。サーンガーネールから、毎朝バスで布を運んでくる
# speaker: heroine
# reaction: heroine,surprised,question
# voice: gt_jaipur_cloth_shop_intro_002
サーンガーネール？
# speaker: gt_sumitra
ジャイプールのすぐそばの、刷り師の町だ。うちはチッパーの家。チャーパー、押すっていう言葉から来てる
# speaker: narrator
台の上には、彫った木の版が並んでいた。大きな花、小さな花、細い蔓。どれも手のひらに載るほどの大きさだ。
# speaker: gt_sumitra
チークを彫って作る。花も、蔓も、みんな版だ。押して、日に干す
# speaker: gt_sumitra
サーンガーネールの布は、地が白い。白い地に、細かい花。年寄りは、川の水がいいから白が冴えるんだ、って言う
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_cloth_shop_intro_003
川の水で、白が……。本当かな。でも、そう聞くと、この白がもっときれいに見えてくる
{ cond("seen gt_delhi_cloth_shop_intro"):
    { cond("seen gt_agra_cloth_shop_intro"):
        # speaker: heroine
        # reaction: heroine,happy,sparkle
        # voice: gt_jaipur_cloth_shop_intro_004
        デリーの布は織って、アーグラの布は縫って、ここは押すんだ。……三つの町で、花の付け方が全部違う
    }
}
-> END

// 交渉の場面。何度でも入れる（# repeat: always）。クルタを手に入れると、もう流れない（# when:）。
// 関係値はクルタを手に入れる選択肢にだけ付ける（買わずに出る道には付けない）。
=== gt_jaipur_cloth_shop_haggle ===
# scene: encounter
# title: 一度だけの値段
# at: shop gt_jaipur_cloth_shop
# priority: -1
# repeat: always
# when: not outfit gt_kurta_block_print
# person: gt_sumitra
# sources: none
# background: gt_bg_jaipur_johari_bazaar
{ cond("seen gt_jaipur_cloth_shop_haggle"):
    # speaker: narrator
    スミトラーの店に戻ると、軒の布が、また少し入れ替わっていた。
    # speaker: gt_sumitra
    また来たね。値段は、変わってないよ
- else:
    # speaker: narrator
    # term: gt_term_kurta
    スミトラーが、軒から一着を下ろした。
    # speaker: narrator
    白い地のクルタに、揃いのゆったりしたズボン。
    # speaker: narrator
    小さな赤い花が、きちんと列になっている。
}
{ cond("date gt_jaipur_date_johari_bazaar"):
    # speaker: heroine
    # reaction: heroine,happy,sparkle
    # voice: gt_jaipur_cloth_shop_haggle_001
    これ、欲しいです。……あ、言っちゃった。欲しいって先に言うと、値切れないんだった
- else:
    # speaker: heroine
    # emotion: smile
    # voice: gt_jaipur_cloth_shop_haggle_002
    これ、着てみたいな。……花が、ほんの少しずつ傾いてる
}
# speaker: gt_sumitra
千二百。値段は、一度しか言わない
# speaker: gt_sumitra
版と同じだ。一度押したら、押し直せない。同じ所に二度押すと、にじむ
{ cond("date gt_jaipur_date_johari_bazaar"):
    # speaker: heroine
    # reaction: heroine,teasing,question
    # voice: gt_jaipur_cloth_shop_haggle_003
    宝石街の腕輪屋さんでは、少しだけ値切ってみたんですけど……
    # speaker: gt_sumitra
    ここは腕輪屋じゃない
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    # voice: gt_jaipur_cloth_shop_haggle_004
    ……一言で終わっちゃった
}
* [Twelve hundred. Done. # option: pay_once # translation: 千二百。決まりです。]
    # outfit: gt_kurta_block_print
    # money: -1200
    # rel: affection +1
    # speaker: gt_sumitra
    決まり。一回で決まる客は、気持ちがいい
    # speaker: narrator
    スミトラーは包む前に、台の上に端切れを一枚広げた。それから花の版を一つ、{heroine_name}の手に載せた。
    # speaker: gt_sumitra
    押してみな。一回だけ。まっすぐ
    # speaker: heroine
    # emotion: serious
    # voice: gt_jaipur_cloth_shop_haggle_005
    一回だけ、だよね。……いきます
    # speaker: narrator
    彼女は息を止めて版を置き、手のひらで、とん、と押した。
    # speaker: narrator
    版を上げると、白い端切れの上に、少しだけ傾いた花が一輪咲いていた。
    # speaker: heroine
    # reaction: heroine,happy,sparkle
    # voice: gt_jaipur_cloth_shop_haggle_006
    咲いた！　……ちょっと、傾いてるけど
    # speaker: gt_sumitra
    傾いた花は、手で押した証拠だ
* [Is there anything a little cheaper? # option: ask_cheaper # translation: もう少し安いものは、ありませんか。]
    # speaker: gt_sumitra
    値段は変えない。……安いのが欲しいなら、こっちだ
    # speaker: narrator
    スミトラーは台の下の籠から、同じ柄のクルタを一着出した。
    # speaker: gt_sumitra
    八百。どこが違うか、見つけたら売る
    # speaker: narrator
    {heroine_name}は布に顔を近づけ、花の列を、端から一輪ずつ指でたどっていった。
    # speaker: heroine
    # reaction: heroine,surprised,exclamation
    # voice: gt_jaipur_cloth_shop_haggle_007
    あった。ここだけ、花がにじんで、二重になってる
    # speaker: gt_sumitra
    息子が、初めて一人で刷った一枚だ。同じ所に二度押した。だから、売り物にはしてない
    # speaker: heroine
    # voice: gt_jaipur_cloth_shop_haggle_008
    売り物にしてないのに、捨てなかったんですね
    # speaker: gt_sumitra
    ……籠に入れておいただけだ
    * * [We'll take that one. # option: take_son_print # translation: それをください。]
        # outfit: gt_kurta_block_print
        # money: -800
        # speaker: gt_sumitra
        ……あいつに言っておく。にじんだのを、わざわざ選んだ客がいたって
        # speaker: heroine
        # emotion: smile
        # voice: gt_jaipur_cloth_shop_haggle_009
        にじんだ花、なんだか照れてるみたいに見える
    * * [No, the first one. At your price. # option: back_to_first # translation: やっぱり最初のを、言い値で。]
        # outfit: gt_kurta_block_print
        # money: -1200
        # speaker: gt_sumitra
        最初から、そう言えばいい
        # speaker: narrator
        スミトラーは、にじんだ一着を籠に戻した。端切れも版も、台の上に出てこなかった。
        # speaker: heroine
        # emotion: worried
        # voice: gt_jaipur_cloth_shop_haggle_010
        一度しか言わないって、こういうことなんだね……
    * * [Let us think about it. # option: cheaper_later # translation: 少し考えさせてください。]
        # later
        -> think
    - -
* [Let us think about it. # option: think_later # translation: 少し考えさせてください。]
    # later
    -> think
-
# speaker: narrator
包み紙にも、同じ花の版が一つ、押してあった。
# speaker: heroine
# emotion: smile
# voice: gt_jaipur_cloth_shop_haggle_011
帰ったら、この花の数、数えてみようかな。……一つずつ、違う顔してるから
-> END

= think
# speaker: gt_sumitra
布は吊るしておく。値段も、そのままだ
-> END
