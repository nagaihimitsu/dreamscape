// 教会の奥行きと、相手に近づくときの距離。
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

# background: milano_san_satiro_date
# speaker: narrator
サンタ・マリア・プレッソ・サン・サティロ教会。祭壇の奥に、長い通路が続いているように見えた。
# speaker: heroine
{
- relationship_tone == "strained":
    # emotion: serious
    「少し離れて見てみます。後で、どこが違ったか聞かせてください」
- relationship_tone == "guarded_attraction":
    # emotion: shy
    「隣だと、見ている場所まで気になりますね」
- relationship_tone == "comfortable":
    # emotion: smile
    「同じ場所に立てば、同じように見えるでしょうか」
- relationship_tone == "warm":
    # emotion: smile
    「先に見つけたほうが、もう一人に教えることにしませんか」
- relationship_tone == "romantic_tension":
    # emotion: shy
    「同じ角度を探したら、思ったより近くなりそうですね」
- relationship_tone == "reserved":
    # emotion: neutral
    「正面と横、両方から見てみたいです」
}
「……あれ？　横から見ると、壁がすぐそこにある」
# speaker: narrator
二人で案内を読む。
# speaker: heroine
「奥に場所が取れなくて、浅いところに漆喰を使い、遠近法で深く見せたんですね」
# speaker: narrator
{heroine_name}は正面に戻り、また一歩横へ動いた。
# speaker: heroine
# emotion: smile
「行ったり来たりしてると、自分のほうがおかしくなりそう」

* [「壁なんだから、通路だと思うほうが間違いだね」]
    # effect: milano_san_satiro_first_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「間違いって言い切ると、さっき驚いた私も間違いみたい」
        「……もう一度、正面から見たいです」
    - else:
        # speaker: heroine
        # emotion: serious
        「間違い、かな。正面から見える景色も、ここにあるのに」
    }
    -> after_first
* [「横から見る役、交代しようか」]
    # effect: milano_san_satiro_first_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「交代すると、二人とも正面を見られなくなりません？」
        「少しだけ、並んでいてもいいですか」
    - else:
        # speaker: heroine
        # emotion: smile
        「じゃあ私が正面。壁に着いたら教えてください」
        「……あ、歩かなくていいです。声が響きそう」
    }
    -> after_first
* [「近くで見るなら、もう少し隣に行ってもいい？」]
    # effect: milano_san_satiro_first_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        「……そこまで近いと、壁より先にあなたが見えます」
        「もう少し離れてもらえますか」
    - else:
        # speaker: heroine
        { romance_stage < 3:
            # emotion: worried
            「あ、うん。でも、まずはこの距離で見せてください」
            「私も、まだどこを見るか決めてなくて」
        - else:
            # emotion: shy
            「……いいですよ。でも、絵のほうも見てくださいね」
        }
    }
    -> after_first

=== after_first ===
# speaker: heroine
{
- relationship_tone_after == "strained":
    # emotion: serious
    「少し離れてからだと、また違って見えます」
- relationship_tone_after == "guarded_attraction":
    # emotion: shy
    「さっきの距離も、今の距離も……見え方が違いますね」
- relationship_tone_after == "comfortable":
    # emotion: smile
    「隣で見ていても、気づくところは別々ですね」
- relationship_tone_after == "warm":
    # emotion: smile
    「あなたはどこが気になりました？　私は、この壁です」
- relationship_tone_after == "romantic_tension":
    # emotion: shy
    「今なら、隣で同じ場所を見つけられるかな」
- relationship_tone_after == "reserved":
    # emotion: neutral
    「もう一度、違う角度から見てみましょう」
}
# speaker: narrator
二人が少し位置を変えるたび、壁の見え方も変わる。
# speaker: heroine
「近くに行けば全部分かる、ってわけでもないんですね」
「正面で見たものも、横で見たものも、どっちも残しておきたいな」

* [「じゃあ、ひとつに決めなくていい」]
    # effect: milano_san_satiro_second_a
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「決めなくていい、って言われると余計に迷います」
        「もう一度、自分で見てきますね」
    - else:
        # speaker: heroine
        # emotion: smile
        「うん。帰ったら、同じ場所に通路と壁の両方があったって話します」
    }
    -> ending
* [「でも、知らないままのほうが楽しかったかも」]
    # effect: milano_san_satiro_second_b
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「知らないままだと、この横からの景色には会えませんでした」
        「私は、両方見られてよかったです」
    - else:
        # speaker: heroine
        # emotion: serious
        「私は、横から見てよかったです」
        「まだ正面からも見られるし」
    }
    -> ending
* [「もう一度だけ、隣で同じ角度を探そう」]
    # effect: milano_san_satiro_second_c
    { romance_result == "negative":
        # speaker: heroine
        # emotion: teasing
        「さっきと同じ角度なら、もう答えは出てますよ」
        「今度は違う場所から見ませんか」
    - else:
        # speaker: heroine
        # emotion: smile
        「今度は、どっちが先に壁を見つけるか」
        「……って、もう二人とも知ってるんでした」
    }
    -> ending

=== ending ===
# speaker: narrator
教会を出る前に、彼女はもう一度だけ振り返った。
{ ending_reached:
    # speaker: heroine
    # emotion: teasing
    「次は私が、あなたの見落としを探しますね」
- else:
    # speaker: heroine
    「次は、違うところに気づくかもしれませんね」
}
-> END
