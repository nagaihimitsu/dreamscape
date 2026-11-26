INCLUDE modules.ink
-> DONE

// アーグラの布の店（話して買う店。2026-11-26）。ザルドージー（金糸・銀糸の刺繍）の職人、ラフィーク。
// 三都市の「織る・縫う・押す」の、縫う。出典は scenes/catalog.json（この knot の ID ごと）。
// 値段を決めるのはいつも奥さん（留守。値札は奥さんの字）。ラフィークは日にちなら言えるが、値段が言えない。
// だから交渉は逆向き：ラフィークが「あんたが決めてくれ」と言い、主人公が値を付ける（英語の選択肢）。
// 一着目の分かれ方（翡翠色のアナルカリ／紺のサルワール・カミーズ。どれにも得と損）：
//   *_low    ₹1,500／₹1,100（いちばん安いが、ラフィークは黙り、フラグ gt_agra_rafiq_low。二着目は札の値段でしか売らない）
//   *_tag    ₹2,400／₹1,800・affection +1（札の値段。ラフィークは奥さんに叱られずにすむ）
//   *_first_flower → *_his_price ₹2,000／₹1,500・trust +1（最初に縫った花を見せてもらうと、ラフィークが初めて自分で値段を言う）
//   *_govind ₹1,800／₹1,300（デリーで言い値で払い、ゴーヴィンドの名刺をもらったときだけ。問屋の値段）
// 二着目：札の値段か、ラフィークの値段（₹2,000／₹1,500。一着目を安く付けたときは出ない）。
// 関係値は服を手に入れる選択肢にだけ付ける（何度でも入れる場面なので、買わずに出る道には付けない）。

// 初めて店に入ったときだけ。この後に、交渉の場面（gt_agra_cloth_shop_haggle）が続く。
=== gt_agra_cloth_shop_intro ===
# scene: talk
# at: shop gt_agra_cloth_shop
# priority: -2
# person: gt_rafiq
# background: gt_bg_agra_fatehabad_road
# speaker: narrator
大通りの車の音が、路地へ一本入っただけで遠くなった。小さな店の入口に、木の枠が据えてある。枠に張った布の上に、男が一人かがみこんでいた。
# speaker: narrator
片手は布の上、片手は布の下。上の手が針を刺すと、下の手が受けて、また返す。銀色の糸が、少しずつ花の形になっていく。
# speaker: heroine
# reaction: heroine,surprised,exclamation
両手で、布をはさんで縫ってるんだ。下の手、見えてないのに
# speaker: gt_rafiq
# cutin: name
いらっしゃい。ラフィークだ。……女房は、妹の家へ行ってる。三日、帰らない
# speaker: heroine
# reaction: heroine,surprised,question
えっと……それは、つまり？
# speaker: gt_rafiq
つまり、今日は俺が売る。俺は、売るのが下手だ
# speaker: narrator
奥の棚には畳んだ服が並び、どれにも小さな値札が下がっていた。丸い、きれいな字。
# speaker: gt_rafiq
札は、女房の字だ
# speaker: narrator
ラフィークは顔を上げないまま、針を進めた。
# speaker: gt_rafiq
これはザルドージー。ザルは金、ドージーは縫うこと。ペルシャの言葉だ
# speaker: gt_rafiq
昔は、王さまと妃さまの服にしか刺さなかった。ムガルの皇帝や貴族が好んだそうだ。今は、サリーにも、靴にも刺す
# speaker: heroine
# reaction: heroine,happy,sparkle
タージ・マハルの町で、ムガルの時代の刺繍……。なんだか、ぴったりだね
# speaker: heroine
……これ、本物の金ですか？
# speaker: narrator
針が、一瞬だけ止まった。
# speaker: gt_rafiq
みんな、それを聞く
# speaker: gt_rafiq
今の糸は、銅の針金に金や銀の色をかけたものだ。本物の金と銀を使ったのは、昔の話だと聞いてる
# speaker: gt_rafiq
だから、金の値段を聞かれても困る。金は、ほとんど入ってない。入ってるのは、日にちだ
# speaker: heroine
日にち？
# speaker: gt_rafiq
一枚に、何日かかったか。それなら、言える
-> END

