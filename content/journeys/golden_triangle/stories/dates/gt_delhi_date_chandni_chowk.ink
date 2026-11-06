VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0

# background: gt_bg_delhi_chandni_chowk
# speaker: narrator
チャンドニー・チョークの店先で、{heroine_name}が布の縁に目を留めた。店主が一枚を広げる。彼女が感心すると、二枚目が出てきた。
# speaker: heroine
# reaction: heroine,happy,sparkle
「あ、こちらもきれい。……えっ、まだあるんですか」
# speaker: narrator
三枚目が開きかけたところで、彼女はこちらへ助けを求める目を向ける。布は好きだが、買うつもりで立ち止まったわけではなかった。
# speaker: heroine
# reaction: heroine,worried,sweat
「こんなに見せてもらって、買わないって言いにくくなっちゃった」
{ relationship_tone == "reserved" || relationship_tone == "strained":
    # speaker: narrator
    彼女の指が鞄の紐を握る。店主は決断を待つように、布の端を持ったままだ。
- else:
    # speaker: heroine
    # emotion: exasperated
    「わたしの『きれい』が、どんどん布を増やしてる」
}

* [「君をさらって帰る役、今なら空いてる？」]
    # effect: gt_delhi_date_chandni_chowk_first_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,anger
        「帰るのはわたしが決める。困ってるのは、断る言い方なの」
        # speaker: narrator
        こちらが一歩引くと、彼女は自分の方から店主へ向き直った。
    - else:
        # speaker: heroine
        # reaction: heroine,teasing,blush
        「空いてるけど、さらう前にお礼を言わせてください」
        # speaker: narrator
        冗談で少し肩が緩んだ彼女は、自分で店主に声をかけた。帰る足は、誰にも引かせない。
    }
    -> after_first

* [「見せてくれたお礼と、今日は買わないことを」]
    # effect: gt_delhi_date_chandni_chowk_first_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「うん。分かってる。頭では、とてもよく分かってます」
        # speaker: narrator
        彼女は少しむっとした顔で息を吐き、店主へ向き直る。言うまでが難しいのだった。
    - else:
        # speaker: heroine
        # emotion: serious
        「二つとも言っていいんだね。きれいだったのは、ほんとうだし」
        # speaker: narrator
        彼女は買わない理由を長く並べず、顔を上げた。
    }
    -> after_first

* [「そのうち布の方から、採用面接が始まりそう」]
    # effect: gt_delhi_date_chandni_chowk_first_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,anger
        「笑い話にするのは、わたしがここを出てからにして」
        # speaker: narrator
        こちらが黙ると、彼女も自分の言葉を探す方へ戻った。
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「『うちの赤をどう着こなすおつもりで？』って？　だめ、笑うとまた増える」
        # speaker: narrator
        彼女は口元を押さえる。そのままでは言えないと気づき、手を下ろした。
    }
    -> after_first

=== after_first ===
# speaker: heroine
# emotion: serious
「見せてくださって、ありがとうございます。今日は買いません。縁の色が気になって、見てみたかったんです」
# speaker: narrator
店主は一度だけ別の布を示したが、彼女が首を振ると畳み始めた。愛想のよい引き止めが終わり、店には次の客が来る。
# speaker: narrator
通りへ戻った彼女は、鞄の中を確かめもせず、深く息を吐いた。
# speaker: heroine
# reaction: heroine,exasperated,sigh
「何も買ってないのに、買い物を終えた気がする」
# speaker: narrator
十七世紀のシャージャハーナーバードに始まる市場だと、手元の案内にある。今も店先から呼びかけが続き、荷を持つ人が通り抜けていく。
# speaker: heroine
「ここでお店を続ける人は、わたしみたいに毎回こんな顔をしないんだろうな」
# speaker: narrator
彼女はさっきの自分の顔を大げさに再現し、今度はこちらの前に立った。
# speaker: heroine
# reaction: heroine,teasing,question
「練習してもいい？　もしわたしが『そのお店は、今日は一人で見たい』って言ったら？」

* [「断られても、次の誘いは諦めないよ」]
    # effect: gt_delhi_date_chandni_chowk_second_bold
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,serious,anger
        「今日の話は、今日のうちに受け取って。次の約束で薄めないでほしい」
        # speaker: narrator
        彼女はまっすぐこちらを見る。小さな練習が、ちゃんと聞いてほしい話になった。
    - else:
        # speaker: heroine
        # reaction: heroine,shy,blush
        「……それ、帰りを待ってる人より、ずっと気になる言い方」
        # speaker: heroine
        # emotion: teasing
        「でも、今日断ったお店には入ってこないでね。次は、わたしから誘うかもしれないし」
    }
    -> ending

* [「店の前で待つ？　別々に見て後で合流する？」]
    # effect: gt_delhi_date_chandni_chowk_second_attentive
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,worried,sweat
        「もう段取りが決まっちゃう。まだ、そう言ってもいいか確かめたかっただけ」
        # speaker: narrator
        彼女は練習だったことを指で示し、こちらの隣へ戻った。
    - else:
        # speaker: heroine
        # reaction: heroine,smile,sparkle
        「ちゃんと選べるんだ。じゃあ、今は一緒。いつか一人で見たい時も、そう言うね」
        # speaker: narrator
        彼女は先ほどより軽い足取りで、こちらに並んだ。
    }
    -> ending

* [「残された自分を、次の店へ売り込む」]
    # effect: gt_delhi_date_chandni_chowk_second_playful
    { romance_result == "negative":
        # speaker: heroine
        # reaction: heroine,exasperated,sigh
        「寂しいって言われるより、困る。今はふざけずに聞いて」
        # speaker: narrator
        こちらがうなずくと、彼女は練習の断り文句を、今度は短くもう一度言った。
    - else:
        # speaker: heroine
        # reaction: heroine,happy,music
        「売り文句は？　よく歩きます、たまに迷います、返品は――あ、返品はだめか」
        { ending_reached || relationship_tone_after == "romantic_tension":
            # speaker: heroine
            # emotion: teasing
            「勝手に出品しないで。わたしが迎えに来るんだから」
        - else:
            # speaker: heroine
            「じゃあ、売れる前に戻ります。勝手な競争が始まっちゃった」
        }
    }
    -> ending

=== ending ===
# speaker: narrator
次の店先で、また鮮やかな布が揺れた。彼女は足を止めてから、今度は先に自分の希望を言う。
{ relationship_tone_after == "strained" || relationship_tone_after == "reserved":
    # speaker: heroine
    # emotion: serious
    「今は買わずに、もう少し見たい。急がず付き合ってくれる？」
- else:
    # speaker: heroine
    # reaction: heroine,teasing,music
    「見るだけです。布にも、隣の人にも、先に宣言しておきます」
}
# speaker: narrator
何も増えていない鞄を肩に、彼女は自分で店の方へ向きを変えた。
-> END
