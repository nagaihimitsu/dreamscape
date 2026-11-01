// コルドゥージオ広場のロースタリーで、注文を決めるまでの時間。
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

# background: milano_starbucks_roastery_date
# speaker: narrator
コルドゥージオ広場に面したスターバックス・リザーブ・ロースタリー。{heroine_name}は入口を見上げて、足を止めた。
# speaker: heroine
「ここ、前は郵便局だったんだって。看板だけ見て、もっと普通の建物を想像してた」
「ミラノまで来てスターバックス？　って言われるかなと思ったけど、どうしても中を見たくて」
# speaker: narrator
店内にはコーヒーの香りが広がり、焙煎の設備が目に入る。
# speaker: heroine
# emotion: surprised
「わ、豆を焙煎してる。飲む前に、しばらく見ててもいい？」
{
- relationship_tone == "strained":
彼女は返事を待ち、設備のほうへ体を向けた。
- relationship_tone == "guarded_attraction":
彼女は隣を振り向き、説明を指さしながら一歩場所を空けた。
- relationship_tone == "comfortable":
彼女は説明を読もうとして、人の流れを避けるように場所を譲った。
- relationship_tone == "warm":
彼女は珍しそうに設備を見て、次はメニューも見たいと話した。
- relationship_tone == "romantic_tension":
彼女は隣で同じ方向を見上げ、一度だけこちらの表情を確かめた。
- else:
彼女は案内に目を通し、それから設備を見上げた。
}

* [「ミラノでいつもの看板を見ると、不思議だ」]
    # effect: milano_roastery_v2_first_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「うん。でも、いつもの店とは違うところを見に来たんだ」
        「中の様子、もう少し見てから決めたいな」
    - else:
        # speaker: heroine
        # emotion: smile
        「でしょ。見慣れた名前なのに、入ったら迷子になりそう」
        「帰りに入口を間違えたら教えてね」
    }
    -> after_first
* [「機械を見てたら、注文するのを忘れそう」]
    # effect: milano_roastery_v2_first_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「あっ、わたしも。忘れたまま帰るところだった」
        「それだと香りを見学しただけだね」
    - else:
        # speaker: heroine
        # emotion: happy
        「分かる！　今、飲み物より先に機械を見に来た人になってる」
        「でも、せっかくだから飲もう」
    }
    -> after_first
* [「君の行きたい場所だから、付き合うよ」]
    # effect: milano_roastery_v2_first_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「付き合う、だけだと少し気になるな」
        「無理してない？　嫌なら別の場所も一緒に考えたい」
    - else:
        # speaker: heroine
        # emotion: smile
        「来てくれてうれしい。次は、あなたが気になる場所も教えてね」
    }
    -> after_first

=== after_first ===
# speaker: narrator
メニューの前で、彼女の視線が二つの候補の間を行ったり来たりした。
# speaker: heroine
「いつも頼むものにするか、初めてのものにするか……」
「さっきまで機械を見るって言ってたのに、今はこれで悩んでる」

* [「初めてのほう。今日は実験の日にしよう」]
    # effect: milano_roastery_v2_second_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「試したいけど、飲むのはわたしだからね」
        「説明を読んで、自分で決めるよ」
    - else:
        # speaker: heroine
        # emotion: smile
        「実験台はわたしかあ。じゃあ、失敗しても一緒に笑ってね」
    }
    -> ending
* [「店員さんに違いを聞いてみたら？」]
    # effect: milano_roastery_v2_second_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「今すぐ聞くのは少し緊張するな。もう一度読んでからでもいい？」
    - else:
        # speaker: heroine
        # emotion: smile
        「そうしよう。迷ってること、ちゃんと伝えてみる」
        # speaker: narrator
        彼女はメニューを指さし、店員に声をかけた。
    }
    -> ending
* [「僕も迷ってる。決まるまで一緒に悩もう」]
    # effect: milano_roastery_v2_second_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「二人とも決まらなかったら、お店が閉まっちゃう」
        「まず候補を二つにしよう」
    - else:
        # speaker: heroine
        # emotion: smile
        「よかった、仲間だ。じゃあ、どっちが先に決められるかな」
        「あ、競争にしたら余計に迷うかも」
    }
    -> ending

=== ending ===
# speaker: narrator
{heroine_name}はもう一度メニューを見て、今度は自分で一つを指さした。
# speaker: heroine
「決めた。……飲む前に、さっきの機械ももう一回見ていい？」
-> END