// 交渉の場面。何度でも入れる（# repeat: always）。二着とも手に入れると、もう流れない（# when:）。
=== gt_agra_cloth_shop_haggle ===
# scene: encounter
# title: 日にちの値段
# at: shop gt_agra_cloth_shop
# priority: -1
# repeat: always
# when: not condition gt_agra_cloth_all_owned
# person: gt_rafiq
# background: gt_bg_agra_fatehabad_road
{ cond("seen gt_agra_cloth_shop_haggle"):
    # speaker: narrator
    ラフィークの店に戻ると、木の枠の上の花が、前に来たときより一輪増えていた。
    # speaker: gt_rafiq
    ……女房は、まだ帰らない
- else:
    # speaker: narrator
    ラフィークは針を布に刺したまま、棚の二着を顎で示した。
}
{ cond("outfit gt_anarkali_jade") || cond("outfit gt_salwar_kameez_navy"):
    -> second
}
# speaker: narrator
翡翠色の長い上着には、金の糸で縁どった赤い花。紺の上着には、銀の小さな花が並んでいる。
# speaker: heroine
どっちも、きれい……。翡翠色のは、お祝いの日の服みたい。紺のは、毎日でも着られそう
* [The jade one. # option: look_jade # translation: 翡翠色のほうを。]
    -> jade
* [The navy one. # option: look_navy # translation: 紺のほうを。]
    -> navy
* [Which one do you like? # option: ask_which # translation: どっちが好き？]
    # speaker: heroine
    # emotion: worried
    えー、迷う……。両方、少しずつ好き
    { cond("outfit gt_saree_blue"):
        # speaker: heroine
        # emotion: smile
        ……でも、銀の花はもう、デリーの青いのがあるから。今日は金のほう
        -> jade
    - else:
        # speaker: heroine
        # emotion: smile
        ……毎日着られるほうにする。旅は、まだ続くもんね
        -> navy
    }
* [Just looking today. # option: just_looking # translation: 今日は見るだけにします。]
    # later
    # speaker: gt_rafiq
    見るのは、ただだ。女房がいたら、そうは言わないが
    -> END

= jade
# speaker: narrator
# term: gt_term_anarkali
ラフィークが翡翠色の一着を広げた。胸の下から裾まで、傘のように広がる。
{ cond("outfit gt_saree_blue"):
    # speaker: heroine
    # reaction: heroine,surprised,exclamation
    デリーのサリーの銀は、織り込んであった。こっちの金は、上から縫ってあるんだね。同じように光るのに、作り方が違う
}
# speaker: gt_rafiq
札は二千四百。女房の値段だ。……これは、十一日。あとは、あんたが決めてくれ
* [Fifteen hundred? # option: jade_low # translation: 千五百で、どうですか。]
    # outfit: gt_anarkali_jade
    # money: -1500
    # set: gt_agra_rafiq_low
    -> low
* [Your wife's price. Twenty-four hundred. # option: jade_tag # translation: 奥さんの値段で。二千四百。]
    # outfit: gt_anarkali_jade
    # money: -2400
    # rel: affection +1
    -> tag
* [Show me the first flower you sewed. # option: jade_first_flower # translation: 最初に縫った花を、見せてください。]
    # speaker: gt_rafiq
    ……ここだ
    # speaker: narrator
    ラフィークは裾の端の、小さな一輪を指さした。ほかの花より、ほんの少しだけ糸が太い。
    # speaker: gt_rafiq
    一日目は、手が硬い。十一日目には、手が布に慣れる
    # speaker: heroine
    # emotion: smile
    一日目の花、ちゃんと残ってるんだ。わたし、これがいちばん好きかも
    -> his_price_jade
* [Govind in Delhi sent us. # option: jade_govind # translation: デリーのゴーヴィンドさんの紹介です。]
    # requires: flag gt_delhi_govind_card
    # outfit: gt_anarkali_jade
    # money: -1800
    -> govind
* [Let me think. # option: jade_later # translation: 少し考えます。]
    # later
    -> think

= navy
# speaker: narrator
# term: gt_term_salwar_kameez
紺の一着を広げると、銀の花が、襟から裾まで小さく並んでいた。肩には、透ける薄布がついている。
{ cond("outfit gt_saree_blue"):
    # speaker: heroine
    # reaction: heroine,surprised,exclamation
    デリーのサリーの銀は、織り込んであった。こっちの銀は、上から縫ってあるんだね。同じように光るのに、作り方が違う
}
# speaker: gt_rafiq
札は千八百。女房の値段だ。……これは、八日。あとは、あんたが決めてくれ
* [Eleven hundred? # option: navy_low # translation: 千百で、どうですか。]
    # outfit: gt_salwar_kameez_navy
    # money: -1100
    # set: gt_agra_rafiq_low
    -> low
* [Your wife's price. Eighteen hundred. # option: navy_tag # translation: 奥さんの値段で。千八百。]
    # outfit: gt_salwar_kameez_navy
    # money: -1800
    # rel: affection +1
    -> tag
* [Show me the first flower you sewed. # option: navy_first_flower # translation: 最初に縫った花を、見せてください。]
    # speaker: gt_rafiq
    ……襟の、これだ
    # speaker: narrator
    いちばん小さな花だった。花びらの一枚だけが、ほかよりほんの少し長い。
    # speaker: gt_rafiq
    一日目は、糸を引きすぎる。八日目には、引かなくなる
    # speaker: heroine
    # emotion: smile
    長い花びら、ちょっと背伸びしてるみたい。わたし、これがいちばん好きかも
    -> his_price_navy
* [Govind in Delhi sent us. # option: navy_govind # translation: デリーのゴーヴィンドさんの紹介です。]
    # requires: flag gt_delhi_govind_card
    # outfit: gt_salwar_kameez_navy
    # money: -1300
    -> govind
* [Let me think. # option: navy_later # translation: 少し考えます。]
    # later
    -> think

= his_price_jade
# speaker: narrator
ラフィークが、初めて顔を上げた。
# speaker: gt_rafiq
……二千。俺が決めた。女房には、俺が言う
* [Two thousand. Thank you. # option: jade_his_price # translation: 二千で。ありがとうございます。]
    # outfit: gt_anarkali_jade
    # money: -2000
    # rel: trust +1
    -> named
* [Let me think. # option: jade_flower_later # translation: 少し考えます。]
    # later
    -> think

= his_price_navy
# speaker: narrator
ラフィークが、初めて顔を上げた。
# speaker: gt_rafiq
……千五百。俺が決めた。女房には、俺が言う
* [Fifteen hundred. Thank you. # option: navy_his_price # translation: 千五百で。ありがとうございます。]
    # outfit: gt_salwar_kameez_navy
    # money: -1500
    # rel: trust +1
    -> named
* [Let me think. # option: navy_flower_later # translation: 少し考えます。]
    # later
    -> think

= low
# speaker: gt_rafiq
……いい
# speaker: narrator
ラフィークはそれ以上何も言わず、服を畳んで紙に包んだ。木の枠の前に戻っても、針はしばらく動かなかった。
# speaker: heroine
# emotion: worried
あっさり決まっちゃった……。安く買えたのに、なんだか悪いことをした気がする
-> wrap

= tag
# speaker: gt_rafiq
助かった。これで、女房に叱られずにすむ
# speaker: narrator
ラフィークが、初めて少し笑った。
# speaker: heroine
# reaction: heroine,teasing,music
奥さんの字の値札、強いね。ここにいないのに、ちゃんと値段を守ってる
-> wrap

= named
# speaker: narrator
包みを渡すと、ラフィークは針を取り直した。さっきより、手が速い。
# speaker: heroine
# emotion: smile
自分で決めた値段、って顔してた。……奥さん、びっくりするだろうな
-> wrap

= govind
# speaker: gt_rafiq
ゴーヴィンドか。あの男は、俺の金糸の縁取りを、デリーで倍の値で売る
# speaker: gt_rafiq
……あの男に売る値段なら、俺にも分かる。それでいい
# speaker: heroine
# reaction: heroine,happy,sparkle
名刺一枚で、ほんとに安くなった……。デリーで言い値で払った分、ここで返ってきたね
-> wrap

= second
// 一着をもう持っているとき：残りの一着。一着目を安く付けた（gt_agra_rafiq_low）ときは、札の値段だけ。
{ cond("flag gt_agra_rafiq_low"):
    # speaker: narrator
    ラフィークは残りの一着を棚から下ろし、値札を指で叩いた。
    # speaker: gt_rafiq
    今度は、札の値段だ。女房の字は、読めるだろう
    # speaker: heroine
    # emotion: worried
    ……この前の値段、やっぱり覚えてるよね
- else:
    # speaker: narrator
    ラフィークは残りの一着を棚から下ろした。
    { cond("outfit gt_anarkali_jade"):
        # speaker: gt_rafiq
        二着目は、俺が決める。千五百
    - else:
        # speaker: gt_rafiq
        二着目は、俺が決める。二千
    }
}
* [The jade one, at the price on the tag. # option: second_jade_tag # translation: 翡翠色のを、札の値段で。]
    # outfit: gt_anarkali_jade
    # money: -2400
    -> second_done
* [The jade one, at your price. # option: second_jade_his # translation: 翡翠色のを、あなたの値段で。]
    # requires: not flag gt_agra_rafiq_low
    # outfit: gt_anarkali_jade
    # money: -2000
    -> second_done
* [The navy one, at the price on the tag. # option: second_navy_tag # translation: 紺のを、札の値段で。]
    # outfit: gt_salwar_kameez_navy
    # money: -1800
    -> second_done
* [The navy one, at your price. # option: second_navy_his # translation: 紺のを、あなたの値段で。]
    # requires: not flag gt_agra_rafiq_low
    # outfit: gt_salwar_kameez_navy
    # money: -1500
    -> second_done
* [Not today. # option: second_later # translation: 今日はやめておきます。]
    # later
    -> think

= second_done
# speaker: gt_rafiq
二着とも、うちから出ていったか。女房が帰ったら、棚が空いてて驚く
# speaker: heroine
# reaction: heroine,happy,music
金の花と、銀の花。……どの日に、どっちを着よう
-> END

= wrap
# speaker: narrator
包みは、見た目よりずっと重かった。花の一輪ずつに、金属の糸が入っている。
-> END

= think
# speaker: gt_rafiq
服は待つ。俺も、ここで縫ってる
-> END
