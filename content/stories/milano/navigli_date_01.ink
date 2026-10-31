// ナヴィリオ地区。カフェの体験に依存せず運河沿いを歩く。
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
# speaker: heroine
「洗濯に使ってた石が、まだ残ってるんですね」
# speaker: narrator
ヴィーコロ・デイ・ラヴァンダイ。昔の洗濯場が残る、小さな路地だ。
# speaker: heroine
「ここで洗ってた人は、毎日この景色を見てたのかな」

* [「今日は靴下を持ってくるべきだったか」]
    # effect: milano_navigli_first_joke
    # speaker: heroine
    # emotion: smile
    「片方だけなら、帰りが大変ですよ」
    -> after_first
* [「どんな景色に見えてたと思う？」]
    # effect: milano_navigli_first_listen
    # speaker: heroine
    「忙しい日は、景色より洗濯物だったかも」
    # emotion: smile
    「私もきっと、まず靴を濡らさない場所を探します」
    -> after_first
* [「君と歩くと、こういう場所に気づける」]
    # effect: milano_navigli_first_honest
    # speaker: heroine
    # emotion: shy
    「……さっき路地を見つけたのは、あなたです」
    「私は、通り過ぎかけてた」
    -> after_first

=== after_first ===
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
    # speaker: heroine
    # emotion: teasing
    「橋は黙ったままですね。ずいぶん慎重派です」
    -> ending
* [「君が気になった道へ行こう」]
    # effect: milano_navigli_second_listen
    # speaker: heroine
    # emotion: smile
    「じゃあ、橋を渡る手前まで。この水の色をもう少し見たい」
    -> ending
* [「もう少し隣を歩けるほうがいい」]
    # effect: milano_navigli_second_honest
    # speaker: heroine
    # emotion: shy
    「……じゃあ、遠回りしても、文句はなしですね」
    # speaker: narrator
    彼女は橋ではなく、続いていく岸辺を見た。
    -> ending

=== ending ===
# speaker: narrator
窓の灯りが水の上で途切れ、またつながる。
二人は次の曲がり角まで、どちらが先とも決めずに歩いた。
-> END
