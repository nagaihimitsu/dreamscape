// 返事を保留された後の任意の短い会話。
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
VAR memory_callback = ""
VAR confession_ready = false

# background: milano_walk
# speaker: narrator
道の角で、{heroine_name}が立ち止まった。
{
- relationship_tone == "strained":
彼女は道の向こうを見たまま、慎重に言葉を選んだ。
- relationship_tone == "guarded_attraction":
目が合い、彼女は鞄の紐を持ち直した。
- relationship_tone == "comfortable":
彼女は信号が変わるまで、隣で静かに待った。
- relationship_tone == "warm":
彼女は足を止めた理由を、自分から話し始めた。
- relationship_tone == "romantic_tension":
彼女は隣へ半歩寄り、何かを言いかけた。
- else:
彼女は少し間を置いて、こちらへ向き直った。
}
# speaker: heroine
「この前の返事、待たせたままなのが気になって」
「まだ決められないけど、何も話さないのも違うと思って」

* [「返事の予告だけ先に届いた」]
    # effect: milano_reassurance_chosen_joke
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「予告だけで終わらせるつもりは、ないです」
        # speaker: narrator
        彼女は歩きかけて、横断歩道の手前でもう一度止まった。
    - else:
        # speaker: heroine
        # emotion: smile
        「本編が遅れてますね。……予告も、言うのに時間がかかりました」
    }
    -> ending
* [「話してくれてありがとう。急いで決めなくていいよ」]
    # effect: milano_reassurance_chosen_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「ありがとう。でも、待ってもらうだけなのも落ち着かなくて」
        # speaker: narrator
        彼女は言い終えると、信号の色を確かめた。
    - else:
        # speaker: heroine
        「うん。でも、考えてるふりのままにはしたくないです」
    }
    -> ending
* [「返事を待ちながら、また会いたい」]
    # effect: milano_reassurance_chosen_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: shy
        {
        - relationship_tone_after == "strained":
        「会うのはいいです。でも、返事を急がせないでくださいね」
        - relationship_tone_after == "guarded_attraction":
        「……また会いたいです。でも、返事とは分けて考えても？」
        - else:
        「また会うのは、嬉しいです。……返事とは、分けて考えても？」
        }
        # speaker: narrator
        彼女は鞄の紐を直し、少しだけ距離をあけて並んだ。
    - else:
        # speaker: heroine
        # emotion: shy
        {
        - relationship_tone_after == "romantic_tension":
        「……次に会う約束なら、私からしてもいいですか」
        - relationship_tone_after == "comfortable":
        「次に会う約束ならできます。行き先も一緒に考えましょう」
        - relationship_tone_after == "guarded_attraction":
        「……次の約束だけ、先にしてもいいですか」
        - else:
        「……それなら、次に会う約束は今できます」
        }
    }
    -> ending

=== ending ===
# speaker: narrator
彼女は横断歩道の先を見て、それからこちらへ向き直る。
# speaker: heroine
「{player_address}、もう少し歩きませんか」
-> END
