// ナヴィリオ地区。カフェの体験に依存せず運河沿いを歩く。
VAR relationship_tone = "reserved"
VAR relationship_tone_before = "reserved"
VAR relationship_tone_after = "reserved"

VAR romance_result = "neutral"
VAR affection_delta = 0
VAR trust_delta = 0
VAR spark_delta = 0
VAR player_name = ""
VAR heroine_name = ""
VAR player_address = ""
VAR romance_stage = 1
VAR ending_reached = false
VAR has_cafe_memory = false

# background: milano_navigli_date
# speaker: narrator
ナヴィリオの水面に、向こう岸の窓が細く揺れている。
小さな路地を指さすと、{heroine_name}は人の流れを避けて立ち止まった。
{
- relationship_tone == "reserved":
彼女は水辺に目を向け、言葉を探していた。
- relationship_tone == "strained":
彼女は鞄の紐を持ち直し、路地の先を見た。
- relationship_tone == "comfortable":
彼女は並んで立ち、路地に残る石を指さした。
- relationship_tone == "guarded_attraction":
彼女は隣に目を向けかけ、すぐに水面へ視線を移した。
- relationship_tone == "warm":
彼女は路地の奥を指さし、どちらへ歩くか尋ねた。
- else:
彼女は水面に落ちた二人の影を見て、歩幅を合わせた。
}
# speaker: heroine
「洗濯に使ってた石が、まだ残ってるんですね」
# speaker: narrator
ヴィーコロ・デイ・ラヴァンダイ。昔の洗濯場が残る、小さな路地だ。
# speaker: heroine
「ここで洗ってた人は、毎日この景色を見てたのかな」

* [「今日は靴下を持ってくるべきだったか」]
    # effect: milano_navigli_first_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「靴下の話にすると、途端に自分の洗濯物を思い出しますね」
        「今日は忘れたかったのに」
    - else:
        # speaker: heroine
        # emotion: smile
        「片方だけなら、帰りが大変ですよ」
    }
    -> after_first
* [「どんな景色に見えてたと思う？」]
    # effect: milano_navigli_first_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「景色より、まず仕事を終わらせたい日もあったと思います」
        「……私も今日は、考えすぎかな」
    - else:
        # speaker: heroine
        「忙しい日は、景色より洗濯物だったかも」
        # emotion: smile
        「私もきっと、まず靴を濡らさない場所を探します」
    }
    -> after_first
* [「君と歩くと、こういう場所に気づける」]
    # effect: milano_navigli_first_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「私が見つけたことにしなくていいですよ」
        「一緒に気づいた、でよくありませんか」
    - else:
        # speaker: heroine
        # emotion: shy
        「……さっき路地を見つけたのは、あなたです」
        「私は、通り過ぎかけてた」
    }
    -> after_first

=== after_first ===
# speaker: narrator
{
- relationship_tone_after == "strained":
彼女は歩く速さを落とし、少し間を置いた。
- relationship_tone_after == "reserved":
彼女は橋の手前で立ち止まり、水面を見た。
- else:
彼女は橋のほうへ歩きながら、隣を振り返った。
}
# speaker: narrator
路地から運河へ戻ると、歩く人たちの足音がまた近くなった。
{ has_cafe_memory:
    # speaker: heroine
    # emotion: smile
    「前にも運河の近くで話しましたね。今日は、ずっと歩いてる」
- else:
    # speaker: heroine
    「水に映る灯り、歩くたびに別の形になりますね」
}
# speaker: heroine
「次の橋を渡るか、このまま歩くか。……どっちでもよさそう」

* [「橋の意見も聞こう。もう一票あれば決まる」]
    # effect: milano_navigli_second_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「橋は、もう十分働いてますよ」
        「私たちで決めましょう」
    - else:
        # speaker: heroine
        # emotion: teasing
        「橋は黙ったままですね。ずいぶん慎重派です」
    }
    -> ending
* [「君が気になった道へ行こう」]
    # effect: milano_navigli_second_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「私ばかり決めると、あなたの寄り道がなくなります」
        「気になるほう、言ってください」
    - else:
        # speaker: heroine
        # emotion: smile
        「じゃあ、橋を渡る手前まで。この水の色をもう少し見たい」
    }
    -> ending
* [「もう少し隣を歩けるほうがいい」]
    # effect: milano_navigli_second_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「……道を決める話だったのに」
        「先に歩いても、置いていかないでくださいね」
    - else:
        # speaker: heroine
        # emotion: shy
        「……じゃあ、遠回りしても、文句はなしですね」
        # speaker: narrator
        彼女は橋ではなく、続いていく岸辺を見た。
    }
    -> ending

=== ending ===
# speaker: narrator
窓の灯りが水の上で途切れ、またつながる。
二人は次の曲がり角まで、どちらが先とも決めずに歩いた。
-> END
