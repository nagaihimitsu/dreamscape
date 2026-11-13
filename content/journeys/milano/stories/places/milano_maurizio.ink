INCLUDE modules.ink
-> DONE

// サン・マウリツィオ教会の場所のファイル（1場面1ファイルからの移し替え。文は今のまま）。
// デート。

// デート（本筋）。romance/date_catalog.json の milano_maurizio_date_sound の storyId がこの knot を指す。
// 恋愛の選択は、選択肢のすぐ下の # profile:（と # memory:）。もとの 1場面1ファイルの # effect: と同じ噛み合いと思い出。
=== milano_maurizio_date_sound ===
# scene: date
# title: 別々に見て、ここで会う
# background: milano_san_maurizio_sound
# speaker: narrator
サン・マウリツィオ教会の内部は壁で二つに分かれている。かつて一般の人と、修道院の内側で暮らす女性たちが、それぞれの側でミサにあずかった。
# speaker: heroine
修道女たちがいた向こう側にも壁画が残ってるんだって。どんな色に見えていたんだろう
別々に絵を見て、一色だけ覚えて、ここで会いませんか。私、好きな人と同じものを見るのがデートだと思ってたから、逆をしてみたい
# speaker: player
待ち合わせに遅れたら？
# speaker: heroine
私のほうが遅いと思います。いまから謝っておきます
{
- relationship_tone == "strained" || relationship_tone == "reserved":
# speaker: narrator
彼女は仕切りのそばに戻る場所を指で示した。
- relationship_tone == "romantic_tension" || relationship_tone == "warm":
# speaker: narrator
先に去りかけて、彼女は一度だけ小さく手を振った。
}

* [「時間は決めずに待つ」 # option: first_attentive]
    # profile: attentive
    { romance_result == "negative":
        # speaker: heroine
        時間は少しだけ決めておこう。私、本気で見始めると長いよ
    - else:
        # speaker: heroine
        ありがとう。待たせないことより、ちゃんと見てくることをがんばる
    }
    -> join_1

* [「僕の色も当ててみて」 # option: first_playful]
    # profile: playful
    { romance_result == "negative":
        # speaker: heroine
        先に当てようとすると、あなたのことしか考えなくなるよ。絵も見たい
    - else:
        # speaker: heroine
        ふたつ覚えていい？　私の好きな色と、あなたが好きそうな色。あ、もう反則だ
    }
    -> join_1

* [「会ったら先に声をかけて」 # option: first_honest]
    # profile: honest
    { romance_result == "negative":
        # speaker: heroine
        先に見つけた方、がいいな。待つ役まで決めたくない
    - else:
        # speaker: heroine
        うん。見つけたらすぐに言う。教会の中だから、ちっちゃい声でね
    }
    -> join_1

= join_1
# speaker: narrator
戻ってきた彼女は「青」と言ってから、息を吸った。
# speaker: heroine
帰る途中に別の青があって、最初の青がわからなくなった。でも、戻るとき、早く話したかったのは覚えてる

* [「じゃあ二色とも聞く」 # option: second_attentive]
    # profile: attentive
    # memory: sound_memory_maurizio_date_sound
    { romance_result == "negative":
        # speaker: heroine
        混ぜる前の色は戻せないな。今覚えてるほうだけでもいい？
    - else:
        # speaker: heroine
        # reaction: heroine,smile,sparkle
        最初のはひんやり。次のは、日なたの水。青を二つ持ってきたってことだね
    }
    -> join_2

* [「僕は待ってる間の色にする」 # option: second_bold]
    # profile: bold
    # memory: sound_memory_maurizio_date_sound
    { romance_result == "negative":
        # speaker: heroine
        それはずるい。あなたが絵を見て選んだのを聞きたかった
    - else:
        # speaker: heroine
        それだと待たせた私の色じゃない。……何色？　やっぱり聞きたい
    }
    -> join_2

* [「次は二人で同じ青を探そう」 # option: second_honest]
    # profile: honest
    # memory: sound_memory_maurizio_date_sound
    { romance_result == "negative":
        # speaker: heroine
        今日だけは違うまま帰ろうよ。私の青、もう少し貸さないでおく
    - else:
        # speaker: heroine
        うん。別々に見たから、一緒に見たい所ができた
    }
    -> join_2

= join_2
{ relationship_tone_after == "romantic_tension" || relationship_tone_after == "guarded_attraction":
# speaker: narrator
戻ってきた二人の足が、同じ床で向かい合わせに止まった。
}
# speaker: narrator
教会の外で、彼女はようやくいつもの声に戻った。
# speaker: heroine
待ち合わせ、もう一回やりたい
-> END
