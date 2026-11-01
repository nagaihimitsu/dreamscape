// 広場のL.O.V.E.を、別々の角度から見る。
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false

# background: milano_love_date
# speaker: narrator
アッファーリ広場。証券取引所の建物の前に、大きな手の彫刻が立っている。
ほかの指を欠いた手は、中指だけを空に向けていた。
作品名は、マウリツィオ・カテランの『L.O.V.E.』。
# speaker: heroine
「この名前で、この手なんですね」
# speaker: narrator
{heroine_name}は少し離れ、指先から建物へ視線を移した。
# speaker: heroine
「写真を撮るなら、どこに立とう。正面からだと、私まで怒ってるみたい」

* [「一緒に怒った顔で撮ろう」]
    # effect: milano_love_first_a
    # speaker: heroine
    # emotion: smile
    「ええと……私、怒る顔がうまくできないかも」
    「練習してたら、本当に何かあったと思われそう」
    -> after_first
* [「作品と同じポーズにしよう。君もやって」]
    # effect: milano_love_first_b
    # speaker: heroine
    # emotion: serious
    「私はやめておきます。写真の中で何をするか、自分で決めたいので」
    -> after_first
* [「手を振っているように見える場所を探そう」]
    # effect: milano_love_first_c
    # speaker: heroine
    # emotion: smile
    「さっきから、あの建物に挨拶してるようにも見えたんです」
    「でも、あちらは返してくれなさそう」
    -> after_first

=== after_first ===
# speaker: narrator
広場の反対側へ回ると、手と建物の重なり方が変わった。
# speaker: heroine
「私は、少し困る感じが好きです。見て終わりにできなくて」
「{player_address}は、家にこんな手の置物があったらどうします？」

* [「玄関に置く。帰ってきたら、毎回挨拶する」]
    # effect: milano_love_second_a
    # speaker: heroine
    # emotion: smile
    「宅配の人にも挨拶するんですね。説明するのはあなたですよ」
    -> ending
* [「困るものなら、見えない所にしまおう」]
    # effect: milano_love_second_b
    # speaker: heroine
    # emotion: serious
    「私は、困っても見ていたいものがあります」
    「しまう前に、一度だけ相談させてください」
    -> ending
* [「置く場所は二人で相談する。君の好みも聞きたい」]
    # effect: milano_love_second_c
    # speaker: heroine
    { ending_reached:
        # emotion: teasing
        「じゃあ、あなたが玄関なら私は窓際を推します。今から相談ですね」
    - else:
        # emotion: shy
        「二人で決めるんですか。……ずいぶん大きな買い物の話になりましたね」
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
