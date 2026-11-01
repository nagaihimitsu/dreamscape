// サン・サティロ教会。奥行きの錯覚を確かめながら歩く。
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

# background: milano_san_satiro_date
# speaker: narrator
サンタ・マリア・プレッソ・サン・サティロ教会。祭壇の向こうへ、柱に囲まれた空間が長く続いている。
# speaker: heroine
「奥にも行けるのかな。見てみたい」
# speaker: narrator
横へ歩いた{heroine_name}が、数歩目で立ち止まった。
# speaker: heroine
# emotion: surprised
「えっ、待って。横からだと、奥がない」
# speaker: narrator
祭壇の背後は浅く、その限られた奥行きに遠近法の装飾が施されている。正面からの印象とはまるで違った。
# speaker: heroine
「今、入っていこうとしてたよね、わたし」
{
- relationship_tone == "strained":
彼女は声をひそめ、横からもう一度確かめた。
- relationship_tone == "guarded_attraction":
彼女は笑われる前に、こちらの顔を確かめた。
- relationship_tone == "comfortable":
彼女は悔しそうに正面へ戻り、また横へ移った。
- relationship_tone == "warm":
彼女は確かめてほしそうに、正面の位置を指さした。
- relationship_tone == "romantic_tension":
彼女は笑いながら、同じ場所で見てと手招きした。
- else:
彼女は自分の見間違いを確かめるように、案内へ目を落とした。
}
# speaker: heroine
「{player_address}は、最初から気づいてた？」

* [「気づかなかった。奥に行く気でいた」]
    # effect: milano_san_satiro_v2_first_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「同じ間違いなら安心、って言いたいけど……本当に？」
        「もう一度、正面から見よう」
    - else:
        # speaker: heroine
        # emotion: happy
        「よかった、仲間がいた！」
        「二人とも、行けない場所への順路を探してたんだね」
    }
    -> after_first
* [「横から見る場所を、先に教えてほしかった」]
    # effect: milano_san_satiro_v2_first_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「ごめん。でも、一緒に驚きたかったな」
        「次は先に言うか、待つか、聞いてみる」
    - else:
        # speaker: heroine
        # emotion: smile
        「じゃあ次は、どこで驚くか相談してからにする？」
        「それも難しそうだけど」
    }
    -> after_first
* [「先に見つけたの、ちょっと悔しい」]
    # effect: milano_san_satiro_v2_first_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「ごめん、先に言わないほうがよかったかな」
        「でも見た瞬間、誰かに伝えたくなって」
    - else:
        # speaker: heroine
        # emotion: teasing
        「ふふ、今日はわたしの勝ち」
        「次の発見は譲る、とは言わないよ」
    }
    -> after_first

=== after_first ===
# speaker: narrator
二人は歩く位置を少しずつ変え、奥行きが崩れたり戻ったりするのを確かめた。
# speaker: heroine
「狭いから諦めるんじゃなくて、こう見せようって考えた人がいたんだね」
「正面では本当に遠く見えるのに、横へ一歩で分かる。不思議」
# speaker: narrator
彼女は祭壇を見上げ、こちらの立つ場所も気にかけた。
# speaker: heroine
「同じところにいるのに、見えてるものは少し違うんだ」

* [「ここに立つとよく見える。場所を交代しよう」]
    # effect: milano_san_satiro_v2_second_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「ありがとう。でも、今の場所も気に入ってる」
        「交代は、もう少しだけ待って」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。じゃあ次は、わたしの場所も試してみて」
    }
    -> ending
* [「違って見えるなら、説明し合おう」]
    # effect: milano_san_satiro_v2_second_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「うまく説明できなかったら、ごめんね」
        「でも、言葉にする前にもう少し見たい」
    - else:
        # speaker: heroine
        # emotion: smile
        「いいね。わたし、さっきまで本当に奥へ続いてると思ってた」
        「どれくらい本気だったかは、聞かないで」
    }
    -> ending
* [「見え方が違っても、隣にいたい」]
    # effect: milano_san_satiro_v2_second_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「うれしいけど、今は少し距離をとって見ていい？」
        「横からのほうが、仕組みが分かりやすいから」
    - else:
        # speaker: heroine
        { relationship_tone_after == "romantic_tension":
            # emotion: shy
            「うん。見たいところが違っても、あとで教え合おう」
        - else:
            # emotion: smile
            「じゃあ、わたしが横から見たら、正面はお願い」
        }
    }
    -> ending

=== ending ===
# speaker: heroine
「出る前に、もう一回だけ正面から見たい」
「さっき分かったはずなのに、まだ奥へ行けそうな気がする」
# speaker: narrator
彼女は一歩進みかけ、今度は自分で笑って立ち止まった。
-> END
