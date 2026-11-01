// 関係がぎくしゃくし、ほかのデートを選べないときの短い再交流。
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

# background: milano_city_date_landmark
# speaker: narrator
ガッレリアの屋根の下。{heroine_name}は、通り過ぎる人の足音を聞いていた。
{
- relationship_tone == "strained":
彼女は隣との間を少し空け、足元を見ていた。
- relationship_tone == "guarded_attraction":
彼女は距離を測るように一度こちらを見て、歩幅を緩めた。
- relationship_tone == "comfortable":
彼女は何も言わず、こちらと歩幅を合わせた。
- relationship_tone == "warm":
彼女は足音に耳を澄ませ、先に小さく息をついた。
- relationship_tone == "romantic_tension":
彼女の手が鞄から離れかけ、また持ち手に戻った。
- else:
彼女は声をかけるまで、少しだけ時間を置いた。
}
# speaker: heroine
「同じ道でも、歩く速さが違うと話しにくいですね」
「……今日は、どのくらいの速さにしましょうか」

* [「話したいことがあれば聞くよ。黙って歩いてもいい」]
    # effect: milano_recovery_listen
    { romance_result == "negative":
        # speaker: heroine
        # emotion: worried
        「聞いてもらうこと、まだ上手に決められなくて」
        # speaker: narrator
        彼女は足を緩めた。言葉が出るまでは待つことにした。
    - else:
        # speaker: heroine
        # emotion: smile
        「じゃあ、途中で黙っても、続きを待っててください」
        # speaker: narrator
        彼女は歩幅を確かめるように、一度こちらを見た。
    }
    -> ending
* [「ゆっくり。追い越されるのは、鳩だけにしよう」]
    # effect: milano_recovery_playful
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        「鳩には、もうだいぶ負けていますけど」
        # speaker: narrator
        彼女が指す先で、一羽が小走りに追い抜いていった。
    - else:
        # speaker: heroine
        # emotion: smile
        「あの鳩、ずいぶん急ぎの用事ですね」
        # speaker: narrator
        彼女は小走りの鳩を見送り、小さく笑った。
    }
    -> ending
* [「少し気まずくても、また一緒に話したい」]
    # effect: milano_recovery_honest
    { romance_result == "negative":
        # speaker: heroine
        # emotion: serious
        {
        - relationship_tone_after == "strained":
        「……まだ、うまく話せないところもあります」
        - relationship_tone_after == "guarded_attraction":
        「話したいです。でも、急いで近づかなくてもいいですか」
        - else:
        「……気まずいことも、急いで片付けなくていいですか」
        }
        # speaker: narrator
        彼女は返事を待って、それから並んだ。
    - else:
        # speaker: heroine
        # emotion: shy
        {
        - relationship_tone_after == "romantic_tension":
        「はい。言い直すときも、ちゃんと隣にいてください」
        - relationship_tone_after == "comfortable":
        「はい。黙って歩くのも、話のうちにしましょう」
        - relationship_tone_after == "guarded_attraction":
        「はい。……少しずつなら、話せそうです」
        - else:
        「はい。言い直したいことも、きっとありますから」
        }
        # speaker: narrator
        彼女は手を振りかけ、近すぎることに気づいて下ろした。
    }
    -> ending

=== ending ===
# speaker: narrator
屋根の切れ目まで、二人は歩幅を合わせて歩いた。
-> END
