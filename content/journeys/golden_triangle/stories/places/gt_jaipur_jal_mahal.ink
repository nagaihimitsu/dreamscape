INCLUDE modules.ink
-> DONE

// ジャル・マハルのデート（噛み合いの選択は2回）。
// メヘンディと焼きとうもろこしの代金は、頭の # on_done: で払う（選択のない買い物。合わせた額の案）。
// 模様に隠したものは、その夜と翌朝の宿の差し込み（gt_jaipur_inserts.ink【4】）で見つかる。

// 【3】
=== gt_jaipur_date_jal_mahal ===
# scene: date
# title: 手のひらに隠した名前
# when: episodes jaipur >= 1
# on_done: money -340
# background: gt_bg_jaipur_jal_mahal
{ cond("time night"):
    # speaker: narrator
    湖の真ん中に、灯りに縁どられた宮殿が浮かんでいた。ジャル・マハル。水面に映ったもう一つの宮殿が、風が吹くたびに揺れる。
- else:
    # speaker: narrator
    湖の真ん中に、黄土色の宮殿が浮かんでいた。ジャル・マハル。水面に映ったもう一つの宮殿が、風が吹くたびに揺れる。
}
# speaker: narrator
もとは鴨猟のための館だったという。湖の水が満ちると、下の階は水に沈むと言われている。中には入れない。人々は湖沿いの長い遊歩道から、ただ眺めるだけだ。
遊歩道には、焼きとうもろこしの屋台、写真用に飾り立てたラクダ、風船売り。その間に、低い椅子を並べた女性がいた。手の中には、絞り袋のような、細い円錐の筒。
# speaker: gt_jaipur_jal_mahal_woman
メヘンディ、どう？　手に描く模様。ヘナで描いて、二週間くらい残るの
# speaker: gt_farhana
わたしはファルハーナ。この遊歩道で、毎日、旅行者や地元の娘さんたちの手に描いてるの。いつか、扇風機と鏡のある自分のお店を持つのが夢
# speaker: heroine
# reaction: heroine,surprised,sparkle
わ、きれい！　ちょうど、結婚式に呼ばれてるんです。描いてもらっても、いいですか
# speaker: gt_farhana
結婚式なら、手の甲と手のひら、両方ね。……花嫁さんの手には、模様の中に花婿の名前を隠すの。初夜に、花婿がそれを探すのよ。見つけられないと、からかわれる
# speaker: gt_farhana
あなたも、何か隠す？
* [「自分の名前を隠して」 # option: hide_my_name]
    # profile: bold
    # memory: gt_jaipur_date_jal_mahal_memory
    # set: gt_jaipur_mehndi_his_name
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,surprised_big,sweat
        ほ、ほんとに？　人前でそういうの、ずるいよ
        # speaker: heroine
        # reaction: heroine,shy,blush
        ……でも、いいよ。断れないからじゃなくて、わたしが、いいって決めたから
        # speaker: narrator
        ファルハーナが声を立てて笑い、筒を構えた。彼女は耳まで赤くして、手を差し出した。
    - else:
        # speaker: heroine
        # reaction: heroine,surprised_big,blush
        えっ！　それ、花嫁さんのやつ……
        # speaker: heroine
        # reaction: heroine,teasing,blush
        ……いいよ。ただし、自分で見つけられたらね。見つけられなかったら、ずっと言うから
    }
* [「君が決めて」 # option: you_decide]
    # profile: attentive
    # memory: gt_jaipur_date_jal_mahal_memory
    # set: gt_jaipur_mehndi_her_secret
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        え、わたしが？　急に言われても……。ううん、決めた。ファルハーナさん、耳を貸して
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,music
        わたしが？　じゃあ、こっちに耳を貸して、ファルハーナさん
    }
    # speaker: narrator
    彼女が何かをささやくと、ファルハーナは目を丸くし、それから、たまらないという顔で笑った。
    # speaker: heroine
    秘密。聞いても、教えないからね
* [「名前は隠さないで、模様だけで」 # option: pattern_only]
    # profile: honest
    # memory: gt_jaipur_date_jal_mahal_memory
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        ……そっか。うん、模様だけでも、きれいだし
    - else:
        # speaker: heroine
        # emotion: smile
        うん。模様だけで十分。きれいなのが、いちばんだもんね
    }
    # speaker: gt_farhana
    もったいない。……まあ、いいわ。お客さんが決めること
    # speaker: narrator
    そう言いながら、ファルハーナの筒の先は、手のひらの真ん中で、妙に長く止まっていた。
-
# speaker: narrator
筒の先から、こげ茶色のペーストが細い線になって出てくる。花びら。蔓。孔雀の羽。手首から指先まで、迷いのない線が、見る見るうちに彼女の手を埋めていった。
# speaker: heroine
すごい。下書きもないのに。手のひらが、だんだん自分の手じゃないみたいになっていく
# speaker: gt_farhana
しばらくは、何にも触らないで。乾いたら、水で洗わずに、指でこそげ落とすの。最初はオレンジ色。一晩たつと、濃くなる
# speaker: narrator
描き終わると、彼女は両手を胸の前に上げたまま、動けなくなった。その鼻先を、焼きとうもろこしの匂いが通り過ぎる。炭火で焼いて、塩とライムと唐辛子をこすりつけたものだ。
# speaker: heroine
# reaction: heroine,exasperated,sweat
食べたい。今、いちばん食べたい。でも、手が使えない
# speaker: narrator
屋台で一本買って戻ると、彼女の目が、とうもろこしから離れなくなった。
* [口もとまで持っていく # option: feed_corn]
    # profile: bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,shy,sweat
        ひ、人が見てる……。一口だけ。一口だけね
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        ……ありがとう。自分で食べられないの、ちょっと恥ずかしいね。誰かに食べさせてもらうなんて、子どものとき以来かも
    }
    # speaker: narrator
    一口かじって、彼女は目を細めた。唐辛子とライムが、あとから追いかけてくる。
* [わざと少し遠ざける # option: tease_corn]
    # profile: provocative
    { romance_result == "negative":
        # speaker: heroine
        # emotion: exasperated
        今は本当にやめて。手、動かしたら模様がつぶれちゃう
        # speaker: narrator
        すぐに差し出すと、彼女はまだ少しむくれたまま、一口かじった。
    - else:
        # speaker: heroine
        # reaction: heroine,teasing_big,anger
        いじわる！　手が乾いたら、覚えてなさいね
        # speaker: narrator
        三回目で、ようやく一口かじらせてもらえた。彼女は、勝った人の顔で、もぐもぐと口を動かした。
    }
* [自分でおいしそうに食べてみせる # option: eat_corn_myself]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,gloom
        ひどい。本気でひどい
    - else:
        # speaker: heroine
        # reaction: heroine,exasperated,gloom
        ひどい……。今の、この旅でいちばんひどい。ふふっ、でも、おいしそうに食べるね
    }
    # speaker: narrator
    残りの半分を差し出すと、彼女は、まだ少しむくれたまま、それをかじった。
-
# speaker: narrator
遊歩道のはずれで、二人は湖を眺めた。彼女は、乾きかけた両手を、まだ胸の前に上げている。
# speaker: heroine
手が使えないと、何にもできないね。やってもらうの、慣れてないから、変な感じ。でも、今日は、ちょっと楽しかった
# speaker: heroine
# emotion: smile
この模様、結婚式の夜まで、持つかな。持ってほしいな
-> END
