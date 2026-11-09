INCLUDE modules.ink
-> DONE

// インド門のデート（新しい書き方の下書き。噛み合いの選択は2回）。
// 写真屋を呼んだときの写真は、デートの後の差し込み（gt_delhi_inserts.ink）で渡す【4】。

// 【3】
=== gt_delhi_date_india_gate ===
# scene: date
# title: 十三人目
# when: episodes delhi >= 1
# background: gt_bg_delhi_india_gate
# speaker: narrator
インド門の前の芝生は、敷物でまだら模様になっていた。風船売り、アイスの屋台、銀の弁当箱を開ける家族。戦没者の記念門の足もとで、デリーの人たちは、日曜の居間みたいにくつろいでいる。
# speaker: heroine
# reaction: heroine,surprised,question
「記念碑の前って、もっと静かな場所だと思ってた。みんな、ピクニックしてる」
# speaker: narrator
敷物の一つから、十六くらいの男の子が走ってきた。携帯を差し出して、英語で一言。写真、お願いします。
振り返ると、敷物の上に十二人いた。腰の曲がった祖母から、よちよち歩きの子まで。ハリヤーナーの村から、年に一度のデリー見物に来たのだという。
# speaker: heroine
# reaction: heroine,exasperated,sweat
「十二人！　ええと、もう少し寄ってください。あ、寄りすぎ。おばあさんが、おじさんの肘で隠れてる」
# speaker: narrator
祖母が、細い手で彼女を招いた。撮る人も入りなさい、という仕草だった。
男の子――モヌが、通訳する。
モヌ「ダーディーが、あなたも入れって。外国の人と撮ると、村で自慢できるから」
# speaker: heroine
「正直！　でも、わたしが入ったら、撮る人がいなくなっちゃう」
* [「自分が撮る。君は入って」 # option: shoot_for_family]
    # profile: attentive
    # memory: gt_delhi_date_india_gate_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「わたしだけ？　……一緒に、がよかったな。ううん、いいの。撮って」
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「じゃあ、お願い。……変な顔してたら、撮り直してね」
    }
    # speaker: narrator
    彼女は祖母の隣に押し込まれた。祖母はその手を握ったまま離さない。画面の中で、一人だけ顔立ちの違う十三人目が、困ったように笑っていた。
* [写真屋を呼んで、二人とも入る # option: hire_photographer]
    # profile: bold
    # memory: gt_delhi_date_india_gate_memory
    # money: -50
    # set: gt_delhi_photo_both_in
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised,sweat
        「二人で並ぶの？　家族の人たち、絶対に何か勘違いするよ」
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「二人とも？　うん、それがいい。せっかくだもん」
    }
    # speaker: narrator
    芝生を回っていた写真屋が、首から小さな印刷機を下げてやってきた。その場で刷って、一枚ずつ売っている。十四人が並び、誰かの子が泣きだし、もう一枚撮り直した。
* [「アイスを人数分、買ってきます」 # option: buy_ice]
    # profile: playful
    # memory: gt_delhi_date_india_gate_memory
    # money: -200
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「えっ、今？　十二人、わたし一人で並べるの？」
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        「人数分って、十四本だよ？　いってらっしゃい。並べておくね」
    }
    # speaker: narrator
    十四本のアイスを抱えて戻ると、写真はもう撮り終わっていた。撮ったのは彼女で、写っていたのは十二人と、両手にアイスを抱えて走ってくる一人だった。
-
# speaker: narrator
写真のあと、祖母は門を見上げたまま動かなくなった。モヌが、面倒くさそうに通訳する。
モヌ「ダーディーのおじいさんの名前が、あの門に彫ってあるんだって。最初の世界大戦で、遠い国で死んだ兵士。毎年探して、毎年見つからない」
インド門の壁には、第一次世界大戦などで亡くなった兵士たちの名前が刻まれている。その数、一万三千を超える。
# speaker: heroine
# emotion: serious
「毎年……。それでも、毎年来てるんだ」
# speaker: narrator
モヌ「去年も柵の前で一時間。僕は飽きた。名前が多すぎるし、遠くて読めない」
# speaker: heroine
「……探したいな。おばあさんが見たいのは、たぶん写真より、そっちだと思う」
* [「一緒に探そう」 # option: search_together]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「うん。……でも、一時間探して見つからなかったら、おばあさん、もっとがっかりしないかな」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。目、四つあれば、去年より少しは近づけるかも」
    }
    -> searching
