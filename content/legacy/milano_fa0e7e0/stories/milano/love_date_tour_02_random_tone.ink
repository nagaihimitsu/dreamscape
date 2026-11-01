// 広場のL.O.V.E.を、別々の角度から見る。
VAR romance_result = "neutral"
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_love_date
# speaker: narrator
アッファーリ広場。証券取引所の前に、大きな白い手が立っている。
中指は空を向き、ほかの四本は途中から欠けていた。
作品名は、マウリツィオ・カテランの『L.O.V.E.』。
# speaker: heroine
{
- relationship_tone == "strained":
    # emotion: serious
    「まずは、それぞれの角度から見てみましょうか」
- relationship_tone == "guarded_attraction":
    # emotion: shy
    「あなたがこの手をどう見るのか、少し気になります」
- relationship_tone == "comfortable":
    # emotion: smile
    「正面も横も、なかなか挨拶しづらい手ですね」
- relationship_tone == "warm":
    # emotion: smile
    「あなたなら、これをどう紹介するか聞きたいです」
- relationship_tone == "romantic_tension":
    # emotion: teasing
    「あの手の前だと、手をつなぐのも少し目立ちますね」
- relationship_tone == "reserved":
    # emotion: neutral
    「近くで見ると、ずいぶん大きいですね」
}
「指の向こうに証券取引所……手が、建物に何か言いたそうですね」
「題名は、自由、憎悪、復讐、永遠のイタリア語の頭文字だそうです」
「『愛』に見えるのに、ずいぶん喧嘩腰の名前ですね」
「最初は二週間だけの予定だったのに、議論になって残ったそうです」
「……ずいぶん長い立ち話ですね」
# speaker: narrator
{heroine_name}は少し離れ、指先から建物へ視線を移した。
# speaker: heroine
「写真を撮るなら、どこに立とう。正面からだと、私まで怒ってるみたい」

* [「一緒に怒った顔で撮ろう」]
    # effect: milano_love_first_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「怒った顔は難しいです。たぶん、眠そうにしかならなくて」
        「私だけ普通の顔でもいいですか」
    - else:
        # speaker: heroine
        # emotion: smile
        「ええと……私、怒る顔がうまくできないかも」
        「練習してたら、本当に何かあったと思われそう」
    }
    -> after_first
* [「作品と同じポーズにしよう。君もやって」]
    # effect: milano_love_first_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「私はそのポーズ、写真に残したくないです」
        「あなたの分は止めませんけど」
    - else:
        # speaker: heroine
        # emotion: teasing
        「私はやめておきます。でも、あなたの指、少し曲がってますよ」
    }
    -> after_first
* [「手を振っているように見える場所を探そう」]
    # effect: milano_love_first_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「挨拶に見える場所を探すと、この手らしさが消えませんか」
        「もう少し、このまま見ていたいです」
    - else:
        # speaker: heroine
        # emotion: smile
        「さっきから、あの建物に挨拶してるようにも見えたんです」
        「でも、あちらは返してくれなさそう」
    }
    -> after_first

=== after_first ===
# speaker: heroine
{
- relationship_tone_after == "strained":
    # emotion: serious
    「同じ手を見ていても、気になるところは違いますね」
- relationship_tone_after == "guarded_attraction":
    # emotion: shy
    「並んで見ていると、横顔のほうも気になります」
- relationship_tone_after == "comfortable":
    # emotion: smile
    「二人で別の角度から撮ったら、違う作品に見えそう」
- relationship_tone_after == "warm":
    # emotion: smile
    「さっきの見方、もう一度聞いてもいいですか」
- relationship_tone_after == "romantic_tension":
    # emotion: teasing
    「次は私が角度を決めます。ちゃんとついてきてくださいね」
- relationship_tone_after == "reserved":
    # emotion: neutral
    「こちら側からも、少し見てみたいです」
}
# speaker: narrator
広場の反対側へ回ると、手と建物の重なり方が変わった。
# speaker: heroine
「金融の世界への皮肉、という見方もあるそうです」
「欠けた指を補うと、昔のファシスト式敬礼に見える、という人も」
「でも作者は、どちらの解釈も肯定も否定もしていないんですって」
「私は、少し困る感じが好きです。見て終わりにできなくて」
「{player_address}は、家にこんな手の置物があったらどうします？」

* [「玄関に置く。帰ってきたら、毎回挨拶する」]
    # effect: milano_love_second_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「毎日だと、いつか挨拶を忘れた日に気まずそう」
        「……置く場所も、少し悩みます」
    - else:
        # speaker: heroine
        # emotion: smile
        「宅配の人にも挨拶するんですね。説明するのはあなたですよ」
    }
    -> ending
* [「困るものなら、見えない所にしまおう」]
    # effect: milano_love_second_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「見えない場所にしまう前に、私にも聞いてください」
        「困るものでも、好きかもしれないので」
    - else:
        # speaker: heroine
        # emotion: serious
        「私は、困っても見ていたいものがあります」
        「しまう前に、一度だけ相談させてください」
    }
    -> ending
* [「置く場所は二人で相談する。君の好みも聞きたい」]
    # effect: milano_love_second_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「二人で置く話、もう始まってるんですね」
        「少し先まで決まりすぎて、びっくりしました」
    - else:
        # speaker: heroine
        { ending_reached:
            # emotion: teasing
            「じゃあ、あなたが玄関なら私は窓際を推します。今から相談ですね」
        - else:
            # emotion: shy
            「二人で決めるんですか。……ずいぶん大きな買い物の話になりましたね」
        }
    }
    -> ending

=== ending ===
# speaker: narrator
彼女はスマートフォンを構え、彫刻だけを一枚撮った。
# speaker: heroine
「人に見せたら、きっと名前を聞かれますね」
# emotion: smile
「そのとき、先に写真を見せるか、名前を言うかで迷いそう」
-> END
