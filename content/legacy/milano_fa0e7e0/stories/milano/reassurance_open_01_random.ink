// 返事を保留された後の任意の短い会話。
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
        「また会うのは、嬉しいです。……返事とは、分けて考えても？」
        # speaker: narrator
        彼女は鞄の紐を直し、少しだけ距離をあけて並んだ。
    - else:
        # speaker: heroine
        # emotion: shy
        「……それなら、次に会う約束は今できます」
    }
    -> ending

=== ending ===
# speaker: narrator
彼女は横断歩道の先を見て、それからこちらへ向き直る。
# speaker: heroine
「{player_address}、もう少し歩きませんか」
-> END