* [「モヌ、その携帯の望遠で読めないかな」 # option: ask_monu_zoom]
    # profile: playful
    # set: gt_delhi_monu_zoom
    { romance_result == "negative":
        # speaker: narrator
        モヌ「……僕の携帯、電池が残り少ないんだけど」
        # speaker: heroine
        # reaction: heroine,exasperated,sweat
        「あ、ごめん、無理にとは……」
    - else:
        # speaker: narrator
        モヌ「望遠？　……ああ、それ、思いつかなかった」
    }
    -> searching
* [「名前が見つからなくても、今日来たことは残る」 # option: today_counts]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「……それ、わたしたちが決めることじゃないと思う。おばあさんに、聞いてみよう」
    - else:
        # speaker: heroine
        「……うん。それも本当だと思う。でも、それを決めるのは、おばあさんだよね」
    }
    -> not_searching

= searching
# speaker: narrator
柵の外から見上げる門は、思ったよりずっと高かった。名前は細かい文字で、壁一面に並んでいる。
{ cond("flag gt_delhi_monu_zoom"):
    # speaker: narrator
    モヌが渋々、携帯のカメラを最大まで寄せた。画面の中で、石の文字が一つずつ大きくなる。気づけば彼は、誰よりも熱心に画面を動かしていた。
    モヌ「ダーディー、名前、もう一回言って。……ラーム・シン。待って、今、それっぽいのが」
- else:
    # speaker: narrator
    彼女は目を細め、文字の列を指でたどった。読めるのは、太い見出しの英字だけだ。見かねたモヌが、黙って携帯を差し出した。望遠にすると、石の文字がぐっと近づく。
    モヌ「貸すだけだからね。ラーム・シン、だっけ。あ、待って」
}
# speaker: narrator
画面に、同じ名前がいくつも並んだ。ラーム・シン。ラーム・シン。もう一人、ラーム・シン。
# speaker: heroine
# reaction: heroine,surprised_big,exclamation
「同じ名前が、こんなに！　どれがおばあさんのおじいさんなんだろう」
# speaker: narrator
モヌが画面を見せると、祖母は目を細め、しばらく黙っていた。それから、画面の中の一番近くの一つを指さした。
モヌ「……どれでもいいって。全部、誰かのおじいさんだから、どれに手を合わせても怒られないって」
# speaker: heroine
# emotion: smile
「おばあさんの方が、一枚上手だった」
# speaker: narrator
モヌは携帯を見つめたまま、来年はもっと望遠のきく携帯にする、と小さく言った。
-> family_talk

= not_searching
# speaker: narrator
彼女はモヌに頼んで、祖母に聞いてもらった。名前を探したいですか、と。祖母は少し考え、首を横に振った。それから、門ではなく、芝生の方を指さした。
モヌ「名前は、去年まででいいって。今年は、ひ孫がここで走ってるのを見に来たんだって。……初耳なんだけど」
芝生の上で、よちよち歩きの子が鳩を追いかけていた。祖母はそれを、門を見上げるときと同じ目で見ていた。
# speaker: heroine
# reaction: heroine,surprised,sparkle
「探すものが、変わってたんだ。名前じゃなくて、続いていく方に」
-> family_talk

= family_talk
# speaker: narrator
帰りぎわ、母親たちが弁当箱を差し出した。揚げたパンに、辛い漬物。断ると、もう一つ増えた。
モヌ「あと、ダーディーが聞いてって。二人はいつ結婚するのかって。……ごめん、うちの村ではこれ、あいさつだから」
{
- cond("couple"):
    # speaker: heroine
    # reaction: heroine,shy_deep,blush
    「け、結婚は、まだ。でも、ちゃんと付き合ってます。……それ、通訳しなくていいからね！」
    # speaker: narrator
    モヌは全部訳した。祖母は満足そうにうなずき、二人の頭に順番に手を置いた。
- cond("stage >= 3"):
    # speaker: heroine
    # reaction: heroine,teasing,blush
    「それは、わたしにも分からない質問かな。……ね？」
    # speaker: narrator
    最後の「ね」がこちらに向いていたので、祖母がひどく面白そうに笑った。
- else:
    # speaker: heroine
    # reaction: heroine,exasperated,sweat
    「しません！　旅の連れです。あいさつに、全力で答えちゃった」
    # speaker: narrator
    祖母は聞こえないふりをして、彼女の手に揚げパンをもう一枚のせた。
}
-> END
